import { asc, count, eq, inArray, or } from "drizzle-orm";
import { verifySession } from "@/lib/auth";
import { getDb } from "@/db";
import {
  annotations,
  assets,
  attachments,
  boards,
  clientMembers,
  clients,
  crmActivities,
  crmDeals,
  crmLeads,
  deliverables,
  deliverableReferences,
  financeWorkers,
  financialDocuments,
  memberPermissions,
  members,
  slides,
  transactions,
  workerCompetencies,
} from "@/db/schema";
import { effectivePermissions, hasPermission } from "@/lib/permissions";

const now = () => new Date().toISOString();

export async function getCurrentMember({ seed = true } = {}) {
  const session = await verifySession();
  if (!session) return null;

  const db = getDb();
  const [member] = await db.select().from(members).where(eq(members.id, session.userId)).limit(1);

  if (!member) return null;

  if (seed && (member.role === "manager" || member.role === "admin")) await seedWorkspace(member.id);
  return member;
}

export async function getWorkspaceData() {
  const currentMember = await getCurrentMember();
  if (!currentMember) return null;
  const db = getDb();

  const allClientMembers = await db.select().from(clientMembers);
  const currentPermissionRows = await db.select().from(memberPermissions).where(eq(memberPermissions.memberId, currentMember.id));
  const currentPermissions = effectivePermissions(currentMember.role, currentPermissionRows.map((row) => row.permission));
  const agencyOwnerId = currentMember.role === "manager" ? currentMember.id : currentMember.agencyOwnerId;
  const visibleMembers = currentMember.role === "admin"
    ? await db.select().from(members).where(or(eq(members.id, currentMember.id), eq(members.role, "manager"))).orderBy(asc(members.name))
    : agencyOwnerId
      ? await db.select().from(members).where(or(eq(members.id, agencyOwnerId), eq(members.agencyOwnerId, agencyOwnerId))).orderBy(asc(members.name))
      : [currentMember];
  const allMembers = visibleMembers.map((row) => row.role === "collaborator" ? { ...row, role: "designer" as const } : row);

  let allDeliverables;
  let allBoards;
  let allClients;

  if (currentMember.role !== "client" && currentPermissions.includes("demands.execute") && !currentPermissions.includes("demands.create")) {
    allDeliverables = await db.select().from(deliverables).where(eq(deliverables.assigneeId, currentMember.id)).orderBy(asc(deliverables.sortOrder));
    const boardIds = [...new Set(allDeliverables.map((item) => item.boardId))];
    allBoards = boardIds.length ? await db.select().from(boards).where(inArray(boards.id, boardIds)).orderBy(asc(boards.createdAt)) : [];
    const clientIds = [...new Set(allBoards.map((board) => board.clientId))];
    allClients = clientIds.length ? await db.select().from(clients).where(inArray(clients.id, clientIds)).orderBy(asc(clients.name)) : [];
  } else if (currentMember.role === "client") {
    const allowedClientIds = allClientMembers.filter((row) => row.memberId === currentMember.id).map((row) => row.clientId);
    allClients = allowedClientIds.length ? await db.select().from(clients).where(inArray(clients.id, allowedClientIds)).orderBy(asc(clients.name)) : [];
    const clientIds = allClients.map((client) => client.id);
    allBoards = clientIds.length ? await db.select().from(boards).where(inArray(boards.clientId, clientIds)).orderBy(asc(boards.createdAt)) : [];
    const boardIds = allBoards.map((board) => board.id);
    allDeliverables = boardIds.length 
      ? await db.select().from(deliverables).where(inArray(deliverables.boardId, boardIds)).orderBy(asc(deliverables.sortOrder)) 
      : [];
  } else {
    const allowedClientIds = currentMember.role === "manager" || currentMember.clientAccessMode === "all"
      ? null
      : allClientMembers.filter((row) => row.memberId === currentMember.id).map((row) => row.clientId);
    allClients = allowedClientIds === null
      ? await db.select().from(clients).orderBy(asc(clients.name))
      : allowedClientIds.length
        ? await db.select().from(clients).where(inArray(clients.id, allowedClientIds)).orderBy(asc(clients.name))
        : [];
    const clientIds = allClients.map((client) => client.id);
    allBoards = clientIds.length ? await db.select().from(boards).where(inArray(boards.clientId, clientIds)).orderBy(asc(boards.createdAt)) : [];
    const boardIds = allBoards.map((board) => board.id);
    allDeliverables = boardIds.length ? await db.select().from(deliverables).where(inArray(deliverables.boardId, boardIds)).orderBy(asc(deliverables.sortOrder)) : [];
  }

  const clientIds = allClients.map((client) => client.id);
  const deliverableIds = allDeliverables.map((item) => item.id);
  const allSlides = deliverableIds.length
    ? await db.select().from(slides).where(inArray(slides.deliverableId, deliverableIds)).orderBy(asc(slides.position))
    : [];
  const allAssets = deliverableIds.length
    ? await db.select().from(assets).where(inArray(assets.deliverableId, deliverableIds)).orderBy(asc(assets.version))
    : [];
  const allAttachments = deliverableIds.length
    ? await db.select().from(attachments).where(inArray(attachments.deliverableId, deliverableIds)).orderBy(asc(attachments.createdAt))
    : [];
  const allReferences = deliverableIds.length
    ? await db.select().from(deliverableReferences).where(inArray(deliverableReferences.deliverableId, deliverableIds)).orderBy(asc(deliverableReferences.createdAt))
    : [];
  const assetIds = allAssets.map((asset) => asset.id);
  const allAnnotations = assetIds.length
    ? await db.select().from(annotations).where(inArray(annotations.assetId, assetIds)).orderBy(asc(annotations.createdAt))
    : [];

  const financeOwnerId = currentPermissions.includes("finance.access") ? (["manager", "admin"].includes(currentMember.role) ? currentMember.id : currentMember.agencyOwnerId) : null;
  const allTransactions = financeOwnerId
    ? await db.select().from(transactions).where(eq(transactions.agencyOwnerId, financeOwnerId)).orderBy(asc(transactions.dueDate))
    : [];
  const allFinanceWorkers = financeOwnerId
    ? await db.select().from(financeWorkers).where(eq(financeWorkers.agencyOwnerId, financeOwnerId)).orderBy(asc(financeWorkers.name))
    : [];
  const allWorkerCompetencies = financeOwnerId
    ? await db.select().from(workerCompetencies).where(eq(workerCompetencies.agencyOwnerId, financeOwnerId)).orderBy(asc(workerCompetencies.dueDate))
    : [];
  const allFinancialDocuments = financeOwnerId
    ? await db.select().from(financialDocuments).where(eq(financialDocuments.agencyOwnerId, financeOwnerId)).orderBy(asc(financialDocuments.createdAt))
    : [];

  const crmOwnerId = currentPermissions.includes("crm.access") ? (currentMember.role === "manager" ? currentMember.id : currentMember.role === "admin" ? currentMember.id : currentMember.agencyOwnerId) : null;
  const allCrmLeads = crmOwnerId ? await db.select().from(crmLeads).where(eq(crmLeads.agencyOwnerId, crmOwnerId)).orderBy(asc(crmLeads.createdAt)) : [];
  const allCrmDeals = crmOwnerId ? await db.select().from(crmDeals).where(eq(crmDeals.agencyOwnerId, crmOwnerId)).orderBy(asc(crmDeals.createdAt)) : [];
  const allCrmActivities = crmOwnerId ? await db.select().from(crmActivities).where(eq(crmActivities.agencyOwnerId, crmOwnerId)).orderBy(asc(crmActivities.dueAt)) : [];

  return {
    currentMember,
    members: allMembers,
    clients: allClients.map((client) => ({ ...client, avatarUrl: client.avatarKey ? `/api/clients/${client.id}/media?kind=avatar` : null, bannerUrl: client.bannerKey ? `/api/clients/${client.id}/media?kind=banner` : null })),
    clientMembers: allClientMembers.filter((row) => clientIds.includes(row.clientId)),
    memberPermissions: await db.select().from(memberPermissions).where(inArray(memberPermissions.memberId, allMembers.map((member) => member.id))),
    boards: allBoards,
    deliverables: allDeliverables.map((item) => ({
      ...item,
      slides: allSlides.filter((slide) => slide.deliverableId === item.id),
      assets: allAssets
        .filter((asset) => asset.deliverableId === item.id)
        .map((asset) => ({ ...asset, url: `/api/assets/${asset.id}` })),
      attachments: allAttachments
        .filter((attachment) => attachment.deliverableId === item.id)
        .map((attachment) => ({ ...attachment, url: `/api/attachments/${attachment.id}` })),
      references: allReferences.filter((ref) => ref.deliverableId === item.id),
    })),
    annotations: allAnnotations,
    transactions: allTransactions,
    financeWorkers: allFinanceWorkers,
    workerCompetencies: allWorkerCompetencies,
    financialDocuments: allFinancialDocuments.map((document) => ({ ...document, url: `/api/finance/documents/${document.id}` })),
    crmLeads: allCrmLeads,
    crmDeals: allCrmDeals,
    crmActivities: allCrmActivities,
  };
}

