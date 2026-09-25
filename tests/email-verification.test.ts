import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { digest } from "../lib/security";
import { createVerificationChallenge, verifyEmailCode } from "../lib/email-verification";
import { VERIFICATION_CODE_MAX_ATTEMPTS, VERIFICATION_CODE_TTL_MINUTES } from "../lib/auth-policy";

// No runtime getDb(), environment credentials, network, files or real email.
const pg = new PGlite();
const db = drizzle(pg, { schema });
const { members, authChallenges } = schema;
const start = Date.parse("2026-09-24T04:26:00.000Z");
const at = (offset = 0) => () => new Date(start + offset);
const email = "fixture@example.invalid";

before(async () => {
  await pg.exec(`
    CREATE SCHEMA postito;
    CREATE TABLE postito.members (
      id text PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text,
      name text NOT NULL, profession text NOT NULL DEFAULT 'other',
      email_verified_at text, status text NOT NULL DEFAULT 'pending', created_at text NOT NULL
    );
    CREATE TABLE postito.auth_challenges (
      id text PRIMARY KEY, member_id text NOT NULL REFERENCES postito.members(id),
      kind text NOT NULL, token_hash text NOT NULL, attempts integer NOT NULL DEFAULT 0,
      expires_at text NOT NULL, consumed_at text, created_at text NOT NULL
    );
  `);
});
beforeEach(async () => {
  await pg.exec("TRUNCATE postito.auth_challenges, postito.members CASCADE");
  await db.insert(members).values({ id: "member", email, name: "Fixture", createdAt: at()().toISOString() });
});
after(async () => { await pg.close(); });

async function issue(id: string, code: string, offset = 0) {
  return createVerificationChallenge(db, { id, memberId: "member", tokenHash: digest(`${id}:${code}`) }, at(offset));
}
async function challengeRows() {
  return db.select().from(authChallenges);
}

test("Confirmação: emissão usa cinco minutos e orçamento de cinco tentativas", async () => {
  assert.equal(VERIFICATION_CODE_TTL_MINUTES, 5);
  assert.equal(VERIFICATION_CODE_MAX_ATTEMPTS, 5);
  assert.equal(await issue("a", "001234"), true);
  const [row] = await challengeRows();
  assert.equal(Date.parse(row.expiresAt) - Date.parse(row.createdAt), 5 * 60_000);
  assert.equal(row.attempts, 0);
  assert.equal(row.tokenHash, digest("a:001234"));
});

for (const selected of ["001234", "005678"]) {
  test(`Confirmação: mensagens A/B fora de ordem aceitam ${selected === "001234" ? "A" : "B"} e impedem ambos os replays`, async () => {
    await issue("a", "001234");
    await issue("b", "005678", 3_488);
    // Successful verification consumes only confirmation challenges, not recovery tokens.
    await db.insert(authChallenges).values({
      id: "reset", memberId: "member", kind: "reset", tokenHash: "fixture-reset-hash",
      createdAt: at()().toISOString(), expiresAt: at(30 * 60_000)().toISOString(),
    });
    assert.equal(await verifyEmailCode(db, email, selected, at(4_000)), "member");
    const rows = await challengeRows();
    assert(rows.filter((row) => row.kind === "verify").every((row) => row.consumedAt === at(4_000)().toISOString()));
    assert.equal(rows.find((row) => row.kind === "reset")?.consumedAt, null);
    assert.equal(await verifyEmailCode(db, email, "001234", at(4_001)), null);
    assert.equal(await verifyEmailCode(db, email, "005678", at(4_002)), null);
    const [user] = await db.select().from(members);
    assert.equal(user.status, "active");
    assert.equal(user.emailVerifiedAt, at(4_000)().toISOString());
  });
}

for (const [name, elapsed, legacy, succeeds] of [
  ["um milissegundo antes de cinco minutos", 299_999, false, true],
  ["exatamente cinco minutos", 300_000, false, false],
  ["após cinco minutos", 300_001, false, false],
  ["legado de quinze minutos antes da nova borda", 299_999, true, true],
  ["legado de quinze minutos na nova borda", 300_000, true, false],
] as const) {
  test(`Confirmação: validade estrita em ${name}`, async () => {
    await issue("a", "001234");
    if (legacy) await db.update(authChallenges).set({ expiresAt: at(15 * 60_000)().toISOString() });
    assert.equal(await verifyEmailCode(db, email, "001234", at(elapsed)), succeeds ? "member" : null);
  });
}

test("Confirmação: expiração gravada mais curta também é respeitada", async () => {
  await issue("a", "001234");
  await db.update(authChallenges).set({ expiresAt: at(30_000)().toISOString() });
  assert.equal(await verifyEmailCode(db, email, "001234", at(30_000)), null);
});

