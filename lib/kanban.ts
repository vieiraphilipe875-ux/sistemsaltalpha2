export const kanbanKinds = ["demands", "crmLeads", "crmDeals", "crmClients"] as const;
export type KanbanKind = typeof kanbanKinds[number];
export type KanbanColumn = { id: string; name: string; color: string; status: string | null; assigneeId?: string | null; dueHours?: number | null; nextColumnId?: string | null };
export type KanbanBoardConfig = { kind: KanbanKind; clientId: string | null; revision: number; columns: KanbanColumn[] };

const defaults: Record<KanbanKind, [string, string, string][]> = {
  demands: [["briefing", "Briefing", "#E6E7FD"], ["production", "Em produção", "#DFEEFF"], ["review", "Em revisão", "#FFF0CD"], ["changes", "Alterações", "#F9E6EF"], ["approved", "Aprovadas", "#DFF3EB"]],
  crmLeads: [["new", "Novos", "#E6E7FD"], ["research", "Pesquisa", "#DFEEFF"], ["contacting", "Em contato", "#FFF0CD"], ["connected", "Conectados", "#DFF3EB"], ["qualifying", "Qualificação", "#F9E6EF"], ["sql", "Qualificados", "#D9E8B9"], ["nurture", "Nutrição", "#F5E6D3"], ["disqualified", "Desqualificados", "#E5E7EB"]],
  crmDeals: [["discovery", "Discovery", "#E6E7FD"], ["solution", "Solução", "#DFEEFF"], ["proposal", "Proposta", "#FFF0CD"], ["negotiation", "Negociação", "#F9E6EF"], ["decision", "Decisão", "#DFF3EB"], ["contract", "Contrato", "#D9E8B9"], ["won", "Ganhas", "#DFF3EB"], ["lost", "Perdidas", "#E5E7EB"]],
  crmClients: [["prospecting", "Em prospecção", "#E6E7FD"], ["active", "Ativos", "#DFF3EB"], ["inactive", "Inativos", "#E5E7EB"]],
};

export function defaultKanbanColumns(kind: KanbanKind): KanbanColumn[] {
  return defaults[kind].map(([id, name, color]) => ({ id, name, color, status: id }));
}

export function getKanbanBoard(configs: readonly KanbanBoardConfig[] | undefined, kind: KanbanKind, clientId: string | null = null): KanbanBoardConfig {
  return configs?.find(board => board.kind === kind && board.clientId === (kind === "demands" ? clientId : null))
    ?? { kind, clientId: kind === "demands" ? clientId : null, revision: 0, columns: defaultKanbanColumns(kind) };
}

export function kanbanScopeKey(agencyId: string, kind: KanbanKind, clientId: string | null = null) {
  return `${agencyId}:${kind}:${kind === "demands" ? clientId : "agency"}`;
}

/** Color is decorative; always retain a textual label and a readable foreground. */
export function kanbanTextColor(color: string) {
  const rgb = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (!rgb) return "#22272D";
  const [r, g, b] = rgb.slice(1).map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? "#22272D" : "#FFFFFF";
}
