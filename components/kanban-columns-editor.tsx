"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { defaultKanbanColumns, type KanbanBoardConfig, type KanbanColumn } from "@/lib/kanban";

const palette = ["#DFEEFF", "#E6E7FD", "#DFF3EB", "#F9E6EF", "#D9E8B9", "#FCE8BE", "#E7EBEF"];

export function KanbanMoveSelect({ columns, value, onChange, label, disabled = false, disabledColumnIds = [] }: {
  columns: KanbanColumn[];
  value: string | null;
  onChange(value: string | null): void;
  label: string;
  disabled?: boolean;
  disabledColumnIds?: string[];
}) {
  return <label className="mt-3 block text-xs font-medium text-slate-600">
    <span className="mb-1 block">Lista</span>
    <select aria-label={label} disabled={disabled} value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60">
      <option value="">Sem lista</option>
      {columns.map((column) => <option key={column.id} value={column.id} disabled={disabledColumnIds.includes(column.id)}>{column.name}</option>)}
    </select>
  </label>;
}

export function KanbanColumnsEditor({ config, postAction, counts = {} }: {
  config: KanbanBoardConfig;
  postAction(payload: object, success?: string): Promise<unknown>;
  counts?: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const [base, setBase] = useState(config);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [destinations, setDestinations] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const removed = base.columns.filter((column) => !columns.some((current) => current.id === column.id));
  const stale = open && config.revision !== base.revision;

  function loadCurrent() {
    setBase(config);
    setColumns(config.columns.map((column) => ({ ...column })));
    setDestinations({});
    setError("");
  }
  function change(id: string, patch: Partial<KanbanColumn>) {
    setColumns((current) => current.map((column) => column.id === id ? { ...column, ...patch } : column));
  }
  function move(index: number, direction: -1 | 1) {
    setColumns((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  }
  async function save() {
    if (columns.some((column) => !column.name.trim())) { setError("Dê um nome a cada lista antes de salvar."); return; }
    setSaving(true);
    setError("");
    try {
      await postAction({
        action: "saveKanbanColumns", kind: base.kind, clientId: base.clientId,
        expectedRevision: base.revision, columns: columns.map((column) => ({ ...column, name: column.name.trim() })),
        moves: removed.map((column) => ({ fromColumnId: column.id, toColumnId: columns.some((current) => current.id === destinations[column.id]) ? destinations[column.id] : null })),
      }, "Listas atualizadas");
      setOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar as listas. Seu rascunho foi mantido."); }
    finally { setSaving(false); }
  }
  return <>
    <Button variant="outline" className="rounded-xl" onClick={() => { loadCurrent(); setOpen(true); }}><Settings className="size-4" />Personalizar listas</Button>
    <Dialog open={open} onOpenChange={(next) => { if (!saving) setOpen(next); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" onPointerDownOutside={(event) => { if (saving) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>Personalizar listas</DialogTitle>
          <DialogDescription>Altere nomes, cores e ordem. Remover listas preserva todos os cartões.</DialogDescription>
        </DialogHeader>
        <fieldset disabled={saving} className="min-w-0 space-y-4">
          <div className="space-y-3" data-kanban-editor-rows>
            {columns.map((column, index) => <div key={column.id} data-kanban-editor-row={column.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <span aria-hidden className="size-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: column.color }} />
                <label className="min-w-0 flex-1 basis-[calc(100%-1.25rem)] sm:basis-auto"><span className="sr-only">Nome da lista {index + 1}</span><Input aria-label={`Nome da lista ${index + 1}`} maxLength={60} value={column.name} onChange={(event) => change(column.id, { name: event.target.value })} /></label>
                <div className="ml-auto flex shrink-0 gap-1">
                <Button type="button" size="icon" variant="ghost" disabled={index === 0} aria-label={`Mover ${column.name || "lista"} para cima`} onClick={() => move(index, -1)}><ArrowUp className="size-4" /></Button>
                <Button type="button" size="icon" variant="ghost" disabled={index === columns.length - 1} aria-label={`Mover ${column.name || "lista"} para baixo`} onClick={() => move(index, 1)}><ArrowDown className="size-4" /></Button>
                <Button type="button" size="icon" variant="ghost" aria-label={`Remover lista ${column.name || index + 1}`} onClick={() => setColumns((current) => current.filter((item) => item.id !== column.id))}><Trash2 className="size-4" /></Button>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">{column.status ? `Ao mover: ${defaultKanbanColumns(base.kind).find((item) => item.status === column.status)?.name || column.status}.` : "Mantém a situação atual do cartão."}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs text-slate-500">Cor</span>
                {palette.map((color) => <button key={color} type="button" aria-label={`Cor ${color} para ${column.name || `lista ${index + 1}`}`} aria-pressed={color.toLowerCase() === column.color.toLowerCase()} onClick={() => change(column.id, { color })} style={{ backgroundColor: color }} className={`size-7 rounded-full border border-black/10 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${color.toLowerCase() === column.color.toLowerCase() ? "ring-2 ring-slate-600 ring-offset-2" : ""}`} />)}
                <input type="color" aria-label={`Cor personalizada de ${column.name || `lista ${index + 1}`}`} value={column.color} onChange={(event) => change(column.id, { color: event.target.value.toUpperCase() })} className="size-8 cursor-pointer rounded border border-slate-200 bg-white p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2" />
              </div>
            </div>)}
          </div>
          {!columns.length && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">Nenhuma lista. Os cartões ficam em Sem lista até você organizá-los novamente.</p>}
          <div className="flex flex-wrap justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => setColumns((current) => [...current, { id: crypto.randomUUID(), name: "Nova lista", color: palette[current.length % palette.length], status: null }])}><Plus className="size-4" />Adicionar lista</Button>
            {columns.length > 0 && <Button type="button" variant="ghost" onClick={() => setColumns([])}>Remover todas as listas</Button>}
          </div>
          {removed.length > 0 && <div className="space-y-3 rounded-xl bg-slate-50 p-4">
            <h3 className="text-sm font-semibold">Destino dos cartões das listas removidas</h3>
            <p className="text-xs leading-relaxed text-slate-500">Os cartões e seus históricos serão mantidos. O resultado de aprovação, venda ou situação do cliente também é preservado.</p>
            {removed.map((column) => <label key={column.id} className="block text-sm"><span className="mb-1 block">{column.name}{counts[column.id] !== undefined ? ` (${counts[column.id]} cartões visíveis)` : ""}</span><select aria-label={`Destino de ${column.name}`} value={columns.some((current) => current.id === destinations[column.id]) ? destinations[column.id] ?? "" : ""} onChange={(event) => setDestinations((current) => ({ ...current, [column.id]: event.target.value || null }))} className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 outline-none focus-visible:ring-2 focus-visible:ring-primary"><option value="">Sem lista</option>{columns.map((current) => <option key={current.id} value={current.id}>{current.name}</option>)}</select></label>)}
          </div>}
        </fieldset>
        {stale && <div role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">Outra pessoa alterou estas listas. Seu rascunho foi mantido. <Button variant="link" className="h-auto p-0 text-amber-950" disabled={saving} onClick={() => { if (window.confirm("Descartar seu rascunho e carregar as listas atuais?")) loadCurrent(); }}>Carregar versão atual</Button></div>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <DialogFooter><Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={saving || stale} onClick={save}>{saving ? "Salvando…" : "Salvar listas"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
