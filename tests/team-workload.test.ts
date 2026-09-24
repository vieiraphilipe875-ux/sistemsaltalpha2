import assert from "node:assert/strict";
import { test } from "node:test";
import { filterTeamWorkload, getTeamWorkload } from "../lib/team-workload";
import type { Deliverable, Member, WorkspaceData } from "../lib/workspace-types";

const now = new Date("2026-09-24T12:00:00Z");
function member(id: string, fields: Partial<Member> = {}): Member {
  return { id, name: id, email: `${id}@example.invalid`, profession: "designer", role: "editor", status: "active", permissions: ["clients.view", "demands.execute"], agencyOwnerId: "agency-visible", clientAccessMode: "selected", createdAt: now.toISOString(), ...fields };
}
function task(id: string, fields: Partial<Deliverable> = {}): Deliverable {
  return { id, boardId: "board-visible", title: `Demanda ${id}`, kind: "carousel", slideCount: 12, hasStoriesVersion: true, status: "production", assigneeId: "ana", dueAt: "2026-09-25T12:00:00Z", notes: "", sourceUrl: "", sortOrder: 0, createdAt: now.toISOString(), updatedAt: now.toISOString(), slides: [], assets: [], attachments: [], references: [], ...fields };
}
function workspace(members: Member[], deliverables: Deliverable[]): WorkspaceData {
  return {
    agency: { id: "agency-visible", name: "Agência fixture", role: "manager" }, agencies: [], currentMember: members[0], members, deliverables,
    clients: [], boards: [], clientMembers: [], memberPermissions: [], activity: [], annotations: [], invites: [], transactions: [], financeWorkers: [], workerCompetencies: [], financialDocuments: [], crmLeads: [], crmDeals: [], crmActivities: [],
  };
}

// Each scenario uses only in-memory authorized workspace fixtures; no database or network.
test("Carga da equipe: cada demanda vale uma unidade; aprovadas e não atribuídas não entram", () => {
  const data = workspace([member("ana")], [
    ...["briefing", "production", "review", "changes"].map((status, index) => task(String(index), { status: status as Deliverable["status"], slideCount: 20 })),
    task("approved", { status: "approved", dueAt: "2026-09-20T12:00:00Z" }),
    task("unassigned", { assigneeId: null }),
  ]);
  assert.deepEqual(getTeamWorkload(data, now), [{ member: { id: "ana", name: "ana", profession: "designer" }, open: 4, dueToday: 0, overdue: 0 }]);
  assert.equal(data.deliverables[0].slideCount, 20);
});

test("Carga da equipe: usa elegibilidade por permissão, incluindo zero, e exclui inativos", () => {
  const members = [
    member("ana"), member("bruno", { profession: "video_editor" }),
    member("inativo", { status: "inactive" }), member("pendente", { status: "pending" }),
    member("sem-leitura", { permissions: ["demands.execute"] }),
    member("sem-producao", { permissions: ["clients.view"] }),
  ];
  const rows = getTeamWorkload(workspace(members, members.map(person => task(person.id, { assigneeId: person.id })).filter(item => item.assigneeId !== "bruno")), now);
  assert.deepEqual(rows.map(row => [row.member.id, row.open]), [["bruno", 0], ["ana", 1]]);
});

test("Carga da equipe: reatribuir transfere a contagem e aprovar retira da carga", () => {
  const members = [member("ana"), member("bruno")];
  const item = task("transfer");
  const before = getTeamWorkload(workspace(members, [item]), now);
  assert.equal(before.find(row => row.member.id === "ana")?.open, 1);
  const after = getTeamWorkload(workspace(members, [{ ...item, assigneeId: "bruno" }]), now);
  assert.equal(after.find(row => row.member.id === "ana")?.open, 0);
  assert.equal(after.find(row => row.member.id === "bruno")?.open, 1);
  assert(getTeamWorkload(workspace(members, [{ ...item, assigneeId: "bruno", status: "approved" }]), now).every(row => row.open === 0));
  assert.equal(item.assigneeId, "ana", "O cálculo não deve alterar a tarefa original");
});

