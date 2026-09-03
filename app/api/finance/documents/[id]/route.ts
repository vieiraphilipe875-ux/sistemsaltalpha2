import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { financialDocuments } from "@/db/schema";
import { canAccessFinancialDocument, getCurrentMember } from "@/lib/server-workspace";

export const dynamic = "force-dynamic";

type StoredObject = { body: ReadableStream; writeHttpMetadata(headers: Headers): void };
type Bucket = { get(key: string): Promise<StoredObject | null> };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember({ seed: false });
  if (!member) return new Response("Não autorizado", { status: 403 });
  const { id } = await context.params;
  if (!(await canAccessFinancialDocument(member.id, id, member.role))) return new Response("Não autorizado", { status: 403 });
  const [document] = await getDb().select().from(financialDocuments).where(eq(financialDocuments.id, id)).limit(1);
  if (!document) return new Response("Arquivo não encontrado", { status: 404 });
  const object = await (env as unknown as { BUCKET: Bucket }).BUCKET.get(document.storageKey);
  if (!object) return new Response("Arquivo não encontrado", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", document.mimeType);
  headers.set("Content-Disposition", `inline; filename="${document.fileName.replace(/["\\]/g, "-")}"`);
  headers.set("Cache-Control", "private, max-age=3600");
  return new Response(object.body, { headers });
}
