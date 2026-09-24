import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../db/schema";
import { agencyClientIdsInput, authorizeAgencyClientIds } from "../lib/agency-client-scope";
import type { Member } from "../lib/workspace-types";

const pg = new PGlite();
let queryCount = 0;
const db = drizzle(pg, { schema, logger: { logQuery() { queryCount++; } } });
const ownIds = Array.from({ length: 1_001 }, () => randomUUID());
const otherId = randomUUID();
const member: Pick<Member, "agencyOwnerId" | "role" | "permissions"> = {
  agencyOwnerId: "own-agency", role: "manager", permissions: ["clients.view"],
};

before(async () => {
  await pg.exec("CREATE SCHEMA postito; CREATE TABLE postito.clients (id text PRIMARY KEY, agency_id text NOT NULL)");
  await pg.query("INSERT INTO postito.clients (id, agency_id) SELECT unnest($1::text[]), $2", [ownIds, "own-agency"]);
  await pg.query("INSERT INTO postito.clients (id, agency_id) VALUES ($1, $2)", [otherId, "other-agency"]);
});
after(async () => { await pg.close(); });

test("Clientes liberados: seleção acima de 100 preserva UUIDs e valida em lote", async () => {
  const ids = agencyClientIdsInput.parse(ownIds.slice(0, 150));
  queryCount = 0;
  assert.deepEqual(await authorizeAgencyClientIds(db, member, ids), ids);
  assert.equal(queryCount, 1);
});

test("Clientes liberados: listas maiores usam lotes sem limitar a seleção", async () => {
  queryCount = 0;
  assert.deepEqual(await authorizeAgencyClientIds(db, member, ownIds), ownIds);
  assert.equal(queryCount, 2);
});

test("Clientes liberados: IDs repetidos são deduplicados sem expandir o escopo", async () => {
  const selected = ownIds.slice(0, 150);
  assert.deepEqual(await authorizeAgencyClientIds(db, member, [...selected, ...selected]), selected);
  assert.equal(agencyClientIdsInput.parse([...selected, ...selected]).length, 150);
});

for (const [label, id] of [["de outra agência", otherId], ["inexistente", randomUUID()]] as const) {
  test(`Clientes liberados: rejeita toda a seleção quando inclui ID ${label}`, async () => {
    await assert.rejects(authorizeAgencyClientIds(db, member, [...ownIds.slice(0, 150), id]), {
      status: 403, message: "Cliente não disponível nesta agência.",
    });
  });
}

test("Clientes liberados: editor e leitor não concedem acesso, mesmo com clients.view", async () => {
  for (const role of ["editor", "viewer"] as const) {
    await assert.rejects(authorizeAgencyClientIds(db, { ...member, role }, ownIds.slice(0, 150)), { status: 403 });
  }
});

test("Clientes liberados: exige agência ativa e clients.view para IDs selecionados", async () => {
  await assert.rejects(authorizeAgencyClientIds(db, { ...member, agencyOwnerId: null }, ownIds), { status: 403 });
  await assert.rejects(authorizeAgencyClientIds(db, { ...member, permissions: [] }, ownIds), { status: 403 });
});

test("Clientes liberados: administrador pode selecionar; vazio não concede todos; UUID inválido falha", async () => {
  const admin = { ...member, role: "admin" as const };
  assert.deepEqual(await authorizeAgencyClientIds(db, admin, ownIds.slice(0, 150)), ownIds.slice(0, 150));
  assert.deepEqual(await authorizeAgencyClientIds(db, admin, []), []);
  assert.throws(() => agencyClientIdsInput.parse([...ownIds, "invalid-id"]));
  await assert.rejects(authorizeAgencyClientIds(db, admin, ["invalid-id"]));
});
