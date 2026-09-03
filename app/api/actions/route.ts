import { env } from "cloudflare:workers";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { annotations, assets, attachments, boards, clientMembers, clients, crmActivities, crmDeals, crmLeads, deliverables, financeWorkers, memberPermissions, members, slides, deliverableReferences, transactions, workerCompetencies } from "@/db/schema";
import { canAccessAsset, canAccessDeliverable, canManageDeliverable, getCurrentMember } from "@/lib/server-workspace";
import { hashPassword } from "@/lib/auth";
import { hasPermission, permissionKeys, type PermissionKey } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type Payload =
  | { action: "inviteMember"; email: string; name: string; role: "manager" | "admin" | "social" | "designer" | "copywriter" | "video_editor" | "collaborator" | "client"; clientIds: string[]; permissions?: PermissionKey[]; clientAccessMode?: "all" | "selected" }
  | { action: "updateMember"; id: string; role: "manager" | "admin" | "social" | "designer" | "copywriter" | "video_editor" | "collaborator" | "client"; status: "pending" | "active" | "inactive"; clientIds: string[]; permissions?: PermissionKey[]; clientAccessMode?: "all" | "selected"; password?: string }
  | { action: "createClient"; name: string; handle: string; driveUrl: string; period: string; revenue?: number; dueDay?: number }
  | { action: "updateClient"; id: string; driveUrl: string }
  | { action: "updateClientStatus"; id: string; status: "active" | "inactive" }
  | { action: "deleteClient"; id: string }
  | { action: "createDeliverable"; boardId: string; title: string; kind: "carousel" | "reels" | "stories" | "static"; slideCount: number; assigneeId: string | null; dueAt: string; notes: string; slides?: { position: number; copy: string; direction: string }[] }
  | { action: "updateDeliverable"; id: string; status?: string; assigneeId?: string | null; dueAt?: string; title?: string; notes?: string }
  | { action: "deleteDeliverable"; id: string }
  | { action: "saveSlides"; deliverableId: string; slides: { position: number; copy: string; direction: string }[] }
  | { action: "addAnnotation"; assetId: string; slideNumber: number; x: number; y: number; comment: string }
  | { action: "resolveAnnotation"; id: string; status: "open" | "resolved" }
  | { action: "updateClientCrm"; id: string; status: "prospecting" | "active" | "inactive"; contactName: string; phone: string; email: string; revenue: number; dueDay?: number; notes: string }
  | { action: "createTransaction"; type: "income" | "expense" | "transfer" | "contribution" | "withdrawal" | "reimbursement" | "reversal" | "fee" | "tax" | "adjustment"; amount: number; paidAmount?: number; category: string; costCenter: string; account: string; status: "predicted" | "open" | "partial" | "paid" | "overdue" | "cancelled"; competence: string; dueDate: string; paymentDate?: string | null; clientId: string | null; counterpart: string; paymentMethod: string; recurring: boolean; recurrence: string; description: string; notes: string }
  | { action: "updateTransaction"; id: string; status?: "predicted" | "open" | "partial" | "paid" | "overdue" | "cancelled"; paidAmount?: number; paymentDate?: string | null; description?: string; category?: string; costCenter?: string; account?: string; dueDate?: string; notes?: string }
  | { action: "duplicateTransaction"; id: string }
  | { action: "archiveTransaction"; id: string }
  | { action: "createFinanceWorker"; name: string; employmentType: "clt" | "pj" | "partner" | "intern" | "freelancer" | "other"; taxId: string; companyName: string; role: string; costCenter: string; email: string; phone: string; monthlyAmount: number; paymentDay: number; paymentMethod: string; paymentDetails: string; invoiceRequired: boolean; contractEnd?: string | null; notes: string }
  | { action: "updateFinanceWorker"; id: string; status?: "active" | "away" | "inactive"; monthlyAmount?: number; paymentDay?: number; paymentMethod?: string; paymentDetails?: string; invoiceRequired?: boolean; notes?: string }
  | { action: "createWorkerCompetency"; workerId: string; competence: string; dueDate?: string; expectedAmount?: number }
  | { action: "updateWorkerCompetency"; id: string; status?: "predicted" | "waiting_document" | "approved" | "paid" | "overdue"; invoiceStatus?: "not_required" | "waiting" | "received" | "validated" | "divergent"; adjustments?: number; notes?: string }
  | { action: "createDeliverableReference"; deliverableId: string; url: string; description: string }
  | { action: "deactivateMember"; id: string }
  | { action: "createBoard"; clientId: string; period: string }
  | { action: "createCrmLead"; company: string; contactName: string; email: string; phone: string; source: string; potentialValue: number; nextAction: string; nextActionAt?: string; notes: string; ownerId?: string | null }
  | { action: "updateCrmLead"; id: string; status?: string; score?: number; nextAction?: string; nextActionAt?: string | null; notes?: string }
  | { action: "convertCrmLead"; id: string; value: number; closeDate?: string }
  | { action: "createCrmDeal"; company: string; contactName: string; value: number; nextAction: string; nextActionAt?: string; closeDate?: string; notes: string; ownerId?: string | null }
  | { action: "updateCrmDeal"; id: string; stage?: string; probability?: number; nextAction?: string; nextActionAt?: string | null; lossReason?: string | null }
  | { action: "createCrmActivity"; leadId?: string | null; dealId?: string | null; type: "call" | "whatsapp" | "email" | "meeting" | "task" | "note"; title: string; dueAt?: string; notes?: string }
  | { action: "completeCrmActivity"; id: string };

