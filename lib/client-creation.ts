import { createHash, randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "../db/schema";
import { AppError } from "./http";
import type { Member } from "./workspace-types";

type Transaction = Parameters<Parameters<PgliteDatabase<typeof schema>["transaction"]>[0]>[0];
type ClientInput = {
  requestId?: string;
  name: string;
  handle: string;
  driveUrl: string;
  period: string;
  revenue: number;
  dueDay: number;
};
const { clients, boards, clientMembers, transactions } = schema;

// UUID v8: namespaced SHA-256, scoped to the authenticated actor and agency.
// The caller supplies only a request identifier, never an existing client ID.
export function clientCreationId(agencyId: string, memberId: string, requestId: string) {
  const bytes = createHash("sha256")
    .update(JSON.stringify(["postito/create-client/v1", agencyId, memberId, requestId.toLowerCase()]))
    .digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Must run inside the action transaction, so client, access, board and forecasts
// either commit together or roll back. A conflicting INSERT waits for the first
// transaction; only the transaction that inserted the client creates dependents.
export async function createClientRecord(db: Transaction, member: Member, payload: ClientInput) {
  const agencyId = member.agencyOwnerId;
  if (!agencyId || !member.permissions.includes("clients.manage")) throw new AppError("Você não tem permissão para criar clientes.", 403);
  if (payload.revenue > 0 && !member.permissions.includes("finance.access")) throw new AppError("Permissão financeira necessária para alterar cobranças.", 403);
  const name = payload.name.trim();
  if (!name) throw new AppError("Informe o nome do cliente.");
  const clientId = payload.requestId ? clientCreationId(agencyId, member.id, payload.requestId) : randomUUID();
  const createdAt = new Date().toISOString();
  const revenue = Math.max(0, Math.round(Number(payload.revenue) || 0));
  const dueDay = Math.max(1, Math.min(31, Math.round(Number(payload.dueDay) || 5)));
  const [inserted] = await db.insert(clients).values({
    id: clientId, agencyId, name, handle: payload.handle.trim(), driveUrl: payload.driveUrl.trim(),
    accent: ["#64745d", "#ae805b", "#6b8183", "#978362"][name.length % 4], revenue, dueDay, createdAt,
  }).onConflictDoNothing({ target: clients.id }).returning({ id: clients.id });

  if (!inserted) {
    const [existing] = await db.select({ id: clients.id }).from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.agencyId, agencyId))).limit(1);
    if (!existing || !member.permissions.includes("clients.view")) throw new AppError("Cliente não disponível.", 403);
    if (member.clientAccessMode !== "all" && !["manager", "admin"].includes(member.role)) {
      const [grant] = await db.select({ clientId: clientMembers.clientId }).from(clientMembers)
        .where(and(eq(clientMembers.clientId, clientId), eq(clientMembers.memberId, member.id))).limit(1);
      // Replaying creation must not restore a removed client grant.
      if (!grant) throw new AppError("Cliente não disponível.", 403);
    }
    const [board] = await db.select({ id: boards.id }).from(boards).where(eq(boards.clientId, clientId))
      .orderBy(asc(boards.createdAt), asc(boards.id)).limit(1);
    return { ok: true as const, clientId, boardId: board?.id ?? null, replayed: true };
  }

  const boardId = randomUUID();
  await db.insert(clientMembers).values({ clientId, memberId: member.id });
  await db.insert(boards).values({ id: boardId, clientId, title: "Planejamento de Mídia Social", period: payload.period.trim() || "Pauta atual", status: "active", createdBy: member.id, createdAt });
  if (revenue > 0) {
    const today = new Date();
    const forecasts = Array.from({ length: 12 }, (_, offset) => {
      const monthStart = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
      const dueDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(dueDay, lastDay), 12);
      const competence = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
      return { id: randomUUID(), agencyOwnerId: agencyId, type: "income" as const, amount: revenue, paidAmount: 0, category: "Mensalidades", costCenter: "Clientes", account: "Conta principal", status: "predicted" as const, competence, dueDate: dueDate.toISOString(), paymentDate: null, clientId, counterpart: name, paymentMethod: "", recurring: true, recurrence: "monthly", description: `Mensalidade — ${name}`, notes: "Previsão gerada automaticamente no cadastro do cliente.", createdBy: member.id, createdAt, updatedAt: createdAt, archivedAt: null };
    });
    await db.insert(transactions).values(forecasts);
  }
  return { ok: true as const, clientId, boardId, replayed: false };
}
