import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import {
  agencies,
  agencyMemberships,
  agencyInvites,
  clientMembers,
  clients,
  sessions,
  activityLog,
} from "@/db/schema";
import { verifySession, switchAgency } from "./auth";
import { getCurrentMember, canAccessClient } from "./server-workspace";
import { digest, rateLimit } from "./security";
import { rolePermissionDefaults, permissionKeys } from "./permissions";
import { AppError } from "./http";
import { assertMailConfigured } from "./mail";
import { createAgencyInvitation } from "./agency-invitations";
import { agencyClientIdsInput, authorizeAgencyClientIds } from "./agency-client-scope";

export const agencyActionNames = [
  "createAgency",
  "switchAgency",
  "inviteMember",
  "acceptInvite",
  "revokeInvite",
  "updateMember",
  "deactivateMember",
  "assignClientMember",
  "renameAgency",
];
const now = () => new Date().toISOString();
const inviteInput = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((s) => s.toLowerCase())
    .optional(),
  role: z.enum(["admin", "editor", "viewer"]),
  clientIds: agencyClientIdsInput.default([]),
  clientAccessMode: z.enum(["all", "selected"]).default("selected"),
  permissions: z.array(z.enum(permissionKeys)).optional(),
  delivery: z.enum(["link", "email"]).default("link"),
});
export async function agencyAction(raw: unknown) {
  const action = z.object({ action: z.string() }).parse(raw).action;
  const session = await verifySession();
  if (!session) throw new AppError("Entre na sua conta.", 401);
  const db = getDb();
  if (action === "createAgency") {
    const { name } = z
      .object({ name: z.string().trim().min(2).max(100) })
      .parse(raw);
    await rateLimit(`agency:${session.userId}`, 10, 60);
    const id = randomUUID();
    await db.transaction(async (tx) => {
      await tx
        .insert(agencies)
        .values({ id, name, createdBy: session.userId, createdAt: now() });
      await tx
        .insert(agencyMemberships)
        .values({
          agencyId: id,
          memberId: session.userId,
          role: "manager",
          clientAccessMode: "all",
          permissions: [...permissionKeys],
          createdAt: now(),
        });
      await tx
        .update(sessions)
        .set({ agencyId: id })
        .where(eq(sessions.tokenHash, session.tokenHash));
    });
    return { ok: true, agencyId: id };
  }
  if (action === "switchAgency") {
    const { agencyId } = z.object({ agencyId: z.string().uuid() }).parse(raw);
    if (!(await switchAgency(agencyId)))
      throw new AppError("Agência não disponível.", 403);
    return { ok: true };
  }
  if (action === "acceptInvite") {
    const { token } = z
      .object({ token: z.string().min(20).max(200) })
      .parse(raw);
    await rateLimit(`accept:${session.userId}`, 20, 15);
    const result = await db.transaction(async (tx) => {
      const [invite] = await tx
        .select()
        .from(agencyInvites)
        .where(eq(agencyInvites.tokenHash, digest(token)))
        .limit(1)
        .for("update");
      if (
        !invite ||
        invite.usedAt ||
        invite.revokedAt ||
        invite.expiresAt < now()
      )
        throw new AppError("Convite inválido, expirado ou já utilizado.");
      if (invite.email && invite.email !== session.user.email)
        throw new AppError("Entre com o e-mail que recebeu o convite.", 403);
      const [inviter] = await tx
        .select()
        .from(agencyMemberships)
        .where(
          and(
            eq(agencyMemberships.agencyId, invite.agencyId),
            eq(agencyMemberships.memberId, invite.createdBy),
          ),
        )
        .limit(1);
      if (
        !inviter ||
        inviter.status !== "active" ||
        !["manager", "admin"].includes(inviter.role) ||
        (invite.role === "admin" && inviter.role !== "manager")
      )
        throw new AppError(
          "Este convite perdeu a validade. Peça um novo ao administrador.",
          403,
        );
      const [current] = await tx
        .select()
        .from(agencyMemberships)
        .where(
          and(
            eq(agencyMemberships.agencyId, invite.agencyId),
            eq(agencyMemberships.memberId, session.userId),
          ),
        )
        .limit(1);
      if (current?.status === "active")
        throw new AppError("Você já participa desta agência.", 409);
      const memberValue = {
        agencyId: invite.agencyId,
        memberId: session.userId,
        role: invite.role,
        permissions: invite.permissions,
        clientAccessMode: invite.clientAccessMode,
        status: "active" as const,
        createdAt: now(),
      };
      await tx
        .insert(agencyMemberships)
        .values(memberValue)
        .onConflictDoUpdate({
          target: [agencyMemberships.agencyId, agencyMemberships.memberId],
          set: memberValue,
        });
      const agencyClients = await tx
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.agencyId, invite.agencyId));
      if (agencyClients.length)
        await tx.delete(clientMembers).where(
          and(
            eq(clientMembers.memberId, session.userId),
            inArray(
              clientMembers.clientId,
              agencyClients.map((c) => c.id),
            ),
          ),
        );
      const validClients = invite.clientIds.length
        ? await tx
            .select({ id: clients.id })
            .from(clients)
            .where(
              and(
                eq(clients.agencyId, invite.agencyId),
                inArray(clients.id, invite.clientIds),
              ),
            )
        : [];
      for (const c of validClients)
        await tx
          .insert(clientMembers)
          .values({ clientId: c.id, memberId: session.userId })
          .onConflictDoNothing();
      await tx
        .update(agencyInvites)
        .set({ usedAt: now() })
        .where(eq(agencyInvites.id, invite.id));
      await tx
        .update(sessions)
        .set({ agencyId: invite.agencyId })
        .where(eq(sessions.tokenHash, session.tokenHash));
      await tx
        .insert(activityLog)
        .values({
          id: randomUUID(),
          agencyId: invite.agencyId,
          memberId: session.userId,
          action: "acceptInvite",
          entityId: invite.id,
          createdAt: now(),
        });
      return {
        agencyId: invite.agencyId,
        clientId: validClients[0]?.id || null,
      };
    });
    return { ok: true, ...result };
  }
  const me = await getCurrentMember();
  if (!me) throw new AppError("Escolha uma agência.", 403);
  const agencyId = me.agencyOwnerId!;
  if (action === "assignClientMember") {
    const p = z
      .object({
        clientId: z.string().uuid(),
        memberId: z.string().uuid(),
        remove: z.boolean().default(false),
      })
      .parse(raw);
    if (
      !["manager", "admin"].includes(me.role) ||
      !(await canAccessClient(me, p.clientId, true))
    )
      throw new AppError(
        "Somente administradores podem conceder acesso ao cliente.",
        403,
      );
    const [target] = await db
      .select()
      .from(agencyMemberships)
      .where(
        and(
          eq(agencyMemberships.memberId, p.memberId),
          eq(agencyMemberships.agencyId, agencyId),
          eq(agencyMemberships.status, "active"),
        ),
      )
      .limit(1);
    if (!target)
      throw new AppError("Colaborador não disponível nesta agência.");
    if (p.remove)
      await db
        .delete(clientMembers)
        .where(
          and(
            eq(clientMembers.clientId, p.clientId),
            eq(clientMembers.memberId, p.memberId),
          ),
        );
    else
      await db
        .insert(clientMembers)
        .values({ clientId: p.clientId, memberId: p.memberId })
        .onConflictDoNothing();
    return { ok: true };
  }
  if (!["manager", "admin"].includes(me.role))
    throw new AppError("Acesso administrativo necessário.", 403);
  if (action === "renameAgency") {
    const { name } = z
      .object({ name: z.string().trim().min(2).max(100) })
      .parse(raw);
    await db.update(agencies).set({ name }).where(eq(agencies.id, agencyId));
    return { ok: true };
  }
  if (action === "inviteMember") {
    const p = inviteInput.parse(raw);
    if (p.role === "admin" && me.role !== "manager")
      throw new AppError(
        "Somente o proprietário pode convidar administradores.",
        403,
      );
    if (p.delivery === "email" && !p.email)
      throw new AppError("Informe o e-mail do convite.");
    if (p.email) assertMailConfigured();
    await rateLimit(`invite:${agencyId}`, 40, 60);
    const clientIds = await authorizeAgencyClientIds(db, me, p.clientIds);
    const permissions =
      p.role === "viewer"
        ? ["clients.view"]
        : (p.permissions ?? rolePermissionDefaults[p.role]);
    const [agency] = await db.select({ name: agencies.name }).from(agencies)
      .where(eq(agencies.id, agencyId)).limit(1);
    if (!agency) throw new AppError("Agência não disponível.", 404);
    return createAgencyInvitation(db, {
      ...p, clientIds, agencyId, agencyName: agency.name, createdBy: me.id, inviterName: me.name, permissions,
    });
  }
  if (action === "revokeInvite") {
    const { id } = z.object({ id: z.string().uuid() }).parse(raw);
    const rows = await db
      .update(agencyInvites)
      .set({ revokedAt: now() })
      .where(
        and(eq(agencyInvites.id, id), eq(agencyInvites.agencyId, agencyId)),
      )
      .returning({ id: agencyInvites.id });
    if (!rows.length) throw new AppError("Convite não encontrado.", 404);
    return { ok: true };
  }
  if (action === "updateMember" || action === "deactivateMember") {
    const p = z
      .object({
        id: z.string().uuid(),
        role: z.enum(["manager", "admin", "editor", "viewer"]).optional(),
        status: z.enum(["active", "inactive"]).optional(),
        clientIds: agencyClientIdsInput.optional(),
        clientAccessMode: z.enum(["all", "selected"]).optional(),
        permissions: z.array(z.enum(permissionKeys)).optional(),
      })
      .parse(raw);
    const [target] = await db
      .select()
      .from(agencyMemberships)
      .where(
        and(
          eq(agencyMemberships.agencyId, agencyId),
          eq(agencyMemberships.memberId, p.id),
        ),
      )
      .limit(1);
    if (!target) throw new AppError("Colaborador não encontrado.", 404);
    if (target.role === "manager" || target.memberId === me.id)
      throw new AppError(
        "O acesso principal não pode ser alterado por esta ação.",
      );
    if (
      me.role !== "manager" &&
      (target.role === "admin" || p.role === "admin")
    )
      throw new AppError(
        "Somente o proprietário pode administrar este acesso.",
        403,
      );
    if (p.role === "manager")
      throw new AppError(
        "Transferência de propriedade não disponível nesta ação.",
      );
    const clientIds = p.clientIds === undefined ? undefined : await authorizeAgencyClientIds(db, me, p.clientIds);
    await db.transaction(async (tx) => {
      const role = p.role ?? target.role;
      await tx
        .update(agencyMemberships)
        .set({
          role,
          status:
            action === "deactivateMember"
              ? "inactive"
              : (p.status ?? target.status),
          clientAccessMode: p.clientAccessMode ?? target.clientAccessMode,
          permissions:
            role === "viewer"
              ? ["clients.view"]
              : (p.permissions ?? target.permissions),
        })
        .where(
          and(
            eq(agencyMemberships.agencyId, agencyId),
            eq(agencyMemberships.memberId, p.id),
          ),
        );
      if (clientIds) {
        const own = await tx
          .select({ id: clients.id })
          .from(clients)
          .where(eq(clients.agencyId, agencyId));
        if (own.length)
          await tx.delete(clientMembers).where(
            and(
              eq(clientMembers.memberId, p.id),
              inArray(
                clientMembers.clientId,
                own.map((c) => c.id),
              ),
            ),
          );
        for (let offset = 0; offset < clientIds.length; offset += 1_000)
          await tx.insert(clientMembers)
            .values(clientIds.slice(offset, offset + 1_000).map(clientId => ({ clientId, memberId: p.id })))
            .onConflictDoNothing();
      }
    });
    return { ok: true };
  }
  throw new AppError("Ação inválida.");
}
