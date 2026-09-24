import { assignableMembers } from "./client-permissions";
import type { Member, WorkspaceData } from "./workspace-types";

export type TeamWorkloadRow = {
  member: Pick<Member, "id" | "name" | "profession">;
  open: number;
  dueToday: number;
  overdue: number;
};

// WorkspaceData has already been scoped by the server to this agency and viewer.
// These are visible task counts, never an estimate of someone's total capacity.
export function getTeamWorkload(data: WorkspaceData, now = new Date()): TeamWorkloadRow[] {
  const rows = assignableMembers(data).map(({ id, name, profession }) => ({
    member: { id, name, profession }, open: 0, dueToday: 0, overdue: 0,
  }));
  const byMember = new Map(rows.map(row => [row.member.id, row]));
  for (const task of data.deliverables) {
    if (task.status === "approved" || !task.assigneeId) continue;
    const row = byMember.get(task.assigneeId);
    if (!row) continue;
    row.open++;
    const deadline = new Date(task.dueAt);
    if (!Number.isFinite(deadline.getTime())) continue;
    if (deadline.getFullYear() === now.getFullYear() && deadline.getMonth() === now.getMonth() && deadline.getDate() === now.getDate()) row.dueToday++;
    if (deadline.getTime() < now.getTime()) row.overdue++;
  }
  return rows.sort((a, b) => a.open - b.open || a.member.name.localeCompare(b.member.name, "pt-BR"));
}

const searchable = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

export function filterTeamWorkload(rows: TeamWorkloadRow[], query: string, profession: string) {
  const search = searchable(query.trim());
  return rows.filter(row => (!profession || row.member.profession === profession) && searchable(row.member.name).includes(search));
}
