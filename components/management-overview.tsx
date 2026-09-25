"use client";

import { ArrowUpRight, Briefcase, Wallet } from "lucide-react";
import type { WorkspaceData } from "@/lib/workspace-types";

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export function ManagementOverview({
  data,
  onFinance,
  onCrm,
  now,
}: {
  now: number;
  data: WorkspaceData;
  onFinance(): void;
  onCrm(): void;
}) {
  const manager = ["manager", "admin"].includes(data.currentMember.role);
  const finance =
    manager && data.currentMember.permissions.includes("finance.access");
  const crm = manager && data.currentMember.permissions.includes("crm.access");
  if (!finance && !crm) return null;
  const pending = data.transactions.filter(
    (t) => !t.archivedAt && !["paid", "cancelled"].includes(t.status),
  );
  const remaining = (type: string) =>
    pending
      .filter((t) => t.type === type)
      .reduce((sum, t) => sum + Math.max(0, t.amount - t.paidAmount), 0);
  const overdue = pending.filter((t) => Date.parse(t.dueDate) < now);
  const deals = data.crmDeals.filter((d) => !["won", "lost"].includes(d.stage));
  const leads = data.crmLeads.filter(
    (l) => !["sql", "disqualified"].includes(l.status),
  );
  const followups = data.crmActivities.filter(
    (a) => a.status === "pending" && a.dueAt && Date.parse(a.dueAt) <= now,
  );
  return (
    <section
      className="grid gap-4 md:grid-cols-2"
      aria-label="Resumo da gestão"
    >
      {finance && (
        <button
          onClick={onFinance}
          className="workspace-panel p-5 text-left transition hover:border-slate-400"
          aria-label="Abrir resumo financeiro"
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Wallet size={18} />
              Pagamentos
            </h2>
            <ArrowUpRight size={18} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs text-muted-foreground">A receber</dt>
              <dd className="mt-1 break-words text-xl font-semibold">
                {money(remaining("income"))}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">A pagar</dt>
              <dd className="mt-1 break-words text-xl font-semibold">
                {money(remaining("expense"))}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            {overdue.length}{" "}
            {overdue.length === 1
              ? "lançamento vencido"
              : "lançamentos vencidos"}{" "}
            · saldos em aberto, incluindo previsões
          </p>
        </button>
      )}
      {crm && (
        <button
          onClick={onCrm}
          className="workspace-panel p-5 text-left transition hover:border-slate-400"
          aria-label="Abrir resumo do CRM"
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Briefcase size={18} />
              CRM comercial
            </h2>
            <ArrowUpRight size={18} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs text-muted-foreground">
                Leads em acompanhamento
              </dt>
              <dd className="mt-1 text-xl font-semibold">{leads.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Oportunidades abertas
              </dt>
              <dd className="mt-1 text-xl font-semibold">{deals.length}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            {followups.length}{" "}
            {followups.length === 1
              ? "ação pendente com prazo atingido"
              : "ações pendentes com prazo atingido"}
          </p>
        </button>
      )}
    </section>
  );
}
