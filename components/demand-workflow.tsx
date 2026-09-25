"use client";

import { useState } from "react";
import { ArrowRight, Bell, Clock3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { canExecuteTask, canPlanTask } from "@/lib/client-permissions";
import { getKanbanBoard } from "@/lib/kanban";
import type { Deliverable, WorkspaceData } from "@/lib/workspace-types";

type Save = (payload: object, success?: string) => Promise<unknown>;
export function CompleteStage({
  item,
  data,
  save,
  disabled = false,
}: {
  item: Deliverable;
  data: WorkspaceData;
  save: Save;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const clientId = data.boards.find(
    (board) => board.id === item.boardId,
  )?.clientId;
  const config = getKanbanBoard(data.kanbanBoards, "demands", clientId);
  const current = config.columns.find((column) => column.id === item.columnId);
  const next = config.columns.find(
    (column) => column.id === current?.nextColumnId,
  );
  if (
    !next ||
    item.status === "approved" ||
    (!canPlanTask(data, item) &&
      (!canExecuteTask(data, item) ||
        (next.status && !["production", "review"].includes(next.status))))
  )
    return null;
  async function complete() {
    if (busy) return;
    setBusy(true);
    try {
      await save(
        {
          action: "updateDeliverable",
          id: item.id,
          completeStage: true,
          expectedColumnId: item.columnId,
        },
        next?.status === "approved"
          ? "Demanda aprovada"
          : "Etapa concluída. Demanda encaminhada.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a etapa.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button
      size="sm"
      variant="outline"
      className="max-w-full whitespace-normal text-left"
      disabled={busy || disabled}
      onClick={() => void complete()}
      title={`Enviar para ${next.name}`}
    >
      <ArrowRight className="size-4 shrink-0" />
      {busy
        ? "Encaminhando…"
        : next.status === "approved"
          ? "Aprovar demanda"
          : `Concluir etapa → ${next.name}`}
    </Button>
  );
}

export function NotificationInbox({
  data,
  onOpen,
  save,
  now,
}: {
  now: number;
  data: WorkspaceData;
  onOpen(id: string): void;
  save: Save;
}) {
  const [open, setOpen] = useState(false);
  const notices = data.notifications || [];
  const unread = notices.filter((n) => !n.readAt).length;
  const due = data.deliverables
    .filter(
      (t) =>
        t.assigneeId === data.currentMember.id &&
        t.status !== "approved" &&
        new Date(t.dueAt).getTime() - now <= 86_400_000,
    )
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  async function read(id: string, taskId: string) {
    try {
      await save({ action: "markNotificationRead", id });
      setOpen(false);
      onOpen(taskId);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir a notificação.",
      );
    }
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative shrink-0"
          aria-label={`Notificações, ${unread} não lidas`}
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-600 px-1 text-[10px] leading-5 text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        className="w-[360px] max-w-[calc(100vw-32px)] p-0"
      >
        <div className="border-b p-4">
          <h2 className="font-semibold">Notificações</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Suas atribuições e mudanças nas demandas.
          </p>
        </div>
        <div className="max-h-[min(65dvh,480px)] overflow-y-auto">
          {due.length > 0 && (
            <section className="border-b p-3">
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                Seus prazos nas próximas 24h e atrasados
              </h3>
              {due.slice(0, 5).map((task) => (
                <button
                  key={task.id}
                  className="flex w-full items-start gap-2 rounded-lg p-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setOpen(false);
                    onOpen(task.id);
                  }}
                >
                  <Clock3
                    size={16}
                    className={
                      Date.parse(task.dueAt) < now
                        ? "mt-0.5 shrink-0 text-red-600"
                        : "mt-0.5 shrink-0 text-amber-600"
                    }
                  />
                  <span className="min-w-0 break-words">
                    {task.title}
                    <small className="block text-muted-foreground">
                      {new Date(task.dueAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </span>
                </button>
              ))}
            </section>
          )}
          {notices.map((n) => {
            const task = data.deliverables.find(
              (t) => t.id === n.deliverableId,
            );
            if (!task) return null;
            return (
              <button
                key={n.id}
                onClick={() => void read(n.id, n.deliverableId)}
                className={`flex w-full items-start gap-3 border-b p-4 text-left hover:bg-muted ${n.readAt ? "" : "bg-sky-50/50"}`}
              >
                <Bell
                  size={16}
                  className={`mt-1 shrink-0 ${n.kind === "urgent" ? "text-rose-600" : "text-slate-500"}`}
                />
                <span className="min-w-0">
                  <strong className="block break-words text-sm">
                    {task.title}
                  </strong>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {n.message}
                  </span>
                  <small className="mt-2 block text-[11px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {!n.readAt ? " · Não lida" : ""}
                  </small>
                </span>
              </button>
            );
          })}
          {!notices.length && !due.length && (
            <p className="p-6 text-sm text-muted-foreground">
              Nenhuma notificação por enquanto.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
