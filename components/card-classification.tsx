"use client";

import { useState } from "react";
import { Bell, Plus, Tags, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { kanbanTextColor } from "@/lib/kanban";
import type { CardLabel, CardPriority } from "@/lib/workspace-types";

const priorities = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};
const presets: CardLabel[] = [
  { id: "review", name: "Revisar", color: "#DFEEFF" },
  { id: "waiting", name: "Aguardando retorno", color: "#FCE8BE" },
  { id: "approval", name: "Aprovação", color: "#E6E7FD" },
];

export function CardBadges({
  priority = "normal",
  labels = [],
}: {
  priority?: CardPriority;
  labels?: CardLabel[];
}) {
  if (priority === "normal" && !labels.length) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {priority !== "normal" && (
        <span
          aria-label={`Prioridade ${priorities[priority]}`}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${priority === "urgent" ? "bg-red-50 text-red-700" : priority === "high" ? "bg-amber-50 text-amber-900" : "bg-slate-100 text-slate-600"}`}
        >
          {priority === "urgent" && (
            <Bell size={13} aria-hidden="true" className="urgent-bell" />
          )}
          {priorities[priority]}
        </span>
      )}
      {labels.map((label) => (
        <span
          key={label.id}
          className="max-w-full break-words rounded-md px-2 py-1 text-xs font-medium"
          style={{
            backgroundColor: label.color,
            color: kanbanTextColor(label.color),
          }}
        >
          {label.name}
        </span>
      ))}
    </div>
  );
}

export function ClassificationFields({
  priority,
  labels,
  onPriority,
  onLabels,
}: {
  priority: CardPriority;
  labels: CardLabel[];
  onPriority(value: CardPriority): void;
  onLabels(value: CardLabel[]): void;
}) {
  const [name, setName] = useState("");
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">
        Prioridade
        <select
          aria-label="Prioridade"
          value={priority}
          onChange={(event) => onPriority(event.target.value as CardPriority)}
          className="mt-2 min-h-10 w-full rounded-lg border bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {Object.entries(priorities).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-medium">Etiquetas</legend>
        <div className="flex flex-wrap gap-2">
          {presets.map((label) => (
            <button
              key={label.id}
              type="button"
              aria-pressed={labels.some((item) => item.id === label.id)}
              disabled={
                labels.length >= 8 &&
                !labels.some((item) => item.id === label.id)
              }
              onClick={() =>
                onLabels(
                  labels.some((item) => item.id === label.id)
                    ? labels.filter((item) => item.id !== label.id)
                    : [...labels, { ...label }],
                )
              }
              className="rounded-md border px-2 py-1.5 text-xs outline-none aria-pressed:ring-2 aria-pressed:ring-primary focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40"
              style={{
                backgroundColor: label.color,
                color: kanbanTextColor(label.color),
              }}
            >
              {label.name}
            </button>
          ))}
        </div>
        {labels.map((label, index) => (
          <div key={label.id} className="flex min-w-0 items-center gap-2">
            <input
              type="color"
              aria-label={`Cor da etiqueta ${index + 1}`}
              value={label.color}
              onChange={(event) =>
                onLabels(
                  labels.map((item) =>
                    item.id === label.id
                      ? { ...item, color: event.target.value.toUpperCase() }
                      : item,
                  ),
                )
              }
              className="size-8 shrink-0 rounded border bg-white p-0.5"
            />
            <Input
              aria-label={`Nome da etiqueta ${index + 1}`}
              value={label.name}
              maxLength={32}
              onChange={(event) =>
                onLabels(
                  labels.map((item) =>
                    item.id === label.id
                      ? { ...item, name: event.target.value }
                      : item,
                  ),
                )
              }
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={`Remover etiqueta ${label.name}`}
              onClick={() =>
                onLabels(labels.filter((item) => item.id !== label.id))
              }
            >
              <X size={15} />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            aria-label="Nova etiqueta"
            placeholder="Digite uma etiqueta"
            value={name}
            maxLength={32}
            disabled={labels.length >= 8}
            onChange={(event) => setName(event.target.value)}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Adicionar etiqueta"
            disabled={!name.trim() || labels.length >= 8}
            onClick={() => {
              onLabels([
                ...labels,
                {
                  id: crypto.randomUUID(),
                  name: name.trim(),
                  color: "#DFF3EB",
                },
              ]);
              setName("");
            }}
          >
            <Plus size={16} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Até 8 etiquetas. Os nomes e cores editados valem para este cartão.
        </p>
      </fieldset>
    </div>
  );
}

export function CardClassificationEditor({
  id,
  kind,
  priority = "normal",
  labels = [],
  save,
}: {
  id: string;
  kind: "demand" | "lead";
  priority?: CardPriority;
  labels?: CardLabel[];
  save(payload: object, success?: string): Promise<unknown>;
}) {
  const [open, setOpen] = useState(false),
    [draftPriority, setDraftPriority] = useState(priority),
    [draftLabels, setDraftLabels] = useState(labels),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  async function submit() {
    if (saving || draftLabels.some((label) => !label.name.trim())) return;
    setSaving(true);
    setError("");
    try {
      await save(
        {
          action: kind === "demand" ? "updateDeliverable" : "updateCrmLead",
          id,
          priority: draftPriority,
          labels: draftLabels.map((label) => ({
            ...label,
            name: label.name.trim(),
          })),
        },
        "Prioridade e etiquetas atualizadas",
      );
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        if (next) {
          setDraftPriority(priority);
          setDraftLabels(labels.map((label) => ({ ...label })));
          setError("");
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Tags size={16} />
          Etiquetas e prioridade
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="z-[70] max-h-[75dvh] w-[min(360px,calc(100vw-32px))] overflow-y-auto p-4"
      >
        <h3 className="mb-4 font-semibold">Destaques do cartão</h3>
        <fieldset disabled={saving}>
          <ClassificationFields
            priority={draftPriority}
            labels={draftLabels}
            onPriority={setDraftPriority}
            onLabels={setDraftLabels}
          />
        </fieldset>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button
          className="mt-4 w-full"
          disabled={saving || draftLabels.some((label) => !label.name.trim())}
          onClick={() => void submit()}
        >
          {saving ? "Salvando…" : "Salvar destaques"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
