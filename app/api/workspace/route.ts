import { getWorkspaceData } from "@/lib/server-workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getWorkspaceData();
    if (!data) return Response.json({ error: "Acesso não autorizado para este workspace." }, { status: 403 });
    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar o workspace.";
    return Response.json({ error: message }, { status: 500 });
  }
}