export async function canAccessDeliverable(memberId: string, deliverableId: string, role: string) {
  const db = getDb();
  const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!member) return false;
  const explicit = await db.select().from(memberPermissions).where(eq(memberPermissions.memberId, memberId));
  const permissionValues = explicit.map((row) => row.permission);
  if (role === "manager" || role === "admin") return true;
  const [deliverable] = await db.select().from(deliverables).where(eq(deliverables.id, deliverableId)).limit(1);
  if (!deliverable) return false;
  if (hasPermission(role, permissionValues, "demands.execute") && deliverable.assigneeId === memberId) return true;
  const [board] = await db.select().from(boards).where(eq(boards.id, deliverable.boardId)).limit(1);
  if (!board) return false;
  const [access] = await db.select().from(clientMembers).where(eq(clientMembers.clientId, board.clientId)).where(eq(clientMembers.memberId, memberId)).limit(1);
  if (role === "client") return !!access;
  return hasPermission(role, permissionValues, "clients.view") && (member.clientAccessMode === "all" || !!access);
}

export async function canManageDeliverable(memberId: string, deliverableId: string, role: "manager" | "admin" | "social" | "designer" | "copywriter" | "video_editor" | "collaborator" | "client") {
  const db = getDb();
  const explicit = await db.select().from(memberPermissions).where(eq(memberPermissions.memberId, memberId));
  if (!hasPermission(role, explicit.map((row) => row.permission), "demands.create")) return false;
  return canAccessDeliverable(memberId, deliverableId, role);
}

