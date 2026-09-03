import { desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { assets, deliverables, boards, clients } from "@/db/schema";
import { canAccessDeliverable, getCurrentMember } from "@/lib/server-workspace";
import { ensureDemandFolder, uploadFileToDrive } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

type Bucket = { put(key: string, value: ArrayBuffer | ReadableStream, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown> };

export async function POST(request: Request) {
  try {
    const member = await getCurrentMember({ seed: false });
    if (!member) return Response.json({ error: "Não autorizado." }, { status: 403 });
    const form = await request.formData();
    const deliverableId = String(form.get("deliverableId") ?? "");
    const file = form.get("file");
    if (!(file instanceof File) || !deliverableId) return Response.json({ error: "Selecione um arquivo final." }, { status: 400 });
    
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const isPsd = file.name.toLowerCase().endsWith(".psd");
    if (!isImage && !isVideo && !isPsd) return Response.json({ error: "Envie a composição final (PNG, JPG), vídeo ou arquivo aberto (PSD)." }, { status: 400 });
    
    if (file.size > 200 * 1024 * 1024) return Response.json({ error: "O arquivo deve ter no máximo 200 MB." }, { status: 400 });
    const allowed = await canAccessDeliverable(member.id, deliverableId, member.role);
    if (!allowed) return Response.json({ error: "Você não pode enviar arquivos para esta demanda." }, { status: 403 });

    const db = getDb();
    const [deliverable] = await db.select().from(deliverables).where(eq(deliverables.id, deliverableId)).limit(1);
    if (!deliverable) return Response.json({ error: "Demanda não encontrada." }, { status: 404 });
    const [board] = await db.select().from(boards).where(eq(boards.id, deliverable.boardId)).limit(1);
    const [client] = await db.select().from(clients).where(eq(clients.id, board.clientId)).limit(1);

    if (client?.driveUrl) {
      try {
        const folderId = await ensureDemandFolder(client.driveUrl, deliverable.title);
        if (folderId) {
          await uploadFileToDrive(folderId, file, file.name);
        }
      } catch (err) {
        console.error("Erro ao subir asset no Google Drive:", err);
      }
    }

    const [latest] = await db.select().from(assets).where(eq(assets.deliverableId, deliverableId)).orderBy(desc(assets.version)).limit(1);
    const version = (latest?.version ?? 0) + 1;
    const id = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100);
    const storageKey = `deliverables/${deliverableId}/${id}-${safeName}`;
    const bucket = (env as unknown as { BUCKET: Bucket }).BUCKET;
    if (!bucket) throw new Error("O armazenamento de arquivos não está disponível.");
    await bucket.put(storageKey, file.stream(), { httpMetadata: { contentType: file.type } });
    const row = { id, deliverableId, storageKey, fileName: file.name, mimeType: file.type, version, uploadedBy: member.id, createdAt: new Date().toISOString() };
    await db.insert(assets).values(row);
    await db.update(deliverables).set({ status: "review", updatedAt: new Date().toISOString() }).where(eq(deliverables.id, deliverableId));
    return Response.json({ ok: true, asset: { ...row, url: `/api/assets/${id}` } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha no upload.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const deliverableId = new URL(request.url).searchParams.get("deliverableId") || "";
  const fileName = decodeURIComponent(request.headers.get("x-file-name") || "arquivo");
  const contentType = request.headers.get("content-type") || "application/octet-stream";
  const blob = await request.blob();
  const form = new FormData();
  form.set("deliverableId", deliverableId);
  form.set("file", new File([blob], fileName, { type: contentType }));
  return POST(new Request(request.url, { method: "POST", body: form }));
}
