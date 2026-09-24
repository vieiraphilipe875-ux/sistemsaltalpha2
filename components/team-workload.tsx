"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { professionLabels } from "@/lib/permissions";
import { filterTeamWorkload, getTeamWorkload } from "@/lib/team-workload";
import type { WorkspaceData } from "@/lib/workspace-types";

type Props = { data: WorkspaceData; onCreateTask?: (assigneeId?: string) => void };

const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function TeamWorkload({ data, onCreateTask }: Props) {
  const localTimeReady = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);
  const [query, setQuery] = useState("");
  const [profession, setProfession] = useState("");
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
                    <span className="flex items-center gap-3">
                      <span className="picker-avatar shrink-0" aria-hidden="true">{member.name.trim().slice(0, 1).toLocaleUpperCase("pt-BR")}</span>
                      <span className="max-w-56 break-words">{member.name}</span>
                    </span>
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
    </section>
  );
}
