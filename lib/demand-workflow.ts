import type { getDb } from "../db";
import { taskNotifications } from "../db/schema";
import type { KanbanBoardConfig } from "./kanban";
import { validateWorkflowAssignee } from "./kanban-server";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];
type Task = {
  id: string;
  assigneeId: string | null;
  columnId: string | null;
  priority: string;
  dueAt: string;
  status: string;
};

/** Called under the board/task lock. Entering a stage applies its configured handoff. */
export async function stageAssignment(
  db: Transaction,
  agencyId: string,
  config: Pick<KanbanBoardConfig, "columns">,
  columnId: string | null,
) {
  const column = config.columns.find((item) => item.id === columnId);
  if (column?.assigneeId)
    await validateWorkflowAssignee(db, agencyId, column.assigneeId);
  return {
    ...(column?.assigneeId ? { assigneeId: column.assigneeId } : {}),
    ...(column?.dueHours && column.status !== "approved"
      ? {
          dueAt: new Date(
            Date.now() + column.dueHours * 3_600_000,
          ).toISOString(),
        }
      : {}),
  };
}

export async function notifyDemand(
  db: Transaction,
  agencyId: string,
  next: Task,
  previous?: Task,
) {
  if (!next.assigneeId) return;
  const assigned = !previous || next.assigneeId !== previous.assigneeId;
  const moved =
    previous &&
    (next.columnId !== previous.columnId || next.status !== previous.status);
  const urgent =
    next.status !== "approved" &&
    next.priority === "urgent" &&
    (assigned || moved || previous?.priority !== "urgent");
  const due = previous && next.dueAt !== previous.dueAt;
  if (!assigned && !moved && !urgent && !due) return;
  const kind = urgent
    ? "urgent"
    : assigned
      ? "assignment"
      : moved
        ? "stage"
        : "deadline";
  const message = urgent
    ? "Demanda urgente para você. Confira o prazo."
    : assigned
      ? "Uma demanda foi atribuída a você."
      : moved
        ? next.status === "approved"
          ? "Demanda aprovada."
          : "A demanda chegou à sua etapa."
        : "O prazo desta demanda foi atualizado.";
  await db
    .insert(taskNotifications)
    .values({
      id: crypto.randomUUID(),
      agencyId,
      memberId: next.assigneeId,
      deliverableId: next.id,
      kind,
      message,
      createdAt: new Date().toISOString(),
      readAt: null,
    });
}
