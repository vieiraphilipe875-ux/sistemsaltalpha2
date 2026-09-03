import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { financialDocuments, memberPermissions, transactions, workerCompetencies } from "@/db/schema";
import { getCurrentMember } from "@/lib/server-workspace";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type Bucket = { put(key: string, value: ReadableStream, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown> };

export async function POST(request: Request) {
  try {
    const member = await getCurrentMember({ seed: false });
    if (!member) return Response.json({ error: "Acesso negado." }, { status: 403 });
    const db = getDb();
    const explicit = await db.select().from(memberPermissions).where(eq(memberPermissions.memberId, member.id));
    if (!hasPermission(member.role, explicit.map((row) => row.permission), "finance.access")) return Response.json({ error: "Acesso negado." }, { status: 403 });
    const ownerId = ["manager", "admin"].includes(member.role) ? member.id : member.agencyOwnerId;
    if (!ownerId) return Response.json({ error: "Espaço financeiro não encontrado." }, { status: 403 });
    const form = await request.formData();
    const transactionId = String(form.get("transactionId") ?? "") || null;
    const workerCompetencyId = String(form.get("workerCompetencyId") ?? "") || null;
    const documentType = String(form.get("type") ?? "other") as "invoice" | "receipt" | "bill" | "contract" | "statement" | "other";
    const file = form.get("file");
    if (!(file instanceof File) || (!transactionId && !workerCompetencyId)) return Response.json({ error: "Selecione um arquivo e o item relacionado." }, { status: 400 });
    if (file.size > 50 * 1024 * 1024) return Response.json({ error: "Cada arquivo deve ter no máximo 50 MB." }, { status: 400 });
    let competence = "";
    if (transactionId) {
      const [transaction] = await db.select().from(transactions).where(and(eq(transactions.id, transactionId), eq(transactions.agencyOwnerId, ownerId))).limit(1);
      if (!transaction) return Response.json({ error: "Lançamento não encontrado." }, { status: 404 });
      competence = transaction.competence;
    }
    if (workerCompetencyId) {
      const [workerCompetency] = await db.select().from(workerCompetencies).where(and(eq(workerCompetencies.id, workerCompetencyId), eq(workerCompetencies.agencyOwnerId, ownerId))).limit(1);
      if (!workerCompetency) return Response.json({ error: "Competência não encontrada." }, { status: 404 });
      competence = workerCompetency.competence;
    }
    const id = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
    const storageKey = `finance/${ownerId}/${id}-${safeName}`;
    const bucket = (env as unknown as { BUCKET: Bucket }).BUCKET;
    if (!bucket) throw new Error("O armazenamento de arquivos não está disponível.");
    await bucket.put(storageKey, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
    const row = { id, agencyOwnerId: ownerId, transactionId, workerCompetencyId, type: documentType, competence, storageKey, fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: file.size, uploadedBy: member.id, createdAt: new Date().toISOString() };
    await db.insert(financialDocuments).values(row);
    if (workerCompetencyId && documentType === "invoice") await db.update(workerCompetencies).set({ invoiceStatus: "received", updatedAt: new Date().toISOString() }).where(eq(workerCompetencies.id, workerCompetencyId));
    return Response.json({ ok: true, document: { ...row, url: `/api/finance/documents/${id}` } });
  } catch (error) {
    console.error("Financial document upload error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Falha no upload." }, { status: 500 });
  }
}
