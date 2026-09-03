import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { assets } from "@/db/schema";
import { canAccessAsset, getCurrentMember } from "@/lib/server-workspace";

export const dynamic = "force-dynamic";

type StoredObject = { body: ReadableStream; httpMetadata?: { contentType?: string }; writeHttpMetadata(headers: Headers): void };
type Bucket = { get(key: string): Promise<StoredObject | null> };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember({ seed: false });
  if (!member) return new Response("Não autorizado", { status: 403 });
  const { id } = await context.params;
  if (!(await canAccessAsset(member.id, id, member.role))) return new Response("Não autorizado", { status: 403 });
  const db = getDb();
  const [asset] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  if (!asset) return new Response("Arquivo não encontrado", { status: 404 });
  const bucket = (env as unknown as { BUCKET: Bucket }).BUCKET;
  const object = await bucket.get(asset.storageKey);
  if (!object) return new Response("Arquivo não encontrado", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", asset.mimeType);
  headers.set("Cache-Control", "private, max-age=3600");
  return new Response(object.body, { headers });
}
