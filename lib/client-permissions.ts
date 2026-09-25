import type { WorkspaceData, Deliverable } from "./workspace-types";
export function canPlanClient(data: WorkspaceData, clientId: string) {
  const me = data.currentMember;
  return (
    me.permissions.includes("demands.create") &&
    (["manager", "admin"].includes(me.role) ||
      me.clientAccessMode === "all" ||
      data.clientMembers.some(
        (g) => g.clientId === clientId && g.memberId === me.id,
      ))
  );
}
export function canPlanTask(data: WorkspaceData, task: Deliverable) {
  const board = data.boards.find((b) => b.id === task.boardId);
  return !!board && canPlanClient(data, board.clientId);
}
export function canExecuteTask(data: WorkspaceData, task: Deliverable) {
  return (
    canPlanTask(data, task) ||
    (data.currentMember.permissions.includes("demands.execute") &&
      task.assigneeId === data.currentMember.id)
  );
}
export const assignableMembers = (data: WorkspaceData) =>
  data.members.filter(
    (m) => m.status === "active" && m.permissions.includes("demands.execute") && m.permissions.includes("clients.view"),
  );
