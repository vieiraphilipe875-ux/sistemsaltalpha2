"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { taskCover, taskCoverImages } from "@/lib/task-cover";
import type { Deliverable } from "@/lib/workspace-types";

export function TaskCoverPicker({
  item,
  save,
}: {
  item: Deliverable;
  save(payload: object, success?: string): Promise<unknown>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const images = taskCoverImages(item);
  const current = taskCover(item);
  const selected = current || images[0];
  async function choose(
    mode: "auto" | "none" | "image" | "full",
    file = selected,
  ) {
    if (saving || (["image", "full"].includes(mode) && !file)) return;
    setSaving(true);
    setError("");
    try {
      await save(
        {
          action: "updateDeliverable",
          id: item.id,
          cover: {
            mode,
            fileId: file?.id || null,
            fileKind: file?.source || null,
          },
        },
        "Capa atualizada",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível alterar a capa.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <ImageIcon size={16} />
          Capa
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="z-[70] max-h-[70dvh] w-[min(340px,calc(100vw-32px))] overflow-y-auto p-4"
      >
        <h3 className="font-semibold">Capa do cartão</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Escolha uma imagem da demanda e como ela aparece no quadro.
        </p>
        <fieldset disabled={saving} className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["none", "Sem capa"],
                ["image", "Imagem no topo"],
                ["full", "Imagem inteira"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                aria-label={label}
                aria-pressed={(item.coverMode || "auto") === mode}
                disabled={mode !== "none" && !images.length}
                onClick={() => void choose(mode)}
                className="rounded-lg border p-2 text-xs leading-4 outline-none aria-pressed:ring-2 aria-pressed:ring-primary disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span
                  aria-hidden="true"
                  className="relative mb-2 block h-12 overflow-hidden rounded bg-slate-100"
                >
                  {mode !== "none" && selected && (
                    <img
                      src={selected.url}
                      alt=""
                      className={`w-full object-cover ${mode === "full" ? "h-full" : "h-7"}`}
                    />
                  )}
                  <span
                    className={`absolute bottom-2 left-2 h-1 w-8 rounded ${mode === "full" ? "bg-white shadow" : "bg-slate-500"}`}
                  />
                </span>
                {label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="w-full"
            aria-pressed={!item.coverMode || item.coverMode === "auto"}
            onClick={() => void choose("auto")}
          >
            Usar primeira imagem automaticamente
          </Button>
          {images.length ? (
            <div className="grid grid-cols-3 gap-2">
              {images.map((file) => (
                <button
                  key={`${file.source}-${file.id}`}
                  type="button"
                  aria-label={`Usar ${file.fileName} como capa`}
                  aria-pressed={
                    current?.id === file.id && current?.source === file.source
                  }
                  className="overflow-hidden rounded-lg border outline-none aria-pressed:ring-2 aria-pressed:ring-primary aria-pressed:ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() =>
                    void choose(
                      item.coverMode === "full" ? "full" : "image",
                      file,
                    )
                  }
                >
                  <img
                    src={file.url}
                    alt={file.fileName}
                    className="aspect-square w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
              Anexe uma imagem à demanda para usá-la como capa. Sem imagem, o
              cartão fica compacto.
            </p>
          )}
        </fieldset>
        {saving && (
          <p role="status" className="mt-3 text-xs">
            Salvando capa…
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
