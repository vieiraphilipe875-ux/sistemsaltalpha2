import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { clientMembers, clients } from "@/db/schema";
import { getCurrentMember } from "@/lib/server-workspace";

export const dynamic = "force-dynamic";

type StoredObject = { body: ReadableStream; writeHttpMetadata(headers: Headers): void };
type Bucket = {
  get(key: string): Promise<StoredObject | null>;
  put(key: string, value: ReadableStream, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  delete(key: string): Promise<void>;
};

async function clientAccess(memberId: string, role: string, clientId: string) {
  if (role === "manager") return true;
  const [access] = await getDb().select().from(clientMembers).where(and(eq(clientMembers.clientId, clientId), eq(clientMembers.memberId, memberId))).limit(1);
  return Boolean(access);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember({ seed: false });
  if (!member) return new Response("Não autorizado", { status: 403 });
  const { id } = await context.params;
  if (!(await clientAccess(member.id, member.role, id))) return new Response("Não autorizado", { status: 403 });
  const kind = new URL(request.url).searchParams.get("kind") === "banner" ? "banner" : "avatar";
  const [client] = await getDb().select().from(clients).where(eq(clients.id, id)).limit(1);
  const key = kind === "banner" ? client?.bannerKey : client?.avatarKey;
  if (!key) return new Response("Imagem não encontrada", { status: 404 });
  const object = await (env as unknown as { BUCKET: Bucket }).BUCKET.get(key);
  if (!object) return new Response("Imagem não encontrada", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, max-age=3600");
  return new Response(object.body, { headers });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember({ seed: false });
  if (!member || !["manager", "admin"].includes(member.role)) return Response.json({ error: "Acesso negado." }, { status: 403 });
  const { id } = await context.params;
  if (!(await clientAccess(member.id, member.role, id))) return Response.json({ error: "Acesso negado." }, { status: 403 });
  const form = await request.formData();
  const kind = String(form.get("kind")) === "banner" ? "banner" : "avatar";
  const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return Response.json({ error: "Selecione uma imagem válida." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: "A imagem deve ter no máximo 10 MB." }, { status: 400 });
  const [client] = await getDb().select().from(clients).where(eq(clients.id, id)).limit(1);
  if (!client) return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
  const oldKey = kind === "banner" ? client.bannerKey : client.avatarKey;
  const key = `clients/${id}/${kind}-${crypto.randomUUID()}`;
  const bucket = (env as unknown as { BUCKET: Bucket }).BUCKET;
  await bucket.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  await getDb().update(clients).set(kind === "banner" ? { bannerKey: key } : { avatarKey: key }).where(eq(clients.id, id));
  if (oldKey) await bucket.delete(oldKey).catch((error) => console.error("Falha ao remover imagem anterior:", error));
  return Response.json({ ok: true });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember({ seed: false });
  if (!member || !["manager", "admin"].includes(member.role)) return Response.json({ error: "Acesso negado." }, { status: 403 });
  const { id } = await context.params;
  if (!(await clientAccess(member.id, member.role, id))) return Response.json({ error: "Acesso negado." }, { status: 403 });
  const kind = new URL(request.url).searchParams.get("kind") === "banner" ? "banner" : "avatar";
  const contentType = request.headers.get("content-type") || "";
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (!contentType.startsWith("image/")) return Response.json({ error: "Selecione uma imagem válida." }, { status: 400 });
  if (contentLength > 10 * 1024 * 1024) return Response.json({ error: "A imagem deve ter no máximo 10 MB." }, { status: 413 });
  if (!request.body) return Response.json({ error: "Arquivo vazio." }, { status: 400 });
  const [client] = await getDb().select().from(clients).where(eq(clients.id, id)).limit(1);
  if (!client) return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
  const oldKey = kind === "banner" ? client.bannerKey : client.avatarKey;
  const key = `clients/${id}/${kind}-${crypto.randomUUID()}`;
  const bucket = (env as unknown as { BUCKET: Bucket }).BUCKET;
  await bucket.put(key, request.body, { httpMetadata: { contentType } });
  await getDb().update(clients).set(kind === "banner" ? { bannerKey: key } : { avatarKey: key }).where(eq(clients.id, id));
  if (oldKey) await bucket.delete(oldKey).catch((error) => console.error("Falha ao remover imagem anterior:", error));
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember({ seed: false });
  if (!member || !["manager", "admin"].includes(member.role)) return Response.json({ error: "Acesso negado." }, { status: 403 });
  const { id } = await context.params;
  if (!(await clientAccess(member.id, member.role, id))) return Response.json({ error: "Acesso negado." }, { status: 403 });
  const kind = new URL(request.url).searchParams.get("kind") === "banner" ? "banner" : "avatar";
  const [client] = await getDb().select().from(clients).where(eq(clients.id, id)).limit(1);
  if (!client) return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
  const key = kind === "banner" ? client.bannerKey : client.avatarKey;
  if (key) await (env as unknown as { BUCKET: Bucket }).BUCKET.delete(key);
  await getDb().update(clients).set(kind === "banner" ? { bannerKey: null } : { avatarKey: null }).where(eq(clients.id, id));
  return Response.json({ ok: true });
}
