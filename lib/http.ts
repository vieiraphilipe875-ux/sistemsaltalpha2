export class AppError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function assertSameOrigin(request: Request) {
  const expected = new URL(process.env.APP_URL || request.url).origin;
  const origin = request.headers.get("origin");
  if ((origin && origin !== expected) || request.headers.get("sec-fetch-site") === "cross-site") throw new AppError("Origem não autorizada.",403);
}
export function errorResponse(error: unknown) {
  if (error instanceof AppError) return Response.json({error:error.message},{status:error.status});
  if (error && typeof error === "object" && "issues" in error) return Response.json({error:"Revise os campos informados."},{status:400});
  const code = (error as {cause?:{code?:string};code?:string})?.cause?.code ?? (error as {code?:string})?.code;
  if (code === "23505") return Response.json({error:"Este registro já existe."},{status:409});
  console.error("Postito: falha interna", error instanceof Error ? error.name : "UnknownError", code || "");
  return Response.json({error:"Não foi possível concluir. Tente novamente."},{status:500});
}
