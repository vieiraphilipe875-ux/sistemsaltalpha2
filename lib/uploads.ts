import { lockDemandKanban, resolveKanbanPlacement } from "./kanban-server";
import { and, eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import {
  uploadTickets,
  transactions,
  workerCompetencies,
  assets,
  attachments,
  financialDocuments,
  clients,
  deliverables,
} from "@/db/schema";
import {
  getCurrentMember,
  canAccessClient,
  canAccessDeliverable,
  canManageDeliverable,
} from "./server-workspace";
import { bucket } from "./storage";
import { AppError } from "./http";
import type { Member } from "./workspace-types";
export type Purpose = typeof uploadTickets.$inferSelect.purpose;
export const acceptedTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
  "image/vnd.adobe.photoshop",
  "application/zip",
  "application/octet-stream",
];
export async function authorizeUpload(
  me: Member,
  purpose: Purpose,
  targetId: string,
) {
  if (purpose === "avatar" || purpose === "banner") {
    if (
      !me.permissions.includes("clients.manage") ||
      !(await canAccessClient(me, targetId, true))
    )
      throw new AppError("Você não pode alterar este cliente.", 403);
  } else if (purpose === "asset" || purpose === "attachment") {
    if (
      !(
        me.permissions.includes("demands.create") ||
        me.permissions.includes("demands.execute")
      ) ||
      !(await canAccessDeliverable(me.id, targetId))
    )
      throw new AppError(
        "Você não pode enviar arquivos para esta demanda.",
        403,
      );
    if (!(await canManageDeliverable(me.id, targetId))) {
      const [task] = await getDb()
        .select()
        .from(deliverables)
        .where(eq(deliverables.id, targetId))
        .limit(1);
      if (
        !me.permissions.includes("demands.execute") ||
        task?.assigneeId !== me.id
      )
        throw new AppError(
          "Você só pode enviar arquivos para as suas demandas.",
          403,
        );
    }
  } else {
    if (!me.permissions.includes("finance.access"))
      throw new AppError("Acesso financeiro necessário.", 403);
    const table = purpose === "transaction" ? transactions : workerCompetencies;
    const [row] = await getDb()
      .select({ id: table.id })
      .from(table)
      .where(
        and(eq(table.id, targetId), eq(table.agencyOwnerId, me.agencyOwnerId!)),
      )
      .limit(1);
    if (!row) throw new AppError("Registro financeiro não encontrado.", 404);
  }
}
export async function finishUpload(id: string, me: Member) {
  const [ticket] = await getDb()
    .select()
    .from(uploadTickets)
    .where(
      and(
        eq(uploadTickets.id, id),
        eq(uploadTickets.memberId, me.id),
        eq(uploadTickets.agencyId, me.agencyOwnerId!),
      ),
    )
    .limit(1);
  if (
    !ticket ||
    ticket.consumedAt ||
    ticket.expiresAt < new Date().toISOString()
  )
    throw new AppError("Envio inválido, expirado ou já concluído.");
  await authorizeUpload(me, ticket.purpose, ticket.targetId);
  const info = await bucket.info(ticket.storageKey);
  if (info.size !== ticket.fileSize || info.type !== ticket.mimeType)
    throw new AppError(
      "O arquivo enviado não corresponde ao envio autorizado.",
    );
  const createdAt = new Date().toISOString();
  return getDb().transaction(async (db) => {
    const [locked] = await db
      .select()
      .from(uploadTickets)
      .where(eq(uploadTickets.id, id))
      .for("update");
    if (locked.consumedAt)
      throw new AppError("Este envio já foi concluído.", 409);
    const base = {
      id: ticket.id,
      storageKey: ticket.storageKey,
      fileName: ticket.fileName,
      mimeType: ticket.mimeType,
      uploadedBy: me.id,
      createdAt,
    };
    if (ticket.purpose === "asset") {
      const { config, task } = await lockDemandKanban(db, me.agencyOwnerId!, ticket.targetId);
      const placement = resolveKanbanPlacement(config, task, { status: "review" }, "briefing");
      const [latest] = await db
        .select()
        .from(assets)
        .where(eq(assets.deliverableId, ticket.targetId))
        .orderBy(desc(assets.version))
        .limit(1);
      await db
        .insert(assets)
        .values({
          ...base,
          deliverableId: ticket.targetId,
          version: (latest?.version || 0) + 1,
        });
      await db
        .update(deliverables)
        .set({ status: "review", columnId: placement.columnId, updatedAt: createdAt })
        .where(eq(deliverables.id, ticket.targetId));
    } else if (ticket.purpose === "attachment") {
      await db
        .insert(attachments)
        .values({
          ...base,
          deliverableId: ticket.targetId,
          slidePosition: ticket.slidePosition,
          fileSize: ticket.fileSize,
        });
    } else if (ticket.purpose === "avatar" || ticket.purpose === "banner") {
      await db
        .update(clients)
        .set(
          ticket.purpose === "avatar"
            ? { avatarKey: ticket.storageKey }
            : { bannerKey: ticket.storageKey },
        )
        .where(eq(clients.id, ticket.targetId));
    } else {
      const table =
        ticket.purpose === "transaction" ? transactions : workerCompetencies;
      const [row] = await db
        .select({ competence: table.competence })
        .from(table)
        .where(eq(table.id, ticket.targetId))
        .limit(1);
      await db
        .insert(financialDocuments)
        .values({
          ...base,
          agencyOwnerId: me.agencyOwnerId!,
          transactionId:
            ticket.purpose === "transaction" ? ticket.targetId : null,
          workerCompetencyId:
            ticket.purpose === "competency" ? ticket.targetId : null,
          type: ticket.purpose === "competency" ? "invoice" : "receipt",
          competence: row.competence,
          fileSize: ticket.fileSize,
        });
      if (ticket.purpose === "competency")
        await db
          .update(workerCompetencies)
          .set({ invoiceStatus: "received", updatedAt: createdAt })
          .where(eq(workerCompetencies.id, ticket.targetId));
    }
    await db
      .update(uploadTickets)
      .set({ consumedAt: createdAt })
      .where(eq(uploadTickets.id, id));
    return { ok: true, id };
  });
}