export async function POST(request: Request) {
  try {
    const member = await getCurrentMember({ seed: false });
    if (!member) return Response.json({ error: "Não autorizado." }, { status: 403 });
    const payload = (await request.json()) as Payload;
    const db = getDb();
    const currentPermissionRows = await db.select().from(memberPermissions).where(eq(memberPermissions.memberId, member.id));
    const explicitPermissions = currentPermissionRows.map((row) => row.permission);
    const can = (permission: PermissionKey) => hasPermission(member.role, explicitPermissions, permission);
    const workspaceOwnerId = ["manager", "admin"].includes(member.role) ? member.id : member.agencyOwnerId;
    const crmOwnerId = can("crm.access") ? (member.role === "manager" ? member.id : member.role === "admin" ? member.id : member.agencyOwnerId) : null;
    const financeOwnerId = can("finance.access") ? (["manager", "admin"].includes(member.role) ? member.id : member.agencyOwnerId) : null;

    if (payload.action === "createClient") {
      if (!can("clients.manage")) return Response.json({ error: "Você não tem permissão para criar clientes." }, { status: 403 });
      const name = payload.name.trim();
      if (!name) return Response.json({ error: "Informe o nome do cliente." }, { status: 400 });
      const clientId = crypto.randomUUID();
      const boardId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const revenue = Math.max(0, Math.round(Number(payload.revenue) || 0));
      const dueDay = Math.max(1, Math.min(31, Math.round(Number(payload.dueDay) || 5)));
      await db.insert(clients).values({ id: clientId, name, handle: payload.handle.trim(), driveUrl: payload.driveUrl.trim(), accent: "#FFD84D", revenue, dueDay, createdAt });
      await db.insert(clientMembers).values({ clientId, memberId: member.id });
      await db.insert(boards).values({ id: boardId, clientId, title: "Planejamento de Mídia Social", period: payload.period.trim() || "Pauta atual", status: "active", createdBy: member.id, createdAt });
      if (revenue > 0 && workspaceOwnerId) {
        const today = new Date();
        const forecasts = Array.from({ length: 12 }, (_, offset) => {
          const year = today.getFullYear();
          const monthIndex = today.getMonth() + offset;
          const monthStart = new Date(year, monthIndex, 1);
          const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
          const dueDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(dueDay, lastDay), 12);
          const competence = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
          return { id: crypto.randomUUID(), agencyOwnerId: workspaceOwnerId, type: "income" as const, amount: revenue, paidAmount: 0, category: "Mensalidades", costCenter: "Clientes", account: "Conta principal", status: "predicted" as const, competence, dueDate: dueDate.toISOString(), paymentDate: null, clientId, counterpart: name, paymentMethod: "", recurring: true, recurrence: "monthly", description: `Mensalidade — ${name}`, notes: "Previsão gerada automaticamente no cadastro do cliente.", createdBy: member.id, createdAt, updatedAt: createdAt, archivedAt: null };
        });
        await db.insert(transactions).values(forecasts);
      }
      return Response.json({ ok: true, clientId, boardId });
    }

    if (payload.action === "createDeliverable") {
      try {
        if (!can("demands.create")) return Response.json({ error: "Você não pode criar demandas." }, { status: 403 });
        const title = payload.title.trim();
        const slideCount = Math.max(1, Math.min(30, Number(payload.slideCount) || 1));
        if (!title || !payload.dueAt || !payload.assigneeId || !payload.kind) return Response.json({ error: "Preencha todos os campos obrigatórios (título, formato, prazo e responsável)." }, { status: 400 });
        const [targetBoard] = await db.select().from(boards).where(eq(boards.id, payload.boardId)).limit(1);
        if (!targetBoard) return Response.json({ error: "Pauta não encontrada." }, { status: 404 });
        if (!["manager", "admin"].includes(member.role) && member.clientAccessMode !== "all") {
          const [access] = await db.select().from(clientMembers).where(and(eq(clientMembers.clientId, targetBoard.clientId), eq(clientMembers.memberId, member.id))).limit(1);
          if (!access) return Response.json({ error: "Você não tem acesso a este cliente." }, { status: 403 });
        }
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const hasStoriesVersion = Boolean((payload as any).hasStoriesVersion);
        await db.insert(deliverables).values({ id, boardId: payload.boardId, title, kind: payload.kind, slideCount, status: "briefing", assigneeId: payload.assigneeId, dueAt: new Date(payload.dueAt).toISOString(), notes: payload.notes?.trim() ?? "", sourceUrl: "", sortOrder: Date.now(), createdAt, updatedAt: createdAt, hasStoriesVersion });
        const draftSlides = Array.from({ length: slideCount }, (_, index) => payload.slides?.find((slide) => slide.position === index + 1) ?? { position: index + 1, copy: "", direction: "" });
        await db.insert(slides).values(draftSlides.map((slide) => ({ id: crypto.randomUUID(), deliverableId: id, position: slide.position, copy: slide.copy?.trim() ?? "", direction: slide.direction?.trim() ?? "" })));
        return Response.json({ ok: true, id });
      } catch (err: any) {
        console.error("Error creating deliverable:", err);
        return Response.json({ error: err.message }, { status: 500 });
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
      const [client] = await db.select().from(clients).where(eq(clients.id, payload.id)).limit(1);
      if (!client) return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
      await db.update(clients).set({ status: payload.status }).where(eq(clients.id, client.id));
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
          await (env as unknown as { BUCKET: { delete(keys: string | string[]): Promise<void> } }).BUCKET.delete(storageKeys);
        } catch (error) {
          console.error("Falha ao remover os arquivos do cliente excluído:", error);
        }
      }
      return Response.json({ ok: true });
    }

    if (payload.action === "inviteMember") {
      if (member.role !== "manager" && member.role !== "admin") return Response.json({ error: "Apenas o gerente da agência e administradores podem convidar pessoas." }, { status: 403 });
      if (member.role === "admin" && payload.role !== "manager") return Response.json({ error: "O desenvolvedor pode criar somente contas de gerente." }, { status: 403 });
      if (member.role === "manager" && (payload.role === "manager" || payload.role === "admin")) return Response.json({ error: "O gerente pode criar somente usuários da própria equipe." }, { status: 403 });
      const email = payload.email.trim().toLowerCase();
      const name = payload.name.trim() || email.split("@")[0];
      if (!email.includes("@")) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
      const processEnv = (globalThis as any).process?.env ?? {};
      const workerEnv = env as unknown as Record<string, string | undefined>;
      const apiKey = workerEnv.RESEND_API_KEY || processEnv.RESEND_API_KEY;
      if (!apiKey) return Response.json({ error: "O envio de e-mail ainda não está configurado. Adicione a chave RESEND_API_KEY para enviar convites reais." }, { status: 503 });
      const [existing] = await db.select().from(members).where(eq(members.email, email)).limit(1);

      if (existing?.status === "active") return Response.json({ error: "Este e-mail já possui acesso ativo ao sistema." }, { status: 409 });
      const inviteCode = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
      const setupToken = `${Date.now() + 24 * 60 * 60 * 1000}.${inviteCode}.${crypto.randomUUID()}`;
      const targetId = existing?.id ?? crypto.randomUUID();
      const agencyOwnerId = member.role === "admin" ? targetId : member.id;
      const clientAccessMode = payload.role === "manager" ? "all" : payload.clientAccessMode ?? "selected";
      if (existing && existing.id !== member.id && existing.agencyOwnerId && existing.agencyOwnerId !== agencyOwnerId) return Response.json({ error: "Este e-mail já pertence a outro espaço." }, { status: 409 });
      const target = existing 
        ? { ...existing, name, role: payload.role, agencyOwnerId, clientAccessMode, setupToken, status: "pending" as const, passwordHash: null }
        : { id: targetId, email, name, role: payload.role, agencyOwnerId, clientAccessMode, status: "pending" as const, createdAt: new Date().toISOString(), setupToken, passwordHash: null };
      
      if (!existing) {
        await db.insert(members).values(target as any);
      } else {
        await db.update(members).set({ name, role: payload.role, agencyOwnerId, clientAccessMode, setupToken, status: "pending", passwordHash: null }).where(eq(members.id, existing.id));
      }

      const assignedPermissions = payload.role === "manager" || payload.role === "admin" ? [...permissionKeys] : (payload.permissions ?? []);
      await db.delete(memberPermissions).where(eq(memberPermissions.memberId, target.id));
      if (assignedPermissions.length) await db.insert(memberPermissions).values(assignedPermissions.map((permission) => ({ memberId: target.id, permission }))).onConflictDoNothing();
      
      for (const clientId of payload.clientIds) {
        await db.insert(clientMembers).values({ clientId, memberId: target.id }).onConflictDoNothing();
      }
      
      try {
        const requestUrl = new URL(request.url);
        const configuredOrigin = String(workerEnv.APP_URL || processEnv.APP_URL || "").replace(/\/$/, "");
        const origin = configuredOrigin || `${requestUrl.protocol}//${requestUrl.host}`;
        const setupLink = `${origin}/setup-password?token=${encodeURIComponent(setupToken)}&email=${encodeURIComponent(email)}`;
        const { Resend } = await import("resend");
        const resend = new Resend(apiKey);
        const safeName = name.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
        const delivery = await resend.emails.send({
              from: workerEnv.RESEND_FROM_EMAIL || processEnv.RESEND_FROM_EMAIL || "Pauta <onboarding@resend.dev>",
              to: [email],
              subject: "Seu código de acesso à Pauta",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #17191d;">
                  <h2>Olá, ${safeName}.</h2>
                  <p>Seu acesso ao sistema Pauta foi liberado. A senha será criada somente por você.</p>
                  <p style="margin-bottom: 6px;">Seu código de acesso é:</p>
                  <div style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #f3f1ff; color: #5b4ce0; font-size: 26px; font-weight: 800; letter-spacing: 8px;">${inviteCode}</div>
                  <p><a href="${setupLink}" style="display: inline-block; padding: 12px 24px; background-color: #17191d; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; margin: 16px 0;">Criar minha senha</a></p>
                  <p style="color: #64748b; font-size: 13px;">Este convite expira em 24 horas e funciona apenas uma vez. Se você não esperava este e-mail, ignore-o.</p>
                </div>
              `
            });
        if (delivery.error) throw new Error(delivery.error.message);
      } catch (e) {
        console.error("Failed to send email", e);
        return Response.json({ error: "Não foi possível entregar o convite. Confira o endereço de e-mail e tente novamente." }, { status: 502 });
      }

      return Response.json({ ok: true, member: target });
    }

    if (payload.action === "updateMember") {
      if (member.role !== "manager" && member.role !== "admin") return Response.json({ error: "Apenas o gerente da agência e administradores podem alterar acessos." }, { status: 403 });
      const [target] = await db.select().from(members).where(eq(members.id, payload.id)).limit(1);
      if (!target) return Response.json({ error: "Usuário não encontrado." }, { status: 404 });
      if (member.role === "admin" && target.id !== member.id && target.role !== "manager") return Response.json({ error: "O desenvolvedor administra somente contas de gerentes." }, { status: 403 });
      if (member.role === "manager" && target.id !== member.id && target.agencyOwnerId !== member.id) return Response.json({ error: "Este usuário não pertence à sua agência." }, { status: 403 });
      if (target.role === "admin" && (payload.role !== "admin" || payload.status !== "active")) return Response.json({ error: "A conta do desenvolvedor não pode ser removida, inativada ou rebaixada." }, { status: 400 });
      if (member.role === "manager" && target.id === member.id && (payload.role !== "manager" || payload.status !== "active")) return Response.json({ error: "O gerente não pode remover o próprio acesso principal." }, { status: 400 });
      if (member.role === "manager" && target.id !== member.id && (payload.role === "manager" || payload.role === "admin")) return Response.json({ error: "O gerente não pode conceder acesso de desenvolvedor ou criar outro gerente." }, { status: 403 });
      const updateData: any = { role: payload.role, status: payload.status, clientAccessMode: payload.role === "manager" || payload.role === "admin" ? "all" : payload.clientAccessMode ?? target.clientAccessMode };
      if (payload.password) {
        updateData.passwordHash = await hashPassword(payload.password);
      }
      await db.update(members).set(updateData).where(eq(members.id, payload.id));
      const assignedPermissions = payload.role === "manager" || payload.role === "admin" ? [...permissionKeys] : (payload.permissions ?? []);
      await db.delete(memberPermissions).where(eq(memberPermissions.memberId, payload.id));
      if (assignedPermissions.length) await db.insert(memberPermissions).values(assignedPermissions.map((permission) => ({ memberId: payload.id, permission }))).onConflictDoNothing();
      await db.delete(clientMembers).where(eq(clientMembers.memberId, payload.id));
      for (const clientId of payload.clientIds) await db.insert(clientMembers).values({ clientId, memberId: payload.id }).onConflictDoNothing();
      return Response.json({ ok: true });
    }

    if (payload.action === "updateDeliverable") {
      const allowed = await canAccessDeliverable(member.id, payload.id, member.role);
      if (!allowed) return Response.json({ error: "Você não pode editar esta demanda." }, { status: 403 });
      if (!can("demands.create") && can("demands.execute")) {
        const statusAllowed = payload.status === "production" || payload.status === "review";
        const attemptedDetails = "assigneeId" in payload || payload.dueAt || payload.title || typeof payload.notes === "string";
        if (!statusAllowed || attemptedDetails) return Response.json({ error: "Profissionais de produção só podem iniciar a demanda ou enviá-la para revisão." }, { status: 403 });
      }
      const update: Record<string, string | null> = { updatedAt: new Date().toISOString() };
      if (payload.status) update.status = payload.status;
      if ("assigneeId" in payload) update.assigneeId = payload.assigneeId ?? null;
      if (payload.dueAt) update.dueAt = payload.dueAt;
      if (payload.title) update.title = payload.title.trim();
      if (typeof payload.notes === "string") update.notes = payload.notes;
      await db.update(deliverables).set(update).where(eq(deliverables.id, payload.id));
      return Response.json({ ok: true });
    }

    if (payload.action === "deleteDeliverable") {
      if (!can("demands.create")) return Response.json({ error: "Você não pode apagar demandas." }, { status: 403 });
      if (!(await canAccessDeliverable(member.id, payload.id, member.role))) return Response.json({ error: "Você não pode apagar esta demanda." }, { status: 403 });
      await db.delete(deliverables).where(eq(deliverables.id, payload.id));
      return Response.json({ ok: true });
    }

    if (payload.action === "saveSlides") {
      const allowed = await canManageDeliverable(member.id, payload.deliverableId, member.role);
      if (!allowed) return Response.json({ error: "Você não pode editar esta pauta." }, { status: 403 });
      const normalized = payload.slides.slice(0, 30).map((slide, index) => ({ id: crypto.randomUUID(), deliverableId: payload.deliverableId, position: index + 1, copy: slide.copy, direction: slide.direction }));
      if (!normalized.length) return Response.json({ error: "A pauta precisa ter pelo menos uma fatia." }, { status: 400 });
      await db.delete(slides).where(eq(slides.deliverableId, payload.deliverableId));
      await db.insert(slides).values(normalized);
      await db.update(deliverables).set({ slideCount: normalized.length, updatedAt: new Date().toISOString() }).where(eq(deliverables.id, payload.deliverableId));
      return Response.json({ ok: true });
    }

    if (payload.action === "addAnnotation") {
      const comment = payload.comment.trim();
      if (!comment) return Response.json({ error: "Descreva a alteração." }, { status: 400 });
      if (can("demands.execute") && !can("demands.create")) return Response.json({ error: "O responsável pela pauta fará os apontamentos de revisão." }, { status: 403 });
      if (!(await canAccessAsset(member.id, payload.assetId, member.role))) return Response.json({ error: "Você não pode revisar este arquivo." }, { status: 403 });
      const row = { id: crypto.randomUUID(), assetId: payload.assetId, slideNumber: payload.slideNumber, x: payload.x, y: payload.y, comment, authorId: member.id, status: "open" as const, createdAt: new Date().toISOString(), resolvedAt: null };
      await db.insert(annotations).values(row);

      const [asset] = await db.select().from(assets).where(eq(assets.id, payload.assetId)).limit(1);
      if (asset) {
        await db.update(deliverables).set({ status: "changes", updatedAt: new Date().toISOString() }).where(eq(deliverables.id, asset.deliverableId));
      }

      return Response.json({ ok: true, annotation: row });
    }

    if (payload.action === "resolveAnnotation") {
      const [annotation] = await db.select().from(annotations).where(eq(annotations.id, payload.id)).limit(1);
      if (!annotation || !(await canAccessAsset(member.id, annotation.assetId, member.role))) return Response.json({ error: "Você não pode atualizar este apontamento." }, { status: 403 });
      await db.update(annotations).set({ status: payload.status, resolvedAt: payload.status === "resolved" ? new Date().toISOString() : null }).where(eq(annotations.id, payload.id));
      return Response.json({ ok: true });
    }

    if (payload.action === "updateClientCrm") {
      if (!can("crm.access")) return Response.json({ error: "Você não tem acesso ao CRM." }, { status: 403 });
      const dueDay = Math.max(1, Math.min(31, Math.round(Number(payload.dueDay) || 5)));
      await db.update(clients).set({
        status: payload.status,
        contactName: payload.contactName.trim(),
        phone: payload.phone.trim(),
        email: payload.email.trim(),
        revenue: payload.revenue,
        dueDay,
        notes: payload.notes.trim()
      }).where(eq(clients.id, payload.id));
      const futureForecasts = await db.select().from(transactions).where(and(eq(transactions.clientId, payload.id), eq(transactions.recurring, true)));
      for (const transaction of futureForecasts.filter((row) => ["predicted", "open"].includes(row.status) && new Date(row.dueDate).getTime() >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime())) {
        const currentDate = new Date(transaction.dueDate);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const nextDueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), Math.min(dueDay, lastDay), 12).toISOString();
        await db.update(transactions).set({ amount: Math.max(0, Math.round(payload.revenue)), dueDate: nextDueDate, updatedAt: new Date().toISOString() }).where(eq(transactions.id, transaction.id));
      }
      return Response.json({ ok: true });
    }

    if (payload.action === "createTransaction") {
      if (!financeOwnerId) return Response.json({ error: "Apenas o gerente da agência e o desenvolvedor podem acessar o financeiro." }, { status: 403 });
      if (!payload.description.trim() || !payload.category.trim() || !payload.dueDate || payload.amount <= 0) return Response.json({ error: "Preencha descrição, categoria, vencimento e um valor válido." }, { status: 400 });
      const createdAt = new Date().toISOString();
      await db.insert(transactions).values({
        id: crypto.randomUUID(),
        agencyOwnerId: financeOwnerId,
        type: payload.type,
        amount: payload.amount,
        paidAmount: payload.status === "paid" ? payload.amount : Math.max(0, payload.paidAmount ?? 0),
        category: payload.category.trim(),
        costCenter: payload.costCenter.trim(),
        account: payload.account.trim() || "Conta principal",
        status: payload.status,
        competence: payload.competence,
        dueDate: new Date(payload.dueDate).toISOString(),
        paymentDate: payload.status === "paid" ? new Date(payload.paymentDate || Date.now()).toISOString() : null,
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
      });
      return Response.json({ ok: true });
    }

    if (payload.action === "updateTransaction") {
      if (!financeOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      const [transaction] = await db.select().from(transactions).where(and(eq(transactions.id, payload.id), eq(transactions.agencyOwnerId, financeOwnerId))).limit(1);
      if (!transaction) return Response.json({ error: "Lançamento não encontrado." }, { status: 404 });
      const nextStatus = payload.status ?? transaction.status;
      await db.update(transactions).set({
        status: nextStatus,
        paidAmount: nextStatus === "paid" ? transaction.amount : payload.paidAmount ?? transaction.paidAmount,
        paymentDate: nextStatus === "paid" ? new Date(payload.paymentDate || Date.now()).toISOString() : payload.paymentDate === undefined ? transaction.paymentDate : payload.paymentDate,
        description: payload.description?.trim() ?? transaction.description,
        category: payload.category?.trim() ?? transaction.category,
        costCenter: payload.costCenter?.trim() ?? transaction.costCenter,
        account: payload.account?.trim() ?? transaction.account,
        dueDate: payload.dueDate ? new Date(payload.dueDate).toISOString() : transaction.dueDate,
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
      await db.insert(financeWorkers).values({ id: crypto.randomUUID(), agencyOwnerId: financeOwnerId, name: payload.name.trim(), employmentType: payload.employmentType, status: "active", taxId: payload.taxId.trim(), companyName: payload.companyName.trim(), role: payload.role.trim(), costCenter: payload.costCenter.trim() || "Equipe", email: payload.email.trim(), phone: payload.phone.trim(), monthlyAmount: Math.max(0, payload.monthlyAmount), paymentDay: Math.max(1, Math.min(31, payload.paymentDay)), paymentMethod: payload.paymentMethod.trim(), paymentDetails: payload.paymentDetails.trim(), invoiceRequired: payload.invoiceRequired, contractEnd: payload.contractEnd ? new Date(payload.contractEnd).toISOString() : null, notes: payload.notes.trim(), createdAt, updatedAt: createdAt });
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
      const [worker] = await db.select().from(financeWorkers).where(and(eq(financeWorkers.id, payload.workerId), eq(financeWorkers.agencyOwnerId, financeOwnerId))).limit(1);
      if (!worker) return Response.json({ error: "Profissional não encontrado." }, { status: 404 });
      const competence = payload.competence.trim();
      if (!/^\d{4}-\d{2}$/.test(competence)) return Response.json({ error: "Informe uma competência válida." }, { status: 400 });
      const [year, month] = competence.split("-").map(Number);
      const defaultDue = new Date(Date.UTC(year, month - 1, Math.min(worker.paymentDay, new Date(Date.UTC(year, month, 0)).getUTCDate()))).toISOString();
      const createdAt = new Date().toISOString();
      await db.insert(workerCompetencies).values({ id: crypto.randomUUID(), agencyOwnerId: financeOwnerId, workerId: worker.id, competence, expectedAmount: payload.expectedAmount ?? worker.monthlyAmount, dueDate: payload.dueDate ? new Date(payload.dueDate).toISOString() : defaultDue, status: worker.invoiceRequired ? "waiting_document" : "predicted", invoiceStatus: worker.invoiceRequired ? "waiting" : "not_required", createdAt, updatedAt: createdAt });
      return Response.json({ ok: true });
    }

    if (payload.action === "updateWorkerCompetency") {
      if (!financeOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      const [competency] = await db.select().from(workerCompetencies).where(and(eq(workerCompetencies.id, payload.id), eq(workerCompetencies.agencyOwnerId, financeOwnerId))).limit(1);
      if (!competency) return Response.json({ error: "Competência não encontrada." }, { status: 404 });
      const nextStatus = payload.status ?? competency.status;
      await db.update(workerCompetencies).set({ status: nextStatus, invoiceStatus: payload.invoiceStatus ?? competency.invoiceStatus, adjustments: payload.adjustments ?? competency.adjustments, notes: payload.notes ?? competency.notes, paymentDate: nextStatus === "paid" ? new Date().toISOString() : competency.paymentDate, updatedAt: new Date().toISOString() }).where(eq(workerCompetencies.id, payload.id));
      return Response.json({ ok: true });
    }

    if (payload.action === "createDeliverableReference") {
      if (!(await canManageDeliverable(member.id, payload.deliverableId, member.role))) return Response.json({ error: "Acesso negado." }, { status: 403 });
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

    if (payload.action === "deactivateMember") {
      if (member.role !== "manager" && member.role !== "admin") return Response.json({ error: "Acesso negado." }, { status: 403 });
      const [target] = await db.select().from(members).where(eq(members.id, payload.id)).limit(1);
      if (!target) return Response.json({ error: "Usuário não encontrado." }, { status: 404 });
      if (target.role === "admin" || target.id === member.id) return Response.json({ error: "Esta conta principal não pode ser inativada." }, { status: 400 });
      if (member.role === "admin" && target.role !== "manager") return Response.json({ error: "O desenvolvedor administra somente contas de gerentes." }, { status: 403 });
      if (member.role === "manager" && target.agencyOwnerId !== member.id) return Response.json({ error: "Este usuário não pertence à sua agência." }, { status: 403 });
      await db.update(members).set({ status: "inactive" }).where(eq(members.id, payload.id));
      return Response.json({ ok: true });
    }

    if (payload.action === "createBoard") {
      if (!can("clients.manage")) return Response.json({ error: "Acesso negado." }, { status: 403 });
      const boardId = crypto.randomUUID();
      await db.insert(boards).values({ id: boardId, clientId: payload.clientId, title: "Planejamento de Mídia Social", period: payload.period.trim() || "Pauta atual", status: "active", createdBy: member.id, createdAt: new Date().toISOString() });
      return Response.json({ ok: true, boardId });
    }

    if (payload.action === "createCrmLead") {
      if (!crmOwnerId) return Response.json({ error: "Acesso negado ao CRM." }, { status: 403 });
      const company = payload.company.trim();
      if (!company) return Response.json({ error: "Informe a empresa ou nome do lead." }, { status: 400 });
      const createdAt = new Date().toISOString();
      const row = { id: crypto.randomUUID(), agencyOwnerId: crmOwnerId, company, contactName: payload.contactName.trim(), email: payload.email.trim(), phone: payload.phone.trim(), source: payload.source.trim() || "Manual", status: "new" as const, score: 0, potentialValue: Math.max(0, Number(payload.potentialValue) || 0), nextAction: payload.nextAction.trim(), nextActionAt: payload.nextActionAt ? new Date(payload.nextActionAt).toISOString() : null, notes: payload.notes.trim(), ownerId: payload.ownerId || member.id, createdAt, updatedAt: createdAt };
      await db.insert(crmLeads).values(row);
      if (row.nextAction) await db.insert(crmActivities).values({ id: crypto.randomUUID(), agencyOwnerId: crmOwnerId, leadId: row.id, dealId: null, type: "task", title: row.nextAction, dueAt: row.nextActionAt, status: "pending", notes: "", createdBy: member.id, createdAt });
      return Response.json({ ok: true, id: row.id });
    }

    if (payload.action === "updateCrmLead") {
      if (!crmOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      const [lead] = await db.select().from(crmLeads).where(and(eq(crmLeads.id, payload.id), eq(crmLeads.agencyOwnerId, crmOwnerId))).limit(1);
      if (!lead) return Response.json({ error: "Lead não encontrado." }, { status: 404 });
      const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      if (payload.status) update.status = payload.status;
      if (typeof payload.score === "number") update.score = Math.max(0, Math.min(100, payload.score));
      if (typeof payload.nextAction === "string") update.nextAction = payload.nextAction.trim();
      if ("nextActionAt" in payload) update.nextActionAt = payload.nextActionAt ? new Date(payload.nextActionAt).toISOString() : null;
      if (typeof payload.notes === "string") update.notes = payload.notes.trim();
      await db.update(crmLeads).set(update).where(eq(crmLeads.id, payload.id));
      return Response.json({ ok: true });
    }

    if (payload.action === "convertCrmLead") {
      if (!crmOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      const [lead] = await db.select().from(crmLeads).where(and(eq(crmLeads.id, payload.id), eq(crmLeads.agencyOwnerId, crmOwnerId))).limit(1);
      if (!lead) return Response.json({ error: "Lead não encontrado." }, { status: 404 });
      const createdAt = new Date().toISOString();
      const dealId = crypto.randomUUID();
      await db.insert(crmDeals).values({ id: dealId, agencyOwnerId: crmOwnerId, leadId: lead.id, company: lead.company, contactName: lead.contactName, value: Math.max(0, Number(payload.value) || lead.potentialValue), stage: "discovery", probability: 10, nextAction: lead.nextAction || "Agendar discovery", nextActionAt: lead.nextActionAt, closeDate: payload.closeDate ? new Date(payload.closeDate).toISOString() : null, ownerId: lead.ownerId, notes: lead.notes, lossReason: null, createdAt, updatedAt: createdAt });
      await db.update(crmLeads).set({ status: "sql", updatedAt: createdAt }).where(eq(crmLeads.id, lead.id));
      return Response.json({ ok: true, dealId });
    }

    if (payload.action === "createCrmDeal") {
      if (!crmOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      const createdAt = new Date().toISOString();
      const row = { id: crypto.randomUUID(), agencyOwnerId: crmOwnerId, leadId: null, company: payload.company.trim(), contactName: payload.contactName.trim(), value: Math.max(0, Number(payload.value) || 0), stage: "discovery" as const, probability: 10, nextAction: payload.nextAction.trim(), nextActionAt: payload.nextActionAt ? new Date(payload.nextActionAt).toISOString() : null, closeDate: payload.closeDate ? new Date(payload.closeDate).toISOString() : null, ownerId: payload.ownerId || member.id, notes: payload.notes.trim(), lossReason: null, createdAt, updatedAt: createdAt };
      if (!row.company) return Response.json({ error: "Informe a empresa." }, { status: 400 });
      await db.insert(crmDeals).values(row);
      return Response.json({ ok: true, id: row.id });
    }

    if (payload.action === "updateCrmDeal") {
      if (!crmOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      const [deal] = await db.select().from(crmDeals).where(and(eq(crmDeals.id, payload.id), eq(crmDeals.agencyOwnerId, crmOwnerId))).limit(1);
      if (!deal) return Response.json({ error: "Oportunidade não encontrada." }, { status: 404 });
      const probabilities: Record<string, number> = { discovery: 10, solution: 35, proposal: 50, negotiation: 65, decision: 80, contract: 90, won: 100, lost: 0 };
      const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      if (payload.stage) { update.stage = payload.stage; update.probability = probabilities[payload.stage] ?? deal.probability; }
      if (typeof payload.probability === "number") update.probability = Math.max(0, Math.min(100, payload.probability));
      if (typeof payload.nextAction === "string") update.nextAction = payload.nextAction.trim();
      if ("nextActionAt" in payload) update.nextActionAt = payload.nextActionAt ? new Date(payload.nextActionAt).toISOString() : null;
      if ("lossReason" in payload) update.lossReason = payload.lossReason?.trim() || null;
      if (payload.stage === "lost" && !update.lossReason) return Response.json({ error: "Informe o motivo da perda." }, { status: 400 });
      await db.update(crmDeals).set(update).where(eq(crmDeals.id, payload.id));
      return Response.json({ ok: true });
    }

    if (payload.action === "createCrmActivity") {
      if (!crmOwnerId || !payload.title.trim()) return Response.json({ error: "Informe a atividade." }, { status: 400 });
      await db.insert(crmActivities).values({ id: crypto.randomUUID(), agencyOwnerId: crmOwnerId, leadId: payload.leadId || null, dealId: payload.dealId || null, type: payload.type, title: payload.title.trim(), dueAt: payload.dueAt ? new Date(payload.dueAt).toISOString() : null, status: "pending", notes: payload.notes?.trim() || "", createdBy: member.id, createdAt: new Date().toISOString() });
      return Response.json({ ok: true });
    }

    if (payload.action === "completeCrmActivity") {
      if (!crmOwnerId) return Response.json({ error: "Acesso negado." }, { status: 403 });
      await db.update(crmActivities).set({ status: "done" }).where(and(eq(crmActivities.id, payload.id), eq(crmActivities.agencyOwnerId, crmOwnerId)));
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível concluir a ação.";
    return Response.json({ error: message }, { status: 500 });
  }
}
