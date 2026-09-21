import { getWorkspaceData } from "@/lib/server-workspace";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getWorkspaceData();
    if (!data) return Response.json({ error: "Entre na sua conta e escolha uma agência disponível." }, { status: 401 });
    return Response.json(data,{headers:{"Cache-Control":"private, no-store"}});
  } catch (error) {
    return errorResponse(error);
  }
}
