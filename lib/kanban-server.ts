import { and, eq, inArray, isNull } from "drizzle-orm";
import type { getDb } from "../db";
import { boards, clients, crmDeals, crmLeads, deliverables, kanbanBoards, agencyMemberships, members } from "../db/schema";
import { AppError } from "./http";
import { defaultKanbanColumns, kanbanScopeKey, type KanbanBoardConfig, type KanbanColumn, type KanbanKind } from "./kanban";

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
export type KanbanScope = { agencyId: string; kind: KanbanKind; clientId?: string | null };

/** Every card mutation takes this lock before reading/writing the card. A list
 * edit can therefore never race a move/create and leave an orphan column ID. */
export async function lockKanbanBoard(db: Transaction, scope: KanbanScope) {
  const clientId = scope.kind === "demands" ? scope.clientId ?? null : null;
  if (scope.kind === "demands" && !clientId) throw new AppError("Informe o cliente do quadro.");
  const id = kanbanScopeKey(scope.agencyId, scope.kind, clientId);
  const [created] = await db.insert(kanbanBoards).values({ id, agencyId: scope.agencyId, kind: scope.kind, clientId, revision: 0, columns: defaultKanbanColumns(scope.kind), updatedAt: new Date().toISOString() }).onConflictDoNothing({ target: kanbanBoards.id }).returning({ id: kanbanBoards.id });
  const [config] = await db.select().from(kanbanBoards).where(eq(kanbanBoards.id, id)).limit(1).for("update");
  if (!config) throw new AppError("Quadro não disponível.", 409);
  // Initializes legacy or fixture rows only once. Persisted empty boards never
  // get defaults again, and an explicit null thereafter always means Sem lista.
  if (created) {
    if (scope.kind === "demands") {
      await db.update(deliverables).set({ columnId: deliverables.status }).where(and(isNull(deliverables.columnId), inArray(deliverables.boardId, db.select({ id: boards.id }).from(boards).where(eq(boards.clientId, clientId!)))));
    } else if (scope.kind === "crmLeads") {
      await db.update(crmLeads).set({ columnId: crmLeads.status }).where(and(eq(crmLeads.agencyOwnerId, scope.agencyId), isNull(crmLeads.columnId)));
    } else if (scope.kind === "crmDeals") {
      await db.update(crmDeals).set({ columnId: crmDeals.stage }).where(and(eq(crmDeals.agencyOwnerId, scope.agencyId), isNull(crmDeals.columnId)));
    } else {
      await db.update(clients).set({ columnId: clients.status }).where(and(eq(clients.agencyId, scope.agencyId), isNull(clients.columnId)));
    }
  }
  return config;
}

export async function lockDemandKanban(db: Transaction, agencyId: string, deliverableId: string) {
  const [context] = await db.select({ clientId: boards.clientId }).from(deliverables).innerJoin(boards, eq(boards.id, deliverables.boardId)).innerJoin(clients, eq(clients.id, boards.clientId)).where(and(eq(deliverables.id, deliverableId), eq(clients.agencyId, agencyId))).limit(1);
  if (!context) throw new AppError("Demanda não disponível.", 404);
  const config = await lockKanbanBoard(db, { agencyId, kind: "demands", clientId: context.clientId });
  const [task] = await db.select().from(deliverables).where(eq(deliverables.id, deliverableId)).limit(1).for("update");
  if (!task) throw new AppError("Demanda não disponível.", 404);
  return { config, task };
}

export function resolveKanbanPlacement(config: Pick<KanbanBoardConfig, "columns">, current: { columnId: string | null; status: string } | null, request: { columnId?: string | null; status?: string }, initialStatus: string) {
  let status = request.status ?? current?.status ?? initialStatus;
  if (request.columnId !== undefined) {
    if (request.columnId === null) return { columnId: null, status };
    const column = config.columns.find(item => item.id === request.columnId);
    if (!column) throw new AppError("Esta lista foi removida ou pertence a outro quadro. Atualize o quadro e tente novamente.", 409);
    if (column.status && request.status && column.status !== request.status) throw new AppError("A lista e a situação informadas são incompatíveis.");
    status = column.status ?? status;
    return { columnId: column.id, status };
  }
  if (current) {
    const previous = config.columns.find(column => column.id === current.columnId);
    // Changing the business state does not discard a custom-list organization.
    const columnId = request.status && previous?.status
      ? config.columns.find(column => column.status === status)?.id ?? null
      : previous?.id ?? null;
    return { columnId, status };
  }
  const column = config.columns.find(item => item.status === initialStatus) ?? config.columns.find(item => item.status === null);
  return { columnId: column?.id ?? null, status };
}

