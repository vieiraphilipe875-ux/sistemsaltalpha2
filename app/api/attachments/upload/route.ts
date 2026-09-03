import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { attachments, boards, clients, deliverables } from "@/db/schema";
import { canAccessDeliverable, getCurrentMember } from "@/lib/server-workspace";
import { ensureDemandFolder, uploadFileToDrive } from "@/lib/google-drive";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Bucket = { put(key: string, value: ReadableStream, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown> };

export async function POST(request: Request) {
  try {
    const member = await getCurrentMember({ seed: false });
    if (!member) return Response.json({ error: "Não autorizado." }, { status: 403 });
    const form = await request.formData();
    const deliverableId = String(form.get("deliverableId") ?? "");
    const slideValue = String(form.get("slidePosition") ?? "");
    const slidePosition = slideValue ? Math.max(1, Number(slideValue) || 1) : null;
    const file = form.get("file");
    if (!(file instanceof File) || !deliverableId) return Response.json({ error: "Selecione um arquivo." }, { status: 400 });
    if (file.size > 50 * 1024 * 1024) return Response.json({ error: "Cada arquivo deve ter no máximo 50 MB." }, { status: 400 });
    if (!(await canAccessDeliverable(member.id, deliverableId, member.role))) return Response.json({ error: "Você não pode anexar arquivos nesta demanda." }, { status: 403 });

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
        console.error("Erro ao subir arquivo no Google Drive:", err);
      }
    }

    const id = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
    const storageKey = `attachments/${deliverableId}/${id}-${safeName}`;
    const bucket = (env as unknown as { BUCKET: Bucket }).BUCKET;
    if (!bucket) throw new Error("O armazenamento de arquivos não está disponível.");
    await bucket.put(storageKey, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
    const row = { id, deliverableId, slidePosition, storageKey, fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: file.size, uploadedBy: member.id, createdAt: new Date().toISOString() };
    await db.insert(attachments).values(row);
    return Response.json({ ok: true, attachment: { ...row, url: `/api/attachments/${id}` } });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Falha no upload." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const url = new URL(request.url);
  const deliverableId = url.searchParams.get("deliverableId") || "";
  const slidePosition = url.searchParams.get("slidePosition") || "";
  const fileName = decodeURIComponent(request.headers.get("x-file-name") || "arquivo");
  const contentType = request.headers.get("content-type") || "application/octet-stream";
  const blob = await request.blob();
  const form = new FormData();
  form.set("deliverableId", deliverableId);
  form.set("slidePosition", slidePosition);
  form.set("file", new File([blob], fileName, { type: contentType }));
  return POST(new Request(request.url, { method: "POST", body: form }));
}