export async function canAccessAsset(memberId: string, assetId: string, role: "manager" | "admin" | "social" | "designer" | "copywriter" | "video_editor" | "collaborator" | "client") {
  const db = getDb();
  const [asset] = await db.select({ deliverableId: assets.deliverableId }).from(assets).where(eq(assets.id, assetId)).limit(1);
  if (!asset) return false;
  return canAccessDeliverable(memberId, asset.deliverableId, role);
}

export async function canAccessAttachment(memberId: string, attachmentId: string, role: "manager" | "admin" | "social" | "designer" | "copywriter" | "video_editor" | "collaborator" | "client") {
  const db = getDb();
  const [attachment] = await db.select({ deliverableId: attachments.deliverableId }).from(attachments).where(eq(attachments.id, attachmentId)).limit(1);
  if (!attachment) return false;
  return canAccessDeliverable(memberId, attachment.deliverableId, role);
}

export async function canAccessFinancialDocument(memberId: string, documentId: string, role: "manager" | "admin" | "social" | "designer" | "copywriter" | "video_editor" | "collaborator" | "client") {
  const db = getDb();
  const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!member) return false;
  const explicit = await db.select().from(memberPermissions).where(eq(memberPermissions.memberId, memberId));
  if (!hasPermission(role, explicit.map((row) => row.permission), "finance.access")) return false;
  const [document] = await db.select({ agencyOwnerId: financialDocuments.agencyOwnerId }).from(financialDocuments).where(eq(financialDocuments.id, documentId)).limit(1);
  const ownerId = ["manager", "admin"].includes(role) ? memberId : member.agencyOwnerId;
  return !!document && document.agencyOwnerId === ownerId;
}

