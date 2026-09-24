import { lockKanbanBoard, lockDemandKanban, resolveKanbanPlacement, saveKanbanColumns } from "@/lib/kanban-server";
import {dateInputToISO} from "@/lib/dates";
import {futureMonthlyDates} from "@/lib/finance";
import { bucket } from "@/lib/storage";
import { assertSameOrigin, errorResponse, AppError } from "@/lib/http";
import { parseAction, authorizeAction } from "@/lib/action-validation";
import { createClientRecord } from "@/lib/client-creation";
import { agencyAction, agencyActionNames } from "@/lib/agency-actions";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { annotations, assets, attachments, boards, clientMembers, clients, crmActivities, crmDeals, crmLeads, deliverables, financeWorkers, activityLog, members, slides, deliverableReferences, transactions, workerCompetencies } from "@/db/schema";
import { canAccessAsset, canAccessDeliverable, canManageDeliverable, getCurrentMember } from "@/lib/server-workspace";
import { hashPassword } from "@/lib/auth";
import { hasPermission, permissionKeys, type PermissionKey } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const raw = await request.json();
    if (agencyActionNames.includes(raw?.action)) return Response.json(await agencyAction(raw));
    const authenticated = await getCurrentMember({seed:false});
    if (!authenticated) throw new AppError("Entre na sua conta e escolha uma agência.",401);
    const member = authenticated;
    const payload = parseAction(raw);
    await authorizeAction(member,payload);
    const managesTask = payload.action === "updateDeliverable" ? await canManageDeliverable(member.id, payload.id) : false;
    return await getDb().transaction(async (db) => {
    const can = (permission: PermissionKey) => member.permissions.includes(permission);
    const crmOwnerId = can("crm.access") ? member.agencyOwnerId : null;
    const financeOwnerId = can("finance.access") ? member.agencyOwnerId : null;
    let recordActivity = true;
    async function execute() {
    if (payload.action === "saveKanbanColumns") {
      return Response.json(await saveKanbanColumns(db, { agencyId: member.agencyOwnerId!, kind: payload.kind, clientId: payload.clientId }, payload));
    }
    if (payload.action === "createClient") {
      const result = await createClientRecord(db, member, payload);
      recordActivity = !result.replayed;
      return Response.json(result);
    }

    if (payload.action === "createDeliverable") {
      try {
        if (!can("demands.create")) return Response.json({ error: "Você não pode criar demandas." }, { status: 403 });
        const title = payload.title.trim();
        const slideCount = Math.max(1, Math.min(30, Number(payload.slideCount) || 1));
        if (!title || !payload.dueAt || !payload.kind) return Response.json({ error: "Preencha todos os campos obrigatórios (título, formato e prazo)." }, { status: 400 });
        const [targetBoard] = await db.select().from(boards).where(eq(boards.id, payload.boardId)).limit(1);
        if (!targetBoard) return Response.json({ error: "Pauta não encontrada." }, { status: 404 });
        if (!["manager", "admin"].includes(member.role) && member.clientAccessMode !== "all") {
          const [access] = await db.select().from(clientMembers).where(and(eq(clientMembers.clientId, targetBoard.clientId), eq(clientMembers.memberId, member.id))).limit(1);
          if (!access) return Response.json({ error: "Você não tem acesso a este cliente." }, { status: 403 });
        }
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const hasStoriesVersion = Boolean(payload.hasStoriesVersion);
        const config = await lockKanbanBoard(db, { agencyId: member.agencyOwnerId!, kind: "demands", clientId: targetBoard.clientId });
        const placement = resolveKanbanPlacement(config, null, payload, "briefing");
        await db.insert(deliverables).values({ columnId: placement.columnId, id, boardId: payload.boardId, title, kind: payload.kind, slideCount, status: placement.status as typeof deliverables.$inferInsert.status, assigneeId: payload.assigneeId, dueAt: dateInputToISO(payload.dueAt), notes: payload.notes?.trim() ?? "", sourceUrl: "", sortOrder: Date.now(), createdAt, updatedAt: createdAt, hasStoriesVersion });
        const draftSlides = Array.from({ length: slideCount }, (_, index) => payload.slides?.find((slide: {position:number;copy:string;direction:string}) => slide.position === index + 1) ?? { position: index + 1, copy: "", direction: "" });
        await db.insert(slides).values(draftSlides.map((slide) => ({ id: crypto.randomUUID(), deliverableId: id, position: slide.position, copy: slide.copy?.trim() ?? "", direction: slide.direction?.trim() ?? "" })));
        return Response.json({ ok: true, id });
      } catch (err) {
        console.error("Error creating deliverable:", err);
        throw err;
      }
    }

    if (payload.action === "updateClient") {
      if (!can("clients.manage")) return Response.json({ error: "Você não pode alterar os dados do cliente." }, { status: 403 });
      const driveUrl = payload.driveUrl.trim();
      if (driveUrl && !/^https:\/\//i.test(driveUrl)) return Response.json({ error: "Informe um link completo do Drive." }, { status: 400 });
      await db.update(clients).set({ driveUrl }).where(eq(clients.id, payload.id));
      return Response.json({ ok: true });
    }

    if (payload.action === "updateClientStatus") {
      if (!can("clients.manage") && !can("crm.access")) return Response.json({ error: "Você não pode alterar o status deste cliente." }, { status: 403 });
      const config = await lockKanbanBoard(db, { agencyId: member.agencyOwnerId!, kind: "crmClients" });
      const [client] = await db.select().from(clients).where(eq(clients.id, payload.id)).limit(1).for("update");
      if (!client) return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
      const placement = resolveKanbanPlacement(config, client, payload, "active");
      await db.update(clients).set({ status: payload.status, columnId: placement.columnId }).where(eq(clients.id, client.id));
      return Response.json({ ok: true });
    }

    if (payload.action === "deleteClient") {
      if (!can("clients.manage")) return Response.json({ error: "Você não pode excluir clientes." }, { status: 403 });
      const [client] = await db.select().from(clients).where(eq(clients.id, payload.id)).limit(1);
      if (!client) return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
      if (client.status !== "inactive") return Response.json({ error: "Coloque o cliente como inativo antes de excluí-lo." }, { status: 409 });

      const clientBoards = await db.select({ id: boards.id }).from(boards).where(eq(boards.clientId, client.id));
      const boardIds = clientBoards.map((row) => row.id);
      const clientDeliverables = boardIds.length
        ? await db.select({ id: deliverables.id }).from(deliverables).where(inArray(deliverables.boardId, boardIds))
        : [];
      const deliverableIds = clientDeliverables.map((row) => row.id);
      const assetRows = deliverableIds.length
        ? await db.select({ storageKey: assets.storageKey }).from(assets).where(inArray(assets.deliverableId, deliverableIds))
        : [];
      const attachmentRows = deliverableIds.length
        ? await db.select({ storageKey: attachments.storageKey }).from(attachments).where(inArray(attachments.deliverableId, deliverableIds))
        : [];
      const storageKeys = [client.avatarKey, client.bannerKey, ...assetRows.map((row) => row.storageKey), ...attachmentRows.map((row) => row.storageKey)].filter((key): key is string => Boolean(key));

      await db.delete(clients).where(eq(clients.id, client.id));
      if (storageKeys.length) {
        try {
          await bucket.delete(storageKeys);
        } catch (error) {
          console.error("Falha ao remover os arquivos do cliente excluído:", error);
        }
      }
      return Response.json({ ok: true });
    }

    if (payload.action === "updateDeliverable") {
      const { config, task } = await lockDemandKanban(db, member.agencyOwnerId!, payload.id);
      const placement = resolveKanbanPlacement(config, task, payload, "briefing");
      if (!managesTask) {
        const destination = config.columns.find(column => column.id === payload.columnId);
        if ((destination?.status && !["production", "review"].includes(destination.status)) || (payload.status && !["production", "review"].includes(payload.status))) throw new AppError("Profissionais de produção só podem iniciar, enviar para revisão ou organizar suas demandas em listas personalizadas.", 403);
      }
      const update: Record<string, string | number | null> = { updatedAt: new Date().toISOString(), status: placement.status, columnId: placement.columnId };
      if (typeof payload.sortOrder === "number") update.sortOrder = payload.sortOrder;
      if ("assigneeId" in payload) update.assigneeId = payload.assigneeId ?? null;
      if (payload.dueAt) update.dueAt = dateInputToISO(payload.dueAt);
      if (payload.title) update.title = payload.title.trim();
      if (typeof payload.notes === "string") update.notes = payload.notes;
      await db.update(deliverables).set(update).where(eq(deliverables.id, payload.id));
      return Response.json({ ok: true });
    }

    if (payload.action === "deleteDeliverable") {
      if (!can("demands.create")) return Response.json({ error: "Você não pode apagar demandas." }, { status: 403 });
      await db.delete(deliverables).where(eq(deliverables.id, payload.id));
      return Response.json({ ok: true });
    }

    if (payload.action === "saveSlides") {
      // The task row serializes saves; changing slide IDs is the revision marker.
      const [locked] = await db.select({ id: deliverables.id }).from(deliverables).where(eq(deliverables.id, payload.deliverableId)).limit(1).for("update");
      if (!locked) throw new AppError("Demanda não disponível.", 404);
      const currentSlides = await db.select({ id: slides.id }).from(slides).where(eq(slides.deliverableId, payload.deliverableId)).orderBy(asc(slides.position));
      if (currentSlides.length !== payload.expectedSlideIds.length || currentSlides.some((slide, index) => slide.id !== payload.expectedSlideIds[index])) {
        throw new AppError("Esta pauta foi atualizada em outra edição. Seu rascunho foi mantido. Carregue a versão atual antes de salvar novamente.", 409);
      }
      const normalized = payload.slides.slice(0, 30).map((slide: {copy:string;direction:string}, index:number) => ({ id: crypto.randomUUID(), deliverableId: payload.deliverableId, position: index + 1, copy: slide.copy, direction: slide.direction }));
      if (!normalized.length) return Response.json({ error: "A pauta precisa ter pelo menos uma fatia." }, { status: 400 });
      await db.delete(slides).where(eq(slides.deliverableId, payload.deliverableId));
      await db.insert(slides).values(normalized);
      await db.update(deliverables).set({ slideCount: normalized.length, updatedAt: new Date().toISOString() }).where(eq(deliverables.id, payload.deliverableId));
      return Response.json({ ok: true, slideIds: normalized.map(slide => slide.id) });
    }

    if (payload.action === "addAnnotation") {
      const comment = payload.comment.trim();
      if (!comment) return Response.json({ error: "Descreva a alteração." }, { status: 400 });
      if (can("demands.execute") && !can("demands.create")) return Response.json({ error: "O responsável pela pauta fará os apontamentos de revisão." }, { status: 403 });
      const row = { id: crypto.randomUUID(), assetId: payload.assetId, slideNumber: payload.slideNumber, x: payload.x, y: payload.y, comment, authorId: member.id, status: "open" as const, createdAt: new Date().toISOString(), resolvedAt: null };
      await db.insert(annotations).values(row);

      const [asset] = await db.select().from(assets).where(eq(assets.id, payload.assetId)).limit(1);
      if (asset) {
        const { config, task } = await lockDemandKanban(db, member.agencyOwnerId!, asset.deliverableId);
        const placement = resolveKanbanPlacement(config, task, { status: "changes" }, "briefing");
        await db.update(deliverables).set({ status: "changes", columnId: placement.columnId, updatedAt: new Date().toISOString() }).where(eq(deliverables.id, asset.deliverableId));
      }

      return Response.json({ ok: true, annotation: row });
    }

    if (payload.action === "resolveAnnotation") {
      const [annotation] = await db.select().from(annotations).where(eq(annotations.id, payload.id)).limit(1);
      await db.update(annotations).set({ status: payload.status, resolvedAt: payload.status === "resolved" ? new Date().toISOString() : null }).where(eq(annotations.id, payload.id));
      return Response.json({ ok: true });
    }

    if (payload.action === "updateClientCrm") {
      if (!can("crm.access")) return Response.json({ error: "Você não tem acesso ao CRM." }, { status: 403 });
      const clientId = payload.id;
      const config = await lockKanbanBoard(db, { agencyId: member.agencyOwnerId!, kind: "crmClients" });
      const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1).for("update");
      if (!client) throw new AppError("Cliente não disponível.", 404);
      const placement = resolveKanbanPlacement(config, client, payload, "active");
      const changes = { status: placement.status as typeof client.status, columnId: placement.columnId, contactName: payload.contactName, phone: payload.phone, email: payload.email, notes: payload.notes, revenue: payload.revenue, dueDay: payload.dueDay };
      await db.update(clients).set(changes).where(eq(clients.id, clientId));
      // Contact/status edits must never rewrite hidden financial values or forecasts.
      if (payload.revenue !== undefined || payload.dueDay !== undefined) {
        const futureForecasts = await db.select().from(transactions).where(and(eq(transactions.clientId, clientId), eq(transactions.recurring, true)));
        for (const transaction of futureForecasts.filter((row) => ["predicted", "open"].includes(row.status) && new Date(row.dueDate).getTime() >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime())) {
          const currentDate = new Date(transaction.dueDate);
          const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
          const dueDate = payload.dueDay === undefined ? transaction.dueDate : new Date(currentDate.getFullYear(), currentDate.getMonth(), Math.min(payload.dueDay, lastDay), 12).toISOString();
          await db.update(transactions).set({ amount: payload.revenue ?? transaction.amount, dueDate, updatedAt: new Date().toISOString() }).where(eq(transactions.id, transaction.id));
        }
      }
      return Response.json({ ok: true });
    }

    if (payload.action === "createTransaction") {
      if (!financeOwnerId) return Response.json({ error: "Apenas o gerente da agência e o desenvolvedor podem acessar o financeiro." }, { status: 403 });
      if (!payload.description.trim() || !payload.category.trim() || !payload.dueDate || payload.amount <= 0) return Response.json({ error: "Preencha descrição, categoria, vencimento e um valor válido." }, { status: 400 });
      if (payload.status === "partial" && (typeof payload.paidAmount !== "number" || !(payload.paidAmount > 0) || payload.paidAmount >= payload.amount)) return Response.json({ error: "O pagamento parcial deve ser maior que zero e menor que o total." }, { status: 400 });
      const createdAt = new Date().toISOString();
      const row = {
        id: crypto.randomUUID(),
        agencyOwnerId: financeOwnerId,
        type: payload.type,
        amount: payload.amount,
        paidAmount: payload.status === "paid" ? payload.amount : payload.status === "partial" ? payload.paidAmount ?? 0 : 0,
        category: payload.category.trim(),
        costCenter: payload.costCenter.trim(),
        account: payload.account.trim() || "Conta principal",
        status: payload.status,
        competence: payload.competence,
        dueDate: dateInputToISO(payload.dueDate),
        paymentDate: payload.status === "paid" ? dateInputToISO(payload.paymentDate || Date.now()) : null,
        clientId: payload.clientId,
        counterpart: payload.counterpart.trim(),
        paymentMethod: payload.paymentMethod.trim(),
        recurring: payload.recurring,
        recurrence: payload.recurring ? payload.recurrence : "",
        description: payload.description.trim(),
        notes: payload.notes.trim(),
        createdBy: member.id,
        createdAt,
        updatedAt: createdAt,
      } satisfies typeof transactions.$inferInsert;
      const forecasts = payload.recurring ? futureMonthlyDates(payload.competence,row.dueDate).map(date=>({...row,...date,id:crypto.randomUUID(),status:"predicted" as const,paidAmount:0,paymentDate:null,notes:`${row.notes}\nPrevisão mensal gerada no cadastro.`.trim()})) : [];
      await db.insert(transactions).values([row,...forecasts]);
      return Response.json({ ok: true,id:row.id,forecasts:forecasts.length });
    }

    if (payload.action === "updateTransaction") {
      if (!financeOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      const [transaction] = await db.select().from(transactions).where(and(eq(transactions.id, payload.id), eq(transactions.agencyOwnerId, financeOwnerId))).limit(1);
      if (!transaction) return Response.json({ error: "Lançamento não encontrado." }, { status: 404 });
      const nextStatus = payload.status ?? transaction.status;
      const paidAmount = nextStatus === "paid" ? transaction.amount : nextStatus === "open" || nextStatus === "predicted" || nextStatus === "cancelled" ? 0 : payload.paidAmount ?? transaction.paidAmount;
      if(paidAmount > transaction.amount || (nextStatus === "partial" && (paidAmount <= 0 || paidAmount >= transaction.amount))) throw new AppError("Valor pago incompatível com o lançamento.");
      await db.update(transactions).set({
        status: nextStatus,
        paidAmount,
        paymentDate: paidAmount > 0 ? dateInputToISO(payload.paymentDate || transaction.paymentDate || Date.now()) : null,
        description: payload.description?.trim() ?? transaction.description,
        category: payload.category?.trim() ?? transaction.category,
        costCenter: payload.costCenter?.trim() ?? transaction.costCenter,
        account: payload.account?.trim() ?? transaction.account,
        dueDate: payload.dueDate ? dateInputToISO(payload.dueDate) : transaction.dueDate,
        notes: payload.notes?.trim() ?? transaction.notes,
        updatedAt: new Date().toISOString(),
      }).where(eq(transactions.id, payload.id));
      return Response.json({ ok: true });
    }

    if (payload.action === "duplicateTransaction") {
      if (!financeOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      const [source] = await db.select().from(transactions).where(and(eq(transactions.id, payload.id), eq(transactions.agencyOwnerId, financeOwnerId))).limit(1);
      if (!source) return Response.json({ error: "Lançamento não encontrado." }, { status: 404 });
      const createdAt = new Date().toISOString();
      await db.insert(transactions).values({ ...source, id: crypto.randomUUID(), status: "open", paidAmount: 0, paymentDate: null, description: `${source.description} (cópia)`, createdBy: member.id, createdAt, updatedAt: createdAt, archivedAt: null });
      return Response.json({ ok: true });
    }

    if (payload.action === "archiveTransaction") {
      if (!financeOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      await db.update(transactions).set({ archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(and(eq(transactions.id, payload.id), eq(transactions.agencyOwnerId, financeOwnerId)));
      return Response.json({ ok: true });
    }

    if (payload.action === "createFinanceWorker") {
      if (!financeOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      if (!payload.name.trim()) return Response.json({ error: "Informe o nome do profissional." }, { status: 400 });
      const createdAt = new Date().toISOString();
      await db.insert(financeWorkers).values({ id: crypto.randomUUID(), agencyOwnerId: financeOwnerId, name: payload.name.trim(), employmentType: payload.employmentType, status: "active", taxId: payload.taxId.trim(), companyName: payload.companyName.trim(), role: payload.role.trim(), costCenter: payload.costCenter.trim() || "Equipe", email: payload.email.trim(), phone: payload.phone.trim(), monthlyAmount: Math.max(0, payload.monthlyAmount), paymentDay: Math.max(1, Math.min(31, payload.paymentDay)), paymentMethod: payload.paymentMethod.trim(), paymentDetails: payload.paymentDetails.trim(), invoiceRequired: payload.invoiceRequired, contractEnd: payload.contractEnd ? dateInputToISO(payload.contractEnd) : null, notes: payload.notes.trim(), createdAt, updatedAt: createdAt });
      return Response.json({ ok: true });
    }

    if (payload.action === "updateFinanceWorker") {
      if (!financeOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      const [worker] = await db.select().from(financeWorkers).where(and(eq(financeWorkers.id, payload.id), eq(financeWorkers.agencyOwnerId, financeOwnerId))).limit(1);
      if (!worker) return Response.json({ error: "Profissional não encontrado." }, { status: 404 });
      await db.update(financeWorkers).set({ status: payload.status ?? worker.status, monthlyAmount: payload.monthlyAmount ?? worker.monthlyAmount, paymentDay: payload.paymentDay ?? worker.paymentDay, paymentMethod: payload.paymentMethod ?? worker.paymentMethod, paymentDetails: payload.paymentDetails ?? worker.paymentDetails, invoiceRequired: payload.invoiceRequired ?? worker.invoiceRequired, notes: payload.notes ?? worker.notes, updatedAt: new Date().toISOString() }).where(eq(financeWorkers.id, payload.id));
      return Response.json({ ok: true });
    }

    if (payload.action === "createWorkerCompetency") {
      if (!financeOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      const [worker] = await db.select().from(financeWorkers).where(and(eq(financeWorkers.id, payload.workerId), eq(financeWorkers.agencyOwnerId, financeOwnerId))).limit(1).for("update");
      if (!worker) return Response.json({ error: "Profissional não encontrado." }, { status: 404 });
      const competence = payload.competence.trim();
      const [existingCompetency] = await db.select().from(workerCompetencies).where(and(eq(workerCompetencies.workerId,worker.id),eq(workerCompetencies.competence,competence))).limit(1);
      if(existingCompetency) return Response.json({ok:true,id:existingCompetency.id});
      if (!/^\d{4}-\d{2}$/.test(competence)) return Response.json({ error: "Informe uma competência válida." }, { status: 400 });
      const [year, month] = competence.split("-").map(Number);
      const defaultDue = new Date(Date.UTC(year, month - 1, Math.min(worker.paymentDay, new Date(Date.UTC(year, month, 0)).getUTCDate()),12)).toISOString();
      const createdAt = new Date().toISOString();
      await db.insert(workerCompetencies).values({ id: crypto.randomUUID(), agencyOwnerId: financeOwnerId, workerId: worker.id, competence, expectedAmount: payload.expectedAmount ?? worker.monthlyAmount, dueDate: payload.dueDate ? dateInputToISO(payload.dueDate) : defaultDue, status: worker.invoiceRequired ? "waiting_document" : "predicted", invoiceStatus: worker.invoiceRequired ? "waiting" : "not_required", createdAt, updatedAt: createdAt });
      return Response.json({ ok: true });
    }

    if (payload.action === "updateWorkerCompetency") {
      if (!financeOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      const [competency] = await db.select().from(workerCompetencies).where(and(eq(workerCompetencies.id, payload.id), eq(workerCompetencies.agencyOwnerId, financeOwnerId))).limit(1);
      if (!competency) return Response.json({ error: "Competência não encontrada." }, { status: 404 });
      const nextStatus = payload.status ?? competency.status;
      if (competency.expectedAmount + (payload.adjustments ?? competency.adjustments) < 0) throw new AppError("O total da competência não pode ser negativo.");
      await db.update(workerCompetencies).set({ status: nextStatus, invoiceStatus: payload.invoiceStatus ?? competency.invoiceStatus, adjustments: payload.adjustments ?? competency.adjustments, notes: payload.notes ?? competency.notes, paymentDate: nextStatus === "paid" ? new Date().toISOString() : null, updatedAt: new Date().toISOString() }).where(eq(workerCompetencies.id, payload.id));
      return Response.json({ ok: true });
    }

    if (payload.action === "createDeliverableReference") {
      if (!payload.url.trim()) return Response.json({ error: "A URL é obrigatória." }, { status: 400 });
      await db.insert(deliverableReferences).values({
        id: crypto.randomUUID(),
        deliverableId: payload.deliverableId,
        url: payload.url.trim(),
        description: payload.description.trim(),
        createdAt: new Date().toISOString()
      });
      return Response.json({ ok: true });
    }

    if (payload.action === "createBoard") {
      if (!can("demands.create")) return Response.json({ error: "Acesso negado." }, { status: 403 });
      const boardId = crypto.randomUUID();
      await db.insert(boards).values({ id: boardId, clientId: payload.clientId, title: "Planejamento de Mídia Social", period: payload.period.trim() || "Pauta atual", status: "active", createdBy: member.id, createdAt: new Date().toISOString() });
      return Response.json({ ok: true, boardId });
    }

    if (payload.action === "createCrmLead") {
      if (!crmOwnerId) return Response.json({ error: "Acesso negado ao CRM." }, { status: 403 });
      const company = payload.company.trim();
      if (!company) return Response.json({ error: "Informe a empresa ou nome do lead." }, { status: 400 });
      const createdAt = new Date().toISOString();
      const config = await lockKanbanBoard(db, { agencyId: crmOwnerId, kind: "crmLeads" });
      const placement = resolveKanbanPlacement(config, null, payload, "new");
      const row = { columnId: placement.columnId, id: crypto.randomUUID(), agencyOwnerId: crmOwnerId, company, contactName: payload.contactName.trim(), email: payload.email.trim(), phone: payload.phone.trim(), source: payload.source.trim() || "Manual", status: placement.status as typeof crmLeads.$inferInsert.status, score: 0, potentialValue: Math.max(0, Number(payload.potentialValue) || 0), nextAction: payload.nextAction.trim(), nextActionAt: payload.nextActionAt ? dateInputToISO(payload.nextActionAt) : null, notes: payload.notes.trim(), ownerId: payload.ownerId || member.id, createdAt, updatedAt: createdAt };
      await db.insert(crmLeads).values(row);
      if (row.nextAction) await db.insert(crmActivities).values({ id: crypto.randomUUID(), agencyOwnerId: crmOwnerId, leadId: row.id, dealId: null, type: "task", title: row.nextAction, dueAt: row.nextActionAt, status: "pending", notes: "", createdBy: member.id, createdAt });
      return Response.json({ ok: true, id: row.id });
    }

    if (payload.action === "updateCrmLead") {
      if (!crmOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      const config = await lockKanbanBoard(db, { agencyId: crmOwnerId, kind: "crmLeads" });
      const [lead] = await db.select().from(crmLeads).where(and(eq(crmLeads.id, payload.id), eq(crmLeads.agencyOwnerId, crmOwnerId))).limit(1).for("update");
      if (!lead) return Response.json({ error: "Lead não encontrado." }, { status: 404 });
      const placement = resolveKanbanPlacement(config, lead, payload, "new");
      const update: Record<string, unknown> = { updatedAt: new Date().toISOString(), status: placement.status, columnId: placement.columnId };
      if (typeof payload.score === "number") update.score = Math.max(0, Math.min(100, payload.score));
      if (typeof payload.nextAction === "string") update.nextAction = payload.nextAction.trim();
      if ("nextActionAt" in payload) update.nextActionAt = payload.nextActionAt ? dateInputToISO(payload.nextActionAt) : null;
      if (typeof payload.notes === "string") update.notes = payload.notes.trim();
      await db.update(crmLeads).set(update).where(eq(crmLeads.id, payload.id));
      return Response.json({ ok: true });
    }

    if (payload.action === "convertCrmLead") {
      if (!crmOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      const leadConfig = await lockKanbanBoard(db, { agencyId: crmOwnerId, kind: "crmLeads" });
      const dealConfig = await lockKanbanBoard(db, { agencyId: crmOwnerId, kind: "crmDeals" });
      const [lead] = await db.select().from(crmLeads).where(and(eq(crmLeads.id, payload.id), eq(crmLeads.agencyOwnerId, crmOwnerId))).limit(1).for("update");
      if (!lead) return Response.json({ error: "Lead não encontrado." }, { status: 404 });
      const [existingDeal] = await db.select().from(crmDeals).where(and(eq(crmDeals.leadId, lead.id),eq(crmDeals.agencyOwnerId,crmOwnerId))).limit(1);
      if(existingDeal) return Response.json({ok:true,dealId:existingDeal.id});
      const createdAt = new Date().toISOString();
      const dealId = crypto.randomUUID();
      const dealPlacement = resolveKanbanPlacement(dealConfig, null, {}, "discovery");
      const leadPlacement = resolveKanbanPlacement(leadConfig, lead, { status: "sql" }, "new");
      await db.insert(crmDeals).values({ columnId: dealPlacement.columnId, id: dealId, agencyOwnerId: crmOwnerId, leadId: lead.id, company: lead.company, contactName: lead.contactName, value: Math.max(0, Number(payload.value) || lead.potentialValue), stage: "discovery", probability: 10, nextAction: lead.nextAction || "Agendar discovery", nextActionAt: lead.nextActionAt, closeDate: payload.closeDate ? dateInputToISO(payload.closeDate) : null, ownerId: lead.ownerId, notes: lead.notes, lossReason: null, createdAt, updatedAt: createdAt });
      await db.update(crmLeads).set({ status: "sql", columnId: leadPlacement.columnId, updatedAt: createdAt }).where(eq(crmLeads.id, lead.id));
      return Response.json({ ok: true, dealId });
    }

    if (payload.action === "createCrmDeal") {
      if (!crmOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      const createdAt = new Date().toISOString();
      const config = await lockKanbanBoard(db, { agencyId: crmOwnerId, kind: "crmDeals" });
      const placement = resolveKanbanPlacement(config, null, payload, "discovery");
      const probabilities: Record<string, number> = { discovery: 10, solution: 35, proposal: 50, negotiation: 65, decision: 80, contract: 90, won: 100, lost: 0 };
      if (placement.status === "lost" && !payload.lossReason?.trim()) throw new AppError("Informe o motivo da perda.");
      const row = { columnId: placement.columnId, id: crypto.randomUUID(), agencyOwnerId: crmOwnerId, leadId: null, company: payload.company.trim(), contactName: payload.contactName.trim(), value: Math.max(0, Number(payload.value) || 0), stage: placement.status as typeof crmDeals.$inferInsert.stage, probability: probabilities[placement.status] ?? 10, nextAction: payload.nextAction.trim(), nextActionAt: payload.nextActionAt ? dateInputToISO(payload.nextActionAt) : null, closeDate: payload.closeDate ? dateInputToISO(payload.closeDate) : null, ownerId: payload.ownerId || member.id, notes: payload.notes.trim(), lossReason: placement.status === "lost" ? payload.lossReason?.trim() || null : null, createdAt, updatedAt: createdAt };
      if (!row.company) return Response.json({ error: "Informe a empresa." }, { status: 400 });
      await db.insert(crmDeals).values(row);
      return Response.json({ ok: true, id: row.id });
    }

    if (payload.action === "updateCrmDeal") {
      if (!crmOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      const config = await lockKanbanBoard(db, { agencyId: crmOwnerId, kind: "crmDeals" });
      const [deal] = await db.select().from(crmDeals).where(and(eq(crmDeals.id, payload.id), eq(crmDeals.agencyOwnerId, crmOwnerId))).limit(1).for("update");
      if (!deal) return Response.json({ error: "Oportunidade não encontrada." }, { status: 404 });
      const probabilities: Record<string, number> = { discovery: 10, solution: 35, proposal: 50, negotiation: 65, decision: 80, contract: 90, won: 100, lost: 0 };
      const placement = resolveKanbanPlacement(config, { columnId: deal.columnId, status: deal.stage }, { columnId: payload.columnId, status: payload.stage }, "discovery");
      const update: Record<string, unknown> = { updatedAt: new Date().toISOString(), stage: placement.status, columnId: placement.columnId };
      if (placement.status !== deal.stage || payload.stage) update.probability = probabilities[placement.status] ?? deal.probability;
      if (typeof payload.probability === "number") update.probability = Math.max(0, Math.min(100, payload.probability));
      if (typeof payload.nextAction === "string") update.nextAction = payload.nextAction.trim();
      if ("nextActionAt" in payload) update.nextActionAt = payload.nextActionAt ? dateInputToISO(payload.nextActionAt) : null;
      if ("lossReason" in payload) update.lossReason = payload.lossReason?.trim() || null;
      if (placement.status === "lost" && !("lossReason" in update ? update.lossReason : deal.lossReason)) return Response.json({ error: "Informe o motivo da perda." }, { status: 400 });
      await db.update(crmDeals).set(update).where(eq(crmDeals.id, payload.id));
      return Response.json({ ok: true });
    }

    if (payload.action === "createCrmActivity") {
      if (!crmOwnerId || !payload.title.trim()) return Response.json({ error: "Informe a atividade." }, { status: 400 });
      await db.insert(crmActivities).values({ id: crypto.randomUUID(), agencyOwnerId: crmOwnerId, leadId: payload.leadId || null, dealId: payload.dealId || null, type: payload.type, title: payload.title.trim(), dueAt: payload.dueAt ? dateInputToISO(payload.dueAt) : null, status: "pending", notes: payload.notes?.trim() || "", createdBy: member.id, createdAt: new Date().toISOString() });
      return Response.json({ ok: true });
    }

    if (payload.action === "completeCrmActivity") {
      if (!crmOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      await db.update(crmActivities).set({ status: "done" }).where(and(eq(crmActivities.id, payload.id), eq(crmActivities.agencyOwnerId, crmOwnerId)));
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Ação inválida." }, { status: 400 });
    }
    const result = await execute();
    if (!result.ok) throw new AppError((await result.json()).error, result.status);
    if (recordActivity) await db.insert(activityLog).values({id:crypto.randomUUID(),agencyId:member.agencyOwnerId!,memberId:member.id,action:payload.action,entityId:"id" in payload ? payload.id : "deliverableId" in payload ? payload.deliverableId : null,createdAt:new Date().toISOString()});
    return result;
    });
  } catch (error) {
    return errorResponse(error);
  }
}
