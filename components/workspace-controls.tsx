"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Building2, Search, FolderOpen, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { professionLabels } from "@/lib/permissions";
import type { WorkspaceData } from "@/lib/workspace-types";
import { toast } from "sonner";

export function AgencySwitcher({ data }: { data: WorkspaceData }) {
  const [open, setOpen] = useState(false), [name, setName] = useState(""), [busy, setBusy] = useState(false);
  async function act(payload: object) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign("/");
    } catch (error) { toast.error((error as Error).message); setBusy(false); }
  }
  return <div className="agency-switcher">
    <label htmlFor="agency-switch">SEU ESPAÇO</label>
    <div className="agency-switcher-row">
      <span className="agency-switcher-icon"><Building2 size={16} aria-hidden="true" /></span>
      <select id="agency-switch" aria-label="Trocar agência" value={data.agency.id} disabled={busy} onChange={event => void act({ action: "switchAgency", agencyId: event.target.value })}>
        {data.agencies.map(agency => <option key={agency.id} value={agency.id}>{agency.name}</option>)}
      </select>
      <button onClick={() => setOpen(true)} aria-label="Criar outra agência"><Plus size={16} /></button>
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Criar outra agência</DialogTitle><DialogDescription>A nova agência terá clientes, equipe e financeiro próprios.</DialogDescription></DialogHeader>
        <form className="profile-form" onSubmit={event => { event.preventDefault(); void act({ action: "createAgency", name }); }}>
          <label>Nome da agência<Input value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={100} required disabled={busy} /></label>
          <DialogFooter><Button disabled={busy || name.trim().length < 2} type="submit">{busy ? "Criando..." : "Criar agência"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}

export function ProfileDialog({ open, onOpenChange, data, reload }: { open: boolean; onOpenChange: (value: boolean) => void; data: WorkspaceData; reload: () => Promise<void> }) {
  const [name, setName] = useState(data.currentMember.name), [profession, setProfession] = useState(data.currentMember.profession), [busy, setBusy] = useState(false);
  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/auth/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, profession }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await reload(); toast.success("Perfil atualizado"); onOpenChange(false);
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader><DialogTitle>Seu perfil</DialogTitle><DialogDescription>Seu nome e profissão acompanham sua conta em todas as agências.</DialogDescription></DialogHeader>
      <form className="profile-form" onSubmit={event => { event.preventDefault(); void save(); }}>
        <label>Nome<Input value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={120} disabled={busy} /></label>
        <label>Profissão<select className="profile-select" value={profession} onChange={event => setProfession(event.target.value)} disabled={busy}>{Object.entries(professionLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <p className="profile-email">{data.currentMember.email}</p>
        <DialogFooter><Button disabled={busy || name.trim().length < 2} type="submit">{busy ? "Salvando..." : "Salvar perfil"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

export function GlobalSearch({ data, onClient, onTask }: { data: WorkspaceData; onClient: (id: string) => void; onTask: (id: string) => void }) {
  const [query, setQuery] = useState(""), [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null), containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        if (document.querySelector('[role="dialog"][data-state="open"]')) return;
        event.preventDefault(); inputRef.current?.focus(); inputRef.current?.select(); setOpen(true);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const normalize = (text: string) => text.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const term = normalize(query.trim());
  const tasks = data.deliverables.filter(task => normalize(task.title).includes(term)).slice(0, 6);
  const clients = data.clients.filter(client => normalize(client.name).includes(term)).slice(0, 4);
  function select(action: (id: string) => void, id: string) { action(id); setQuery(""); setOpen(false); inputRef.current?.blur(); }
  return <div className="global-search" ref={containerRef}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}
    onKeyDown={event => {
      if (event.key === "Escape") { inputRef.current?.focus(); setOpen(false); event.stopPropagation(); }
      if ((event.key === "ArrowDown" || event.key === "ArrowUp") && open && term) {
        const options = Array.from(containerRef.current?.querySelectorAll<HTMLButtonElement>(".search-results button:not(.search-close)") || []);
        if (!options.length) return;
        event.preventDefault();
        const index = options.indexOf(document.activeElement as HTMLButtonElement);
        options[(index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length]?.focus();
      }
    }}>
    <Search size={17} aria-hidden="true" />
    <input ref={inputRef} aria-label="Buscar clientes ou demandas" aria-keyshortcuts="Control+k Meta+k" aria-controls={open && term ? "global-search-results" : undefined} placeholder="Buscar clientes ou demandas..." value={query} onChange={event => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
    {query ? <button className="search-clear" aria-label="Limpar busca" onClick={() => { setQuery(""); inputRef.current?.focus(); }}><X size={14} /></button> : <span className="search-shortcut" aria-hidden="true"><kbd>Ctrl</kbd><kbd>K</kbd></span>}
    {term && open && <div id="global-search-results" className="search-results" role="region" aria-label="Resultados da busca">
      {!!clients.length && <p>CLIENTES</p>}
      {clients.map(client => <button key={client.id} onClick={() => select(onClient, client.id)}><FolderOpen size={16} aria-hidden="true" /><span>{client.name}</span><ArrowRight size={14} aria-hidden="true" /></button>)}
      {!!tasks.length && <p>DEMANDAS</p>}
      {tasks.map(task => <button key={task.id} onClick={() => select(onTask, task.id)}><ArrowRight size={16} aria-hidden="true" /><span>{task.title}</span></button>)}
      {!tasks.length && !clients.length && <span role="status">Nenhum resultado neste espaço.</span>}
      <button className="search-close" onClick={() => setOpen(false)}>Fechar busca</button>
    </div>}
  </div>;
}
