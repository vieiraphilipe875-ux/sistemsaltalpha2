"use client";

import { ExternalLink, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { FinancialDocument } from "@/lib/workspace-types";

export function FinancialDocuments({
  documents,
  context,
}: {
  documents: FinancialDocument[];
  context: string;
}) {
  if (!documents.length) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-auto justify-start px-0 py-1 text-xs text-[#526949]"
          aria-label={`Ver ${documents.length} ${documents.length === 1 ? "anexo" : "anexos"} de ${context}`}
        >
          <Paperclip className="size-3.5" />
          {documents.length} {documents.length === 1 ? "anexo" : "anexos"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-80 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto p-3"
        aria-label={`Anexos de ${context}`}
      >
        <p className="mb-2 text-sm font-semibold">Documentos anexados</p>
        <ul className="space-y-1">
          {documents.map((document) => (
            <li key={document.id}>
              <a
                href={document.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-2 rounded-md px-2 py-2 text-sm text-[#34483b] hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#526949]"
              >
                <span className="min-w-0 flex-1 break-words">
                  {document.fileName}
                </span>
                <ExternalLink className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="sr-only">Abrir em nova aba</span>
              </a>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
