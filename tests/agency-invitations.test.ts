import assert from "node:assert/strict";
import { after, before, beforeEach, test, type TestContext } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../db/schema";
import { createAgencyInvitation } from "../lib/agency-invitations";
import { digest } from "../lib/security";
import { AppError } from "../lib/http";

// Isolated memory database and simulated provider. No real email or credentials.
const pg = new PGlite();
const db = drizzle(pg, { schema });
const invitation = {
  agencyId: "agency-fixture", agencyName: "Agência <Fixture>", createdBy: "owner-fixture",
  inviterName: "Pessoa & Fixture", email: "recipient@example.invalid", role: "viewer" as const,
  permissions: ["clients.view"], clientIds: ["client-fixture", "client-fixture"],
  clientAccessMode: "selected" as const, delivery: "email" as const,
};

before(async () => {
  await pg.exec(`
    CREATE SCHEMA postito;
    CREATE TABLE postito.agency_invites (
      id text PRIMARY KEY, agency_id text NOT NULL, token_hash text NOT NULL UNIQUE,
      email text, role text NOT NULL, permissions jsonb NOT NULL DEFAULT '[]',
      client_ids jsonb NOT NULL DEFAULT '[]', client_access_mode text NOT NULL,
      created_by text NOT NULL, expires_at text NOT NULL, used_at text, revoked_at text,
      created_at text NOT NULL
    );
  `);
});
beforeEach(async () => { await pg.exec("TRUNCATE postito.agency_invites"); });
after(async () => { await pg.close(); });

function configure(t: TestContext) {
  const config = {
    NODE_ENV: "production", MAIL_TRANSPORT: "", VERCEL: "1", MAIL_PROVIDER: "brevo",
    APP_URL: "https://postito.example.invalid/", BREVO_API_KEY: "brevo-fixture-not-real",
    BREVO_FROM_EMAIL: "sender@example.invalid",
  };
  const previous = Object.fromEntries(Object.keys(config).map(key => [key, process.env[key]]));
  Object.assign(process.env, config);
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const logs: unknown[][] = [];
  t.mock.method(console, "error", (...args: unknown[]) => { logs.push(args); });
  return logs;
}

test("Convite: e-mail chama Brevo com o link persistido e distingue aceite de entrega", async t => {
  configure(t);
  let calls = 0;
  let emailedLink = "";
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    calls++;
    assert.equal(String(input), "https://api.brevo.com/v3/smtp/email");
    const payload = JSON.parse(String(init?.body));
    assert.deepEqual(payload.to, [{ email: invitation.email }]);
    assert.equal(payload.subject, "Convite para Agência <Fixture> no Postito");
    assert.match(payload.htmlContent, /Pessoa &amp; Fixture/);
    assert.match(payload.htmlContent, /Agência &lt;Fixture&gt;/);
    assert.match(payload.htmlContent, /expira em 7 dias/);
    emailedLink = payload.htmlContent.match(/href="([^"]+)"/)[1];
    const [stored] = await db.select().from(schema.agencyInvites);
    assert.equal(payload.headers["Idempotency-Key"], stored.id);
    assert.equal(stored.tokenHash, digest(new URL(emailedLink).searchParams.get("invite")!));
    assert.equal(stored.revokedAt, null);
    return Response.json({ messageId: "<fixture@brevo.example.invalid>" }, { status: 201 });
  });
  const result = await createAgencyInvitation(db, invitation);
  assert.equal(calls, 1);
  assert.equal(result.delivery, "email");
  assert.equal(result.emailStatus, "accepted");
  assert.equal(result.link, emailedLink);
  assert.equal(new URL(result.link).pathname, "/");
  assert(!("delivered" in result));
  const [stored] = await db.select().from(schema.agencyInvites);
  assert.equal(Date.parse(stored.expiresAt) - Date.parse(stored.createdAt), 7 * 86_400_000);
  assert.deepEqual(stored.clientIds, ["client-fixture"]);
  assert.deepEqual(stored.permissions, ["clients.view"]);
  assert.equal(stored.usedAt, null);
});

test("Convite: link com e-mail restringe destinatário e informa que não houve envio", async t => {
  configure(t);
  delete process.env.BREVO_API_KEY;
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; throw new Error("Unexpected network"); });
  const result = await createAgencyInvitation(db, { ...invitation, delivery: "link" });
  assert.equal(result.delivery, "link");
  assert.equal(result.emailStatus, "not_requested");
  assert.equal(calls, 0);
  const [stored] = await db.select().from(schema.agencyInvites);
  assert.equal(stored.email, invitation.email);
  assert.equal(stored.revokedAt, null);
});

test("Convite: envio sem destinatário falha antes de criar registro", async t => {
  configure(t);
  await assert.rejects(createAgencyInvitation(db, { ...invitation, email: undefined }), {
    message: "Informe o e-mail do convite.", status: 400,
  });
  assert.equal((await db.select().from(schema.agencyInvites)).length, 0);
});

test("Convite: configuração ausente falha antes de criar registro", async t => {
  configure(t);
  delete process.env.BREVO_API_KEY;
  await assert.rejects(createAgencyInvitation(db, invitation), { status: 503 });
  assert.equal((await db.select().from(schema.agencyInvites)).length, 0);
});

for (const failure of ["refused", "timeout", "unconfirmed"] as const) {
  test(`Convite: falha ${failure} revoga o link e não anuncia envio nem repete`, async t => {
    const logs = configure(t);
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => {
      calls++;
      if (failure === "timeout") throw new Error("Fixture network timeout");
      if (failure === "unconfirmed") return Response.json({}, { status: 201 });
      return Response.json({ message: "Fixture rejected recipient@example.invalid" }, { status: 403 });
    });
    await assert.rejects(createAgencyInvitation(db, invitation), error => {
      assert(error instanceof AppError);
      assert.equal(error.status, 502);
      assert.doesNotMatch(error.message, /recipient|example.invalid/);
      return true;
    });
    assert.equal(calls, 1);
    const [stored] = await db.select().from(schema.agencyInvites);
    assert(stored.revokedAt);
    assert.equal(stored.usedAt, null);
    assert.equal(logs.length, 1);
    assert.doesNotMatch(JSON.stringify(logs), /recipient|brevo-fixture|token_hash/);
  });
}
