import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { bucket } from "../lib/storage";
import { AppError } from "../lib/http";

const fixtureKey = "fixture-agency/avatar/fixture-image";
const fixtureInfo = {
  id: "fixture-image",
  version: "fixture-version",
  name: fixtureKey,
  bucket_id: "fixture-private",
  created_at: "2026-09-24T00:00:00Z",
  last_modified: "2026-09-24T00:00:00Z",
  size: 68,
  content_type: "image/png",
  metadata: {},
};

function configure(t: TestContext) {
  const config = {
    SUPABASE_URL: "https://storage-fixture.example.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fixture-not-a-real-key",
    SUPABASE_STORAGE_BUCKET: "fixture-private",
  };
  const previous = Object.fromEntries(Object.keys(config).map(key => [key, process.env[key]]));
  Object.assign(process.env, config);
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

const invalidMetadata = (error: unknown) => error instanceof AppError && error.status === 502 && error.message === "Não foi possível verificar o arquivo enviado. Tente novamente.";

test("Storage remoto: info usa tamanho e MIME retornados pelo SDK para concluir o upload", async t => {
  configure(t);
  const requests: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: RequestInfo | URL) => {
    requests.push(String(url));
    return Response.json(fixtureInfo);
  });
  assert.deepEqual(await bucket.info(fixtureKey), { size: 68, type: "image/png" });
  assert.deepEqual(requests, [`https://storage-fixture.example.invalid/storage/v1/object/info/fixture-private/${fixtureKey}`]);
});

test("Storage remoto: metadados personalizados não substituem tamanho e MIME reais", async t => {
  configure(t);
  t.mock.method(globalThis, "fetch", async () => Response.json({
    ...fixtureInfo,
    metadata: { size: 1, mimetype: "application/pdf", content_type: "application/pdf" },
  }));
  assert.deepEqual(await bucket.info(fixtureKey), { size: 68, type: "image/png" });
});

test("Storage remoto: somente metadados personalizados não autorizam o vínculo", async t => {
  configure(t);
  t.mock.method(globalThis, "fetch", async () => Response.json({
    metadata: { size: 68, mimetype: "image/png" },
  }));
  await assert.rejects(bucket.info(fixtureKey), invalidMetadata);
});

test("Storage remoto: tamanhos ausentes ou malformados falham de forma segura", async t => {
  configure(t);
  let response: object = {};
  t.mock.method(globalThis, "fetch", async () => Response.json(response));
  for (const size of [undefined, null, "68", -1, 1.5, Number.MAX_SAFE_INTEGER + 1, {}]) {
    response = { ...fixtureInfo, size };
    await assert.rejects(bucket.info(fixtureKey), invalidMetadata);
  }
});

test("Storage remoto: tipos ausentes ou malformados falham sem propagar os dados", async t => {
  configure(t);
  let response: object = {};
  t.mock.method(globalThis, "fetch", async () => Response.json(response));
  for (const contentType of [undefined, null, "", " ", {}, 68, "image/png\r\nX-Foo: bar", "x".repeat(256)]) {
    response = { ...fixtureInfo, content_type: contentType };
    await assert.rejects(bucket.info(fixtureKey), invalidMetadata);
  }
});

test("Storage remoto: objeto ausente mantém mensagem sem detalhes internos", async t => {
  configure(t);
  t.mock.method(globalThis, "fetch", async () => Response.json({
    statusCode: "404", error: "not_found", message: "private fixture path",
  }, { status: 404 }));
  await assert.rejects(bucket.info(fixtureKey), error => error instanceof AppError && error.message === "Upload ainda não encontrado.");
});
