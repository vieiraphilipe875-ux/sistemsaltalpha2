"use client";

import { useId, useState } from "react";
import { Check, ChevronDown, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { Client } from "@/lib/workspace-types";

export function ClientPicker({
  clients,
  value,
  onSelect,
  disabled = false,
}: {
  clients: Client[];
  value: string;
  onSelect(id: string): void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const selected = clients.find((client) => client.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label="Selecionar cliente"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-haspopup="listbox"
          disabled={disabled}
          className="w-full min-w-0 justify-between rounded-xl font-normal"
        >
          <FolderOpen className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-left">{selected?.name ?? "Escolha o cliente"}</span>
          <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 max-w-[calc(100vw-3rem)] p-0">
        <Command>
          <CommandInput aria-label="Buscar cliente" placeholder="Buscar por nome ou Instagram..." />
          <CommandList id={listId} aria-label="Clientes disponíveis" className="max-h-64 overscroll-contain">
            <CommandEmpty>{clients.length ? "Nenhum cliente encontrado." : "Nenhum cliente liberado para criar demandas."}</CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={`${client.name} ${client.handle} ${client.id}`}
                  onSelect={() => { onSelect(client.id); setOpen(false); }}
                  className="gap-3 px-3 py-2.5"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold text-slate-700" style={{ background: client.accent }} aria-hidden="true">
                    {client.name.slice(0, 1).toLocaleUpperCase("pt-BR")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{client.name}</span>
                    {client.handle && <span className="block truncate text-xs text-muted-foreground">{client.handle}</span>}
                  </span>
                  {value === client.id && <Check className="size-4 shrink-0" aria-label="Selecionado" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