export async function saveKanbanColumns(db: Transaction, scope: KanbanScope, input: { expectedRevision: number; columns: KanbanColumn[]; moves: { fromColumnId: string; toColumnId: string | null }[] }) {
  const config = await lockKanbanBoard(db, scope);
  if (config.revision !== input.expectedRevision) throw new AppError("As listas foram alteradas em outra edição. Seu rascunho foi mantido. Carregue a versão atual antes de salvar.", 409);
  const ids = new Set(input.columns.map(column => column.id));
  if (ids.size !== input.columns.length) throw new AppError("Cada lista precisa ter um identificador único.");
  for (const column of input.columns) {
    const existing = config.columns.find(item => item.id === column.id);
    if (existing ? existing.status !== column.status : column.status !== null) throw new AppError("A situação original da lista deve ser preservada; novas listas são personalizadas.");
    if (!existing && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(column.id)) throw new AppError("Identificador da nova lista inválido.");
    if (scope.kind !== "demands" && (column.assigneeId || column.dueHours || column.nextColumnId)) throw new AppError("O fluxo de responsáveis pertence às demandas.");
    if (column.nextColumnId === column.id) throw new AppError("Escolha outra lista como próxima etapa.");
    if (column.assigneeId) await validateWorkflowAssignee(db, scope.agencyId, column.assigneeId);
  }
  const removed = config.columns.filter(column => !ids.has(column.id));
  if (input.moves.length !== removed.length || new Set(input.moves.map(move => move.fromColumnId)).size !== removed.length || input.moves.some(move => !removed.some(column => column.id === move.fromColumnId) || (move.toColumnId !== null && !ids.has(move.toColumnId)))) {
    throw new AppError("Defina uma lista de destino ou Sem lista para cada lista removida.");
  }
  for (const move of input.moves) {
    // Reorganization never deletes cards, changes approvals or closes sales.
    if (scope.kind === "demands") {
      await db.update(deliverables).set({ columnId: move.toColumnId }).where(and(eq(deliverables.columnId, move.fromColumnId), inArray(deliverables.boardId, db.select({ id: boards.id }).from(boards).where(eq(boards.clientId, scope.clientId!)))));
    } else if (scope.kind === "crmLeads") {
      await db.update(crmLeads).set({ columnId: move.toColumnId }).where(and(eq(crmLeads.agencyOwnerId, scope.agencyId), eq(crmLeads.columnId, move.fromColumnId)));
    } else if (scope.kind === "crmDeals") {
      await db.update(crmDeals).set({ columnId: move.toColumnId }).where(and(eq(crmDeals.agencyOwnerId, scope.agencyId), eq(crmDeals.columnId, move.fromColumnId)));
    } else {
      await db.update(clients).set({ columnId: move.toColumnId }).where(and(eq(clients.agencyId, scope.agencyId), eq(clients.columnId, move.fromColumnId)));
    }
  }
  const revision = config.revision + 1;
  const columns = input.columns.map(column => column.nextColumnId && !ids.has(column.nextColumnId) ? { ...column, nextColumnId: null } : column);
  await db.update(kanbanBoards).set({ columns, revision, updatedAt: new Date().toISOString() }).where(eq(kanbanBoards.id, config.id));
  return { ok: true, revision };
}

export async function validateWorkflowAssignee(db: Transaction, agencyId: string, memberId: string) {
  const [row] = await db.select({ membership: agencyMemberships, accountStatus: members.status }).from(agencyMemberships).innerJoin(members, eq(members.id, agencyMemberships.memberId)).where(and(eq(agencyMemberships.agencyId, agencyId), eq(agencyMemberships.memberId, memberId))).limit(1);
  const member = row?.membership;
  if (!member || member.status !== "active" || row.accountStatus !== "active" || member.role === "viewer" || (!["manager", "admin"].includes(member.role) && (!member.permissions.includes("demands.execute") || !member.permissions.includes("clients.view")))) throw new AppError("O responsável da etapa não está disponível. Peça à agência para ajustar o fluxo.", 409);
}
