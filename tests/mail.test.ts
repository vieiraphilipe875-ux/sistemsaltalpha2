import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { assertMailConfigured, sendMail } from "../lib/mail";
import { AppError } from "../lib/http";

function configure(t: TestContext, provider = "resend") {
  const config = {
    NODE_ENV: "production",
    MAIL_TRANSPORT: "",
    VERCEL: "1",
    MAIL_PROVIDER: provider,
    RESEND_API_KEY: "re_fixture_not_a_real_key",
    RESEND_FROM_EMAIL: "Postito <onboarding@resend.dev>",
    APP_URL: "https://postito.example.invalid",
    BREVO_API_KEY: "brevo_fixture_not_a_real_key",
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

test("Brevo: envio aceito usa a API oficial, remetente verificado e idempotência", async t => {
  const logs = configure(t, "brevo");
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    calls++;
    assert.equal(String(input), "https://api.brevo.com/v3/smtp/email");
    assert.equal(new Headers(init?.headers).get("api-key"), "brevo_fixture_not_a_real_key");
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    assert(init?.signal instanceof AbortSignal);
    const payload = JSON.parse(String(init?.body));
    assert.deepEqual(payload.sender, { name: "Postito", email: "sender@example.invalid" });
    assert.deepEqual(payload.to, [{ email: "recipient@example.invalid" }]);
    assert.equal(payload.subject, "Confirmação de teste");
    assert.match(payload.htmlContent, /conteudo_privado_fixture/);
    assert.equal(payload.headers["Idempotency-Key"], "mail-fixture-brevo-1");
    return Response.json({ messageId: "<fixture@brevo.example.invalid>" }, { status: 201 });
  });
  await sendMail("recipient@example.invalid", "Confirmação de teste", "conteudo_privado_fixture", "mail-fixture-brevo-1");
  assert.equal(calls, 1);
  assert.deepEqual(logs, []);
});

for (const status of [400, 401, 403, 429, 500]) {
  test(`Brevo: HTTP ${status} é falha, não expõe dados e não dispara envio em outro provedor`, async t => {
    const logs = configure(t, "brevo");
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => {
      calls++;
      return Response.json({ message: "private_key recipient@example.invalid conteudo_privado_fixture" }, { status });
    });
    await assert.rejects(sendMail("recipient@example.invalid", "Teste", "conteudo_privado_fixture"), error => {
      assert(error instanceof AppError);
      assert.equal(error.status, 502);
      assert.doesNotMatch(error.message, /private_key|example.invalid|conteudo_privado_fixture/);
      if (status === 429) assert.match(error.message, /limitado/);
      return true;
    });
    assert.equal(calls, 1);
    assert.deepEqual(logs, [["Postito: envio de e-mail recusado", {
      provider: "brevo", reason: status === 429 ? "rate_limited" : "provider_error", status,
    }]]);
  });
}

test("Brevo: resposta sem confirmação de aceite não é tratada como envio", async t => {
  const logs = configure(t, "brevo");
  t.mock.method(globalThis, "fetch", async () => Response.json({}, { status: 201 }));
  await assert.rejects(sendMail("recipient@example.invalid", "Teste", "privado"), AppError);
  assert.deepEqual(logs, [["Postito: envio de e-mail recusado", {
    provider: "brevo", reason: "invalid_response", status: 201,
  }]]);
});

test("Brevo: timeout ou falha de rede não vaza segredo nem repete a solicitação", async t => {
  const logs = configure(t, "brevo");
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    throw new Error("timeout private_key recipient@example.invalid");
  });
  await assert.rejects(sendMail("recipient@example.invalid", "Teste", "privado"), AppError);
  assert.equal(calls, 1);
  assert.deepEqual(logs, [["Postito: envio de e-mail recusado", {
    provider: "brevo", reason: "network_error", status: null,
  }]]);
});

test("E-mail: provedor escolhido exige suas credenciais, mesmo com outro configurado", t => {
  configure(t, "brevo");
  delete process.env.BREVO_API_KEY;
  process.env.MAIL_TRANSPORT = "local";
  assert.throws(assertMailConfigured, { status: 503 });
  process.env.BREVO_API_KEY = "brevo_fixture_not_a_real_key";
  process.env.BREVO_FROM_EMAIL = "Postito <sender@example.invalid>";
  assert.throws(assertMailConfigured, { status: 503 });
  process.env.BREVO_FROM_EMAIL = "sender@example.invalid";
  assert.doesNotThrow(assertMailConfigured);
  process.env.MAIL_PROVIDER = "unknown";
  assert.throws(assertMailConfigured, { status: 503 });
});
