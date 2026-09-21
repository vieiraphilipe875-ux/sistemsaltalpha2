import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { sendMail } from "../lib/mail";
import { AppError } from "../lib/http";

function configure(t: TestContext) {
  const config = {
    NODE_ENV: "production",
    MAIL_TRANSPORT: "",
    VERCEL: "1",
    RESEND_API_KEY: "re_fixture_not_a_real_key",
    RESEND_FROM_EMAIL: "Postito <onboarding@resend.dev>",
    APP_URL: "https://postito.example.invalid",
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

test("E-mail: restrição do remetente de teste tem explicação sem revelar o destinatário autorizado", async t => {
  const logs = configure(t);
  t.mock.method(globalThis, "fetch", async () => Response.json({
    name: "validation_error",
    message: "You can only send testing emails to your own email address (owner@example.invalid). To send emails to other recipients, please verify a domain.",
  }, { status: 403 }));

  await assert.rejects(sendMail("other@example.invalid", "Confirmação de teste", "conteudo_privado_fixture"), error => {
    assert(error instanceof AppError);
    assert.equal(error.status, 502);
    assert.match(error.message, /versão de teste/);
    assert.doesNotMatch(error.message, /owner@example|other@example|conteudo_privado_fixture/);
    return true;
  });
  assert.deepEqual(logs, [["Postito: envio de e-mail recusado", {
    provider: "resend", reason: "test_recipient_restricted", status: null,
  }]]);
});

test("E-mail: outras falhas do provedor não são confundidas com restrição de destinatário", async t => {
  const logs = configure(t);
  t.mock.method(globalThis, "fetch", async () => Response.json({
    name: "validation_error", statusCode: 403, message: "Internal provider context owner@example.invalid conteudo_privado_fixture",
  }, { status: 403 }));
  await assert.rejects(sendMail("other@example.invalid", "Teste", "conteudo_privado_fixture"), error => {
    assert(error instanceof AppError);
    assert.equal(error.message, "Não foi possível enviar o e-mail. Tente novamente.");
    return true;
  });
  assert.deepEqual(logs, [["Postito: envio de e-mail recusado", {
    provider: "resend", reason: "provider_error", status: 403,
  }]]);
});

test("E-mail: envio aceito preserva destinatário, remetente e chave de idempotência", async t => {
  const logs = configure(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    calls++;
    assert.equal(String(input), "https://api.resend.com/emails");
    const payload = JSON.parse(String(init?.body));
    assert.equal(payload.to, "owner@example.invalid");
    assert.equal(payload.from, "Postito <onboarding@resend.dev>");
    assert.match(payload.html, /conteudo_privado_fixture/);
    assert.equal(new Headers(init?.headers).get("idempotency-key"), "mail-fixture-1");
    return Response.json({ id: "email-fixture-1" });
  });
  await sendMail("owner@example.invalid", "Teste", "conteudo_privado_fixture", "mail-fixture-1");
  assert.equal(calls, 1);
  assert.deepEqual(logs, []);
});