test("Confirmação: quinta tentativa pode acertar; erros incrementam todos os códigos ativos", async () => {
  await issue("a", "001234");
  await issue("b", "005678", 1);
  for (let attempt = 1; attempt <= 4; attempt++) {
    assert.equal(await verifyEmailCode(db, email, "999999", at(100)), null);
    assert((await challengeRows()).every((row) => row.attempts === attempt));
  }
  assert.equal(await verifyEmailCode(db, email, "001234", at(100)), "member");
  assert((await challengeRows()).every((row) => row.attempts === 5));
});

test("Confirmação: reenvio herda tentativas e não libera a sexta, mesmo expirando o código anterior", async () => {
  await issue("a", "001234");
  for (let attempt = 0; attempt < 4; attempt++) await verifyEmailCode(db, email, "999999", at(100));
  await issue("b", "005678", 60_000);
  assert.equal((await challengeRows()).find((row) => row.id === "b")?.attempts, 4);
  assert.equal(await verifyEmailCode(db, email, "999999", at(60_001)), null);
  await issue("c", "009876", 120_000);
  assert.equal((await challengeRows()).find((row) => row.id === "c")?.attempts, 5);
  assert.equal(await verifyEmailCode(db, email, "005678", at(300_001)), null);
  assert.equal(await verifyEmailCode(db, email, "009876", at(300_001)), null);
  // Once the entire active window expires, a new code starts a new budget.
  await issue("d", "002468", 420_000);
  assert.equal((await challengeRows()).find((row) => row.id === "d")?.attempts, 0);
  assert.equal(await verifyEmailCode(db, email, "002468", at(420_001)), "member");
});

test("Confirmação: orçamento adota o máximo legado e o distribui entre desafios", async () => {
  await issue("a", "001234");
  await issue("b", "005678", 1);
  await db.update(authChallenges).set({ attempts: 3 }).where(eq(authChallenges.id, "a"));
  await db.update(authChallenges).set({ attempts: 1 }).where(eq(authChallenges.id, "b"));
  assert.equal(await verifyEmailCode(db, email, "999999", at(100)), null);
  assert((await challengeRows()).every((row) => row.attempts === 4));
});

test("Confirmação: código de outra conta, conta ausente e inativa não ativam ninguém", async () => {
  await issue("a", "001234");
  await db.insert(members).values({ id: "other", email: "other@example.invalid", name: "Other", createdAt: at()().toISOString() });
  assert.equal(await verifyEmailCode(db, "other@example.invalid", "001234", at(1)), null);
  assert.equal(await verifyEmailCode(db, "absent@example.invalid", "001234", at(1)), null);
  assert.equal((await challengeRows())[0].attempts, 0);
  await db.update(members).set({ status: "inactive" }).where(eq(members.id, "member"));
  assert.equal(await verifyEmailCode(db, email, "001234", at(1)), null);
  assert.equal(await issue("b", "005678", 2), false);
  const [user] = await db.select().from(members).where(eq(members.id, "member"));
  assert.equal(user.status, "inactive");
  assert.equal(user.emailVerifiedAt, null);
});

test("Confirmação: desafio consumido não serve; email normalizado e zero inicial são preservados", async () => {
  await issue("a", "001234");
  await db.update(authChallenges).set({ consumedAt: at()().toISOString() });
  assert.equal(await verifyEmailCode(db, email, "001234", at(1)), null);
  await issue("b", "005678", 2);
  assert.equal(await verifyEmailCode(db, " FIXTURE@EXAMPLE.INVALID ", "005678", at(3)), "member");
});

test("Confirmação: duas chamadas concorrentes só confirmam uma vez", async () => {
  await issue("a", "001234");
  await issue("b", "005678", 1);
  const results = await Promise.all([
    verifyEmailCode(db, email, "001234", at(2)),
    verifyEmailCode(db, email, "005678", at(2)),
  ]);
  assert.equal(results.filter((result) => result === "member").length, 1);
  assert.equal(results.filter((result) => result === null).length, 1);
});

test("Confirmação: chamadas simultâneas não ultrapassam cinco tentativas", async () => {
  await issue("a", "001234");
  await Promise.all(Array.from({ length: 8 }, () => verifyEmailCode(db, email, "999999", at(1))));
  assert.equal((await challengeRows())[0].attempts, 5);
  assert.equal(await verifyEmailCode(db, email, "001234", at(2)), null);
});

for (const resendFirst of [true, false]) {
  test(`Confirmação: reenvio e confirmação simultâneos, ${resendFirst ? "reenvio" : "confirmação"} agendado primeiro`, async () => {
    await issue("a", "001234");
    const operations = resendFirst
      ? [() => issue("b", "005678", 1), () => verifyEmailCode(db, email, "001234", at(1))]
      : [() => verifyEmailCode(db, email, "001234", at(1)), () => issue("b", "005678", 1)];
    const results = await Promise.all(operations.map((operation) => operation()));
    assert(results.includes("member"));
    assert((await challengeRows()).every((row) => row.consumedAt !== null));
    assert.equal(await verifyEmailCode(db, email, "005678", at(2)), null);
  });
}
