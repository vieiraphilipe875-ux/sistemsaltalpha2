import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../app/api/health/route";

test("Saúde indisponível sem banco de produção, sem expor erro interno", async () => {
  const previous = { DATABASE_URL: process.env.DATABASE_URL, VERCEL: process.env.VERCEL };
  Object.assign(process.env, { DATABASE_URL: "", VERCEL: "1" });
  try {
    const response = await GET();
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { database: "unavailable" });
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
