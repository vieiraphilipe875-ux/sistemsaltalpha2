"use client";
import { useState } from "react";
import { Check, UserPlus, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import type { Member, WorkspaceData } from "@/lib/workspace-types";
import { professionLabels } from "@/lib/permissions";
import { toast } from "sonner";
export function MemberPicker({
  members,
  value,
  onSelect,
  label = "Atribuir responsável",
  allowEmpty = false,
}: {
  members: Member[];
  value?: string | null;
  onSelect: (id: string | null) => Promise<unknown> | void;
  label?: string;
  allowEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  async function choose(id: string | null) {
    setBusy(true);
    try {
      await onSelect(id);
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const selected = members.find((m) => m.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          className="member-picker"
          aria-label={label}
          disabled={busy}
        >
          <UserPlus size={15} />
          <span>{selected?.name || label}</span>
          <ChevronDown size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Buscar colaborador..." />
          <CommandList>
            <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
            <CommandGroup>
              {allowEmpty && (
                <CommandItem onSelect={() => void choose(null)} disabled={busy}>
                  Sem responsável
                </CommandItem>
              )}
              {members
                .filter((m) => m.status === "active")
                .map((m) => (
                  <CommandItem
                    key={m.id}
                    value={`${m.name} ${m.email} ${professionLabels[m.profession] || ""}`}
                    onSelect={() => void choose(m.id)}
                    disabled={busy}
                  >
                    <div className="picker-avatar">{m.name.slice(0, 1)}</div>
                    <div className="flex-1">
                      <strong className="block text-sm">{m.name}</strong>
                      <span className="text-xs text-muted-foreground">
                        {professionLabels[m.profession] || m.profession}
                      </span>
                    </div>
                    {value === m.id && <Check size={16} />}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
export function ClientPeople({
  data,
  clientId,
  postAction,
}: {
  data: WorkspaceData;
  clientId: string;
  postAction: (p: object, s?: string) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const assigned = data.clientMembers
    .filter((g) => g.clientId === clientId)
    .map((g) => g.memberId);
  return (
    <div className="client-people">
      <span className="text-sm text-muted-foreground">Equipe do cliente</span>
      <div className="flex -space-x-2">
        {data.members
          .filter((m) => assigned.includes(m.id))
          .map((m) => (
            <span key={m.id} className="member-dot" title={m.name}>
              {m.name.slice(0, 1)}
            </span>
          ))}
      </div>
      {["manager", "admin"].includes(data.currentMember.role) && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <UserPlus size={14} />
              Gerenciar colaboradores
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            <Command>
              <CommandInput placeholder="Buscar colaborador do cliente..." />
              <CommandList>
                <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                <CommandGroup>
                  {data.members
                    .filter((m) => m.status === "active")
                    .map((m) => (
                      <CommandItem
                        key={m.id}
                        value={`${m.name} ${m.email}`}
                        onSelect={async () => {
                          try {
                            await postAction(
                              {
                                action: "assignClientMember",
                                clientId,
                                memberId: m.id,
                                remove: assigned.includes(m.id),
                              },
                              "Acesso ao cliente atualizado",
                            );
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        <span className="flex-1">{m.name}</span>
                        {assigned.includes(m.id) && <Check size={16} />}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
            <p className="border-t p-3 text-xs text-muted-foreground">
              Este acesso permite ver a pasta. Demandas atribuídas diretamente
              também permanecem visíveis ao responsável.
            </p>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
