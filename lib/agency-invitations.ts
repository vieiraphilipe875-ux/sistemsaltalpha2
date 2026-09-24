import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "../db/schema";
import { AppError } from "./http";
import { assertMailConfigured, escapeHtml, sendMail } from "./mail";
import { digest, randomToken } from "./security";

type InvitationDatabase = Pick<PgliteDatabase<typeof schema>, "insert" | "update">;
type InvitationInput = {
  agencyId: string;
  agencyName: string;
  createdBy: string;
  inviterName: string;
  email?: string;
  role: "admin" | "editor" | "viewer";
  permissions: string[];
  clientIds: string[];
  clientAccessMode: "all" | "selected";
  delivery: "link" | "email";
};

// The action authorizes the inviter and every client before calling this helper.
// Keep provider acceptance distinct from delivery to the recipient's inbox.
export async function createAgencyInvitation(db: InvitationDatabase, input: InvitationInput) {
  if (input.delivery === "email") {
    if (!input.email) throw new AppError("Informe o e-mail do convite.");
    assertMailConfigured();
  }
  const id = randomUUID();
  const token = randomToken();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.parse(createdAt) + 7 * 86_400_000).toISOString();
  const link = `${(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}/?invite=${encodeURIComponent(token)}`;
  await db.insert(schema.agencyInvites).values({
    id, agencyId: input.agencyId, tokenHash: digest(token), email: input.email || null,
    role: input.role, permissions: input.permissions, clientIds: [...new Set(input.clientIds)],
    clientAccessMode: input.clientAccessMode, createdBy: input.createdBy, createdAt, expiresAt,
  });
  if (input.delivery === "email") {
    try {
      await sendMail(
        input.email!,
        `Convite para ${input.agencyName} no Postito`,
        `<p>${escapeHtml(input.inviterName)} convidou você para trabalhar com ${escapeHtml(input.agencyName)}.</p><p><a href="${escapeHtml(link)}">Aceitar convite</a></p><p>Entre na sua conta ou crie uma. O convite expira em 7 dias.</p>`,
        id,
      );
    } catch (error) {
      await db.update(schema.agencyInvites).set({ revokedAt: new Date().toISOString() })
        .where(eq(schema.agencyInvites.id, id));
      throw error;
    }
    return { ok: true as const, link, expiresAt, delivery: "email" as const, emailStatus: "accepted" as const };
  }
  return { ok: true as const, link, expiresAt, delivery: "link" as const, emailStatus: "not_requested" as const };
}