async function seedWorkspace(adminId: string) {
  const db = getDb();
  const [{ value }] = await db.select({ value: count() }).from(clients);
  if (value > 0) return;

  const createdAt = now();
  const clientId = "client-vanessa-lopes";
  const boardId = "board-vanessa-ago-set-2026";
  const due = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  await db.insert(clients).values({ id: clientId, name: "Vanessa Lopes", handle: "@vanessacflopes", driveUrl: "https://drive.google.com/", accent: "#17A4A3", createdAt });
  await db.insert(clientMembers).values({ clientId, memberId: adminId });
  await db.insert(boards).values({ id: boardId, clientId, title: "Planejamento de Mídia Social", period: "AGO/SET • 2026", status: "active", createdBy: adminId, createdAt });

  const items = [
    { id: "vl-post-1", title: "Eu escrevi esse e-book porque os médicos silenciavam sobre renderização", kind: "carousel" as const, slideCount: 5, status: "production" as const, dueAt: due(18), notes: "Usar o e-book como apoio visual. CTA: Saiba mais no link da bio.", sourceUrl: "https://drive.google.com/", sortOrder: 1 },
    { id: "vl-post-2", title: "A paciente fez 4 ultrassons em 3 anos. Todos normais.", kind: "carousel" as const, slideCount: 5, status: "changes" as const, dueAt: due(-2), notes: "Construir o raciocínio: o problema não era o exame, era o olhar.", sourceUrl: "", sortOrder: 2 },
    { id: "vl-post-3", title: "Curso de Rastreamento de Endometriose no Exame de Rotina", kind: "carousel" as const, slideCount: 4, status: "briefing" as const, dueAt: due(52), notes: "Destacar dois dias de teoria e prática e limite de 3 médicos por turma.", sourceUrl: "", sortOrder: 3 },
    { id: "vl-post-4", title: "O exame mais realizado e menos estudado depois da residência", kind: "carousel" as const, slideCount: 5, status: "review" as const, dueAt: due(28), notes: "Cortar a parte do livro indicada na referência.", sourceUrl: "https://drive.google.com/", sortOrder: 4 },
    { id: "vl-post-5", title: "Médicos que usam o 3D só para mostrar o rosto do bebê usam 10% da ferramenta", kind: "carousel" as const, slideCount: 5, status: "briefing" as const, dueAt: due(76), notes: "Contrastar os 10% usados com os 90% de potencial diagnóstico.", sourceUrl: "", sortOrder: 5 },
    { id: "vl-post-6", title: "Você consegue ler este exame? Um caso real.", kind: "carousel" as const, slideCount: 9, status: "production" as const, dueAt: due(96), notes: "Caso clínico. Preservar a sequência PENSAR → PROCURAR → VER → DECIDIR.", sourceUrl: "", sortOrder: 6 },
    { id: "vl-post-7", title: "Motivos para fazer o Curso de Endometriose Infiltrativa", kind: "reels" as const, slideCount: 1, status: "briefing" as const, dueAt: due(118), notes: "Legendar, retirar sobras, corrigir termos e escolher frame para capa.", sourceUrl: "https://drive.google.com/", sortOrder: 7 },
    { id: "vl-post-8", title: "Tire suas dúvidas sobre o Curso de Ultrassonografia Transvaginal", kind: "reels" as const, slideCount: 1, status: "briefing" as const, dueAt: due(144), notes: "Legendar, retirar sobras e criar capa com o título.", sourceUrl: "https://drive.google.com/", sortOrder: 8 },
  ];
  await db.insert(deliverables).values(items.map((item) => ({ ...item, boardId, assigneeId: adminId, createdAt, updatedAt: createdAt })));

  const slideRows = [
    ["vl-post-1", 1, "Renderização não é efeito visual. É uma ferramenta clínica.", "Capa forte, linguagem médica e imagem 3D/4D."],
    ["vl-post-1", 2, "Quando bem aplicada, ela revela estruturas que o 2D não consegue mostrar com a mesma clareza.", "Comparação visual entre leitura 2D e renderização."],
    ["vl-post-1", 3, "Essas estruturas mudam condutas.", "Respiro visual; reforçar a consequência clínica."],
    ["vl-post-1", 4, "Se você usa o 3D/4D ou quer começar com mais segurança, este material é para você.", "Apresentar o e-book."],
    ["vl-post-1", 5, "Saiba mais no link da bio.", "CTA limpo."],
    ["vl-post-2", 1, "A paciente fez 4 ultrassons em 3 anos. Todos normais.", "Capa de tensão."],
    ["vl-post-2", 2, "Quando chegou na cirurgia, tinha endometriose em três sítios.", "Revelação do caso."],
    ["vl-post-2", 3, "O problema não era o exame.", "Pausa dramática."],
    ["vl-post-2", 4, "Era o olhar.", "Headline isolada."],
    ["vl-post-2", 5, "Método muda o que você procura — e o que consegue enxergar.", "Fechamento com autoridade."],
  ].map(([deliverableId, position, copyText, direction]) => ({ id: crypto.randomUUID(), deliverableId: String(deliverableId), position: Number(position), copy: String(copyText), direction: String(direction) }));
  await db.insert(slides).values(slideRows);
}