test("Carga da equipe: prazo de hoje usa calendário local; atraso exige prazo anterior ao instante atual", () => {
  const previousTZ = process.env.TZ;
  process.env.TZ = "America/Sao_Paulo";
  try {
    const localNow = new Date("2026-09-24T03:30:00Z");
    const data = workspace([member("ana")], [
      task("previous-local-day", { dueAt: "2026-09-24T02:59:59Z" }),
      task("today-midnight", { dueAt: "2026-09-24T03:00:00Z" }),
      task("exact-now", { dueAt: localNow.toISOString() }),
      task("end-local-day", { dueAt: "2026-09-25T02:59:59Z" }),
      task("next-local-day", { dueAt: "2026-09-25T03:00:00Z" }),
      task("approved-today", { status: "approved", dueAt: "2026-09-24T03:00:00Z" }),
    ]);
    const [row] = getTeamWorkload(data, localNow);
    assert.equal(row.open, 5);assert.equal(row.dueToday, 3);assert.equal(row.overdue, 2);
  } finally {if (previousTZ === undefined) delete process.env.TZ; else process.env.TZ = previousTZ;}
});

test("Carga da equipe: dia local com mudança de horário não vira janela fixa de 24 horas", () => {
  const previousTZ = process.env.TZ;
  process.env.TZ = "America/New_York";
  try {
    const data = workspace([member("ana")], [
      task("yesterday", { dueAt: "2026-11-01T03:59:59Z" }),
      task("midnight", { dueAt: "2026-11-01T04:00:00Z" }),
      task("late-today", { dueAt: "2026-11-02T04:59:59Z" }),
      task("tomorrow", { dueAt: "2026-11-02T05:00:00Z" }),
    ]);
    const [row] = getTeamWorkload(data, new Date("2026-11-01T23:30:00Z"));
    assert.equal(row.dueToday, 2);assert.equal(row.overdue, 2);
  } finally {if (previousTZ === undefined) delete process.env.TZ; else process.env.TZ = previousTZ;}
});

test("Carga da equipe: conta apenas o conjunto autorizado e ignora responsável fora da agência", () => {
  const visible = task("visible");
  const hidden = task("not-in-authorized-payload");
  const unrelated = task("foreign-member", { assigneeId: "member-other-agency" });
  const members = [member("ana")];
  assert.equal(getTeamWorkload(workspace(members, [visible, hidden]), now)[0].open, 2);
  const [row] = getTeamWorkload(workspace(members, [visible, unrelated]), now);
  assert.equal(row.open, 1);
  assert.deepEqual(Object.keys(row.member).sort(), ["id", "name", "profession"]);
});

test("Carga da equipe: prazo inválido não inventa urgência e não remove demanda aberta", () => {
  const [row] = getTeamWorkload(workspace([member("ana")], [task("missing", { dueAt: "" }), task("invalid", { dueAt: "invalid" })]), now);
  assert.equal(row.open, 2);assert.equal(row.dueToday, 0);assert.equal(row.overdue, 0);
});

test("Carga da equipe: combina busca por nome e profissão sem atribuir capacidade por cargo", () => {
  const rows = getTeamWorkload(workspace([member("ana", { name: "Ána Oliveira" }), member("bruno", { name: "Bruno Nunes", profession: "video_editor" })], []), now);
  assert.equal(filterTeamWorkload(rows, " ANA ", "designer")[0].member.id, "ana");
  assert.equal(filterTeamWorkload(rows, "ana", "video_editor").length, 0);
  assert.equal(filterTeamWorkload(rows, "", "video_editor")[0].member.id, "bruno");
  assert.equal(filterTeamWorkload(rows, "", "").length, 2);
  assert(rows.every(row => row.open === 0));
});
