"use client";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import type { Deliverable } from "@/lib/workspace-types";
import { toast } from "sonner";
export function TaskSettings({
  item,
  save,
}: {
  item: Deliverable;
  save: (p: object, s?: string) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [title, setTitle] = useState(item.title),
    [due, setDue] = useState(item.dueAt.slice(0, 16)),
    [notes, setNotes] = useState(item.notes);
  function edit() {
    const date = new Date(item.dueAt);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    setTitle(item.title);
    setDue(date.toISOString().slice(0, 16));
    setNotes(item.notes);
    setOpen(true);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save(
        {
          action: "updateDeliverable",
          id: item.id,
          title,
          dueAt: new Date(due).toISOString(),
          notes,
        },
        "Demanda atualizada",
      );
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button onClick={edit} variant="outline" size="sm">
        <Pencil size={14} />
        Editar detalhes
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da demanda</DialogTitle>
            <DialogDescription>
              Atualize título, prazo e orientação geral.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <label className="grid gap-2 text-sm">
              Título
              <Input
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm">
              Prazo
              <Input
                required
                type="datetime-local"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm">
              Orientação geral
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={20000}
              />
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button disabled={busy}>
                {busy ? "Salvando…" : "Salvar detalhes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
