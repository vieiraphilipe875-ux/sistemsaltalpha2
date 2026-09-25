"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { professionLabels } from "@/lib/permissions";
import { filterTeamWorkload, getTeamWorkload, memberWorkDays } from "@/lib/team-workload";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { WorkspaceData } from "@/lib/workspace-types";

type Props = { data: WorkspaceData; onCreateTask?: (assigneeId?: string) => void; onOpenTask?: (id:string)=>void };

const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function TeamWorkload({ data, onCreateTask, onOpenTask }: Props) {
  const localTimeReady = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);
  const [query, setQuery] = useState("");
  const [profession, setProfession] = useState("");
  const [selectedMember,setSelectedMember]=useState<string|null>(null);
  const [includeApproved,setIncludeApproved]=useState(false);
  const selected=data.members.find(m=>m.id===selectedMember);
  const days=selectedMember?memberWorkDays(data,selectedMember,includeApproved):[];
  const headingId = useId();
  const scopeId = useId();
  const rows = getTeamWorkload(data);
  const professions = [...new Set(rows.map(row => row.member.profession))].sort((a, b) => (professionLabels[a] || a).localeCompare(professionLabels[b] || b, "pt-BR"));
  const selectedProfession = professions.includes(profession) ? profession : "";
  const visible = filterTeamWorkload(rows, query, selectedProfession);
  return (
    <section className="workspace-panel min-w-0 overflow-hidden" aria-labelledby={headingId}>
      <div className="panel-heading">
        <div>
          <h2 id={headingId}>Carga da equipe</h2>
          <p id={scopeId}>Considera as demandas que você pode visualizar nesta agência.</p>
        </div>
        <span className="panel-icon"><Users className="size-[18px]" aria-hidden="true" /></span>
      </div>
      <div className="flex flex-col gap-3 border-b border-border px-5 pb-4 sm:flex-row sm:items-end sm:px-6">
        <label className="min-w-0 flex-1 text-sm font-medium">
          Buscar colaborador
          <span className="relative mt-2 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input className="pl-9" aria-label="Buscar colaborador na carga da equipe" placeholder="Nome do colaborador" value={query} onChange={event => setQuery(event.target.value)} />
          </span>
        </label>
        <label className="text-sm font-medium sm:w-56">
          Profissão
          <select className="mt-2 block min-h-10 w-full rounded-xl border border-input bg-white px-3 py-2 text-base font-normal sm:text-sm" aria-label="Filtrar profissão da equipe" value={selectedProfession} onChange={event => setProfession(event.target.value)}>
            <option value="">Todas as profissões</option>
            {professions.map(value => <option key={value} value={value}>{professionLabels[value] || value}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs text-muted-foreground sm:px-6">
        <span aria-live="polite">{visible.length} {visible.length === 1 ? "colaborador" : "colaboradores"}</span>
        <span>Menor quantidade em aberto primeiro</span>
      </div>
      {visible.length ? (
        <div className="relative overflow-x-auto" role="region" aria-label="Tabela de carga da equipe" tabIndex={0}>
          <table className="w-full min-w-[720px] text-left text-sm" aria-label="Carga de demandas por colaborador" aria-describedby={scopeId}>
            <thead className="border-y border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium sm:px-6">Colaborador</th>
                <th scope="col" className="px-4 py-3 font-medium">Profissão</th>
                <th scope="col" className="px-4 py-3 text-center font-medium">Em aberto</th>
                <th scope="col" className="px-4 py-3 text-center font-medium">Com prazo hoje</th>
                <th scope="col" className="px-4 py-3 text-center font-medium">Atrasadas</th>
                {onCreateTask && <th scope="col" className="px-5 py-3 text-right font-medium sm:px-6"><span className="sr-only">Ações</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map(({ member, open, dueToday, overdue }) => (
                <tr key={member.id} className="hover:bg-muted/30">
                  <th scope="row" className="px-5 py-4 font-medium sm:px-6">
                    <button className="flex items-center gap-3 rounded-lg text-left underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring" aria-label={`Ver agenda de ${member.name}`} onClick={()=>{setSelectedMember(member.id);setIncludeApproved(false);}}>
                      <span className="picker-avatar shrink-0" aria-hidden="true">{member.name.trim().slice(0, 1).toLocaleUpperCase("pt-BR")}</span>
                      <span className="max-w-56 break-words">{member.name}</span>
                    </button>
                  </th>
                  <td className="px-4 py-4 text-muted-foreground">{professionLabels[member.profession] || member.profession}</td>
                  <td className="px-4 py-4 text-center"><span className="inline-flex min-w-8 justify-center rounded-lg bg-[var(--brand-sky)] px-2 py-1 font-semibold tabular-nums">{open}</span></td>
                  <td className="px-4 py-4 text-center tabular-nums"><span aria-label={localTimeReady ? undefined : "Aguardando horário local"}>{localTimeReady ? dueToday : "-"}</span></td>
                  <td className="px-4 py-4 text-center tabular-nums"><span aria-label={localTimeReady ? undefined : "Aguardando horário local"} className={localTimeReady && overdue ? "inline-flex min-w-8 justify-center rounded-lg bg-[var(--brand-rose)] px-2 py-1 font-semibold" : "text-muted-foreground"}>{localTimeReady ? overdue : "-"}</span></td>
                  {onCreateTask && <td className="px-5 py-4 text-right sm:px-6"><Button size="sm" variant="outline" aria-label={`Nova demanda para ${member.name}`} onClick={() => onCreateTask(member.id)}><Plus aria-hidden="true" />Nova demanda</Button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="workspace-empty compact">
          <strong>{rows.length ? "Nenhum colaborador encontrado" : "Nenhum colaborador disponível"}</strong>
          <p>{rows.length ? "Tente outro nome ou profissão." : "Esta lista mostra pessoas ativas com permissão para visualizar clientes e produzir demandas."}</p>
          {(query || selectedProfession) && <Button variant="outline" onClick={() => { setQuery(""); setProfession(""); }}>Limpar filtros</Button>}
        </div>
      )}
      <p className="border-t border-border px-5 py-4 text-xs leading-relaxed text-muted-foreground sm:px-6">Cada demanda conta uma vez, inclusive carrosséis. Aprovadas ficam fora das contagens. Uma demanda vencida hoje aparece em Com prazo hoje e Atrasadas. Zero indica ausência de demandas abertas visíveis; não representa uma capacidade máxima.</p>
      <Dialog open={Boolean(selected)} onOpenChange={open=>{if(!open)setSelectedMember(null);}}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Agenda de {selected?.name}</DialogTitle><DialogDescription>Demandas atribuídas, agrupadas pelo dia da entrega. Horários no seu fuso local.</DialogDescription></DialogHeader>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeApproved} onChange={e=>setIncludeApproved(e.target.checked)} />Incluir aprovadas</label>
          <div className="space-y-3">{days.map((group,index)=><details key={group.day} open={index===0} className="rounded-xl border bg-white"><summary className="cursor-pointer rounded-xl bg-muted/50 p-4 text-sm font-semibold">{new Date(`${group.day}T12:00:00`).toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})} · {group.tasks.length} {group.tasks.length===1?"demanda":"demandas"}</summary><div className="divide-y">{group.tasks.map(task=><button key={task.id} disabled={!onOpenTask} onClick={()=>{setSelectedMember(null);onOpenTask?.(task.id);}} className="block w-full p-4 text-left hover:bg-muted/30"><div className="flex items-start justify-between gap-3"><strong className="min-w-0 break-words text-sm">{task.title}</strong><time dateTime={task.dueAt} className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold">{new Date(task.dueAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</time></div><p className="mt-1 break-words text-xs text-muted-foreground">{task.client} · {task.stage}{task.approved?" · Aprovada":""}</p><p className="mt-2 text-xs text-muted-foreground">Atribuída por {task.assignedBy}</p>{task.priority==="urgent"&&<span className="mt-2 inline-block rounded bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Urgente</span>}</button>)}</div></details>)}</div>
          {!days.length&&<p className="py-6 text-sm text-muted-foreground">Nenhuma demanda {includeApproved?"":"aberta "}visível para este colaborador.</p>}
        </DialogContent>
      </Dialog>
    </section>
  );
}
