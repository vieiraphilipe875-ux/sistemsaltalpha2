import { getDb } from "@/db";
import { members } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verifica a conexão e o acesso à tabela sem ler ou devolver registros.
// Este endpoint não certifica a entrega de e-mails nem o Storage.
export async function GET() {
  try {
    await getDb().select({ id: members.id }).from(members).limit(0);
    return Response.json({ database: "ok" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = (error as { cause?: { code?: string }; code?: string })?.cause?.code
      ?? (error as { code?: string })?.code;
    console.error("Postito: verificação de banco falhou", code || "UNKNOWN");
    return Response.json({ database: "unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
