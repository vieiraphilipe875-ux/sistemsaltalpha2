import { assignableMembers } from "./client-permissions";
import type { Member, WorkspaceData } from "./workspace-types";
import { getKanbanBoard } from "./kanban";

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

export function memberWorkDays(data:WorkspaceData, memberId:string, includeApproved=false) {
  const groups=new Map<string,{day:string;tasks:{id:string;title:string;dueAt:string;client:string;assignedBy:string;stage:string;priority:string;approved:boolean}[]}>();
  for(const task of data.deliverables) {
    if(task.assigneeId!==memberId || (!includeApproved && task.status==="approved"))continue;
    const date=new Date(task.dueAt);
    if(!Number.isFinite(date.getTime()))continue;
    const day=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    const board=data.boards.find(b=>b.id===task.boardId);
    const client=data.clients.find(c=>c.id===board?.clientId);
    const stage=getKanbanBoard(data.kanbanBoards,"demands",client?.id).columns.find(c=>c.id===task.columnId)?.name||"Sem lista";
    if(!groups.has(day))groups.set(day,{day,tasks:[]});
    groups.get(day)!.tasks.push({id:task.id,title:task.title,dueAt:task.dueAt,client:client?.name||"Cliente",assignedBy:data.members.find(m=>m.id===task.assignedById)?.name||"Não registrado",stage,priority:task.priority||"normal",approved:task.status==="approved"});
  }
  return [...groups.values()].sort((a,b)=>a.day.localeCompare(b.day)).map(group=>({...group,tasks:group.tasks.sort((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt))}));
}
