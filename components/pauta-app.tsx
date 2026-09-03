"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Edit3,
  Eye,
  EyeOff,
  FileArchive,
  FileImage,
  FileText,
  Film,
  FolderOpen,
  GripVertical,
  Grid2X2,
  ImagePlus,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trash2,
  Upload,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent, AttachmentTitle, AttachmentDescription, AttachmentTrigger } from "@/components/ui/attachment";
import type { Annotation, CrmDeal, CrmLead, Deliverable, Member, WorkspaceData } from "@/lib/workspace-types";
import { effectivePermissions, hasPermission, rolePermissionDefaults, type PermissionKey } from "@/lib/permissions";
import { logout } from "@/app/actions/auth";

type View = "dashboard" | "clients" | "team" | "crm" | "finance";

const statusMeta = {
  briefing: { label: "Briefing", className: "bg-slate-100 text-slate-700" },
  production: { label: "Em produção", className: "bg-blue-50 text-blue-700" },
  review: { label: "Em revisão", className: "bg-amber-50 text-amber-800" },
  changes: { label: "Alterações", className: "bg-rose-50 text-rose-700" },
  approved: { label: "Aprovado", className: "bg-emerald-50 text-emerald-700" },
} as const;

const kindMeta = {
  carousel: { label: "Carrossel", icon: Grid2X2 },
  reels: { label: "Reels", icon: Film },
  stories: { label: "Stories", icon: FileImage },
  static: { label: "Estático", icon: FileText },
} as const;

function permissionsFor(data: WorkspaceData, member: Member) {
  return effectivePermissions(member.role, data.memberPermissions.filter((row) => row.memberId === member.id).map((row) => row.permission));
}

async function readApiResponse(response: Response) {
  const text = await response.text();
  if (!text) return {} as Record<string, any>;
  try { return JSON.parse(text) as Record<string, any>; }
  catch { return { error: response.status === 413 ? "O arquivo é grande demais. Envie uma imagem de até 10 MB." : text }; }
}

const permissionOptions: { key: PermissionKey; label: string; description: string }[] = [
  { key: "clients.view", label: "Clientes e pautas", description: "Visualiza os clientes liberados e suas demandas." },
  { key: "clients.manage", label: "Gerenciar clientes", description: "Cadastra clientes, pastas e links do Drive." },
  { key: "demands.create", label: "Social media", description: "Cria, distribui, edita e remove demandas." },
  { key: "demands.execute", label: "Produção", description: "Executa somente as demandas atribuídas à pessoa." },
  { key: "crm.access", label: "CRM comercial", description: "Acessa leads, oportunidades e atividades comerciais." },
  { key: "finance.access", label: "Financeiro", description: "Acessa movimentações, equipe financeira e relatórios." },
];

function firstName(name: string) {
  return name.split(/[\s@]/).filter(Boolean)[0] || "você";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function deadline(item: Deliverable) {
  if (item.status === "approved") return { label: "Concluída", tone: "done" as const, hours: Infinity };
  const diff = new Date(item.dueAt).getTime() - Date.now();
  const hours = diff / 3_600_000;
  if (hours < 0) return { label: `${Math.max(1, Math.ceil(Math.abs(hours)))}h atrasada`, tone: "late" as const, hours };
  if (hours <= 24) return { label: hours < 1 ? "vence em menos de 1h" : `vence em ${Math.ceil(hours)}h`, tone: "urgent" as const, hours };
  if (hours <= 48) return { label: "vence amanhã", tone: "soon" as const, hours };
  return { label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(item.dueAt)).replace(".", ""), tone: "normal" as const, hours };
}

function dueClass(tone: ReturnType<typeof deadline>["tone"]) {
  return tone === "late" ? "text-rose-600 bg-rose-50" : tone === "urgent" ? "text-orange-700 bg-orange-50" : tone === "soon" ? "text-amber-700 bg-amber-50" : tone === "done" ? "text-emerald-700 bg-emerald-50" : "text-slate-600 bg-slate-100";
}

export function PautaApp({ initialData }: { initialData: WorkspaceData }) {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<View>("dashboard");
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [activeDeliverableId, setActiveDeliverableId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [, setClock] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  async function reload() {
    const response = await fetch("/api/workspace", { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível atualizar os dados.");
    setData(await response.json());
  }

  async function postAction(payload: object, success?: string) {
    const response = await fetch("/api/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await readApiResponse(response);
    if (!response.ok) throw new Error(result.error || "Não foi possível salvar.");
    await reload();
    if (success) toast.success(success);
    return result;
  }

  const me = data.currentMember;
  const myExplicitPermissions = data.memberPermissions.filter((row) => row.memberId === me.id).map((row) => row.permission);
  const myPermissions = effectivePermissions(me.role, myExplicitPermissions);
  const canPlan = myPermissions.includes("demands.create");
  const canSeeClients = myPermissions.includes("clients.view");
  const canManageClients = myPermissions.includes("clients.manage");
  const canSeeCrm = myPermissions.includes("crm.access");
  const canSeeFinance = myPermissions.includes("finance.access");
  const executeOnly = myPermissions.includes("demands.execute") && !canPlan;
  const myTasks = useMemo(() => data.deliverables.filter((item) => canPlan || item.assigneeId === me.id), [data.deliverables, me.id, canPlan]);
  const visibleTasks = useMemo(() => myTasks.filter((item) => item.title.toLowerCase().includes(search.toLowerCase())), [myTasks, search]);
  const urgent = myTasks.filter((item) => ["late", "urgent"].includes(deadline(item).tone));
  const activeDeliverable = data.deliverables.find((item) => item.id === activeDeliverableId) ?? null;
  const activeClient = data.clients.find((client) => client.id === activeClientId) ?? null;

  const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: executeOnly ? "Minhas demandas" : "Visão geral", icon: LayoutDashboard },
    ...(canSeeClients ? [{ id: "clients" as View, label: "Clientes e pautas", icon: Grid2X2 }] : []),
    ...(canSeeCrm ? [{ id: "crm" as View, label: "CRM comercial", icon: Briefcase }] : []),
    ...(canSeeFinance ? [{ id: "finance" as View, label: "Financeiro", icon: Wallet }] : []),
    ...(["manager", "admin"].includes(me.role) ? [{ id: "team" as View, label: "Gerenciar acessos", icon: Users }] : []),
  ];

  function navigate(next: View) {
    setView(next);
    setActiveClientId(null);
    setMobileMenu(false);
  }

  return (
    <div className="min-h-screen bg-[#f3f5f7] text-[#15181d]">
      <aside className={`fixed inset-y-0 left-0 z-40 w-[248px] bg-[#12151a] text-white transition-transform lg:translate-x-0 ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col p-4">
          <div className="flex h-14 items-center justify-between px-2">
            <button onClick={() => navigate("dashboard")} className="flex items-center gap-3 text-left" aria-label="Ir para o início">
              <span className="grid size-9 place-items-center rounded-xl bg-[#ffd84d] font-black text-[#16181c]">P</span>
              <span><strong className="block text-[15px] tracking-tight">Pauta</strong><span className="block text-[11px] text-white/45">Gestão de conteúdo</span></span>
            </button>
            <Button variant="ghost" size="icon-sm" className="text-white/60 hover:bg-white/10 hover:text-white lg:hidden" onClick={() => setMobileMenu(false)}><X /></Button>
          </div>

          <nav className="mt-7 space-y-1" aria-label="Navegação principal">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => navigate(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${view === id && !activeClientId ? "bg-white text-[#16181c]" : "text-white/62 hover:bg-white/7 hover:text-white"}`}>
                <Icon className="size-[18px]" />{label}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/8 bg-white/[0.045] p-3">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#6e5eff] text-xs font-bold">{initials(me.name)}</span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold leading-tight">{me.name}</span>
                <span className="block text-xs font-medium text-white/45">{me.role === "manager" ? "Gerente da agência" : me.role === "admin" ? "Administrador de acessos" : me.role === "social" ? "Social media" : me.role === "copywriter" ? "Redator(a)" : me.role === "video_editor" ? "Estúdio de vídeo" : me.role === "client" ? "Cliente" : me.role === "collaborator" ? "Colaborador(a)" : "Designer"}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-1 border-t border-white/10 pt-3">
              <Button variant="ghost" size="icon-sm" className="text-white/50 hover:bg-white/10 hover:text-white" onClick={() => toast.info("Configurações da conta em breve!")}><Settings /></Button>
              <form action={logout}><Button variant="ghost" size="icon-sm" type="submit" className="text-white/50 hover:bg-white/10 hover:text-white"><LogOut /></Button></form>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/60 bg-white/70 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
          <Button variant="ghost" size="icon-sm" className="-ml-2 lg:hidden" onClick={() => setMobileMenu(true)}><Menu /></Button>
          <div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pautas..." className="h-9 w-full rounded-full border-slate-200 bg-slate-50 pl-9 text-sm" /></div>
          {urgent.length > 0 && <button onClick={() => navigate("dashboard")} className="relative grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:text-slate-900"><Bell className="size-[18px]" /><span className="absolute right-2 top-2 size-2 rounded-full bg-rose-500 ring-2 ring-white" /></button>}
        </header>
        <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
          {view === "dashboard" && me.role === "client" && <ClientPortal data={data} onOpen={setActiveDeliverableId} />}
          {view === "dashboard" && !activeClientId && me.role !== "client" && (executeOnly ? <Clients data={data} onOpenClient={setActiveClientId} /> : <Dashboard data={data} tasks={visibleTasks} urgent={urgent} onOpen={setActiveDeliverableId} onClient={(id) => { setView("clients"); setActiveClientId(id); }} />)}
          {view === "dashboard" && activeClientId && executeOnly && <ClientBoard data={data} client={activeClient} onBack={() => setActiveClientId(null)} onOpen={setActiveDeliverableId} postAction={postAction} />}
          {view === "clients" && !activeClientId && <Clients data={data} onOpenClient={setActiveClientId} onCreate={canManageClients ? () => setCreateClientOpen(true) : undefined} postAction={canManageClients ? postAction : undefined} />}
          {view === "clients" && activeClient && <ClientBoard data={data} client={activeClient} onBack={() => setActiveClientId(null)} onOpen={setActiveDeliverableId} onCreate={canPlan ? () => setCreateTaskOpen(true) : undefined} postAction={postAction} />}
          {view === "crm" && canSeeCrm && <CrmWorkspace data={data} postAction={postAction} />}
          {view === "finance" && canSeeFinance && <FinanceView data={data} postAction={postAction} />}
          {view === "team" && ["manager", "admin"].includes(me.role) && <Team data={data} onInvite={() => setInviteOpen(true)} postAction={postAction} />}
        </div>
      </main>

      <TaskSheet key={activeDeliverableId ?? "closed"} data={data} item={activeDeliverable} open={Boolean(activeDeliverable)} onOpenChange={(open) => !open && setActiveDeliverableId(null)} postAction={postAction} reload={reload} />
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} data={data} postAction={postAction} />
      <CreateTaskDialog open={createTaskOpen} onOpenChange={setCreateTaskOpen} data={data} defaultClientId={activeClientId} postAction={postAction} />
      <CreateClientDialog open={createClientOpen} onOpenChange={setCreateClientOpen} postAction={postAction} />
    </div>
  );
}

function Dashboard({ data, tasks, urgent, onOpen, onClient }: { data: WorkspaceData; tasks: Deliverable[]; urgent: Deliverable[]; onOpen(id: string): void; onClient(id: string): void }) {
  const active = tasks.filter((item) => item.status !== "approved");
  const review = tasks.filter((item) => ["review", "changes"].includes(item.status));
  const approved = tasks.filter((item) => item.status === "approved");
  const prioritized = [...tasks].filter((item) => item.status !== "approved").sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()).slice(0, 7);
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return <>
    <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-semibold capitalize text-slate-500">{today}</p><h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] sm:text-[38px]">Boa tarde, {firstName(data.currentMember.name)}.</h1><p className="mt-2 text-[15px] text-slate-500">Aqui está o que precisa da sua atenção agora.</p></div>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"><ListFilter className="size-4" />Ordenado por urgência</div>
    </section>

    {urgent.length > 0 && <section className="mt-7 flex items-center gap-4 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3.5 sm:px-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-500 text-white"><AlertCircle className="size-5" /></span>
      <div className="min-w-0 flex-1"><p className="font-semibold text-orange-950">{urgent.length} {urgent.length === 1 ? "demanda precisa" : "demandas precisam"} de atenção</p><p className="mt-0.5 text-sm text-orange-800/75">O alerta aparece automaticamente nas 24 horas anteriores ao prazo.</p></div>
      <Button variant="outline" className="hidden rounded-xl border-orange-200 bg-white text-orange-900 hover:bg-orange-100 sm:inline-flex" onClick={() => onOpen(urgent[0].id)}>Ver prioridade<ChevronRight /></Button>
    </section>}

    {permissionsFor(data, data.currentMember).includes("demands.create") && review.length > 0 && (
      <section className="mt-7 overflow-hidden rounded-[20px] border border-amber-200 bg-white shadow-sm ring-4 ring-amber-50">
        <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/50 px-5 py-4">
          <div><h2 className="font-bold tracking-tight text-amber-900">Aguardando sua aprovação</h2><p className="mt-0.5 text-xs text-amber-700">Estas demandas voltaram da equipe e precisam do seu aval.</p></div>
          <MessageCircle className="size-6 text-amber-500" />
        </div>
        <div className="divide-y divide-slate-100">
          {review.map((item) => <TaskRow key={item.id} item={item} data={data} onOpen={onOpen} />)}
        </div>
      </section>
    )}

    <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Metric label="Em andamento" value={active.length} hint="demandas abertas" icon={CircleDot} tone="dark" />
      <Metric label="Em revisão" value={review.length} hint="aguardando retorno" icon={MessageCircle} tone="amber" />
      <Metric label="Aprovadas" value={approved.length} hint="nesta pauta" icon={CheckCircle2} tone="green" />
      <Metric label="Clientes" value={data.clients.length} hint="na sua carteira" icon={Users} tone="violet" />
    </section>

    <section className="mt-8 grid gap-6 xl:grid-cols-[1.55fr_.85fr]">
      <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold tracking-tight">Próximas entregas</h2><p className="mt-0.5 text-xs text-slate-500">A ordem muda conforme o prazo se aproxima</p></div><CalendarClock className="size-5 text-slate-400" /></div>
        <div className="divide-y divide-slate-100">
          {prioritized.map((item) => <TaskRow key={item.id} item={item} data={data} onOpen={onOpen} />)}
          {!prioritized.length && <div className="px-5 py-12 text-center text-sm text-slate-500">Nenhuma demanda encontrada.</div>}
        </div>
      </div>
      <div className="rounded-[20px] border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between"><div><h2 className="font-bold tracking-tight">Clientes ativos</h2><p className="mt-0.5 text-xs text-slate-500">Progresso da pauta atual</p></div><Sparkles className="size-5 text-[#6e5eff]" /></div>
        <div className="mt-5 space-y-5">
          {data.clients.map((client) => {
            const boardIds = data.boards.filter((board) => board.clientId === client.id).map((board) => board.id);
            const clientTasks = data.deliverables.filter((item) => boardIds.includes(item.boardId));
            const done = clientTasks.filter((item) => item.status === "approved").length;
            const progress = clientTasks.length ? Math.round((done / clientTasks.length) * 100) : 0;
            return <button key={client.id} onClick={() => onClient(client.id)} className="block w-full text-left group">
              <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl text-xs font-bold text-white" style={{ background: client.accent }}>{initials(client.name)}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between"><p className="truncate text-sm font-semibold">{client.name}</p><span className="text-xs font-semibold text-slate-500">{progress}%</span></div><p className="mt-0.5 text-xs text-slate-500">{clientTasks.length - done} pendentes · {done} aprovadas</p></div></div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: client.accent }} /></div>
            </button>;
          })}
        </div>
      </div>
    </section>
  </>;
}

