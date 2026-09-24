import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { z } from "zod";
import * as schema from "../db/schema";
import { createClientRecord, clientCreationId } from "../lib/client-creation";
import { AppError } from "../lib/http";
import type { Member } from "../lib/workspace-types";

// Full schema in memory. No runtime getDb(), hosted database or credentials.
const pg = new PGlite();
const db = drizzle(pg, { schema });
const now = "2026-09-24T08:00:00.000Z";
const actor: Member = {
  id: randomUUID(), email: "client-creator@example.invalid", name: "Fixture", profession: "other",
  role: "editor", agencyOwnerId: randomUUID(), clientAccessMode: "selected", status: "active",
  permissions: ["clients.view", "clients.manage", "finance.access"], createdAt: now,
};
const otherMemberId = randomUUID();
const otherAgencyId = randomUUID();
const input = {
  requestId: "b656ef1e-31ed-49b8-b333-a07010516b9a", name: "Cliente de teste", handle: "@fixture",
  driveUrl: "", period: "Setembro", revenue: 50000, dueDay: 31,
};

before(async () => { await migrate(db, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) }); });
beforeEach(async () => {
  await pg.exec("TRUNCATE postito.members CASCADE");
  await db.insert(schema.members).values([
    { id: actor.id, email: actor.email, name: actor.name, createdAt: now },
    { id: otherMemberId, email: "other@example.invalid", name: "Outro", createdAt: now },
  ]);
  await db.insert(schema.agencies).values([
    { id: actor.agencyOwnerId!, name: "Agência A", createdBy: actor.id, createdAt: now },
    { id: otherAgencyId, name: "Agência B", createdBy: actor.id, createdAt: now },
  ]);
});
after(async () => { await pg.close(); });

const create = (payload = input, member = actor) => db.transaction(tx => createClientRecord(tx, member, payload));
async function assertCounts(clients: number, boards = clients, forecasts = clients * 12, grants = clients) {
  assert.equal((await db.select().from(schema.clients)).length, clients);
  assert.equal((await db.select().from(schema.boards)).length, boards);
  assert.equal((await db.select().from(schema.transactions)).length, forecasts);
  assert.equal((await db.select().from(schema.clientMembers)).length, grants);
}

test("Cadastro de cliente: retry devolve os IDs originais sem repetir pasta, vínculo ou 12 previsões", async () => {
  const first = await create();
  const retry = await create();
  assert.equal(first.replayed, false);
  assert.deepEqual(retry, { ...first, replayed: true });
  await assertCounts(1);
});

test("Cadastro de cliente: replay preserva cadastro mesmo que o payload seja alterado", async () => {
  const first = await create();
  await create({ ...input, name: "Nome que não deve sobrescrever", revenue: 90000, dueDay: 1, period: "Outro mês" });
  const [client] = await db.select().from(schema.clients);
  const [board] = await db.select().from(schema.boards);
  assert.equal(client.id, first.clientId);
  assert.equal(client.name, input.name);
  assert.equal(client.revenue, input.revenue);
  assert.equal(client.dueDay, input.dueDay);
  assert.equal(board.period, input.period);
  assert((await db.select().from(schema.transactions)).every(row => row.amount === input.revenue));
  await assertCounts(1);
});

test("Cadastro de cliente: a mesma requestId fica isolada por agência e membro", async () => {
  const original = await create();
  const anotherAgency = await create(input, { ...actor, agencyOwnerId: otherAgencyId });
  const anotherMember = await create(input, { ...actor, id: otherMemberId });
  assert.equal(new Set([original.clientId, anotherAgency.clientId, anotherMember.clientId]).size, 3);
  for (const id of [original.clientId, anotherAgency.clientId, anotherMember.clientId]) assert.equal(z.string().uuid().parse(id), id);
  await assertCounts(3);
});

test("Cadastro de cliente: solicitações novas podem usar o mesmo nome", async () => {
  const first = await create();
  const second = await create({ ...input, requestId: randomUUID() });
  assert.notEqual(first.clientId, second.clientId);
  await assertCounts(2);
});

test("Cadastro de cliente: chamadas legadas sem requestId continuam independentes", async () => {
  const legacyInput = { ...input, requestId: undefined };
  const first = await db.transaction(tx => createClientRecord(tx, actor, legacyInput));
  const second = await db.transaction(tx => createClientRecord(tx, actor, legacyInput));
  assert.notEqual(first.clientId, second.clientId);
  await assertCounts(2);
});

test("Cadastro de cliente: replay não restaura acesso à pasta quando o vínculo foi revogado", async () => {
  const first = await create();
  await db.delete(schema.clientMembers).where(eq(schema.clientMembers.clientId, first.clientId));
  await assert.rejects(create, (error: unknown) => error instanceof AppError && error.status === 403);
  await assertCounts(1, 1, 12, 0);
});

test("Cadastro de cliente: revogar permissão de cadastro impede replay e criação", async () => {
  await create();
  await assert.rejects(() => create(input, { ...actor, permissions: ["clients.view"] }),
    (error: unknown) => error instanceof AppError && error.status === 403);
  await assertCounts(1);
});

test("Cadastro de cliente: rollback deixa a mesma chave disponível para uma única nova criação", async () => {
  await assert.rejects(() => db.transaction(async tx => {
    await createClientRecord(tx, actor, input);
    throw new Error("Falha simulada após gravar dependências");
  }), /Falha simulada/);
  await assertCounts(0);
  assert.equal((await create()).replayed, false);
  await assertCounts(1);
});

test("Cadastro de cliente: reenvios concorrentes em PGlite resultam em um único cadastro", async () => {
  const results = await Promise.all(Array.from({ length: 5 }, () => create()));
  assert.equal(new Set(results.map(result => result.clientId)).size, 1);
  assert.equal(new Set(results.map(result => result.boardId)).size, 1);
  assert.equal(results.filter(result => !result.replayed).length, 1);
  await assertCounts(1);
});

test("Cadastro de cliente: replay sem pasta não recria recursos removidos posteriormente", async () => {
  const first = await create();
  await db.delete(schema.boards).where(eq(schema.boards.clientId, first.clientId));
  const retry = await create();
  assert.equal(retry.clientId, first.clientId);
  assert.equal(retry.boardId, null);
  assert.equal(retry.replayed, true);
  await assertCounts(1, 0);
});

test("Cadastro de cliente: UUID da chave aceita diferenças de caixa sem novo registro", async () => {
  assert.equal(clientCreationId(actor.agencyOwnerId!, actor.id, input.requestId),
    clientCreationId(actor.agencyOwnerId!, actor.id, input.requestId.toUpperCase()));
  const first = await create();
  const retry = await create({ ...input, requestId: input.requestId.toUpperCase() });
  assert.equal(retry.clientId, first.clientId);
  await assertCounts(1);
});
