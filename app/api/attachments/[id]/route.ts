import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { attachments } from "@/db/schema";
import { canAccessAttachment, getCurrentMember } from "@/lib/server-workspace";

export const dynamic = "force-dynamic";

type StoredObject = { body: ReadableStream; writeHttpMetadata(headers: Headers): void };
type Bucket = { get(key: string): Promise<StoredObject | null>; delete(key: string): Promise<void> };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember({ seed: false });
  if (!member) return new Response("Não autorizado", { status: 403 });
  const { id } = await context.params;
  if (!(await canAccessAttachment(member.id, id, member.role))) return new Response("Não autorizado", { status: 403 });
  const [attachment] = await getDb().select().from(attachments).where(eq(attachments.id, id)).limit(1);
  if (!attachment) return new Response("Arquivo não encontrado", { status: 404 });
  const object = await (env as unknown as { BUCKET: Bucket }).BUCKET.get(attachment.storageKey);
  if (!object) return new Response("Arquivo não encontrado", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", attachment.mimeType);
  headers.set("Content-Disposition", `inline; filename="${attachment.fileName.replace(/["\\]/g, "-")}"`);
  headers.set("Cache-Control", "private, max-age=3600");
  return new Response(object.body, { headers });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember({ seed: false });
  if (!member || member.role === "client") return Response.json({ error: "Acesso negado." }, { status: 403 });
  const { id } = await context.params;
  if (!(await canAccessAttachment(member.id, id, member.role))) return Response.json({ error: "Acesso negado." }, { status: 403 });
  const db = getDb();
  const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
  if (!attachment) return Response.json({ error: "Arquivo não encontrado." }, { status: 404 });
  await (env as unknown as { BUCKET: Bucket }).BUCKET.delete(attachment.storageKey);
  await db.delete(attachments).where(eq(attachments.id, id));
  return Response.json({ ok: true });
}