function DesignerBoard({ data, tasks, onOpen, postAction }: { data: WorkspaceData; tasks: Deliverable[]; onOpen(id: string): void; postAction(payload: object, success?: string): Promise<unknown> }) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [over, setOver] = useState<"production" | "review" | null>(null);
  const openTasks = tasks.filter((item) => item.status !== "approved");
  const groups: { key: "todo" | "production" | "review"; label: string; hint: string; statuses: Deliverable["status"][] }[] = [
    { key: "todo", label: "Para fazer", hint: "Briefings e alterações recebidas", statuses: ["briefing", "changes"] },
    { key: "production", label: "Em produção", hint: "O que você está criando agora", statuses: ["production"] },
    { key: "review", label: "Enviadas para revisão", hint: "Aguardando retorno da pauta", statuses: ["review"] },
  ];
  async function move(status: "production" | "review") {
    if (!draggingId) return;
    try { await postAction({ action: "updateDeliverable", id: draggingId, status }, status === "review" ? "Demanda enviada para revisão" : "Demanda iniciada"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível mover a demanda"); }
    finally { setDraggingId(null); setOver(null); }
  }
  return <>
    <PageHeader eyebrow="Seu painel" title={`Olá, ${firstName(data.currentMember.name)}.`} description="Aqui aparecem somente as demandas atribuídas a você." />
    <div className="mt-6 flex flex-wrap gap-3"><span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">{openTasks.length} demandas abertas</span><span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500">Arraste para iniciar ou enviar para revisão</span></div>
    <div className="mt-7 grid gap-5 xl:grid-cols-3">{groups.map((group) => {
      const items = openTasks.filter((item) => group.statuses.includes(item.status));
      const droppable = group.key !== "todo";
      return <section key={group.key} onDragOver={droppable ? (event) => { event.preventDefault(); setOver(group.key); } : undefined} onDragLeave={() => setOver(null)} onDrop={droppable ? (event) => { event.preventDefault(); void move(group.key); } : undefined} className={`min-h-[420px] rounded-[22px] border p-4 transition ${over === group.key ? "border-[#6e5eff] bg-violet-50 ring-4 ring-violet-100" : "border-slate-200 bg-slate-100/65"}`}><div className="flex items-start justify-between"><div><h2 className="font-bold">{group.label}</h2><p className="mt-1 text-xs text-slate-500">{group.hint}</p></div><span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-600 shadow-sm">{items.length}</span></div><div className="mt-4 space-y-3">{items.map((item) => <CompactTask key={item.id} item={item} data={data} onOpen={onOpen} draggable onDragStart={() => setDraggingId(item.id)} onDragEnd={() => { setDraggingId(null); setOver(null); }} />)}{!items.length && <div className="grid min-h-28 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 text-center text-xs leading-5 text-slate-400">{droppable ? "Arraste uma demanda para esta etapa" : "Nenhuma demanda aguardando você"}</div>}</div></section>;
    })}</div>
  </>;
}

function Metric({ label, value, hint, icon: Icon, tone }: { label: string; value: number; hint: string; icon: typeof CircleDot; tone: "dark" | "amber" | "green" | "violet" }) {
  const color = tone === "dark" ? "bg-[#171a1f] text-white" : tone === "amber" ? "bg-amber-100 text-amber-700" : tone === "green" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700";
  return <article className="rounded-[18px] border border-slate-200 bg-white p-4 sm:p-5"><div className={`grid size-9 place-items-center rounded-xl ${color}`}><Icon className="size-[18px]" /></div><p className="mt-5 text-3xl font-bold tracking-[-0.04em]">{value}</p><p className="mt-1 text-sm font-semibold">{label}</p><p className="mt-0.5 text-xs text-slate-500">{hint}</p></article>;
}

function TaskRow({ item, data, onOpen }: { item: Deliverable; data: WorkspaceData; onOpen(id: string): void }) {
  const board = data.boards.find((row) => row.id === item.boardId);
  const client = data.clients.find((row) => row.id === board?.clientId);
  const assignee = data.members.find((row) => row.id === item.assigneeId);
  const due = deadline(item);
  const Icon = kindMeta[item.kind].icon;
  return <button onClick={() => onOpen(item.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 sm:gap-4 sm:px-5">
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><Icon className="size-[18px]" /></span>
    <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{item.title}</p>{item.status === "changes" && <span className="size-2 shrink-0 rounded-full bg-rose-500" />}</div><p className="mt-1 text-xs text-slate-500">{client?.name} · {kindMeta[item.kind].label}{item.slideCount > 1 ? ` · ${item.slideCount} fatias` : ""}</p></div>
    <span className={`hidden rounded-lg px-2.5 py-1.5 text-xs font-semibold sm:block ${statusMeta[item.status].className}`}>{statusMeta[item.status].label}</span>
    <div className="hidden items-center sm:flex"><span title={assignee?.name} className="grid size-8 place-items-center rounded-full bg-[#6557e8] text-[10px] font-bold text-white ring-2 ring-white">{initials(assignee?.name ?? "Sem responsável")}</span></div>
    <span className={`min-w-[92px] rounded-lg px-2.5 py-1.5 text-center text-[11px] font-semibold ${dueClass(due.tone)}`}>{due.label}</span>
    <ChevronRight className="size-4 shrink-0 text-slate-300" />
  </button>;
}

function Clients({ data, onOpenClient, onCreate, postAction }: { data: WorkspaceData; onOpenClient(id: string): void; onCreate?: () => void; postAction?: (payload: object, success?: string) => Promise<unknown> }) {
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "prospecting">("active");
  const statuses = [
    { key: "active" as const, label: "Ativos" },
    { key: "inactive" as const, label: "Inativos" },
    { key: "prospecting" as const, label: "Prospecção" },
  ];
  const visibleClients = data.clients.filter((client) => client.status === statusFilter);

  async function changeStatus(client: WorkspaceData["clients"][number], status: "active" | "inactive") {
    if (!postAction || client.status === status) return;
    try {
      await postAction({ action: "updateClientStatus", id: client.id, status }, status === "active" ? `${client.name} está ativo novamente` : `${client.name} foi movido para inativos`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o cliente");
    }
  }

  async function removeClient(client: WorkspaceData["clients"][number]) {
    if (!postAction || client.status !== "inactive") return;
    if (!confirm(`Excluir ${client.name} definitivamente? As pautas, demandas e arquivos desse cliente também serão removidos.`)) return;
    try {
      await postAction({ action: "deleteClient", id: client.id }, `${client.name} foi excluído`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o cliente");
    }
  }

  return <><PageHeader eyebrow="Carteira" title="Clientes" description="Cada cliente concentra suas pautas, responsáveis e arquivos finais." action={onCreate ? <Button className="rounded-xl bg-[#171a1f]" onClick={onCreate}><Plus />Novo cliente</Button> : undefined} />
    <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 sm:w-fit">{statuses.map((status) => <button key={status.key} type="button" onClick={() => setStatusFilter(status.key)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${statusFilter === status.key ? "bg-[#171a1f] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>{status.label}<span className={`ml-2 rounded-md px-1.5 py-0.5 text-[10px] ${statusFilter === status.key ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>{data.clients.filter((client) => client.status === status.key).length}</span></button>)}</div>
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleClients.map((client) => {
      const boards = data.boards.filter((board) => board.clientId === client.id);
      const ids = boards.map((board) => board.id);
      const tasks = data.deliverables.filter((item) => ids.includes(item.boardId));
      const urgent = tasks.filter((item) => ["late", "urgent"].includes(deadline(item).tone)).length;
      return <article key={client.id} className={`group relative isolate overflow-hidden rounded-[20px] border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/45 ${client.status === "inactive" ? "border-slate-200 opacity-80" : "border-slate-200 hover:border-slate-300"}`}>
        <button type="button" onClick={() => onOpenClient(client.id)} className="block w-full text-left">
          <div className="relative z-0 h-28 bg-slate-100">{client.bannerUrl ? <img src={client.bannerUrl} alt={`Banner de ${client.name}`} className={`h-full w-full object-cover ${client.status === "inactive" ? "grayscale" : ""}`} /> : <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${client.accent}, #171a1f)` }} />}<Badge className={`absolute right-3 top-3 rounded-lg ${client.status === "active" ? "bg-emerald-500 text-white" : client.status === "inactive" ? "bg-slate-700 text-white" : "bg-amber-400 text-slate-900"}`}>{client.status === "active" ? "Ativo" : client.status === "inactive" ? "Inativo" : "Prospecção"}</Badge></div>
          <div className="relative z-10 p-5 pb-4 pt-11"><div className="flex items-start justify-between"><span className="absolute left-5 top-0 z-20 grid size-16 -translate-y-1/2 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-white font-bold text-white shadow-lg ring-1 ring-black/10">{client.avatarUrl ? <img src={client.avatarUrl} alt={client.name} className="block h-full w-full object-contain opacity-100" /> : <span className="grid h-full w-full place-items-center" style={{ background: client.accent }}>{initials(client.name)}</span>}</span><span aria-hidden="true" className="size-16 shrink-0" /><ChevronRight className="size-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-600" /></div>
          <h2 className="mt-3 text-lg font-bold tracking-tight">{client.name}</h2><p className="mt-1 text-sm text-slate-500">{client.handle || "Sem @ cadastrado"}</p>{client.revenue > 0 && <p className="mt-2 text-sm font-bold text-emerald-700">{money(client.revenue)} <span className="font-medium text-slate-400">· vence dia {client.dueDay}</span></p>}
          <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4"><Badge variant="secondary" className="rounded-lg">{tasks.length} demandas</Badge>{urgent > 0 && <Badge className="rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-50">{urgent} urgentes</Badge>}</div></div>
        </button>
        {postAction && <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3"><Button variant="ghost" size="sm" className={client.status === "inactive" ? "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800" : "text-slate-600"} onClick={() => changeStatus(client, client.status === "inactive" ? "active" : "inactive")}>{client.status === "inactive" ? <CheckCircle2 className="size-4" /> : <UserMinus className="size-4" />}{client.status === "inactive" ? "Reativar" : "Inativar"}</Button>{client.status === "inactive" && <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => removeClient(client)}><Trash2 className="size-4" />Excluir</Button>}</div>}
      </article>;
    })}</div>
    {!visibleClients.length && <div className="mt-5 rounded-[20px] border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center text-sm text-slate-500">Nenhum cliente nesta categoria.</div>}
  </>;
}

function ClientBoard({ data, client, onBack, onOpen, onCreate, postAction }: { data: WorkspaceData; client: WorkspaceData["clients"][number]; onBack(): void; onOpen(id: string): void; onCreate?: () => void; postAction(payload: object, success?: string): Promise<unknown> }) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<Deliverable["status"] | null>(null);
  const [driveOpen, setDriveOpen] = useState(false);
  const [driveUrl, setDriveUrl] = useState(client.driveUrl);
  const [mediaBusy, setMediaBusy] = useState<"avatar" | "banner" | null>(null);
  
  const boards = data.boards.filter((board) => board.clientId === client.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>(boards[0]?.id);
  
  useEffect(() => {
    if (!selectedBoardId && boards.length > 0) setSelectedBoardId(boards[0].id);
    else if (selectedBoardId && !boards.some(b => b.id === selectedBoardId)) setSelectedBoardId(boards[0]?.id);
  }, [boards, selectedBoardId]);

  const activeBoard = boards.find(b => b.id === selectedBoardId);
  const tasks = data.deliverables.filter((item) => item.boardId === selectedBoardId);
  const currentPermissions = permissionsFor(data, data.currentMember);
  const canManageClient = currentPermissions.includes("clients.manage");
  const groups: { key: Deliverable["status"]; label: string }[] = [{ key: "briefing", label: "Briefing" }, { key: "production", label: "Em produção" }, { key: "review", label: "Em revisão" }, { key: "changes", label: "Alterações" }, ...(!currentPermissions.includes("demands.execute") || currentPermissions.includes("demands.create") ? [{ key: "approved" as const, label: "Aprovadas" }] : [])];
  
  const [createBoardOpen, setCreateBoardOpen] = useState(false);

  async function move(status: Deliverable["status"]) {
    if (!draggingId) return;
    try { await postAction({ action: "updateDeliverable", id: draggingId, status }, `Demanda movida para ${statusMeta[status].label}`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível mover a demanda"); }
    finally { setDraggingId(null); setOverStatus(null); }
  }
  async function changeClientMedia(kind: "avatar" | "banner", file: File) {
    try { setMediaBusy(kind); const response = await fetch(`/api/clients/${client.id}/media?kind=${kind}`, { method: "PUT", headers: { "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) }, body: file }); const result = await readApiResponse(response); if (!response.ok) throw new Error(result.error || "Falha ao enviar imagem"); await postAction({ action: "updateClient", id: client.id, driveUrl }, kind === "avatar" ? "Foto atualizada" : "Banner atualizado"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao enviar imagem"); }
    finally { setMediaBusy(null); }
  }
  async function removeClientMedia(kind: "avatar" | "banner") {
    try { setMediaBusy(kind); const response = await fetch(`/api/clients/${client.id}/media?kind=${kind}`, { method: "DELETE" }); const result = await readApiResponse(response); if (!response.ok) throw new Error(result.error || "Falha ao remover imagem"); await postAction({ action: "updateClient", id: client.id, driveUrl }, kind === "avatar" ? "Foto removida" : "Banner removido"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao remover imagem"); }
    finally { setMediaBusy(null); }
  }
  return <>
    <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="size-4" />Todos os clientes</button>
    <div className="relative isolate mb-5 h-52 overflow-hidden rounded-[24px] bg-slate-200 shadow-sm">
      {client.bannerUrl
        ? <img src={client.bannerUrl} alt={`Banner de ${client.name}`} className="absolute inset-0 z-0 h-full w-full object-cover" />
        : <div className="absolute inset-0 z-0" style={{ background: `linear-gradient(120deg, ${client.accent}, #171a1f)` }} />}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/65 to-transparent" />
      <div className="absolute bottom-5 left-5 z-20 flex items-center gap-4 text-white">
        <span className="relative z-30 grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-white text-xl font-black shadow-xl ring-1 ring-black/10">
          {client.avatarUrl
            ? <img src={client.avatarUrl} alt={client.name} className="block h-full w-full object-contain opacity-100" />
            : <span className="grid h-full w-full place-items-center text-white" style={{ background: client.accent }}>{initials(client.name)}</span>}
        </span>
        <div><h1 className="text-2xl font-black">{client.name}</h1><p className="text-sm text-white/80">{client.handle}</p></div>
      </div>
    </div>
    <PageHeader eyebrow={activeBoard?.period ?? "Pauta atual"} title={client.name} description={`${client.handle} · ${activeBoard?.title ?? "Planejamento de conteúdo"}`} action={<div className="flex gap-2">{client.driveUrl && <Button asChild variant="outline" className="rounded-xl bg-white"><a href={client.driveUrl} target="_blank" rel="noreferrer"><FolderOpen />Abrir Drive</a></Button>}{canManageClient && <Button variant="outline" size="icon" className="rounded-xl bg-white" onClick={() => { setDriveUrl(client.driveUrl || ""); setDriveOpen(true); }} title="Personalizar link do Drive"><Settings className="size-4 text-slate-500" /></Button>}{onCreate && <Button className="rounded-xl bg-[#171a1f]" onClick={onCreate}><Plus />Nova demanda</Button>}</div>} />
    
    <div className="mt-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
          <SelectTrigger className="w-64 rounded-xl font-bold bg-white"><SelectValue placeholder="Selecione uma pasta/mês" /></SelectTrigger>
          <SelectContent>
            {boards.map(b => <SelectItem key={b.id} value={b.id}>{b.period} · {b.title}</SelectItem>)}
          </SelectContent>
        </Select>
        {canManageClient && (
          <Button variant="outline" size="sm" onClick={() => setCreateBoardOpen(true)} className="rounded-xl bg-white"><Plus className="size-4 mr-1" /> Nova Pasta</Button>
        )}
      </div>
      <p className="flex items-center gap-2 text-xs font-medium text-slate-500"><GripVertical className="size-4" />Arraste as demandas para atualizar o status.</p>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-5">{groups.map((group) => {
      const items = tasks.filter((item) => item.status === group.key);
      return <section key={group.key} onDragOver={(event) => { event.preventDefault(); setOverStatus(group.key); }} onDragLeave={() => setOverStatus((current) => current === group.key ? null : current)} onDrop={(event) => { event.preventDefault(); void move(group.key); }} className={`min-w-0 rounded-[18px] p-1.5 transition ${overStatus === group.key ? "bg-[#6e5eff]/8 ring-2 ring-[#6e5eff]/25" : ""}`}><div className="flex items-center justify-between px-1.5"><h2 className="text-sm font-bold">{group.label}</h2><span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-xs font-semibold text-slate-600">{items.length}</span></div><div className="mt-3 space-y-3">{items.map((item) => <CompactTask key={item.id} item={item} data={data} onOpen={onOpen} draggable onDragStart={() => setDraggingId(item.id)} onDragEnd={() => { setDraggingId(null); setOverStatus(null); }} />)}{!items.length && <div className="rounded-2xl border border-dashed border-slate-250 px-3 py-7 text-center text-xs text-slate-400">Solte uma demanda aqui</div>}</div></section>;
    })}</div>
    <Dialog open={driveOpen} onOpenChange={setDriveOpen}><DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-2xl"><DialogHeader><DialogTitle>Personalizar {client.name}</DialogTitle><DialogDescription>Atualize a identidade visual e a pasta de arquivos do cliente.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-semibold">Pasta de fotos / Drive</label><div className="relative"><FolderOpen className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={driveUrl} onChange={(event) => setDriveUrl(event.target.value)} placeholder="https://drive.google.com/drive/folders/..." className="rounded-xl pl-9" /></div></div><div><p className="mb-2 text-sm font-semibold">Foto do cliente</p><div className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100">{client.avatarUrl ? <img src={client.avatarUrl} alt={client.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-slate-400">Sem foto</div>}{mediaBusy === "avatar" && <span className="absolute inset-0 grid place-items-center bg-black/50 text-xs font-bold text-white">Salvando...</span>}</div><div className="mt-2 grid grid-cols-2 gap-2"><label className="flex cursor-pointer items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-bold"><Upload className="size-3.5" />{client.avatarUrl ? "Trocar" : "Adicionar"}<input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void changeClientMedia("avatar", file); event.currentTarget.value = ""; }} /></label>{client.avatarUrl && <Button variant="outline" size="sm" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => removeClientMedia("avatar")} disabled={Boolean(mediaBusy)}><Trash2 className="size-3.5" />Remover</Button>}</div></div><div><p className="mb-2 text-sm font-semibold">Banner do cliente</p><div className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100">{client.bannerUrl ? <img src={client.bannerUrl} alt={`Banner de ${client.name}`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-slate-400">Sem banner</div>}{mediaBusy === "banner" && <span className="absolute inset-0 grid place-items-center bg-black/50 text-xs font-bold text-white">Salvando...</span>}</div><div className="mt-2 grid grid-cols-2 gap-2"><label className="flex cursor-pointer items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-bold"><Upload className="size-3.5" />{client.bannerUrl ? "Trocar" : "Adicionar"}<input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void changeClientMedia("banner", file); event.currentTarget.value = ""; }} /></label>{client.bannerUrl && <Button variant="outline" size="sm" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => removeClientMedia("banner")} disabled={Boolean(mediaBusy)}><Trash2 className="size-3.5" />Remover</Button>}</div></div></div><DialogFooter><Button variant="ghost" onClick={() => setDriveOpen(false)}>Fechar</Button><Button className="rounded-xl bg-[#171a1f]" onClick={async () => { try { await postAction({ action: "updateClient", id: client.id, driveUrl }, "Pasta do Drive salva"); setDriveOpen(false); } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao salvar o Drive"); } }}>Salvar link</Button></DialogFooter></DialogContent></Dialog>
    {createBoardOpen && <CreateBoardDialog open={createBoardOpen} onOpenChange={setCreateBoardOpen} clientId={client.id} postAction={async (p,s) => { const r: any = await postAction(p,s); if (r?.boardId) setSelectedBoardId(r.boardId); }} />}
  </>;
}

function CreateBoardDialog({ open, onOpenChange, clientId, postAction }: { open: boolean; onOpenChange(open: boolean): void; clientId: string; postAction(payload: object, success?: string): Promise<unknown> }) {
  const [period, setPeriod] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      const date = new Date();
      const month = date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace(".", "");
      setPeriod(`${month} • ${date.getFullYear()}`);
    }
  }, [open]);

  async function submit() { try { setSaving(true); await postAction({ action: "createBoard", clientId, period }, "Pasta criada"); onOpenChange(false); } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao criar"); } finally { setSaving(false); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>Nova Pasta (Mês)</DialogTitle><DialogDescription>Crie uma nova pasta para organizar as demandas.</DialogDescription></DialogHeader><div className="grid gap-4"><div><label className="mb-1.5 block text-sm font-semibold">Período / Nome da Pasta</label><Input value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="Ex.: OUT • 2026" className="rounded-xl" /></div></div><DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button className="rounded-xl bg-[#171a1f]" disabled={saving || !period.trim()} onClick={submit}>{saving ? "Criando..." : "Criar pasta"}</Button></DialogFooter></DialogContent></Dialog>;
}

function CompactTask({ item, data, onOpen, draggable = false, onDragStart, onDragEnd }: { item: Deliverable; data: WorkspaceData; onOpen(id: string): void; draggable?: boolean; onDragStart?: () => void; onDragEnd?: () => void }) {
  const assignee = data.members.find((member) => member.id === item.assigneeId);
  const due = deadline(item);
  return <article draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd} className={`group relative rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/40 ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}><button onClick={() => onOpen(item.id)} className="w-full p-4 text-left"><div className="flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{kindMeta[item.kind].label}{item.slideCount > 1 ? ` · ${item.slideCount}` : ""}</span>{draggable ? <GripVertical className="size-4 text-slate-300" /> : <MoreHorizontal className="size-4 text-slate-300" />}</div><h3 className="mt-3 line-clamp-3 text-sm font-semibold leading-5">{item.title}</h3><div className="mt-4 flex items-end justify-between gap-2"><span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${dueClass(due.tone)}`}>{due.label}</span><span className="grid size-7 place-items-center rounded-full bg-[#6557e8] text-[9px] font-bold text-white">{initials(assignee?.name ?? "Sem")}</span></div></button></article>;
}

function Team({ data, onInvite, postAction }: { data: WorkspaceData; onInvite(): void; postAction(payload: object, success?: string): Promise<unknown> }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = data.members.find((member) => member.id === editingId) ?? null;
  const [role, setRole] = useState<Member["role"]>("designer");
  const [status, setStatus] = useState<"pending" | "active" | "inactive">("active");
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<PermissionKey[]>(rolePermissionDefaults.designer);
  const [clientAccessMode, setClientAccessMode] = useState<"all" | "selected">("selected");
  const [clientSearch, setClientSearch] = useState("");
  const [saving, setSaving] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  function openMember(id: string) {
    const member = data.members.find((row) => row.id === id);
    if (!member) return;
    setEditingId(id); setRole(member.role); setStatus(member.status); setPassword(""); setShowPassword(false); setPermissions(permissionsFor(data, member)); setClientAccessMode(member.clientAccessMode); setClientSearch(""); setClientIds(data.clientMembers.filter((row) => row.memberId === id).map((row) => row.clientId));
  }
  async function save() {
    if (!editing) return;
    try { 
      setSaving(true); 
      const payload: any = { action: "updateMember", id: editing.id, role, status, clientIds, permissions, clientAccessMode };
      if (password.trim()) payload.password = password.trim();
      await postAction(payload, "Acessos atualizados"); 
      setEditingId(null); 
    }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao atualizar acessos"); }
    finally { setSaving(false); }
  }
  async function deactivate(memberId: string) {
    const member = data.members.find(m => m.id === memberId);
    if (!member) return;
    if (!confirm("Tem certeza que deseja inativar este membro? Ele perderá acesso ao sistema.")) return;
    try { 
      setSaving(true); 
      await postAction({ 
        action: "updateMember", 
        id: member.id, 
        role: member.role, 
        status: "inactive", 
        clientIds: data.clientMembers.filter(r => r.memberId === member.id).map(r => r.clientId),
        permissions: permissionsFor(data, member),
        clientAccessMode: member.clientAccessMode,
      }, "Membro inativado"); 
      if (editingId === member.id) setEditingId(null); 
    }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao inativar membro"); }
    finally { setSaving(false); }
  }

  const roleLabel = (value: typeof role) => value === "manager" ? "Gerente da agência" : value === "admin" ? "Administrador de acessos" : value === "social" ? "Social media" : value === "copywriter" ? "Redator(a)" : value === "video_editor" ? "Estúdio de vídeo" : value === "client" ? "Cliente" : value === "collaborator" ? "Colaborador(a)" : "Designer";

  const filteredMembers = data.members.filter(m => {
    if (filterRole !== "all" && m.role !== filterRole) return false;
    if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase()) && !m.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return <><PageHeader eyebrow="Hierarquia e permissões" title="Gerenciar acessos" description="Altere a função de cada pessoa e defina exatamente o que ela pode acessar." action={<Button className="rounded-xl bg-[#171a1f]" onClick={onInvite}><UserPlus />Adicionar usuário</Button>} />
    <div className="mt-7 flex flex-col sm:flex-row gap-3 sm:items-center">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Buscar por nome ou email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="rounded-xl pl-9 bg-white shadow-sm" />
      </div>
      <Select value={filterRole} onValueChange={setFilterRole}>
        <SelectTrigger className="w-full sm:w-48 rounded-xl bg-white shadow-sm"><SelectValue placeholder="Todos os perfis" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os perfis</SelectItem>
          <SelectItem value="manager">Gerente da agência</SelectItem>
          <SelectItem value="admin">Administrador de acessos</SelectItem>
          <SelectItem value="social">Social media</SelectItem>
          <SelectItem value="designer">Designer</SelectItem>
          <SelectItem value="copywriter">Redator(a)</SelectItem>
          <SelectItem value="video_editor">Editor(a) de vídeo</SelectItem>
          <SelectItem value="client">Cliente</SelectItem>
          <SelectItem value="collaborator">Outra função</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="mt-4 overflow-hidden rounded-[20px] border border-slate-200 bg-white"><div className="grid grid-cols-[1fr_auto] border-b border-slate-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid-cols-[1fr_180px_160px_auto_auto]"><span>Pessoa</span><span className="hidden sm:block">Clientes</span><span className="hidden sm:block">Acessos</span><span>Status</span><span className="w-8"></span></div>{filteredMembers.map((member) => {
      const assignedClients = data.clientMembers.filter((row) => row.memberId === member.id).map((row) => data.clients.find((client) => client.id === row.clientId)?.name).filter(Boolean);
      const accessLabels = permissionsFor(data, member).map((permission) => permissionOptions.find((option) => option.key === permission)?.label).filter(Boolean);
      return <div key={member.id} className={`group grid w-full grid-cols-[1fr_auto] items-center gap-3 border-b border-slate-100 px-5 py-4 text-left transition last:border-0 hover:bg-slate-50 sm:grid-cols-[1fr_180px_160px_auto_auto] ${member.status === "inactive" ? "opacity-50" : ""}`}><div className="flex min-w-0 items-center gap-3 cursor-pointer" onClick={() => openMember(member.id)}><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#171a1f] text-xs font-bold text-white">{initials(member.name)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{member.name}</p><p className="truncate text-xs text-slate-500">{member.email}</p></div></div><p className="hidden truncate text-sm text-slate-600 sm:block cursor-pointer" onClick={() => openMember(member.id)}>{member.clientAccessMode === "all" ? "Todos os clientes" : assignedClients.join(", ") || "Nenhum"}</p><p className="hidden truncate text-xs font-medium text-slate-700 sm:block cursor-pointer" title={accessLabels.join(", ")} onClick={() => openMember(member.id)}>{accessLabels.slice(0, 2).join(" + ") || roleLabel(member.role)}</p><div className="cursor-pointer" onClick={() => openMember(member.id)}><Badge className={`rounded-lg ${member.status === "active" ? "bg-emerald-50 text-emerald-700" : member.status === "inactive" ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"}`}>{member.status === "active" ? "Ativo" : member.status === "inactive" ? "Inativo" : "Pendente"}</Badge></div><div className="w-8 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">{member.id !== data.currentMember.id && <Button variant="ghost" size="icon-sm" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={(e) => { e.stopPropagation(); deactivate(member.id); }} disabled={saving || member.status === "inactive"} title="Remover acesso"><UserMinus className="size-4"/></Button>}</div></div>;
    })}
    {!filteredMembers.length && <div className="p-8 text-center text-sm text-slate-500">Nenhum membro encontrado.</div>}
    </div>
    <Dialog open={Boolean(editing)} onOpenChange={(nextOpen) => !nextOpen && setEditingId(null)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[22px] sm:max-w-2xl">
        <DialogHeader><DialogTitle>Permissões de {editing?.name}</DialogTitle><DialogDescription>Uma pessoa pode acumular várias funções usando o mesmo login.</DialogDescription></DialogHeader>
        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-2 block text-sm font-semibold">Função principal</label><Select value={role} onValueChange={(value) => setRole(value as typeof role)}><SelectTrigger className="w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Administrador</SelectItem><SelectItem value="social">Social media</SelectItem><SelectItem value="designer">Designer</SelectItem><SelectItem value="copywriter">Redator(a)</SelectItem><SelectItem value="video_editor">Estúdio de vídeo</SelectItem><SelectItem value="collaborator">Outra função</SelectItem><SelectItem value="client">Cliente</SelectItem></SelectContent></Select></div>
            <div><label className="mb-2 block text-sm font-semibold">Status</label><Select value={status} onValueChange={(value) => setStatus(value as typeof status)}><SelectTrigger className="w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="pending">Aguardando primeiro acesso</SelectItem><SelectItem value="inactive">Inativo (sem acesso)</SelectItem></SelectContent></Select></div>
          </div>
          <div><label className="mb-2 block text-sm font-semibold">Funções e módulos liberados</label><div className="grid gap-2 sm:grid-cols-2">{permissionOptions.map((option) => <label key={option.key} className={`cursor-pointer rounded-xl border p-3 transition ${permissions.includes(option.key) ? "border-[#6e5eff] bg-violet-50" : "border-slate-200 bg-white"}`}><span className="flex items-start gap-3"><input type="checkbox" checked={permissions.includes(option.key)} onChange={(event) => setPermissions((current) => event.target.checked ? [...new Set([...current, option.key])] : current.filter((key) => key !== option.key))} className="mt-0.5 size-4 accent-[#6e5eff]"/><span><strong className="block text-sm">{option.label}</strong><span className="mt-0.5 block text-xs leading-4 text-slate-500">{option.description}</span></span></span></label>)}</div></div>
          <div><label className="mb-2 block text-sm font-semibold">Alcance dos clientes</label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setClientAccessMode("all")} className={`rounded-xl border p-3 text-left text-sm ${clientAccessMode === "all" ? "border-[#6e5eff] bg-violet-50 font-semibold" : "border-slate-200"}`}>Todos os clientes<span className="mt-1 block text-xs font-normal text-slate-500">Acesso expansivo ao espaço da agência.</span></button><button type="button" onClick={() => setClientAccessMode("selected")} className={`rounded-xl border p-3 text-left text-sm ${clientAccessMode === "selected" ? "border-[#6e5eff] bg-violet-50 font-semibold" : "border-slate-200"}`}>Clientes específicos<span className="mt-1 block text-xs font-normal text-slate-500">Somente os clientes selecionados abaixo.</span></button></div></div>
          {clientAccessMode === "selected" && <div><label className="mb-2 block text-sm font-semibold">Clientes liberados</label><div className="relative mb-2"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><Input value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Pesquisar cliente..." className="rounded-xl pl-9"/></div><div className="grid max-h-44 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-2 sm:grid-cols-2">{data.clients.filter((client) => client.name.toLowerCase().includes(clientSearch.toLowerCase())).map((client) => <label key={client.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 text-sm font-medium hover:bg-slate-50"><input type={role === "client" ? "radio" : "checkbox"} name="client_access" checked={clientIds.includes(client.id)} onChange={(event) => setClientIds(role === "client" ? [client.id] : (current) => event.target.checked ? [...current, client.id] : current.filter((id) => id !== client.id))} className="size-4 accent-[#6e5eff]"/>{client.name}</label>)}</div></div>}
          <div><label className="mb-2 block text-sm font-semibold">Alterar senha <span className="text-xs font-normal text-slate-400">(opcional)</span></label><div className="relative"><Input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Deixe em branco para não alterar" className="rounded-xl pr-11"/><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6e5eff]">{showPassword ? <EyeOff className="size-4"/> : <Eye className="size-4"/>}</button></div></div>
        </div>
        <DialogFooter className="sm:justify-between"><Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => deactivate(editing!.id)} disabled={saving || status === "inactive"}>Inativar acesso</Button><div className="flex gap-2"><Button variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button><Button onClick={save} disabled={saving || (role === "client" && clientAccessMode === "selected" && clientIds.length === 0)} className="rounded-xl bg-[#171a1f]">{saving ? "Salvando..." : "Salvar acessos"}</Button></div></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

function InviteDialog({ open, onOpenChange, data, postAction }: { open: boolean; onOpenChange(open: boolean): void; data: WorkspaceData; postAction(payload: object, success?: string): Promise<unknown> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Member["role"]>("social");
  const [permissions, setPermissions] = useState<PermissionKey[]>(rolePermissionDefaults.social);
  const [clientAccessMode, setClientAccessMode] = useState<"all" | "selected">("selected");
  const [clientSearch, setClientSearch] = useState("");
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggleClient(clientId: string) {
    setClientIds((current) => current.includes(clientId) ? current.filter((id) => id !== clientId) : [...current, clientId]);
  }

  async function submit() {
    try {
      setSaving(true);
      await postAction({ action: "inviteMember", name, email, role, clientIds, permissions, clientAccessMode }, "Convite enviado por e-mail");
      onOpenChange(false);
      setName(""); setEmail(""); setClientIds([]); setRole("social"); setPermissions(rolePermissionDefaults.social); setClientAccessMode("selected"); setClientSearch("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao adicionar usuário");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar usuário</DialogTitle>
          <DialogDescription>Defina o perfil e as permissões. A pessoa receberá um código por e-mail para criar a própria senha.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div><label className="mb-1.5 block text-sm font-semibold">Nome</label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome completo" className="rounded-xl" /></div>
          <div><label className="mb-1.5 block text-sm font-semibold">E-mail</label><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="pessoa@empresa.com" className="rounded-xl" /></div>
          <div><label className="mb-1.5 block text-sm font-semibold">Função principal</label><Select value={role} onValueChange={(value) => { const nextRole = value as Member["role"]; setRole(nextRole); setPermissions(rolePermissionDefaults[nextRole] ?? []); }}><SelectTrigger className="w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{data.currentMember.role === "admin" && <SelectItem value="manager">Gerente da agência</SelectItem>}<SelectItem value="social">Social media</SelectItem><SelectItem value="designer">Designer</SelectItem><SelectItem value="copywriter">Redator(a)</SelectItem><SelectItem value="video_editor">Estúdio de vídeo</SelectItem><SelectItem value="collaborator">Outra função</SelectItem><SelectItem value="client">Cliente</SelectItem></SelectContent></Select></div>
          {data.currentMember.role !== "admin" && <><div><label className="mb-2 block text-sm font-semibold">Funções e módulos liberados</label><div className="grid gap-2 sm:grid-cols-2">{permissionOptions.map((option) => <label key={option.key} className={`cursor-pointer rounded-xl border p-3 ${permissions.includes(option.key) ? "border-[#6e5eff] bg-violet-50" : "border-slate-200"}`}><span className="flex items-start gap-2"><input type="checkbox" checked={permissions.includes(option.key)} onChange={(event) => setPermissions((current) => event.target.checked ? [...new Set([...current, option.key])] : current.filter((key) => key !== option.key))} className="mt-0.5 size-4 accent-[#6e5eff]"/><span><strong className="block text-sm">{option.label}</strong><span className="block text-[11px] leading-4 text-slate-500">{option.description}</span></span></span></label>)}</div></div><div><label className="mb-2 block text-sm font-semibold">Alcance dos clientes</label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setClientAccessMode("all")} className={`rounded-xl border p-3 text-left text-sm ${clientAccessMode === "all" ? "border-[#6e5eff] bg-violet-50 font-semibold" : "border-slate-200"}`}>Todos</button><button type="button" onClick={() => setClientAccessMode("selected")} className={`rounded-xl border p-3 text-left text-sm ${clientAccessMode === "selected" ? "border-[#6e5eff] bg-violet-50 font-semibold" : "border-slate-200"}`}>Selecionados</button></div></div>{clientAccessMode === "selected" && <div><label className="mb-2 block text-sm font-semibold">Clientes permitidos</label><div className="relative mb-2"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><Input value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Pesquisar cliente..." className="rounded-xl pl-9"/></div><div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">{data.clients.length ? data.clients.filter((client) => client.name.toLowerCase().includes(clientSearch.toLowerCase())).map((client) => <label key={client.id} className="flex cursor-pointer items-center gap-2 text-sm"><input type={role === "client" ? "radio" : "checkbox"} checked={clientIds.includes(client.id)} onChange={() => role === "client" ? setClientIds([client.id]) : toggleClient(client.id)} className="size-4 accent-[#6e5eff]"/>{client.name}</label>) : <p className="text-sm text-slate-500">Nenhum cliente cadastrado.</p>}</div></div>}</>}
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit} disabled={saving || !email.includes("@") || (role === "client" && clientAccessMode === "selected" && clientIds.length === 0)} className="rounded-xl bg-[#171a1f]">{saving ? "Enviando..." : "Enviar convite"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6e5eff]">{eyebrow}</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">{title}</h1><p className="mt-2 text-sm text-slate-500">{description}</p></div>{action}</header>;
}

function FileViewerDialog({ file, open, onOpenChange }: { file: { url: string; fileName: string; mimeType: string }; open: boolean; onOpenChange(open: boolean): void }) {
  const isImage = file.mimeType.startsWith("image/");
  const isVideo = file.mimeType.startsWith("video/");
  const isPdf = file.mimeType.includes("pdf");
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="flex h-[96vh] w-[98vw] max-w-[1500px] flex-col overflow-hidden rounded-[24px] border-0 bg-[#101216] p-0 text-white"><DialogHeader className="border-b border-white/10 px-5 py-4 pr-14 text-left"><DialogTitle className="truncate text-base text-white">{file.fileName}</DialogTitle><DialogDescription className="sr-only">Visualização ampliada do arquivo</DialogDescription></DialogHeader><div className="grid min-h-0 flex-1 place-items-center overflow-auto p-3 sm:p-6">{isImage ? <img src={file.url} alt={file.fileName} className="max-h-full max-w-full object-contain" /> : isVideo ? <video src={file.url} controls autoPlay className="max-h-full max-w-full object-contain" /> : isPdf ? <iframe src={file.url} title={file.fileName} className="h-full min-h-[75vh] w-full bg-white" /> : <a href={file.url} target="_blank" rel="noreferrer" className="rounded-xl bg-white px-5 py-3 font-bold text-[#5b4ce0]">Abrir arquivo</a>}</div></DialogContent></Dialog>;
}

function AttachmentPreview({ file }: { file: Deliverable["attachments"][number] }) {
  const isImage = file.mimeType.startsWith("image/");
  const isVideo = file.mimeType.startsWith("video/");
  const isPdf = file.mimeType.includes("pdf");
  const [viewerOpen, setViewerOpen] = useState(false);
  return <figure className="overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50">
    <div className="grid min-h-72 place-items-center bg-slate-100">
      {isImage ? <button type="button" onClick={() => setViewerOpen(true)} className="group relative h-[min(72vh,900px)] min-h-80 w-full cursor-zoom-in overflow-hidden bg-slate-200" aria-label={`Ampliar ${file.fileName}`}><img src={file.url} alt={file.fileName} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.01]" /><span className="absolute bottom-4 right-4 rounded-xl bg-black/65 px-3 py-2 text-xs font-bold text-white backdrop-blur">Clique para ampliar</span></button>
        : isVideo ? <video src={file.url} controls preload="metadata" className="max-h-[72vh] w-full bg-black object-contain" />
        : isPdf ? <iframe src={file.url} title={file.fileName} className="h-[72vh] w-full bg-white" />
        : <a href={file.url} target="_blank" rel="noreferrer" className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center text-[#5b4ce0]"><FileText className="size-12" /><span className="font-bold">Abrir arquivo</span></a>}
    </div>
    <figcaption className="flex items-center justify-between gap-3 bg-white px-4 py-3 text-sm"><span className="truncate font-semibold text-slate-700">{file.fileName}</span><a href={file.url} target="_blank" rel="noreferrer" className="shrink-0 font-bold text-[#5b4ce0]">Abrir em nova aba</a></figcaption>
    <FileViewerDialog file={file} open={viewerOpen} onOpenChange={setViewerOpen} />
  </figure>;
}

function AttachmentGallery({ item }: { item: Deliverable }) {
  return item.attachments.length ? <div className="space-y-6">{item.attachments.map((file) => <AttachmentPreview key={file.id} file={file} />)}</div> : <div className="grid min-h-64 place-items-center rounded-[18px] border-2 border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">Nenhum arquivo anexado nesta demanda.</div>;
}

function TaskSheet({ data, item, open, onOpenChange, postAction, reload }: { data: WorkspaceData; item: Deliverable | null; open: boolean; onOpenChange(open: boolean): void; postAction(payload: object, success?: string): Promise<unknown>; reload(): Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [uploadingSlide, setUploadingSlide] = useState<number | null>(null);
  const [removingAttachmentId, setRemovingAttachmentId] = useState<string | null>(null);
  const [instantPreviews, setInstantPreviews] = useState<Record<number, { url: string; fileName: string; mimeType: string }>>({});
  const [viewerFile, setViewerFile] = useState<{ url: string; fileName: string; mimeType: string } | null>(null);
  const previewUrls = useRef(new Set<string>());
  const [draggingSlide, setDraggingSlide] = useState<number | null>(null);
  const [draftSlides, setDraftSlides] = useState<Deliverable["slides"]>(() => item ? Array.from({ length: item.slideCount }, (_, index) => item.slides.find((slide) => slide.position === index + 1) ?? { id: `new-${index}`, deliverableId: item.id, position: index + 1, copy: "", direction: "" }) : []);
  useEffect(() => () => { previewUrls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);
  if (!item) return null;
  
  const isClient = data.currentMember.role === "client";
  if (isClient) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-[1280px] flex-col overflow-hidden rounded-[24px] p-0 shadow-2xl sm:h-[85vh]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-4 backdrop-blur sm:px-7">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">{item.title}</h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">{item.kind === "reels" || item.kind === "video" ? "Vídeo / Reels" : item.kind === "carousel" ? "Carrossel" : "Arte Estática"}</p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} className="hover:bg-slate-200/50"><X className="size-5" /></Button>
          </div>
          <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
            <div className="mx-auto max-w-5xl p-5 sm:p-7 space-y-6">
              <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <h3 className="mb-5 text-lg font-bold tracking-tight">Visualização dos arquivos</h3>
                <AttachmentGallery item={item} />
              </section>
              <section className="bg-white rounded-[20px] shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/50"><h3 className="font-bold text-lg tracking-tight">Solicitar alterações</h3><p className="text-xs text-slate-500 mt-0.5">Se algo precisar de ajuste, marque exatamente na imagem.</p></div>
                <div className="p-6">
                  <ReviewPanel data={data} item={item} postAction={postAction} reload={reload} hideUpload />
                </div>
              </section>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const board = data.boards.find((row) => row.id === item.boardId);
  const client = data.clients.find((row) => row.id === board?.clientId);
  const assignee = data.members.find((row) => row.id === item.assigneeId);
  const due = deadline(item);
  const canPlan = permissionsFor(data, data.currentMember).includes("demands.create");
  const canDelete = canPlan;

  async function saveSlides() {
    try { setSaving(true); await postAction({ action: "saveSlides", deliverableId: item!.id, slides: draftSlides.map((slide, index) => ({ ...slide, position: index + 1 })) }, "Pauta salva"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao salvar"); }
    finally { setSaving(false); }
  }

  async function updateStatus(status: Deliverable["status"]) {
    try { await postAction({ action: "updateDeliverable", id: item!.id, status }, "Status atualizado"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao atualizar"); }
  }

  async function deleteDemand() {
    if (!item || !window.confirm(`Apagar definitivamente a demanda "${item.title}"?`)) return;
    try {
      setSaving(true);
      await postAction({ action: "deleteDeliverable", id: item.id }, "Demanda apagada");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao apagar demanda");
    } finally {
      setSaving(false);
    }
  }

  function moveSlide(toIndex: number) {
    if (draggingSlide === null || draggingSlide === toIndex || !canPlan) return;
    setDraftSlides((current) => { const next = [...current]; const [moved] = next.splice(draggingSlide, 1); next.splice(toIndex, 0, moved); return next.map((slide, index) => ({ ...slide, position: index + 1 })); });
    setDraggingSlide(null);
  }

  async function uploadAttachment(file: File, slidePosition: number) {
    const instantUrl = file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : "";
    if (instantUrl) {
      previewUrls.current.add(instantUrl);
      setInstantPreviews((current) => ({ ...current, [slidePosition]: { url: instantUrl, fileName: file.name, mimeType: file.type } }));
    }
    try { setUploadingSlide(slidePosition); const response = await fetch(`/api/attachments/upload?deliverableId=${encodeURIComponent(item!.id)}&slidePosition=${slidePosition}`, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) }, body: file }); const result = await readApiResponse(response); if (!response.ok) throw new Error(result.error || "Falha no upload"); await reload(); toast.success(`Arquivo anexado à fatia ${slidePosition}`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha no upload"); }
    finally { setUploadingSlide(null); if (instantUrl) { URL.revokeObjectURL(instantUrl); previewUrls.current.delete(instantUrl); setInstantPreviews((current) => { const next = { ...current }; delete next[slidePosition]; return next; }); } }
  }
  async function removeAttachment(file: Deliverable["attachments"][number]) {
    if (!window.confirm(`Remover o arquivo "${file.fileName}"?`)) return;
    try { setRemovingAttachmentId(file.id); const response = await fetch(`/api/attachments/${file.id}`, { method: "DELETE" }); const result = await readApiResponse(response); if (!response.ok) throw new Error(result.error || "Falha ao remover arquivo"); await reload(); toast.success("Arquivo removido"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao remover arquivo"); }
    finally { setRemovingAttachmentId(null); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="h-[96vh] w-[98vw] max-w-none gap-0 overflow-hidden rounded-[24px] border-0 bg-[#f4f5f7] p-0 sm:max-w-[98vw]">
    <DialogHeader className="border-b border-slate-200 bg-white px-5 py-4 pr-14 text-left sm:px-7"><div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-bold" style={{ color: client?.accent }}>{client?.name}</span><span className="text-slate-300">•</span><span className="text-slate-500">{kindMeta[item.kind].label} · {draftSlides.length} {draftSlides.length === 1 ? "fatia" : "fatias"}</span><Badge className={`ml-1 rounded-lg ${statusMeta[item.status].className}`}>{statusMeta[item.status].label}</Badge></div><DialogTitle className="mt-2 max-w-5xl text-xl leading-7 tracking-tight sm:text-2xl">{item.title}</DialogTitle><DialogDescription className="sr-only">Área visual da demanda, com fatias, anexos e revisão.</DialogDescription><div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold ${dueClass(due.tone)}`}><Clock3 className="size-3.5" />{due.label}</span><span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold text-slate-600"><span className="grid size-5 place-items-center rounded-full bg-[#6557e8] text-[8px] font-bold text-white">{initials(assignee?.name ?? "Sem")}</span>{assignee?.name ?? "Sem responsável"}</span>{client?.driveUrl && <a href={client.driveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#eef0ff] px-2.5 py-1.5 font-bold text-[#5b4ce0]"><FolderOpen className="size-3.5" />Pasta do Drive</a>}</div></DialogHeader>
    {canDelete && <div className="flex justify-end border-b border-slate-200 bg-white px-5 py-2 sm:px-7"><Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={deleteDemand} disabled={saving}><Trash2 className="size-4" />Apagar demanda</Button></div>}
    <Tabs defaultValue={item.attachments.length ? "attachments" : item.assets.length ? "review" : "briefing"} className="flex min-h-0 flex-1 flex-col"><div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-2 sm:px-7"><TabsList className="rounded-xl bg-slate-100 p-1"><TabsTrigger value="briefing" className="rounded-lg px-4">Pauta visual</TabsTrigger><TabsTrigger value="attachments" className="rounded-lg px-4">Arquivos anexados ({item.attachments.length})</TabsTrigger><TabsTrigger value="review" className="rounded-lg px-4">Arquivo final e revisão</TabsTrigger></TabsList>{!canPlan && <span className="hidden text-xs font-semibold text-slate-400 sm:block">Visualização da demanda</span>}</div>
      <TabsContent value="briefing" className="m-0 min-h-0 flex-1 overflow-y-auto"><div className="px-5 py-5 sm:px-7"><div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Orientação geral</p><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">{item.notes || "Nenhuma orientação geral cadastrada."}</p></div>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-[#5a4ddd]"><Paperclip className="size-4" />Abrir referência</a>}</div>
        <div className="mt-5 overflow-x-auto pb-4"><div className="flex min-w-max items-stretch gap-4">{draftSlides.map((slide, index) => {
          const position = index + 1; const files = item.attachments.filter((file) => file.slidePosition === position); const storedPreview = files.find((file) => file.mimeType.startsWith("image/")); const preview = instantPreviews[position] ?? storedPreview;
          return <article key={slide.id} draggable={canPlan} onDragStart={() => setDraggingSlide(index)} onDragOver={(event) => { if (canPlan) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (event.dataTransfer.files?.[0]) void uploadAttachment(event.dataTransfer.files[0], position); else moveSlide(index); }} className={`flex w-[286px] shrink-0 flex-col overflow-hidden rounded-[20px] border bg-white shadow-sm transition ${draggingSlide === index ? "opacity-45" : "border-slate-200 hover:border-slate-300"}`}><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-xl bg-[#171a1f] text-xs font-black text-white">{position}</span><span className="text-xs font-bold uppercase tracking-wide text-slate-400">Fatia {position}</span></div>{canPlan && <GripVertical className="size-4 cursor-grab text-slate-300" />}</div>
            <div className="relative mx-3 mt-3 aspect-square overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">{preview ? <button type="button" onClick={() => setViewerFile(preview)} className="group h-full w-full cursor-zoom-in" aria-label={`Ampliar arquivo da fatia ${position}`}><img src={preview.url} alt={`Referência da fatia ${position}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" /><span className="absolute bottom-2 right-2 rounded-lg bg-black/65 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">Ampliar</span></button> : <label className="grid h-full cursor-pointer place-items-center transition hover:bg-violet-50"><input type="file" className="hidden" onChange={(event) => { const selected = event.currentTarget.files?.[0]; if (selected) void uploadAttachment(selected, position); event.currentTarget.value = ""; }} /><span className="px-5"><ImagePlus className="mx-auto size-7 text-[#6e5eff]" /><span className="mt-2 block text-xs font-bold text-slate-600">Clique ou arraste um arquivo</span><span className="mt-1 block text-[11px] text-slate-400">O envio começa automaticamente</span></span></label>}{uploadingSlide === position && <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/45 text-xs font-bold text-white backdrop-blur-[1px]">Enviando...</span>}</div>
            {preview && <label className="mx-3 mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-[#6e5eff] hover:text-[#5b4ce0]"><Upload className="size-3.5" />Substituir arquivo<input type="file" className="hidden" onChange={(event) => { const selected = event.currentTarget.files?.[0]; if (selected) void uploadAttachment(selected, position); event.currentTarget.value = ""; }} /></label>}
            {files.length > 0 && (
              <div className="mx-3 mt-3">
                <AttachmentGroup className="w-[260px] pb-2">
                  {files.map((file) => (
                    <div key={file.id} className="relative">
                    <Attachment orientation="vertical" size="sm" asChild>
                      <a href={file.url} target="_blank" rel="noreferrer" className="pr-7">
                        <AttachmentMedia variant={file.mimeType.startsWith("image/") ? "image" : "icon"}>
                          {file.mimeType.startsWith("image/") ? (
                            <img src={file.url} alt={file.fileName} />
                          ) : file.mimeType.startsWith("video/") ? (
                            <VideoIcon />
                          ) : file.mimeType.includes("pdf") ? (
                            <FileText />
                          ) : (
                            <FileIcon />
                          )}
                        </AttachmentMedia>
                        <AttachmentContent>
                          <AttachmentTitle>{file.fileName}</AttachmentTitle>
                          <AttachmentDescription>{(file.fileSize / 1024 / 1024).toFixed(2)} MB</AttachmentDescription>
                        </AttachmentContent>
                      </a>
                    </Attachment>
                    <button type="button" onClick={() => removeAttachment(file)} disabled={removingAttachmentId === file.id} className="absolute right-1.5 top-1.5 z-20 grid size-6 place-items-center rounded-md bg-white/90 text-rose-600 shadow transition hover:bg-rose-50" title="Remover arquivo"><Trash2 className="size-3.5" /></button>
                    </div>
                  ))}
                </AttachmentGroup>
              </div>
            )}
            <div className="flex flex-1 flex-col gap-3 p-3"><div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Copy</label><Textarea readOnly={!canPlan} value={slide.copy} onChange={(event) => setDraftSlides((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, copy: event.target.value } : row))} placeholder={`Texto da fatia ${position}`} className={`min-h-32 resize-none rounded-xl border-slate-200 text-sm leading-5 ${!canPlan ? "bg-slate-50" : "bg-white"}`} /></div><div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Direção visual</label><Textarea readOnly={!canPlan} value={slide.direction} onChange={(event) => setDraftSlides((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, direction: event.target.value } : row))} placeholder="Imagem, frame, corte ou instrução" className={`min-h-20 resize-none rounded-xl border-slate-200 text-xs leading-5 ${!canPlan ? "bg-slate-50" : "bg-white"}`} /></div></div>
          </article>;
        })}{canPlan && <button onClick={() => setDraftSlides((current) => [...current, { id: `new-${crypto.randomUUID()}`, deliverableId: item.id, position: current.length + 1, copy: "", direction: "" }])} className="grid w-[220px] shrink-0 place-items-center rounded-[20px] border-2 border-dashed border-slate-300 bg-white/55 px-6 text-center transition hover:border-[#6e5eff] hover:bg-violet-50"><span><Plus className="mx-auto size-7 text-[#6e5eff]" /><span className="mt-3 block text-sm font-bold">Adicionar fatia</span><span className="mt-1 block text-xs leading-5 text-slate-400">Ela entra no final e pode ser arrastada depois</span></span></button>}</div></div>
        <div className="sticky bottom-0 -mx-5 mt-2 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-7 sm:px-7">{canPlan ? <><Select value={item.status} onValueChange={(value) => updateStatus(value as Deliverable["status"])}><SelectTrigger className="w-[170px] rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="briefing">Briefing</SelectItem><SelectItem value="production">Em produção</SelectItem><SelectItem value="review">Em revisão</SelectItem><SelectItem value="changes">Alterações</SelectItem><SelectItem value="approved">Aprovado</SelectItem></SelectContent></Select><Button onClick={saveSlides} disabled={saving} className="rounded-xl bg-[#171a1f]">{saving ? "Salvando..." : "Salvar pauta"}</Button></> : <><p className="text-xs text-slate-500">{item.status === "review" ? "Arquivo enviado. Aguarde o retorno da revisão." : "Use o botão para atualizar seu andamento."}</p>{item.status !== "review" && <Button onClick={() => updateStatus(item.status === "production" ? "review" : "production")} className="rounded-xl bg-[#171a1f]">{item.status === "production" ? "Enviar para revisão" : "Iniciar produção"}<ChevronRight /></Button>}</>}</div>
      </div></TabsContent>
      <TabsContent value="review" className="m-0 min-h-0 flex-1 overflow-y-auto bg-white"><div className="mx-auto max-w-[1280px] px-5 py-6 sm:px-7"><ReviewPanel data={data} item={item} postAction={postAction} reload={reload} /></div></TabsContent>
      <TabsContent value="attachments" className="m-0 min-h-0 flex-1 overflow-y-auto bg-white"><div className="mx-auto max-w-5xl px-5 py-6 sm:px-7"><AttachmentGallery item={item} /></div></TabsContent>
    </Tabs>
    {viewerFile && <FileViewerDialog file={viewerFile} open={Boolean(viewerFile)} onOpenChange={(next) => { if (!next) setViewerFile(null); }} />}
  </DialogContent></Dialog>;
}

function ReviewPanel({ data, item, postAction, reload, hideUpload = false }: { data: WorkspaceData; item: Deliverable; postAction(payload: object, success?: string): Promise<unknown>; reload(): Promise<void>; hideUpload?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [point, setPoint] = useState<{ x: number; y: number; slideNumber: number } | null>(null);
  const [comment, setComment] = useState("");
  const latestAsset = [...item.assets].sort((a, b) => b.version - a.version)[0];
  const notes = latestAsset ? data.annotations.filter((note) => note.assetId === latestAsset.id) : [];
  const canReview = !permissionsFor(data, data.currentMember).includes("demands.execute") || permissionsFor(data, data.currentMember).includes("demands.create");

  async function upload(file?: File) {
    if (!file) return;
    try { setUploading(true); const response = await fetch(`/api/assets/upload?deliverableId=${encodeURIComponent(item.id)}`, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) }, body: file }); const result = await readApiResponse(response); if (!response.ok) throw new Error(result.error || "Falha no upload"); await reload(); toast.success(`Versão ${result.asset.version} enviada para revisão`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha no upload"); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  function mark(event: React.MouseEvent<HTMLDivElement>) {
    if (!latestAsset || !canReview) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const slideNumber = Math.min(item.slideCount, Math.floor((x / 100) * item.slideCount) + 1);
    setPoint({ x, y, slideNumber }); setComment("");
  }

  async function addNote() {
    if (!point || !latestAsset) return;
    try { await postAction({ action: "addAnnotation", assetId: latestAsset.id, ...point, comment }, "Alteração marcada"); setPoint(null); setComment(""); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao marcar alteração"); }
  }

  async function resolve(note: Annotation) {
    try { await postAction({ action: "resolveAnnotation", id: note.id, status: note.status === "open" ? "resolved" : "open" }, note.status === "open" ? "Alteração resolvida" : "Alteração reaberta"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao atualizar alteração"); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">Revisão visual</h3>
          <p className="mt-1 text-sm text-slate-500">
            {canReview ? "Clique em qualquer ponto da arte para solicitar uma alteração." : "Arraste a composição final para cá e acompanhe os apontamentos."}
          </p>
        </div>
        {!hideUpload && (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,.psd"
              className="hidden"
              onChange={(event) => upload(event.target.files?.[0])}
            />
            <Button variant="outline" className="rounded-xl" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <Upload />
              {uploading ? "Enviando..." : latestAsset ? "Nova versão" : "Anexar arquivo final"}
            </Button>
          </div>
        )}
      </div>

      {latestAsset ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div
            className="relative min-h-80 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
            onClick={mark}
          >
            {latestAsset.mimeType.startsWith("image/") ? (
              <img src={latestAsset.url} alt={latestAsset.fileName} className="h-full w-full object-contain" />
            ) : latestAsset.mimeType.startsWith("video/") ? (
              <video src={latestAsset.url} controls className="h-full w-full" />
            ) : (
              <a href={latestAsset.url} target="_blank" rel="noreferrer" className="grid min-h-80 place-items-center text-sm font-semibold text-[#5b4ce0]">
                Abrir {latestAsset.fileName}
              </a>
            )}
            {notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={(event) => { event.stopPropagation(); void resolve(note); }}
                className={`absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-xs font-black text-white shadow ${note.status === "open" ? "bg-red-500" : "bg-emerald-500"}`}
                style={{ left: `${note.x}%`, top: `${note.y}%` }}
                title={note.comment}
              >
                {note.slideNumber}
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h4 className="font-bold">Apontamentos</h4>
            <div className="mt-3 space-y-3">
              {notes.length ? notes.map((note) => (
                <button key={note.id} type="button" onClick={() => void resolve(note)} className="w-full rounded-xl border border-slate-200 p-3 text-left text-sm">
                  <span className="font-bold">Fatia {note.slideNumber}</span>
                  <span className="mt-1 block text-slate-500">{note.comment}</span>
                </button>
              )) : <p className="text-sm text-slate-500">Nenhum apontamento ainda.</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid min-h-72 place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
          Envie um arquivo final para iniciar a revisão.
        </div>
      )}

      {point && (
        <div className="mt-4 flex gap-2 rounded-2xl border border-violet-200 bg-violet-50 p-3">
          <Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder={`Alteração na fatia ${point.slideNumber}`} className="bg-white" />
          <Button onClick={addNote} disabled={!comment.trim()} className="bg-[#171a1f]">Marcar</Button>
          <Button variant="ghost" onClick={() => setPoint(null)}>Cancelar</Button>
        </div>
      )}
    </div>
  );
}

function DraftFileField({ file, onFile, onRemove, accept }: { file?: File; onFile(file: File): void; onRemove?(): void; accept?: string }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  useEffect(() => {
    if (!file) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>) => { const selected = event.currentTarget.files?.[0]; if (selected) onFile(selected); event.currentTarget.value = ""; };
  if (!file) return <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-3 text-center transition hover:border-[#6e5eff] hover:bg-violet-50"><input type="file" accept={accept} className="hidden" onChange={chooseFile} /><span><ImagePlus className="mx-auto size-7 text-[#6e5eff]" /><span className="mt-2 block text-xs font-bold text-slate-600">Clique ou arraste um arquivo</span><span className="mt-1 block text-[11px] text-slate-400">A prévia aparece na hora</span></span></label>;
  return <div><button type="button" onClick={() => setViewerOpen(true)} className="group relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl border border-slate-200 bg-slate-100">{file.type.startsWith("image/") && previewUrl ? <img src={previewUrl} alt={file.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" /> : file.type.startsWith("video/") && previewUrl ? <video src={previewUrl} muted className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center px-4 text-center text-xs font-bold text-[#5b4ce0]"><FileText className="mb-2 size-9" />{file.name}</span>}<span className="absolute bottom-2 right-2 rounded-lg bg-black/65 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">Ampliar</span></button><div className="mt-2 grid grid-cols-2 gap-2"><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-[#6e5eff] hover:text-[#5b4ce0]"><Upload className="size-3.5" />Trocar<input type="file" accept={accept} className="hidden" onChange={chooseFile} /></label>{onRemove && <button type="button" onClick={onRemove} className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50"><Trash2 className="size-3.5" />Remover</button>}</div>{previewUrl && <FileViewerDialog file={{ url: previewUrl, fileName: file.name, mimeType: file.type }} open={viewerOpen} onOpenChange={setViewerOpen} />}</div>;
}

function CreateTaskDialog({ open, onOpenChange, data, defaultClientId, postAction }: { open: boolean; onOpenChange: (open: boolean) => void; data: WorkspaceData; defaultClientId: string | null; postAction: (payload: object, success?: string) => Promise<unknown> }) {
  const defaultBoard = data.boards.find((board) => board.clientId === defaultClientId)?.id ?? data.boards[0]?.id ?? "";
  type DraftSlide = { id: string; copy: string; direction: string; file?: File };
  type DraftRef = { id: string; url: string; description: string };
  const [boardId, setBoardId] = useState(defaultBoard); const [title, setTitle] = useState(""); const [kind, setKind] = useState<Deliverable["kind"]>("carousel"); const [slides, setSlides] = useState<DraftSlide[]>(() => Array.from({ length: 5 }, () => ({ id: crypto.randomUUID(), copy: "", direction: "" }))); const [assigneeId, setAssigneeId] = useState(data.members.find((member) => permissionsFor(data, member).includes("demands.execute"))?.id ?? ""); const [dueAt, setDueAt] = useState(""); const [notes, setNotes] = useState(""); const [hasStoriesVersion, setHasStoriesVersion] = useState(false); const [refs, setRefs] = useState<DraftRef[]>([]); const [saving, setSaving] = useState(false); const [dragging, setDragging] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const preferredBoard = data.boards.find((board) => board.clientId === defaultClientId)?.id ?? data.boards[0]?.id ?? "";
    if (!boardId || !data.boards.some((board) => board.id === boardId)) setBoardId(preferredBoard);
    const activeMembers = data.members.filter((member) => member.status === "active");
    const preferredAssignee = activeMembers.find((member) => permissionsFor(data, member).includes("demands.execute"))?.id ?? data.currentMember.id;
    if (!assigneeId || !activeMembers.some((member) => member.id === assigneeId)) setAssigneeId(preferredAssignee);
  }, [open, defaultClientId, data.boards, data.members, data.currentMember.id, boardId, assigneeId]);
  
  function changeKind(value: Deliverable["kind"]) { setKind(value); if (value !== "carousel") setSlides((current) => [current[0] ?? { id: crypto.randomUUID(), copy: "", direction: "" }]); else if (slides.length === 1) setSlides((current) => [...current, ...Array.from({ length: 4 }, () => ({ id: crypto.randomUUID(), copy: "", direction: "" }))]); }
  function changeSlideCount(count: number) { 
    if (count < 1) return; 
    setSlides(current => {
      if (count > current.length) return [...current, ...Array.from({ length: count - current.length }, () => ({ id: crypto.randomUUID(), copy: "", direction: "" }))];
      return current.slice(0, count);
    });
  }
  function moveSlide(to: number) { if (dragging === null || dragging === to) return; setSlides((current) => { const next = [...current]; const [moved] = next.splice(dragging, 1); next.splice(to, 0, moved); return next; }); setDragging(null); }
  
  async function submit() {
    if (!boardId) { toast.error("Selecione uma pauta para criar a demanda."); return; }
    if (!title.trim()) { toast.error("Informe o título da demanda."); return; }
    if (!dueAt) { toast.error("Informe a data e a hora do prazo."); return; }
    if (!assigneeId) { toast.error("Selecione uma pessoa responsável."); return; }
    if (!slides.length) { toast.error("A demanda precisa ter pelo menos uma fatia."); return; }
    try {
      setSaving(true);
      const result = await postAction({ action: "createDeliverable", boardId, title, kind, slideCount: slides.length, assigneeId, dueAt, notes, hasStoriesVersion, slides: slides.map((slide, index) => ({ position: index + 1, copy: slide.copy, direction: slide.direction })) }, "Demanda criada");
      const id = (result as { id?: string }).id;
      if (id) {
        await Promise.all(slides.map(async (slide, index) => {
          if (!slide.file) return;
          const response = await fetch(`/api/attachments/upload?deliverableId=${encodeURIComponent(id)}&slidePosition=${index + 1}`, { method: "PUT", headers: { "Content-Type": slide.file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(slide.file.name) }, body: slide.file });
          if (!response.ok) throw new Error(`A demanda foi criada, mas o anexo da fatia ${index + 1} não foi enviado.`);
        }));
        for (const ref of refs) { if (ref.url) await postAction({ action: "createDeliverableReference", deliverableId: id, url: ref.url, description: ref.description }); }
        if (slides.some((slide) => slide.file)) await postAction({ action: "updateDeliverable", id, status: "briefing" });
      }
      onOpenChange(false); setTitle(""); setDueAt(""); setNotes(""); setHasStoriesVersion(false); setSlides(Array.from({ length: 5 }, () => ({ id: crypto.randomUUID(), copy: "", direction: "" }))); setRefs([]);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao criar demanda"); }
    finally { setSaving(false); }
  }
  
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="h-[94vh] w-[96vw] max-w-none gap-0 overflow-hidden rounded-[24px] p-0 sm:max-w-[1120px]"><DialogHeader className="border-b border-slate-200 px-6 py-5 text-left"><DialogTitle className="text-2xl tracking-tight">Criar nova demanda</DialogTitle><DialogDescription>Monte a pauta visualmente, defina o responsável e anexe as referências visuais.</DialogDescription></DialogHeader><div className="min-h-0 flex-1 overflow-y-auto bg-[#f6f7f9] px-5 py-5 sm:px-6"><section className="grid gap-4 rounded-[20px] border border-slate-200 bg-white p-5 lg:grid-cols-4"><div className="lg:col-span-2"><label className="mb-1.5 block text-sm font-semibold">Cliente / pauta</label><Select value={boardId} onValueChange={setBoardId}><SelectTrigger className="w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{data.boards.map((board) => <SelectItem key={board.id} value={board.id}>{data.clients.find((client) => client.id === board.clientId)?.name} · {board.period}</SelectItem>)}</SelectContent></Select></div><div><label className="mb-1.5 block text-sm font-semibold">Formato</label><Select value={kind} onValueChange={(value) => changeKind(value as Deliverable["kind"])}><SelectTrigger className="w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="carousel">Carrossel</SelectItem><SelectItem value="reels">Reels</SelectItem><SelectItem value="stories">Stories</SelectItem><SelectItem value="static">Post estático</SelectItem></SelectContent></Select></div><div><label className="mb-1.5 block text-sm font-semibold">Prazo</label><Input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="rounded-xl" /></div><div className="lg:col-span-3"><label className="mb-1.5 block text-sm font-semibold">Título da demanda</label><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Post 5 — Headline ou descrição principal" className="rounded-xl" /></div><div><label className="mb-1.5 block text-sm font-semibold">Responsável (obrigatório)</label><Select value={assigneeId} onValueChange={setAssigneeId}><SelectTrigger className="w-full rounded-xl"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{data.members.filter((member) => member.status === "active").map((member) => <SelectItem key={member.id} value={member.id}>{member.name} · {member.role === "designer" ? "Designer" : member.role === "copywriter" ? "Redator(a)" : member.role === "video_editor" ? "Editor(a) de Vídeo" : member.role === "social" ? "Social" : "ADM"}</SelectItem>)}</SelectContent></Select></div><div className="lg:col-span-4 flex items-center justify-between"><div className="flex-1"><label className="mb-1.5 block text-sm font-semibold">Orientação geral</label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Objetivo, edição, legenda, capa, observações..." className="min-h-20 rounded-xl w-full" /></div><label className="ml-5 flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium shrink-0"><input type="checkbox" checked={hasStoriesVersion} onChange={(event) => setHasStoriesVersion(event.target.checked)} className="size-5 accent-[#6e5eff]" />Também precisa de versão Stories</label></div>
  <div className="lg:col-span-4 mt-2">
    <div className="flex items-center justify-between"><label className="block text-sm font-semibold">Direção Visual / Referências (Links)</label><Button variant="outline" size="sm" onClick={() => setRefs(c => [...c, { id: crypto.randomUUID(), url: "", description: "" }])}><Plus className="size-4 mr-2" />Adicionar Link</Button></div>
    {refs.length > 0 && <div className="mt-3 space-y-3">{refs.map((r, i) => <div key={r.id} className="flex gap-2 items-start"><Input placeholder="https://instagram.com/..." value={r.url} onChange={e => setRefs(c => c.map(x => x.id === r.id ? { ...x, url: e.target.value } : x))} className="rounded-xl w-1/3" /><Input placeholder="Descreva esta referência (Ex: Usar como base para a cor)" value={r.description} onChange={e => setRefs(c => c.map(x => x.id === r.id ? { ...x, description: e.target.value } : x))} className="rounded-xl flex-1" /><Button variant="ghost" size="icon" onClick={() => setRefs(c => c.filter(x => x.id !== r.id))}><X className="size-4 text-red-500" /></Button></div>)}</div>}
  </div>
  </section>
  <div className="mt-5 flex items-center justify-between"><div><h3 className="font-bold">Fatias da demanda</h3><p className="mt-1 text-xs text-slate-500">Arraste os cartões para ordenar. Solte um arquivo dentro da fatia para anexá-lo.</p></div>
  <div className="flex items-center gap-3">
    {kind === "carousel" && <div className="flex items-center gap-2"><label className="text-sm font-medium">Quantidade:</label><Input type="number" min="1" max="30" value={slides.length} onChange={(e) => changeSlideCount(parseInt(e.target.value) || 1)} className="w-20 rounded-xl" /></div>}
    <Badge variant="secondary" className="rounded-lg">{slides.length} {slides.length === 1 ? "fatia" : "fatias"}</Badge>
  </div></div>
  <div className="mt-3 overflow-x-auto pb-4"><div className="flex min-w-max items-stretch gap-3">{slides.map((slide, index) => <article key={slide.id} draggable={kind === "carousel"} onDragStart={() => setDragging(index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (event.dataTransfer.files?.[0]) setSlides((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, file: event.dataTransfer.files[0] } : row)); else moveSlide(index); }} className={`w-[280px] shrink-0 overflow-hidden rounded-[18px] border bg-white ${dragging === index ? "opacity-45" : "border-slate-200"}`}><div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5"><div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-[#171a1f] text-[11px] font-black text-white">{index + 1}</span><span className="text-xs font-bold text-slate-500">Fatia {index + 1}</span></div>{kind === "carousel" && <GripVertical className="size-4 cursor-grab text-slate-300" />}</div><div className="p-3"><DraftFileField file={slide.file} onFile={(file) => setSlides((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, file } : row))} onRemove={() => setSlides((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, file: undefined } : row))} /><label className="mb-1 mt-3 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Copy</label><Textarea value={slide.copy} onChange={(event) => setSlides((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, copy: event.target.value } : row))} placeholder={`Texto da fatia ${index + 1}`} className="min-h-28 resize-none rounded-xl text-sm" /><label className="mb-1 mt-3 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Direção visual</label><Textarea value={slide.direction} onChange={(event) => setSlides((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, direction: event.target.value } : row))} placeholder="Imagem, frame ou instrução" className="min-h-16 resize-none rounded-xl text-xs" /></div></article>)}{kind === "carousel" && <button type="button" onClick={() => setSlides((current) => [...current, { id: crypto.randomUUID(), copy: "", direction: "" }])} className="grid w-[190px] shrink-0 place-items-center rounded-[18px] border-2 border-dashed border-slate-300 bg-white/60 px-5 text-center hover:border-[#6e5eff] hover:bg-violet-50"><span><Plus className="mx-auto size-6 text-[#6e5eff]" /><span className="mt-2 block text-sm font-bold">Adicionar fatia</span></span></button>}</div></div></div><DialogFooter className="border-t border-slate-200 bg-white px-6 py-4"><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit} disabled={saving} className="rounded-xl bg-[#171a1f]">{saving ? "Criando e enviando anexos..." : "Criar demanda"}</Button></DialogFooter></DialogContent></Dialog>;
}

function CreateClientDialog({ open, onOpenChange, postAction }: { open: boolean; onOpenChange(open: boolean): void; postAction(payload: object, success?: string): Promise<unknown> }) {
  const [name, setName] = useState(""); const [handle, setHandle] = useState(""); const [driveUrl, setDriveUrl] = useState(""); const [period, setPeriod] = useState(""); const [revenue, setRevenue] = useState(""); const [dueDay, setDueDay] = useState("5"); const [avatar, setAvatar] = useState<File | null>(null); const [banner, setBanner] = useState<File | null>(null); const [saving, setSaving] = useState(false);
  async function upload(clientId: string, kind: "avatar" | "banner", file: File) { const response = await fetch(`/api/clients/${clientId}/media?kind=${kind}`, { method: "PUT", headers: { "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) }, body: file }); const result = await readApiResponse(response); if (!response.ok) throw new Error(result.error || "Falha ao enviar imagem"); }
  async function submit() { try { setSaving(true); const result = await postAction({ action: "createClient", name, handle, driveUrl, period, revenue: Math.round(Number(revenue) * 100), dueDay: Number(dueDay) }, "Cliente criado e financeiro previsto"); const clientId = (result as { clientId?: string }).clientId; if (clientId) await Promise.all([avatar ? upload(clientId, "avatar", avatar) : Promise.resolve(), banner ? upload(clientId, "banner", banner) : Promise.resolve()]); if (avatar || banner) await postAction({ action: "updateClient", id: clientId, driveUrl }); onOpenChange(false); setName(""); setHandle(""); setDriveUrl(""); setPeriod(""); setRevenue(""); setDueDay("5"); setAvatar(null); setBanner(null); } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao criar cliente"); } finally { setSaving(false); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[94vh] overflow-y-auto rounded-2xl sm:max-w-2xl"><DialogHeader><DialogTitle>Novo cliente</DialogTitle><DialogDescription>Cadastre a identidade, a primeira pauta e a previsão financeira mensal.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-semibold">Nome do cliente</label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do cliente" className="rounded-xl" /></div><div><label className="mb-1.5 block text-sm font-semibold">Instagram</label><Input value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="@cliente" className="rounded-xl" /></div><div><label className="mb-1.5 block text-sm font-semibold">Período da primeira pauta</label><Input value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="Ex.: SET • 2026" className="rounded-xl" /></div><div><label className="mb-1.5 block text-sm font-semibold">Mensalidade (R$)</label><Input type="number" min="0" step="0.01" value={revenue} onChange={(event) => setRevenue(event.target.value)} placeholder="0,00" className="rounded-xl" /></div><div><label className="mb-1.5 block text-sm font-semibold">Dia do vencimento</label><Input type="number" min="1" max="31" value={dueDay} onChange={(event) => setDueDay(event.target.value)} className="rounded-xl" /></div><div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-semibold">Pasta de fotos / Drive</label><div className="relative"><FolderOpen className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input type="url" value={driveUrl} onChange={(event) => setDriveUrl(event.target.value)} placeholder="https://drive.google.com/drive/folders/..." className="rounded-xl pl-9" /></div></div><div><p className="mb-2 text-sm font-semibold">Foto do cliente</p><DraftFileField file={avatar ?? undefined} onFile={setAvatar} onRemove={() => setAvatar(null)} accept="image/*" /><p className="mt-2 text-center text-[11px] text-slate-400">Quadrada, até 10 MB</p></div><div><p className="mb-2 text-sm font-semibold">Banner do cliente</p><DraftFileField file={banner ?? undefined} onFile={setBanner} onRemove={() => setBanner(null)} accept="image/*" /><p className="mt-2 text-center text-[11px] text-slate-400">Recomendado: 1920 × 640, até 10 MB</p></div></div><DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button className="rounded-xl bg-[#171a1f]" disabled={saving || !name.trim() || Number(dueDay) < 1 || Number(dueDay) > 31} onClick={submit}>{saving ? "Criando cliente, imagens e previsões..." : "Criar cliente"}</Button></DialogFooter></DialogContent></Dialog>;
}

const crmLeadStages: { key: CrmLead["status"]; label: string }[] = [
  { key: "new", label: "Novo" }, { key: "research", label: "Pesquisando" }, { key: "contacting", label: "Tentando contato" }, { key: "connected", label: "Conectado" }, { key: "qualifying", label: "Qualificando" },
];
const crmDealStages: { key: CrmDeal["stage"]; label: string; probability: number }[] = [
  { key: "discovery", label: "Discovery", probability: 10 }, { key: "solution", label: "Solução", probability: 35 }, { key: "proposal", label: "Proposta", probability: 50 }, { key: "negotiation", label: "Negociação", probability: 65 }, { key: "decision", label: "Decisão", probability: 80 }, { key: "contract", label: "Contrato", probability: 90 },
];
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value / 100);

function CrmWorkspace({ data, postAction }: { data: WorkspaceData; postAction(payload: object, success?: string): Promise<unknown> }) {
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [newLead, setNewLead] = useState(false);
  const [newDeal, setNewDeal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [dragLead, setDragLead] = useState<string | null>(null);
  const [dragDeal, setDragDeal] = useState<string | null>(null);
  const selectedLead = data.crmLeads.find((lead) => lead.id === selectedLeadId) ?? null;
  const leads = data.crmLeads.filter((lead) => `${lead.company} ${lead.contactName} ${lead.email}`.toLowerCase().includes(search.toLowerCase()));
  const openDeals = data.crmDeals.filter((deal) => !["won", "lost"].includes(deal.stage));
  const pending = data.crmActivities.filter((activity) => activity.status === "pending").sort((a, b) => new Date(a.dueAt || "2999").getTime() - new Date(b.dueAt || "2999").getTime());
  const overdue = pending.filter((activity) => activity.dueAt && new Date(activity.dueAt).getTime() < Date.now());
  const weighted = openDeals.reduce((total, deal) => total + deal.value * deal.probability / 100, 0);
  async function moveLead(status: CrmLead["status"]) { if (!dragLead) return; try { await postAction({ action: "updateCrmLead", id: dragLead, status }, "Lead movido"); } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao mover lead"); } finally { setDragLead(null); } }
  async function moveDeal(stage: CrmDeal["stage"]) { if (!dragDeal) return; try { await postAction({ action: "updateCrmDeal", id: dragDeal, stage }, "Oportunidade movida"); } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao mover oportunidade"); } finally { setDragDeal(null); } }
  return <div className="p-1 sm:p-2">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#6e5eff]">Operação comercial</p><h1 className="mt-1 text-3xl font-black tracking-tight">CRM</h1><p className="mt-1 text-sm text-slate-500">Veja o que precisa de atenção e mantenha cada negociação com um próximo passo.</p></div><Button onClick={() => setNewLead(true)} className="rounded-xl bg-[#171a1f]"><Plus />Novo lead</Button></div>
    <Tabs value={tab} onValueChange={setTab} className="mt-6"><TabsList className="h-auto flex-wrap justify-start rounded-xl bg-white p-1 shadow-sm"><TabsTrigger value="dashboard" className="rounded-lg">Visão geral</TabsTrigger><TabsTrigger value="prospecting" className="rounded-lg">Prospecção</TabsTrigger><TabsTrigger value="deals" className="rounded-lg">Oportunidades</TabsTrigger><TabsTrigger value="clients" className="rounded-lg">Clientes</TabsTrigger><TabsTrigger value="activities" className="rounded-lg">Atividades</TabsTrigger></TabsList>
      <TabsContent value="dashboard" className="mt-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Atividades abertas" value={pending.length} hint={`${overdue.length} atrasadas`} icon={CheckCircle2} tone="dark" /><Metric label="Leads sem próxima ação" value={data.crmLeads.filter((lead) => !lead.nextAction).length} hint="precisam de atenção" icon={AlertCircle} tone="amber" /><Metric label="Oportunidades" value={openDeals.length} hint={money(openDeals.reduce((t, d) => t + d.value, 0))} icon={TrendingUp} tone="green" /><Metric label="Pipeline ponderado" value={Math.round(weighted / 100)} hint="valor esperado em reais" icon={Wallet} tone="violet" /></div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_.65fr]"><section className="rounded-[20px] border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold">Prioridades agora</h2><p className="text-xs text-slate-500">Ordenadas por prazo e próxima atividade.</p></div><Button variant="ghost" size="sm" onClick={() => setTab("activities")}>Ver fila <ChevronRight /></Button></div><div className="mt-4 divide-y divide-slate-100">{pending.slice(0, 6).map((activity) => { const lead = data.crmLeads.find((row) => row.id === activity.leadId); const deal = data.crmDeals.find((row) => row.id === activity.dealId); return <div key={activity.id} className="flex items-center gap-3 py-3"><span className={`grid size-9 place-items-center rounded-xl ${activity.dueAt && new Date(activity.dueAt).getTime() < Date.now() ? "bg-rose-50 text-rose-600" : "bg-violet-50 text-[#5b4ce0]"}`}><Clock3 className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{activity.title}</p><p className="text-xs text-slate-500">{lead?.company || deal?.company || "Atividade geral"}</p></div><Button variant="outline" size="sm" onClick={() => postAction({ action: "completeCrmActivity", id: activity.id }, "Atividade concluída")}>Concluir</Button></div>; })}{!pending.length && <div className="py-12 text-center text-sm text-slate-500">Nada pendente. Crie um lead para iniciar o fluxo.</div>}</div></section><section className="rounded-[20px] border border-slate-200 bg-[#171a1f] p-5 text-white"><p className="text-xs font-bold uppercase tracking-wide text-white/50">Funil rápido</p><h2 className="mt-1 text-xl font-black">Conversão atual</h2><div className="mt-6 space-y-5">{[["Leads", data.crmLeads.length], ["Conectados", data.crmLeads.filter(l => ["connected", "qualifying", "sql"].includes(l.status)).length], ["Oportunidades", data.crmDeals.length], ["Vendas", data.crmDeals.filter(d => d.stage === "won").length]].map(([label, value], index) => <div key={String(label)}><div className="flex justify-between text-sm"><span className="text-white/65">{label}</span><strong>{value}</strong></div><div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-[#ffd84d]" style={{ width: `${Math.max(8, 100 - index * 22)}%` }} /></div></div>)}</div></section></div>
      </TabsContent>
      <TabsContent value="prospecting" className="mt-5"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empresa, pessoa ou e-mail" className="rounded-xl bg-white pl-9" /></div><div className="flex gap-2"><Badge variant="secondary" className="rounded-lg px-3">{data.crmLeads.length} leads</Badge><Button onClick={() => setNewLead(true)} className="rounded-xl bg-[#171a1f]"><Plus />Lead</Button></div></div><div className="grid gap-3 overflow-x-auto pb-3 xl:grid-cols-5">{crmLeadStages.map((stage) => { const items = leads.filter((lead) => lead.status === stage.key); return <section key={stage.key} onDragOver={(e) => e.preventDefault()} onDrop={() => moveLead(stage.key)} className="min-w-[240px] rounded-[18px] bg-slate-100/75 p-3"><div className="flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{stage.label}</h3><span className="text-xs font-bold text-slate-400">{items.length}</span></div><div className="mt-3 space-y-3">{items.map((lead) => <button key={lead.id} draggable onDragStart={() => setDragLead(lead.id)} onClick={() => setSelectedLeadId(lead.id)} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#6e5eff]"><div className="flex items-start justify-between gap-2"><strong className="text-sm">{lead.company}</strong><Badge className="rounded-md bg-violet-50 text-[#5b4ce0]">{lead.score}</Badge></div><p className="mt-1 text-xs text-slate-500">{lead.contactName || "Contato não informado"}</p><div className="mt-4 border-t border-slate-100 pt-3 text-xs"><span className={lead.nextAction ? "font-semibold text-slate-700" : "font-semibold text-rose-600"}>{lead.nextAction || "Sem próxima ação"}</span>{lead.potentialValue > 0 && <span className="mt-1 block text-emerald-600">{money(lead.potentialValue)}</span>}</div></button>)}{!items.length && <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">Solte aqui</div>}</div></section>; })}</div></TabsContent>
      <TabsContent value="deals" className="mt-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-black">Pipeline comercial</h2><p className="text-sm text-slate-500">{money(openDeals.reduce((t, d) => t + d.value, 0))} em oportunidades abertas.</p></div><Button onClick={() => setNewDeal(true)} className="rounded-xl bg-[#171a1f]"><Plus />Oportunidade</Button></div><div className="grid gap-3 overflow-x-auto pb-3 xl:grid-cols-6">{crmDealStages.map((stage) => { const items = openDeals.filter(d => d.stage === stage.key); return <section key={stage.key} onDragOver={(e) => e.preventDefault()} onDrop={() => moveDeal(stage.key)} className="min-w-[220px] rounded-[18px] bg-slate-100/75 p-3"><div className="flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{stage.label}</h3><span className="text-xs text-slate-400">{money(items.reduce((t, d) => t + d.value, 0))}</span></div><div className="mt-3 space-y-3">{items.map((deal) => <article key={deal.id} draggable onDragStart={() => setDragDeal(deal.id)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-2"><strong className="text-sm">{deal.company}</strong><span className="text-xs font-bold text-[#5b4ce0]">{deal.probability}%</span></div><p className="mt-2 text-base font-black">{money(deal.value)}</p><p className={`mt-3 text-xs ${deal.nextAction ? "text-slate-600" : "font-bold text-rose-600"}`}>{deal.nextAction || "Sem próxima ação"}</p></article>)}{!items.length && <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">Solte aqui</div>}</div></section>; })}</div></TabsContent>
      <TabsContent value="clients" className="mt-5"><CrmView data={data} postAction={postAction} /></TabsContent>
      <TabsContent value="activities" className="mt-5"><section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white"><div className="border-b border-slate-100 p-5"><h2 className="text-xl font-black">Minha fila de trabalho</h2><p className="text-sm text-slate-500">Conclua uma atividade e siga para a próxima.</p></div><div className="divide-y divide-slate-100">{pending.map((activity) => <div key={activity.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-[#5b4ce0]"><Clock3 className="size-4" /></span><div className="min-w-0 flex-1"><p className="font-semibold">{activity.title}</p><p className="text-xs text-slate-500">{activity.type} {activity.dueAt ? `· ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(activity.dueAt))}` : ""}</p></div><Button onClick={() => postAction({ action: "completeCrmActivity", id: activity.id }, "Atividade concluída")} className="rounded-xl bg-[#171a1f]">Concluir</Button></div>)}{!pending.length && <div className="py-16 text-center text-sm text-slate-500">Nenhuma atividade pendente.</div>}</div></section></TabsContent>
    </Tabs>
    <NewCrmLeadDialog open={newLead} onOpenChange={setNewLead} postAction={postAction} />
    <NewCrmDealDialog open={newDeal} onOpenChange={setNewDeal} postAction={postAction} />
    <Sheet open={Boolean(selectedLead)} onOpenChange={(open) => !open && setSelectedLeadId(null)}><SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl"><SheetHeader className="border-b border-slate-200 p-6 text-left"><SheetTitle>{selectedLead?.company}</SheetTitle><SheetDescription>{selectedLead?.contactName || "Lead sem contato principal"}</SheetDescription></SheetHeader>{selectedLead && <div className="space-y-5 p-6"><div className="rounded-2xl bg-[#171a1f] p-5 text-white"><p className="text-xs uppercase tracking-wide text-white/50">Próxima ação</p><p className="mt-2 text-lg font-bold">{selectedLead.nextAction || "Defina o próximo passo"}</p>{selectedLead.nextActionAt && <p className="mt-1 text-sm text-white/60">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(selectedLead.nextActionAt))}</p>}</div><div className="grid grid-cols-2 gap-3">{[["Score", selectedLead.score], ["Potencial", money(selectedLead.potentialValue)], ["Origem", selectedLead.source], ["Status", crmLeadStages.find(s => s.key === selectedLead.status)?.label || selectedLead.status]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-200 p-3"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 font-bold">{value}</p></div>)}</div><div><h3 className="font-bold">Contexto</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selectedLead.notes || "Nenhuma observação registrada."}</p></div><div className="flex gap-2"><Button className="flex-1 rounded-xl bg-[#171a1f]" onClick={async () => { await postAction({ action: "convertCrmLead", id: selectedLead.id, value: selectedLead.potentialValue }, "Oportunidade criada"); setSelectedLeadId(null); setTab("deals"); }}>Qualificar e criar oportunidade</Button></div></div>}</SheetContent></Sheet>
  </div>;
}

function NewCrmLeadDialog({ open, onOpenChange, postAction }: { open: boolean; onOpenChange(open: boolean): void; postAction(payload: object, success?: string): Promise<unknown> }) {
  const [company, setCompany] = useState(""); const [contactName, setContactName] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [source, setSource] = useState("Instagram"); const [value, setValue] = useState(""); const [nextAction, setNextAction] = useState(""); const [nextActionAt, setNextActionAt] = useState(""); const [notes, setNotes] = useState(""); const [saving, setSaving] = useState(false);
  async function submit() { try { setSaving(true); await postAction({ action: "createCrmLead", company, contactName, email, phone, source, potentialValue: Number(value) * 100, nextAction, nextActionAt, notes }, "Lead criado"); onOpenChange(false); setCompany(""); setContactName(""); setEmail(""); setPhone(""); setValue(""); setNextAction(""); setNextActionAt(""); setNotes(""); } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao criar lead"); } finally { setSaving(false); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-[22px] sm:max-w-2xl"><DialogHeader><DialogTitle>Novo lead</DialogTitle><DialogDescription>Cadastro rápido agora; o contexto pode ser enriquecido depois.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="mb-1 block text-sm font-semibold">Empresa ou nome</label><Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Clínica Aura" /></div><div><label className="mb-1 block text-sm font-semibold">Contato principal</label><Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="João Silva" /></div><div><label className="mb-1 block text-sm font-semibold">Origem</label><Select value={source} onValueChange={setSource}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Instagram", "Indicação", "Outbound", "Site", "WhatsApp", "Evento", "Outro"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><label className="mb-1 block text-sm font-semibold">E-mail</label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div><div><label className="mb-1 block text-sm font-semibold">Telefone / WhatsApp</label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div><div><label className="mb-1 block text-sm font-semibold">Valor potencial (R$)</label><Input type="number" value={value} onChange={e => setValue(e.target.value)} /></div><div><label className="mb-1 block text-sm font-semibold">Data da próxima ação</label><Input type="datetime-local" value={nextActionAt} onChange={e => setNextActionAt(e.target.value)} /></div><div className="sm:col-span-2"><label className="mb-1 block text-sm font-semibold">Próxima ação</label><Input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="Ligar e confirmar interesse" /></div><div className="sm:col-span-2"><label className="mb-1 block text-sm font-semibold">Contexto inicial</label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Necessidade, urgência e informações relevantes" /></div></div><DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit} disabled={saving || !company.trim()} className="rounded-xl bg-[#171a1f]">{saving ? "Salvando..." : "Criar lead"}</Button></DialogFooter></DialogContent></Dialog>;
}

function NewCrmDealDialog({ open, onOpenChange, postAction }: { open: boolean; onOpenChange(open: boolean): void; postAction(payload: object, success?: string): Promise<unknown> }) {
  const [company, setCompany] = useState(""); const [contactName, setContactName] = useState(""); const [value, setValue] = useState(""); const [nextAction, setNextAction] = useState(""); const [nextActionAt, setNextActionAt] = useState(""); const [closeDate, setCloseDate] = useState(""); const [notes, setNotes] = useState(""); const [saving, setSaving] = useState(false);
  async function submit() { try { setSaving(true); await postAction({ action: "createCrmDeal", company, contactName, value: Number(value) * 100, nextAction, nextActionAt, closeDate, notes }, "Oportunidade criada"); onOpenChange(false); setCompany(""); setContactName(""); setValue(""); setNextAction(""); setNextActionAt(""); setCloseDate(""); setNotes(""); } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao criar oportunidade"); } finally { setSaving(false); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="rounded-[22px] sm:max-w-xl"><DialogHeader><DialogTitle>Nova oportunidade</DialogTitle><DialogDescription>Registre valor, previsão e o próximo passo comercial.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="mb-1 block text-sm font-semibold">Empresa</label><Input value={company} onChange={e => setCompany(e.target.value)} /></div><div><label className="mb-1 block text-sm font-semibold">Contato</label><Input value={contactName} onChange={e => setContactName(e.target.value)} /></div><div><label className="mb-1 block text-sm font-semibold">Valor (R$)</label><Input type="number" value={value} onChange={e => setValue(e.target.value)} /></div><div><label className="mb-1 block text-sm font-semibold">Fechamento previsto</label><Input type="date" value={closeDate} onChange={e => setCloseDate(e.target.value)} /></div><div><label className="mb-1 block text-sm font-semibold">Data da próxima ação</label><Input type="datetime-local" value={nextActionAt} onChange={e => setNextActionAt(e.target.value)} /></div><div className="sm:col-span-2"><label className="mb-1 block text-sm font-semibold">Próxima ação</label><Input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="Agendar discovery" /></div><div className="sm:col-span-2"><label className="mb-1 block text-sm font-semibold">Contexto</label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div></div><DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit} disabled={saving || !company.trim()} className="rounded-xl bg-[#171a1f]">{saving ? "Salvando..." : "Criar oportunidade"}</Button></DialogFooter></DialogContent></Dialog>;
}

function CrmView({ data, postAction }: { data: WorkspaceData; postAction(payload: object, success?: string): Promise<unknown> }) {
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [overStatus, setOverStatus] = useState<string | null>(null);

  const statuses = [
    { key: "prospecting", label: "Prospecção" },
    { key: "active", label: "Ativos" },
    { key: "inactive", label: "Inativos" }
  ];

  async function moveClient(clientId: string, newStatus: "prospecting" | "active" | "inactive") {
    try {
      const client = data.clients.find(c => c.id === clientId);
      if (!client || client.status === newStatus) return;
      await postAction({ 
        action: "updateClientCrm", 
        id: client.id, 
        status: newStatus, 
        contactName: client.contactName, 
        phone: client.phone, 
        email: client.email, 
        revenue: client.revenue, 
        dueDay: client.dueDay,
        notes: client.notes 
      }, `Cliente movido para ${statuses.find(s => s.key === newStatus)?.label}`);
    } catch(e) {
      toast.error("Falha ao mover cliente");
    } finally {
      setOverStatus(null);
    }
  }

  const filteredClients = data.clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return <div className="p-4 sm:p-6 lg:p-8">
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-black tracking-tight text-slate-900">CRM de Clientes</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Buscar cliente..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="rounded-xl pl-9 w-64 bg-white shadow-sm" />
      </div>
    </div>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {statuses.map(({ key, label }) => {
        const clients = filteredClients.filter(c => c.status === key);
        return <div 
          key={key} 
          className={`flex flex-col gap-3 rounded-2xl p-4 shadow-sm transition ${overStatus === key ? 'bg-[#6e5eff]/10 ring-2 ring-[#6e5eff]/30' : 'bg-white'}`}
          onDragOver={e => { e.preventDefault(); setOverStatus(key); }}
          onDragLeave={() => setOverStatus(curr => curr === key ? null : curr)}
          onDrop={e => { e.preventDefault(); const clientId = e.dataTransfer.getData("text/plain"); if (clientId) moveClient(clientId, key as any); }}
        >
          <h2 className="font-bold uppercase tracking-wide text-slate-500 text-xs">{label} ({clients.length})</h2>
          {clients.map(client => (
            <div 
              key={client.id} 
              draggable
              onDragStart={e => e.dataTransfer.setData("text/plain", client.id)}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-[#6e5eff] cursor-grab active:cursor-grabbing"
            >
              <div className="flex justify-between items-start">
                <span className="font-bold flex items-center gap-2"><GripVertical className="size-3 text-slate-300"/>{client.name}</span>
                <Button variant="ghost" size="icon-xs" onClick={() => setEditingClient(client.id)}><Edit3 className="size-3" /></Button>
              </div>
              {client.revenue > 0 && <span className="mt-1 block pl-5 text-sm font-medium text-green-600">R$ {(client.revenue / 100).toFixed(2)}</span>}
              <span className="mt-1 block pl-5 text-xs text-slate-500">{client.email || "Sem e-mail"}</span>
            </div>
          ))}
          {!clients.length && <div className="rounded-2xl border border-dashed border-slate-250 px-3 py-7 text-center text-xs text-slate-400">Solte um cliente aqui</div>}
        </div>
      })}
    </div>
    {editingClient && <CrmEditDialog open={!!editingClient} client={data.clients.find(c => c.id === editingClient)!} onOpenChange={() => setEditingClient(null)} postAction={postAction} />}
  </div>;
}

function CrmEditDialog({ open, client, onOpenChange, postAction }: { open: boolean; client: WorkspaceData["clients"][0]; onOpenChange(): void; postAction(p: object, s?: string): Promise<unknown> }) {
  const [status, setStatus] = useState(client.status); const [contactName, setContactName] = useState(client.contactName); const [email, setEmail] = useState(client.email); const [phone, setPhone] = useState(client.phone); const [revenue, setRevenue] = useState(String(client.revenue / 100)); const [dueDay, setDueDay] = useState(String(client.dueDay || 5)); const [notes, setNotes] = useState(client.notes); const [saving, setSaving] = useState(false);
  async function submit() { try { setSaving(true); await postAction({ action: "updateClientCrm", id: client.id, status, contactName, phone, email, revenue: Number(revenue) * 100, dueDay: Number(dueDay), notes }, "CRM e previsões atualizados"); onOpenChange(); } catch (e) { toast.error("Falha ao salvar"); } finally { setSaving(false); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>Editar {client.name}</DialogTitle></DialogHeader><div className="grid gap-3">
    <div className="grid grid-cols-3 gap-3"><div><label className="text-xs font-semibold">Status</label><Select value={status} onValueChange={(v: any) => setStatus(v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="prospecting">Prospecção</SelectItem><SelectItem value="active">Ativo</SelectItem><SelectItem value="inactive">Inativo</SelectItem></SelectContent></Select></div><div><label className="text-xs font-semibold">Mensalidade (R$)</label><Input type="number" min="0" step="0.01" value={revenue} onChange={e => setRevenue(e.target.value)} /></div><div><label className="text-xs font-semibold">Vencimento</label><Input type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} /></div></div>
    <div><label className="text-xs font-semibold">Nome do Contato</label><Input value={contactName} onChange={e => setContactName(e.target.value)} /></div>
    <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold">E-mail</label><Input value={email} onChange={e => setEmail(e.target.value)} /></div><div><label className="text-xs font-semibold">Telefone</label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div></div>
    <div><label className="text-xs font-semibold">Anotações</label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
  </div><DialogFooter><Button variant="ghost" onClick={onOpenChange}>Cancelar</Button><Button onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter></DialogContent></Dialog>;
}

const financeStatus = {
  predicted: { label: "Previsto", className: "bg-slate-100 text-slate-700" },
  open: { label: "Em aberto", className: "bg-amber-50 text-amber-700" },
  pending: { label: "Em aberto", className: "bg-amber-50 text-amber-700" },
  partial: { label: "Parcial", className: "bg-blue-50 text-blue-700" },
  paid: { label: "Liquidado", className: "bg-emerald-50 text-emerald-700" },
  overdue: { label: "Vencido", className: "bg-rose-50 text-rose-700" },
  cancelled: { label: "Cancelado", className: "bg-slate-100 text-slate-500" },
} as const;

function FinanceView({ data, postAction }: { data: WorkspaceData; postAction(payload: object, success?: string): Promise<unknown> }) {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [workerOpen, setWorkerOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [filterClient, setFilterClient] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [query, setQuery] = useState("");

  const visibleTransactions = data.transactions.filter(t => !t.archivedAt).map(t => {
    const overdue = !["paid", "cancelled"].includes(t.status) && new Date(t.dueDate) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { ...t, displayStatus: overdue ? "overdue" : t.status === ("pending" as typeof t.status) ? "open" : t.status };
  });
  const filtered = visibleTransactions.filter(t => {
    const date = new Date(t.dueDate);
    if (filterYear !== "all" && String(date.getFullYear()) !== filterYear) return false;
    if (filterMonth !== "all" && String(date.getMonth() + 1) !== filterMonth) return false;
    if (filterClient !== "all" && t.clientId !== filterClient) return false;
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterStatus !== "all" && t.displayStatus !== filterStatus) return false;
    const client = data.clients.find(c => c.id === t.clientId)?.name ?? "";
    return `${t.description} ${t.counterpart} ${t.category} ${t.costCenter} ${client}`.toLowerCase().includes(query.toLowerCase());
  });
  const realizedIncome = filtered.filter(t => t.type === "income" && t.status === "paid").reduce((sum, t) => sum + t.amount, 0);
  const realizedExpense = filtered.filter(t => t.type === "expense" && t.status === "paid").reduce((sum, t) => sum + t.amount, 0);
  const receivable = filtered.filter(t => t.type === "income" && !["paid", "cancelled"].includes(t.status)).reduce((sum, t) => sum + Math.max(0, t.amount - t.paidAmount), 0);
  const payable = filtered.filter(t => t.type === "expense" && !["paid", "cancelled"].includes(t.status)).reduce((sum, t) => sum + Math.max(0, t.amount - t.paidAmount), 0);
  const overdueItems = filtered.filter(t => t.displayStatus === "overdue");
  const missingInvoices = data.workerCompetencies.filter(c => c.invoiceStatus === "waiting" || c.invoiceStatus === "divergent");
  const teamCost = data.workerCompetencies.filter(c => c.competence === `${filterYear}-${filterMonth.padStart(2, "0")}`).reduce((sum, c) => sum + c.expectedAmount + c.adjustments, 0);
  const categories = Array.from(new Set(visibleTransactions.map(t => t.category).filter(Boolean)));
  const accounts = Array.from(new Set(visibleTransactions.map(t => t.account).filter(Boolean)));
  const costCenters = Array.from(new Set([...visibleTransactions.map(t => t.costCenter), ...data.financeWorkers.map(w => w.costCenter)].filter(Boolean)));
  const categoryTotals = categories.map(category => ({ category, value: filtered.filter(t => t.type === "expense" && t.category === category).reduce((sum, t) => sum + t.amount, 0) })).sort((a, b) => b.value - a.value);

  return <div className="p-4 sm:p-6 lg:p-8">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6e5eff]">Gestão da agência</p><h1 className="text-2xl font-black tracking-tight text-slate-900">Financeiro</h1><p className="text-sm text-slate-500">Caixa, compromissos, clientes e equipe em um só lugar.</p></div><Button onClick={() => setOpen(true)} className="rounded-xl bg-[#171a1f]"><Plus className="size-4" />Novo lançamento</Button></div>

    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <Select value={filterYear} onValueChange={setFilterYear}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os anos</SelectItem>{[2024,2025,2026,2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
        <Select value={filterMonth} onValueChange={setFilterMonth}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os meses</SelectItem>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i} value={String(i + 1)}>{new Date(2026, i, 1).toLocaleString("pt-BR", { month: "long" })}</SelectItem>)}</SelectContent></Select>
        <Select value={filterClient} onValueChange={setFilterClient}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Cliente" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os clientes</SelectItem>{data.clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Entradas e saídas</SelectItem><SelectItem value="income">Entradas</SelectItem><SelectItem value="expense">Saídas</SelectItem></SelectContent></Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem>{Object.entries(financeStatus).filter(([key]) => key !== "pending").map(([key, meta]) => <SelectItem key={key} value={key}>{meta.label}</SelectItem>)}</SelectContent></Select>
        <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar..." className="rounded-xl pl-9"/></div>
      </div>
      <div className="mt-2 flex items-center justify-between px-1 text-xs text-slate-500"><span>Contexto: {filterClient === "all" ? "todos os clientes" : data.clients.find(c => c.id === filterClient)?.name} · {filterMonth === "all" ? "todos os meses" : new Date(2026, Number(filterMonth) - 1).toLocaleString("pt-BR", { month: "long" })}/{filterYear}</span><button onClick={() => { setFilterClient("all"); setFilterStatus("all"); setFilterType("all"); setQuery(""); }} className="font-semibold text-[#6e5eff]">Limpar filtros</button></div>
    </div>

    <Tabs defaultValue="overview" className="space-y-5">
      <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-slate-100 p-1"><TabsTrigger value="overview">Visão geral</TabsTrigger><TabsTrigger value="moves">Movimentações</TabsTrigger><TabsTrigger value="payable">Contas a pagar</TabsTrigger><TabsTrigger value="receivable">Contas a receber</TabsTrigger><TabsTrigger value="people">Pessoas</TabsTrigger><TabsTrigger value="reports">Relatórios</TabsTrigger></TabsList>
      <TabsContent value="overview" className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <FinanceKpi label="Saldo realizado" value={realizedIncome - realizedExpense} detail={`${money(realizedIncome)} entrou · ${money(realizedExpense)} saiu`} tone="violet" />
          <FinanceKpi label="Saldo projetado" value={realizedIncome - realizedExpense + receivable - payable} detail="realizado + previsões" />
          <FinanceKpi label="A receber" value={receivable} detail={`${filtered.filter(t => t.type === "income" && t.status !== "paid").length} lançamentos`} tone="green" />
          <FinanceKpi label="A pagar" value={payable} detail={`${filtered.filter(t => t.type === "expense" && t.status !== "paid").length} compromissos`} tone="red" />
          <FinanceKpi label="Custo da equipe" value={teamCost} detail="competência selecionada" tone="amber" />
        </div>
        <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-slate-900">Prioridades agora</h2><Bell className="size-4 text-[#6e5eff]"/></div><div className="space-y-2">
            <FinanceAlert count={overdueItems.filter(t => t.type === "expense").length} label="pagamentos vencidos" tone="red" />
            <FinanceAlert count={overdueItems.filter(t => t.type === "income").length} label="recebimentos atrasados" tone="amber" />
            <FinanceAlert count={missingInvoices.length} label="competências com NF pendente" tone="violet" />
            {!overdueItems.length && !missingInvoices.length && <div className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700"><CheckCircle2 className="mr-2 inline size-4"/>Nenhuma pendência crítica neste contexto.</div>}
          </div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Próximos compromissos</h2><p className="text-xs text-slate-500">Ordenados por vencimento</p></div><CalendarClock className="size-4 text-slate-400"/></div><FinanceTransactionTable transactions={filtered.filter(t => !["paid", "cancelled"].includes(t.status)).slice(0, 5)} data={data} postAction={postAction} compact /></div>
        </div>
      </TabsContent>
      <TabsContent value="moves"><FinanceTransactionTable transactions={filtered} data={data} postAction={postAction} /></TabsContent>
      <TabsContent value="payable"><FinanceTransactionTable transactions={filtered.filter(t => t.type === "expense")} data={data} postAction={postAction} empty="Nenhuma conta a pagar neste período." /></TabsContent>
      <TabsContent value="receivable"><FinanceTransactionTable transactions={filtered.filter(t => t.type === "income")} data={data} postAction={postAction} empty="Nenhuma conta a receber neste período." /></TabsContent>
      <TabsContent value="people" className="space-y-4">
        <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Funcionários e prestadores</h2><p className="text-sm text-slate-500">Competências, pagamentos e documentos de CLT/PJ.</p></div><Button variant="outline" onClick={() => setWorkerOpen(true)} className="rounded-xl"><UserPlus className="size-4"/>Adicionar profissional</Button></div>
        <div className="grid gap-4 lg:grid-cols-2">{data.financeWorkers.map(worker => <FinanceWorkerCard key={worker.id} worker={worker} data={data} postAction={postAction} />)}{!data.financeWorkers.length && <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Users className="mx-auto mb-3 size-8 text-slate-300"/><p className="font-semibold">Nenhum profissional cadastrado</p><p className="text-sm text-slate-500">Cadastre CLTs e PJs para controlar pagamentos e notas por mês.</p></div>}</div>
      </TabsContent>
      <TabsContent value="reports" className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">DRE gerencial simplificada</h2><p className="mb-5 text-xs text-slate-500">Por caixa no período selecionado</p><div className="space-y-3 text-sm"><FinanceReportLine label="Receita realizada" value={realizedIncome}/><FinanceReportLine label="(-) Despesas realizadas" value={-realizedExpense}/><FinanceReportLine label="Resultado operacional" value={realizedIncome - realizedExpense} strong/></div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Despesas por categoria</h2><p className="mb-5 text-xs text-slate-500">Onde o dinheiro está sendo consumido</p><div className="space-y-3">{categoryTotals.slice(0, 8).map(item => <div key={item.category}><div className="mb-1 flex justify-between text-sm"><span>{item.category}</span><strong>{money(item.value)}</strong></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#6e5eff]" style={{ width: `${categoryTotals[0]?.value ? Math.max(4, item.value / categoryTotals[0].value * 100) : 0}%` }}/></div></div>)}{!categoryTotals.length && <p className="text-sm text-slate-500">Sem despesas no contexto selecionado.</p>}</div></div>
      </TabsContent>
    </Tabs>
    {open && <FinanceDialog open={open} onOpenChange={setOpen} data={data} postAction={postAction} categories={categories} accounts={accounts} costCenters={costCenters} />}
    {workerOpen && <FinanceWorkerDialog open={workerOpen} onOpenChange={setWorkerOpen} postAction={postAction} />}
  </div>;
}

function FinanceKpi({ label, value, detail, tone = "slate" }: { label: string; value: number; detail: string; tone?: "slate" | "violet" | "green" | "red" | "amber" }) {
  const toneClass = { slate: "text-slate-900", violet: "text-[#6e5eff]", green: "text-emerald-600", red: "text-rose-600", amber: "text-amber-600" }[tone];
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="text-xs font-semibold text-slate-500">{label}</span><span className={`mt-1 block text-2xl font-black ${toneClass}`}>{money(value)}</span><span className="mt-1 block text-[11px] text-slate-400">{detail}</span></div>;
}

function FinanceAlert({ count, label, tone }: { count: number; label: string; tone: "red" | "amber" | "violet" }) {
  if (!count) return null;
  const classes = { red: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-700", violet: "bg-violet-50 text-violet-700" }[tone];
  return <div className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm ${classes}`}><span><strong>{count}</strong> {label}</span><ChevronRight className="size-4"/></div>;
}

function FinanceReportLine({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return <div className={`flex items-center justify-between border-b border-slate-100 pb-3 ${strong ? "text-base font-black" : ""}`}><span>{label}</span><span className={value < 0 ? "text-rose-600" : "text-emerald-600"}>{money(value)}</span></div>;
}

function FinanceTransactionTable({ transactions: rows, data, postAction, compact = false, empty = "Nenhum lançamento encontrado." }: { transactions: Array<WorkspaceData["transactions"][number] & { displayStatus?: string }>; data: WorkspaceData; postAction(payload: object, success?: string): Promise<unknown>; compact?: boolean; empty?: string }) {
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-4 font-semibold">Descrição / contraparte</th><th className="p-4 font-semibold">Competência</th><th className="p-4 font-semibold">Categoria / centro</th><th className="p-4 font-semibold">Valor</th><th className="p-4 font-semibold">Vencimento</th><th className="p-4 font-semibold">Status</th><th className="p-4 text-right font-semibold">Ações</th></tr></thead><tbody>{rows.map(t => {
    const statusKey = (t.displayStatus || t.status) as keyof typeof financeStatus;
    const client = data.clients.find(c => c.id === t.clientId);
    const documents = data.financialDocuments.filter(d => d.transactionId === t.id);
    return <tr key={t.id} className="border-t border-slate-100 align-top hover:bg-slate-50/60"><td className="p-4"><div className="flex items-start gap-2">{t.type === "income" ? <TrendingUp className="mt-0.5 size-4 text-emerald-500"/> : <TrendingDown className="mt-0.5 size-4 text-rose-500"/>}<div><p className="font-semibold text-slate-900">{t.description}</p><p className="text-xs text-slate-500">{client?.name || t.counterpart || "Sem contraparte"} · {t.account}</p>{documents.length > 0 && <a href={documents[0].url} target="_blank" className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#6e5eff]"><Paperclip className="size-3"/>{documents.length} anexo(s)</a>}</div></div></td><td className="p-4 text-slate-600">{t.competence || new Date(t.dueDate).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })}</td><td className="p-4"><p>{t.category}</p><p className="text-xs text-slate-400">{t.costCenter || "Sem centro"}</p></td><td className={`p-4 font-bold ${t.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>{money(t.amount)}</td><td className="p-4 text-slate-600">{new Date(t.dueDate).toLocaleDateString("pt-BR")}</td><td className="p-4"><Badge className={financeStatus[statusKey]?.className ?? financeStatus.open.className}>{financeStatus[statusKey]?.label ?? "Em aberto"}</Badge></td><td className="p-4"><div className="flex justify-end gap-1">{t.status !== "paid" && t.status !== "cancelled" && <Button size="sm" variant="ghost" className="text-emerald-700" onClick={() => postAction({ action: "updateTransaction", id: t.id, status: "paid" }, t.type === "income" ? "Recebimento confirmado" : "Pagamento confirmado")}><Check className="size-4"/><span className={compact ? "sr-only" : "hidden xl:inline"}>{t.type === "income" ? "Receber" : "Pagar"}</span></Button>}<FinanceDocumentButton transactionId={t.id}/>{!compact && <Button size="icon-sm" variant="ghost" title="Duplicar" onClick={() => postAction({ action: "duplicateTransaction", id: t.id }, "Lançamento duplicado")}><FileText className="size-4"/></Button>}{!compact && <Button size="icon-sm" variant="ghost" title="Arquivar" className="text-rose-600" onClick={() => { if (confirm("Arquivar este lançamento? O histórico será preservado.")) postAction({ action: "archiveTransaction", id: t.id }, "Lançamento arquivado"); }}><Trash2 className="size-4"/></Button>}</div></td></tr>;
  })}{!rows.length && <tr><td colSpan={7} className="p-10 text-center text-sm text-slate-500">{empty}</td></tr>}</tbody></table></div></div>;
}

function FinanceDocumentButton({ transactionId, workerCompetencyId }: { transactionId?: string; workerCompetencyId?: string }) {
  const [uploading, setUploading] = useState(false);
  async function upload(file?: File) { if (!file) return; try { setUploading(true); const form = new FormData(); if (transactionId) form.set("transactionId", transactionId); if (workerCompetencyId) form.set("workerCompetencyId", workerCompetencyId); form.set("type", workerCompetencyId ? "invoice" : "receipt"); form.set("file", file); const response = await fetch("/api/finance/documents/upload", { method: "POST", body: form }); const body = await readApiResponse(response); if (!response.ok) throw new Error(body.error); toast.success("Documento anexado"); window.location.reload(); } catch (error) { toast.error(error instanceof Error ? error.message : "Falha no anexo"); } finally { setUploading(false); } }
  return <Button asChild size="icon-sm" variant="ghost" title={workerCompetencyId ? "Anexar nota fiscal" : "Anexar documento"}><label className="cursor-pointer"><Upload className="size-4"/><input className="hidden" type="file" accept="image/*,.pdf" disabled={uploading} onChange={e => upload(e.target.files?.[0])}/></label></Button>;
}

function FinanceWorkerCard({ worker, data, postAction }: { worker: WorkspaceData["financeWorkers"][number]; data: WorkspaceData; postAction(payload: object, success?: string): Promise<unknown> }) {
  const currentCompetence = new Date().toISOString().slice(0, 7);
  const competencies = data.workerCompetencies.filter(c => c.workerId === worker.id).sort((a,b) => b.competence.localeCompare(a.competence));
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><h3 className="font-bold text-slate-900">{worker.name}</h3><Badge variant="secondary">{worker.employmentType.toUpperCase()}</Badge></div><p className="text-sm text-slate-500">{worker.role || "Sem função"} · {worker.costCenter}</p></div><div className="text-right"><strong className="block">{money(worker.monthlyAmount)}</strong><span className="text-xs text-slate-400">dia {worker.paymentDay}</span></div></div><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => postAction({ action: "createWorkerCompetency", workerId: worker.id, competence: currentCompetence }, "Competência gerada")}>Gerar {currentCompetence}</Button><Button size="sm" variant="ghost" onClick={() => postAction({ action: "updateFinanceWorker", id: worker.id, status: worker.status === "inactive" ? "active" : "inactive" }, worker.status === "inactive" ? "Profissional reativado" : "Profissional inativado")}>{worker.status === "inactive" ? "Reativar" : "Inativar"}</Button></div><div className="mt-4 space-y-2">{competencies.slice(0,3).map(c => { const docs = data.financialDocuments.filter(d => d.workerCompetencyId === c.id); return <div key={c.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><div><p className="text-sm font-semibold">{c.competence} · {money(c.expectedAmount + c.adjustments)}</p><p className="text-[11px] text-slate-500">NF: {c.invoiceStatus === "not_required" ? "não exigida" : c.invoiceStatus === "waiting" ? "aguardando" : c.invoiceStatus === "divergent" ? "divergente" : "anexada"}{docs.length ? ` · ${docs.length} arquivo(s)` : ""}</p></div><div className="flex items-center gap-1"><Badge className={c.status === "paid" ? "bg-emerald-50 text-emerald-700" : c.status === "waiting_document" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"}>{c.status === "paid" ? "Pago" : c.status === "waiting_document" ? "Aguardando NF" : c.status === "approved" ? "Aprovado" : "Previsto"}</Badge>{c.invoiceStatus !== "not_required" && <FinanceDocumentButton workerCompetencyId={c.id}/>} {c.status !== "paid" && <Button size="icon-sm" variant="ghost" onClick={() => postAction({ action: "updateWorkerCompetency", id: c.id, status: "paid" }, "Pagamento registrado")}><Check className="size-4 text-emerald-600"/></Button>}</div></div>; })}{!competencies.length && <p className="rounded-xl border border-dashed p-3 text-center text-xs text-slate-400">Nenhuma competência mensal gerada.</p>}</div></div>;
}

function FinanceDialog({ open, onOpenChange, data, postAction, categories, accounts, costCenters }: { open: boolean; onOpenChange(open: boolean): void; data: WorkspaceData; postAction(p: object, s?: string): Promise<unknown>; categories: string[]; accounts: string[]; costCenters: string[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState<"income" | "expense">("income"); const [amount, setAmount] = useState(""); const [description, setDescription] = useState(""); const [counterpart, setCounterpart] = useState(""); const [category, setCategory] = useState(""); const [costCenter, setCostCenter] = useState(""); const [account, setAccount] = useState("Conta principal"); const [competence, setCompetence] = useState(today.slice(0,7)); const [dueDate, setDueDate] = useState(today); const [clientId, setClientId] = useState("none"); const [status, setStatus] = useState<"predicted" | "open" | "paid">("open"); const [paymentMethod, setPaymentMethod] = useState("Pix"); const [recurring, setRecurring] = useState(false); const [notes, setNotes] = useState(""); const [saving, setSaving] = useState(false);
  async function submit() { try { setSaving(true); await postAction({ action: "createTransaction", type, amount: Math.round(Number(amount.replace(",", ".")) * 100), category, costCenter, account, status, competence, dueDate, clientId: clientId === "none" ? null : clientId, counterpart, paymentMethod, recurring, recurrence: recurring ? "monthly" : "", description, notes }, "Lançamento salvo"); onOpenChange(false); } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao salvar"); } finally { setSaving(false); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-[22px] sm:max-w-2xl"><DialogHeader><DialogTitle>Novo lançamento</DialogTitle><DialogDescription>Registre o essencial. Os detalhes financeiros ficam vinculados ao mesmo histórico.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2 grid grid-cols-2 gap-2"><Button type="button" variant={type === "income" ? "default" : "outline"} onClick={() => setType("income")} className={type === "income" ? "bg-emerald-600 hover:bg-emerald-700" : ""}><TrendingUp className="size-4"/>Entrada</Button><Button type="button" variant={type === "expense" ? "default" : "outline"} onClick={() => setType("expense")} className={type === "expense" ? "bg-rose-600 hover:bg-rose-700" : ""}><TrendingDown className="size-4"/>Saída</Button></div><FinanceField label="Descrição"><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Mensalidade, software, serviço..."/></FinanceField><FinanceField label="Valor (R$)"><Input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00"/></FinanceField><FinanceField label={type === "income" ? "Cliente" : "Cliente relacionado"}><Select value={clientId} onValueChange={setClientId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Nenhum cliente</SelectItem>{data.clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></FinanceField><FinanceField label="Contraparte"><Input value={counterpart} onChange={e => setCounterpart(e.target.value)} placeholder={type === "income" ? "Pagador" : "Fornecedor / favorecido"}/></FinanceField><FinanceField label="Categoria"><Input list="finance-categories" value={category} onChange={e => setCategory(e.target.value)} placeholder="Receitas, Equipe, Software..."/><datalist id="finance-categories">{categories.map(v => <option key={v} value={v}/>)}</datalist></FinanceField><FinanceField label="Centro de custo"><Input list="finance-cost-centers" value={costCenter} onChange={e => setCostCenter(e.target.value)} placeholder="Operação, Criação, Comercial..."/><datalist id="finance-cost-centers">{costCenters.map(v => <option key={v} value={v}/>)}</datalist></FinanceField><FinanceField label="Competência"><Input type="month" value={competence} onChange={e => setCompetence(e.target.value)}/></FinanceField><FinanceField label="Vencimento"><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}/></FinanceField><FinanceField label="Conta financeira"><Input list="finance-accounts" value={account} onChange={e => setAccount(e.target.value)}/><datalist id="finance-accounts">{accounts.map(v => <option key={v} value={v}/>)}</datalist></FinanceField><FinanceField label="Forma de pagamento"><Input value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} placeholder="Pix, boleto, cartão..."/></FinanceField><FinanceField label="Status"><Select value={status} onValueChange={(v: "predicted" | "open" | "paid") => setStatus(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="predicted">Previsto</SelectItem><SelectItem value="open">Em aberto</SelectItem><SelectItem value="paid">{type === "income" ? "Recebido" : "Pago"}</SelectItem></SelectContent></Select></FinanceField><FinanceField label="Recorrência"><Button type="button" variant={recurring ? "default" : "outline"} onClick={() => setRecurring(!recurring)} className="w-full justify-start">{recurring ? <Check className="size-4"/> : <CircleDot className="size-4"/>}{recurring ? "Mensal recorrente" : "Lançamento único"}</Button></FinanceField><div className="sm:col-span-2"><FinanceField label="Observações"><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Informações internas e contexto do lançamento."/></FinanceField></div></div><DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit} disabled={saving || !description.trim() || !category.trim() || !amount} className="rounded-xl bg-[#171a1f]">{saving ? "Salvando..." : "Salvar lançamento"}</Button></DialogFooter></DialogContent></Dialog>;
}

function FinanceWorkerDialog({ open, onOpenChange, postAction }: { open: boolean; onOpenChange(open: boolean): void; postAction(p: object, s?: string): Promise<unknown> }) {
  const [name, setName] = useState(""); const [employmentType, setEmploymentType] = useState<"clt" | "pj" | "partner" | "intern" | "freelancer" | "other">("pj"); const [taxId, setTaxId] = useState(""); const [companyName, setCompanyName] = useState(""); const [role, setRole] = useState(""); const [costCenter, setCostCenter] = useState("Equipe"); const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [monthlyAmount, setMonthlyAmount] = useState(""); const [paymentDay, setPaymentDay] = useState("5"); const [paymentMethod, setPaymentMethod] = useState("Pix"); const [paymentDetails, setPaymentDetails] = useState(""); const [invoiceRequired, setInvoiceRequired] = useState(true); const [contractEnd, setContractEnd] = useState(""); const [notes, setNotes] = useState(""); const [saving, setSaving] = useState(false);
  async function submit() { try { setSaving(true); await postAction({ action: "createFinanceWorker", name, employmentType, taxId, companyName, role, costCenter, email, phone, monthlyAmount: Math.round(Number(monthlyAmount.replace(",", ".")) * 100), paymentDay: Number(paymentDay), paymentMethod, paymentDetails, invoiceRequired, contractEnd: contractEnd || null, notes }, "Profissional cadastrado"); onOpenChange(false); } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao cadastrar"); } finally { setSaving(false); } }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-[22px] sm:max-w-2xl"><DialogHeader><DialogTitle>Adicionar funcionário ou prestador</DialogTitle><DialogDescription>O cadastro financeiro fica separado do acesso ao sistema.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><FinanceField label="Nome completo"><Input value={name} onChange={e => setName(e.target.value)}/></FinanceField><FinanceField label="Vínculo"><Select value={employmentType} onValueChange={(v: typeof employmentType) => { setEmploymentType(v); setInvoiceRequired(v === "pj" || v === "freelancer"); }}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="clt">CLT</SelectItem><SelectItem value="pj">PJ</SelectItem><SelectItem value="partner">Sócio / pró-labore</SelectItem><SelectItem value="intern">Estágio</SelectItem><SelectItem value="freelancer">Freelancer</SelectItem><SelectItem value="other">Outro</SelectItem></SelectContent></Select></FinanceField><FinanceField label="CPF / CNPJ"><Input value={taxId} onChange={e => setTaxId(e.target.value)}/></FinanceField><FinanceField label="Razão social / empresa"><Input value={companyName} onChange={e => setCompanyName(e.target.value)}/></FinanceField><FinanceField label="Função"><Input value={role} onChange={e => setRole(e.target.value)} placeholder="Designer, Social Media..."/></FinanceField><FinanceField label="Centro de custo"><Input value={costCenter} onChange={e => setCostCenter(e.target.value)}/></FinanceField><FinanceField label="E-mail"><Input type="email" value={email} onChange={e => setEmail(e.target.value)}/></FinanceField><FinanceField label="Telefone"><Input value={phone} onChange={e => setPhone(e.target.value)}/></FinanceField><FinanceField label="Valor mensal (R$)"><Input inputMode="decimal" value={monthlyAmount} onChange={e => setMonthlyAmount(e.target.value)}/></FinanceField><FinanceField label="Dia de pagamento"><Input type="number" min="1" max="31" value={paymentDay} onChange={e => setPaymentDay(e.target.value)}/></FinanceField><FinanceField label="Forma de pagamento"><Input value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}/></FinanceField><FinanceField label="Chave / dados bancários"><Input value={paymentDetails} onChange={e => setPaymentDetails(e.target.value)}/></FinanceField><FinanceField label="Fim / renovação do contrato"><Input type="date" value={contractEnd} onChange={e => setContractEnd(e.target.value)}/></FinanceField><FinanceField label="Nota fiscal"><Button type="button" variant={invoiceRequired ? "default" : "outline"} className="w-full" onClick={() => setInvoiceRequired(!invoiceRequired)}>{invoiceRequired ? <Check className="size-4"/> : null}{invoiceRequired ? "NF obrigatória" : "NF não exigida"}</Button></FinanceField><div className="sm:col-span-2"><FinanceField label="Observações"><Textarea value={notes} onChange={e => setNotes(e.target.value)}/></FinanceField></div></div><DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit} disabled={saving || !name.trim() || !monthlyAmount} className="rounded-xl bg-[#171a1f]">{saving ? "Salvando..." : "Adicionar profissional"}</Button></DialogFooter></DialogContent></Dialog>;
}

function FinanceField({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>; }
