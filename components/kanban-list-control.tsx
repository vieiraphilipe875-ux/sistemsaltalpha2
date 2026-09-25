"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  GripVertical,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Trash2,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  defaultKanbanColumns,
  type KanbanBoardConfig,
  type KanbanColumn,
} from "@/lib/kanban";

const palette = [
  "#DFEEFF",
  "#E6E7FD",
  "#DFF3EB",
  "#F9E6EF",
  "#D9E8B9",
  "#FCE8BE",
  "#E7EBEF",
];

/** Controls live beside the list they change; the server still authorizes every save. */
export function KanbanListControl({
  config,
  columnId,
  count = 0,
  postAction,
  members = [],
}: {
  config: KanbanBoardConfig;
  columnId?: string;
  members?: { id: string; name: string }[];
  count?: number;
  postAction(payload: object, success?: string): Promise<unknown>;
}) {
  const [mode, setMode] = useState<"add" | "edit" | "remove" | null>(null);
  const [base, setBase] = useState(config);
  const [draft, setDraft] = useState<KanbanColumn | null>(null);
  const [destination, setDestination] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const column = config.columns.find((item) => item.id === columnId);
  const index = config.columns.findIndex((item) => item.id === columnId);
  const stale = Boolean(mode && config.revision !== base.revision);

  function open(nextMode: "add" | "edit" | "remove") {
    setBase(config);
    setDraft(
      column
        ? { ...column }
        : {
            id: crypto.randomUUID(),
            name: "",
            color: palette[config.columns.length % palette.length],
            status: null,
          },
    );
    setDestination("");
    setError("");
    setMode(nextMode);
  }
  async function persist(
    snapshot: KanbanBoardConfig,
    columns: KanbanColumn[],
    moves: object[] = [],
  ) {
    await postAction(
      {
        action: "saveKanbanColumns",
        kind: snapshot.kind,
        clientId: snapshot.clientId,
        expectedRevision: snapshot.revision,
        columns,
        moves,
      },
      "Listas atualizadas",
    );
  }
  async function move(direction: -1 | 1) {
    if (saving || index < 0 || !config.columns[index + direction]) return;
    const columns = [...config.columns];
    [columns[index], columns[index + direction]] = [
      columns[index + direction],
      columns[index],
    ];
    setSaving(true);
    try {
      await persist(config, columns);
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Não foi possível mover a lista.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function save() {
    if (saving || stale || !draft || !mode) return;
    if (mode !== "remove" && !draft.name.trim()) {
      setError("Dê um nome à lista.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const next = { ...draft, name: draft.name.trim() };
      const columns =
        mode === "add"
          ? [...base.columns, next]
          : mode === "remove"
            ? base.columns.filter((item) => item.id !== draft.id)
            : base.columns.map((item) => (item.id === draft.id ? next : item));
      const moves =
        mode === "remove"
          ? [{ fromColumnId: draft.id, toColumnId: destination || null }]
          : [];
      await persist(base, columns, moves);
      setMode(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar. Seu rascunho foi mantido.",
      );
    } finally {
      setSaving(false);
    }
  }
  const title =
    mode === "add"
      ? "Adicionar lista"
      : mode === "remove"
        ? "Remover lista"
        : "Editar lista";
  return (
    <>
      {columnId ? (
        column && (
          <div className="flex min-w-0 flex-1 items-start gap-1">
            <button
              type="button"
              draggable
              data-list-drag-id={column.id}
              aria-label={`Arrastar lista ${column.name}`}
              className="mt-0.5 hidden size-6 shrink-0 cursor-grab items-center justify-center rounded text-slate-500 outline-none focus-visible:ring-2 focus-visible:ring-primary md:inline-flex"
            >
              <GripVertical size={16} className="pointer-events-none" />
            </button>
            <h2
              aria-label={column.name}
              className="min-w-0 flex-1 text-sm font-semibold"
            >
              <button
                type="button"
                className="w-full rounded px-1 py-1 text-left break-words hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-ring"
                aria-label={`Renomear lista ${column.name}`}
                onClick={() => open("edit")}
              >
                {column.name}
              </button>
            </h2>
            <span className="mt-1.5 shrink-0 rounded bg-white/70 px-1.5 text-xs text-slate-600">
              {count}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  disabled={saving}
                  aria-label={`Opções da lista ${column.name}`}
                >
                  <MoreHorizontal size={18} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60 max-w-[calc(100vw-32px)]"
                onCloseAutoFocus={(event) => {
                  if (mode) event.preventDefault();
                }}
              >
                <DropdownMenuLabel className="break-words">
                  {column.name}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => open("edit")}>
                  <Pencil size={16} />
                  Renomear lista
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => open("edit")}>
                  <Palette size={16} />
                  Alterar cor
                </DropdownMenuItem>
                {config.kind === "demands" && (
                  <DropdownMenuItem onSelect={() => open("edit")}>
                    <Workflow size={16} />
                    Responsável e próxima etapa
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  disabled={index === 0}
                  onSelect={() => void move(-1)}
                >
                  <ArrowLeft size={16} />
                  Mover para a esquerda
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={index === config.columns.length - 1}
                  onSelect={() => void move(1)}
                >
                  <ArrowRight size={16} />
                  Mover para a direita
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => open("remove")}
                >
                  <Trash2 size={16} />
                  Remover lista
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-14 w-full min-w-0 justify-start self-start rounded-xl border-dashed bg-white/70 px-4 text-sm"
          onClick={() => open("add")}
        >
          <Plus size={18} />
          Adicionar lista
        </Button>
      )}
      <Dialog
        open={Boolean(mode)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !saving) setMode(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {mode === "remove"
                ? "Remova a lista e escolha onde os cartões vão ficar."
                : "Veja como a lista ficará no seu quadro."}
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <fieldset disabled={saving} className="min-w-0 space-y-4">
              <div
                className="rounded-xl border-t-4 p-4"
                style={{
                  backgroundColor: `${draft.color}35`,
                  borderTopColor: draft.color,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <strong className="min-w-0 break-words text-sm">
                    {draft.name || "Nome da lista"}
                  </strong>
                  <span className="shrink-0 rounded bg-white/70 px-2 text-xs">
                    {mode === "add" ? 0 : count}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  {mode === "remove"
                    ? "Os cartões e seus históricos serão preservados."
                    : "Prévia da lista"}
                </p>
              </div>
              {mode === "remove" ? (
                <>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    A lista será removida do quadro. Seus cartões vão para o
                    destino escolhido, mantendo aprovações, vendas e histórico.
                    Não é necessário arquivar.
                  </p>
                  <label className="block text-sm font-medium">
                    Mover cartões para
                    <select
                      aria-label="Mover cartões para"
                      value={destination}
                      onChange={(event) => setDestination(event.target.value)}
                      className="mt-2 min-h-10 w-full rounded-lg border bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <option value="">Sem lista — visível neste quadro</option>
                      {base.columns
                        .filter((item) => item.id !== draft.id)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium">
                    Nome da lista
                    <Input
                      aria-label="Nome da lista"
                      className="mt-2"
                      maxLength={60}
                      value={draft.name}
                      onChange={(event) =>
                        setDraft({ ...draft, name: event.target.value })
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void save();
                        }
                      }}
                      placeholder="Ex.: Aguardando retorno"
                    />
                  </label>
                  <fieldset>
                    <legend className="mb-3 text-sm font-medium">
                      Cor da lista
                    </legend>
                    <div className="flex flex-wrap items-center gap-3">
                      {palette.map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={`Cor ${color}`}
                          aria-pressed={
                            color.toLowerCase() === draft.color.toLowerCase()
                          }
                          onClick={() => setDraft({ ...draft, color })}
                          style={{ backgroundColor: color }}
                          className={`size-8 rounded-full border border-black/10 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${color.toLowerCase() === draft.color.toLowerCase() ? "ring-2 ring-slate-600 ring-offset-2" : ""}`}
                        />
                      ))}
                      <input
                        type="color"
                        aria-label="Cor personalizada da lista"
                        value={draft.color}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            color: event.target.value.toUpperCase(),
                          })
                        }
                        className="size-9 rounded border bg-white p-0.5"
                      />
                    </div>
                  </fieldset>
                  {config.kind === "demands" && (
                    <fieldset className="space-y-3 rounded-xl border bg-muted/30 p-3">
                      <legend className="px-1 text-sm font-semibold">
                        Fluxo desta etapa
                      </legend>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Ao entrar nesta lista, a demanda vai para a pessoa
                        escolhida, que recebe uma notificação.
                      </p>
                      <label className="block text-sm font-medium">
                        Responsável da etapa
                        <select
                          aria-label="Responsável da etapa"
                          className="mt-1 min-h-10 w-full rounded-lg border bg-white px-2"
                          value={draft.assigneeId || ""}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              assigneeId: e.target.value || null,
                            })
                          }
                        >
                          <option value="">Manter o responsável atual</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm font-medium">
                        Prazo da etapa (horas)
                        <Input
                          aria-label="Prazo da etapa em horas"
                          type="number"
                          min="0.5"
                          max="8760"
                          step="0.5"
                          placeholder="Manter o prazo atual"
                          value={draft.dueHours ?? ""}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              dueHours: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                        />
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Conta a partir da entrada na lista. Vazio mantém a data
                        de entrega.
                      </p>
                      <label className="block text-sm font-medium">
                        Ao concluir, enviar para
                        <select
                          aria-label="Próxima etapa"
                          className="mt-1 min-h-10 w-full rounded-lg border bg-white px-2"
                          value={draft.nextColumnId || ""}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              nextColumnId: e.target.value || null,
                            })
                          }
                        >
                          <option value="">Escolher manualmente</option>
                          {base.columns
                            .filter((c) => c.id !== draft.id)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Configure uma vez e use Concluir etapa no cartão. A
                        aprovação final continua com quem pode revisar a pauta.
                      </p>
                    </fieldset>
                  )}
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {draft.status
                      ? `Mover um cartão para esta lista mantém o efeito: ${defaultKanbanColumns(base.kind).find((item) => item.status === draft.status)?.name || draft.status}.`
                      : "Mover cartões para esta lista preserva a situação atual deles."}
                  </p>
                </>
              )}
            </fieldset>
          )}
          {stale && (
            <p
              role="alert"
              className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950"
            >
              As listas mudaram enquanto você editava. Seu rascunho foi mantido.
              Cancele e abra novamente para usar a versão atual.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setMode(null)}
            >
              Cancelar
            </Button>
            <Button
              variant={mode === "remove" ? "destructive" : "default"}
              disabled={saving || stale}
              onClick={() => void save()}
            >
              {saving
                ? "Salvando…"
                : mode === "remove"
                  ? "Remover e mover cartões"
                  : mode === "add"
                    ? "Criar lista"
                    : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const listDragType = "application/x-postito-kanban-list";
export function KanbanListBoard({
  config,
  postAction,
  enabled = true,
  children,
  className,
  ...props
}: {
  config: KanbanBoardConfig;
  postAction(payload: object, success?: string): Promise<unknown>;
  enabled?: boolean;
  children: ReactNode;
  className?: string;
  "data-kanban-board"?: string;
}) {
  const drag = useRef<{ id: string; config: KanbanBoardConfig } | null>(null);
  const highlighted = useRef<HTMLElement | null>(null);
  const saving = useRef(false);
  function clearHighlight() {
    highlighted.current?.removeAttribute("data-list-drop-over");
    highlighted.current = null;
  }
  return (
    <div
      {...props}
      className={className}
      onDragStartCapture={(event) => {
        const handle = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-list-drag-id]",
        );
        if (!handle) return;
        if (!enabled || saving.current) {
          event.preventDefault();
          return;
        }
        const id = handle.dataset.listDragId!;
        drag.current = { id, config };
        event.dataTransfer.setData(listDragType, id);
        event.dataTransfer.effectAllowed = "move";
        const column = handle.closest<HTMLElement>(
          "[data-column-id],[data-kanban-column]",
        );
        if (column) event.dataTransfer.setDragImage(column, 20, 20);
      }}
      onDragOverCapture={(event) => {
        if (!event.dataTransfer.types.includes(listDragType)) return;
        event.preventDefault();
        event.stopPropagation();
        if (!enabled || !drag.current) return;
        const column = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-column-id],[data-kanban-column]",
        );
        const id = column?.dataset.columnId || column?.dataset.kanbanColumn;
        if (
          !column ||
          id === drag.current.id ||
          !config.columns.some((item) => item.id === id)
        ) {
          clearHighlight();
          return;
        }
        if (column !== highlighted.current) {
          clearHighlight();
          column.setAttribute("data-list-drop-over", "true");
          highlighted.current = column;
        }
      }}
      onDropCapture={async (event) => {
        if (!event.dataTransfer.types.includes(listDragType)) return;
        event.preventDefault();
        event.stopPropagation();
        clearHighlight();
        const source = drag.current;
        drag.current = null;
        if (!enabled || saving.current || !source) return;
        const target = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-column-id],[data-kanban-column]",
        );
        const id = target?.dataset.columnId || target?.dataset.kanbanColumn;
        const from = source.config.columns.findIndex(
          (item) => item.id === source.id,
        );
        const to = source.config.columns.findIndex((item) => item.id === id);
        if (from < 0 || to < 0 || from === to) return;
        const columns = [...source.config.columns];
        const [moving] = columns.splice(from, 1);
        columns.splice(to, 0, moving);
        saving.current = true;
        try {
          await postAction(
            {
              action: "saveKanbanColumns",
              kind: source.config.kind,
              clientId: source.config.clientId,
              expectedRevision: source.config.revision,
              columns,
              moves: [],
            },
            "Ordem das listas atualizada",
          );
        } catch (cause) {
          toast.error(
            cause instanceof Error
              ? cause.message
              : "Não foi possível mover a lista.",
          );
        } finally {
          saving.current = false;
        }
      }}
      onDragEndCapture={() => {
        drag.current = null;
        clearHighlight();
      }}
    >
      {children}
    </div>
  );
}
