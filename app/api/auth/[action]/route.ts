import { randomInt, randomUUID } from "node:crypto";
import { and, eq, desc, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { members, authChallenges, sessions } from "@/db/schema";
import { createSession, deleteSession, verifySession } from "@/lib/auth";
import { digest, hashPassword, verifyPassword, randomToken, rateLimit } from "@/lib/security";
import { assertMailConfigured, sendMail, escapeHtml } from "@/lib/mail";
import { AppError, assertSameOrigin, errorResponse } from "@/lib/http";
import { professionLabels } from "@/lib/permissions";
export const runtime="nodejs";
const emailSchema=z.string().trim().email().max(254).transform(v=>v.toLowerCase());
const passwordSchema=z.string().min(10).max(128);
const now=()=>new Date().toISOString();

async function challenge(user:typeof members.$inferSelect,kind:"verify"|"reset") {
  assertMailConfigured();
  const id=randomUUID(), token=kind==="verify"?String(randomInt(0,1000000)).padStart(6,"0"):randomToken();
  await getDb().insert(authChallenges).values({id,memberId:user.id,kind,tokenHash:digest(`${id}:${token}`),expiresAt:new Date(Date.now()+(kind==="verify"?15:30)*60000).toISOString(),createdAt:now()});
  const link=`${process.env.APP_URL || "http://localhost:3000"}/reset-password?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
  try {
    await sendMail(user.email,kind==="verify"?"Confirme sua conta no Postito":"Redefina sua senha no Postito",kind==="verify"?`<p>Olá, ${escapeHtml(user.name)}.</p><p>Use este código para confirmar seu e-mail:</p><p style="font-size:32px;letter-spacing:8px;font-weight:bold">${token}</p><p>Válido por 15 minutos. Se você não solicitou, ignore este e-mail.</p>`:`<p>Recebemos um pedido para redefinir sua senha.</p><p><a href="${escapeHtml(link)}">Escolher uma nova senha</a></p><p>O link é válido por 30 minutos e funciona uma única vez.</p>`,id);
  } catch(e) {await getDb().delete(authChallenges).where(eq(authChallenges.id,id));throw e;}
  return id;
}

export async function POST(request:Request,{params}:{params:Promise<{action:string}>}) {
 try {
  assertSameOrigin(request);
  const {action}=await params;
  const raw=await request.json();
  const db=getDb();
  if (["signup","resend","forgot"].includes(action)) {
    await rateLimit("outgoing-auth-mail",500,60);
    if (process.env.VERCEL) {
      const ip=request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
      await rateLimit(`auth-mail-ip:${ip}`,15,60);
    }
  }
  if(action==="logout") {await deleteSession();return Response.json({ok:true});}
  if(action==="signup") {
    const p=z.object({email:emailSchema,name:z.string().trim().min(2).max(120),password:passwordSchema,profession:z.string().refine(v=>v in professionLabels)}).parse(raw);
    await rateLimit(`signup:${p.email}`,5,60);assertMailConfigured();
    const [existing]=await db.select().from(members).where(eq(members.email,p.email)).limit(1);
    if(existing) return Response.json({ok:true,email:p.email,message:"Se houver uma conta pendente, use Reenviar código. Se já confirmou, entre com sua senha."});
    const [user]=await db.insert(members).values({id:randomUUID(),email:p.email,name:p.name,profession:p.profession,passwordHash:await hashPassword(p.password),status:"pending",createdAt:now()}).returning();
    await challenge(user,"verify");
    return Response.json({ok:true,email:p.email});
  }
  if(action==="resend" || action==="forgot") {
    const {email}=z.object({email:emailSchema}).parse(raw);
    await rateLimit(`${action}:${email}`,4,15);assertMailConfigured();
    const [user]=await db.select().from(members).where(eq(members.email,email)).limit(1);
    if(user && (action==="resend"?user.status==="pending":user.status==="active")) await challenge(user,action==="resend"?"verify":"reset");
    return Response.json({ok:true,message:"Se o e-mail estiver cadastrado para esta ação, você receberá as instruções."});
  }
  if(action==="verify") {
    const p=z.object({email:emailSchema,code:z.string().regex(/^\d{6}$/)}).parse(raw);
    await rateLimit(`verify:${p.email}`,10,15);
    const [user]=await db.select().from(members).where(eq(members.email,p.email)).limit(1);
    if(!user || user.status!=="pending") throw new AppError("Código inválido ou expirado.");
    const verified=await db.transaction(async tx=>{
      const [c]=await tx.select().from(authChallenges).where(and(eq(authChallenges.memberId,user.id),eq(authChallenges.kind,"verify"),isNull(authChallenges.consumedAt))).orderBy(desc(authChallenges.createdAt)).limit(1).for("update");
      if(!c || c.expiresAt<now() || c.attempts>=5)return false;
      await tx.update(authChallenges).set({attempts:c.attempts+1}).where(eq(authChallenges.id,c.id));
      if(c.tokenHash!==digest(`${c.id}:${p.code}`))return false;
      await tx.update(authChallenges).set({consumedAt:now()}).where(eq(authChallenges.id,c.id));
      await tx.update(members).set({status:"active",emailVerifiedAt:now()}).where(eq(members.id,user.id));
      return true;
    });
    if(!verified)throw new AppError("Código inválido ou expirado. Solicite um novo código se necessário.");
    await createSession(user.id);return Response.json({ok:true});
  }
  if(action==="login") {
    const p=z.object({email:emailSchema,password:z.string().min(1).max(128)}).parse(raw);
    await rateLimit(`login:${p.email}`,10,15);
    const [user]=await db.select().from(members).where(eq(members.email,p.email)).limit(1);
    if(!user?.passwordHash || !await verifyPassword(p.password,user.passwordHash) || user.status!=="active" || !user.emailVerifiedAt) throw new AppError("E-mail ou senha incorretos, ou conta ainda não confirmada.",401);
    if(!user.passwordHash.startsWith("scrypt$"))await db.update(members).set({passwordHash:await hashPassword(p.password)}).where(eq(members.id,user.id));
    await createSession(user.id);return Response.json({ok:true});
  }
  if(action==="reset") {
    const p=z.object({id:z.string().uuid(),token:z.string().min(20).max(200),password:passwordSchema}).parse(raw);
    await rateLimit(`reset:${p.id}`,6,30);
    const passwordHash=await hashPassword(p.password);
    const ok=await db.transaction(async tx=>{
      const [c]=await tx.select().from(authChallenges).where(and(eq(authChallenges.id,p.id),eq(authChallenges.kind,"reset"))).limit(1).for("update");
      if(!c || c.consumedAt || c.expiresAt<now() || c.tokenHash!==digest(`${p.id}:${p.token}`))return false;
      await tx.update(members).set({passwordHash}).where(eq(members.id,c.memberId));
      await tx.update(authChallenges).set({consumedAt:now()}).where(eq(authChallenges.memberId,c.memberId));
      await tx.delete(sessions).where(eq(sessions.memberId,c.memberId));return true;
    });
    if(!ok)throw new AppError("Link inválido, expirado ou já utilizado.");
    await deleteSession();return Response.json({ok:true});
  }
  if(action==="profile") {
    const session=await verifySession();if(!session)throw new AppError("Entre na sua conta.",401);
    const p=z.object({name:z.string().trim().min(2).max(120),profession:z.string().refine(v=>v in professionLabels)}).parse(raw);
    await db.update(members).set(p).where(eq(members.id,session.userId));return Response.json({ok:true});
  }
  throw new AppError("Ação inválida.");
 }catch(error){return errorResponse(error);}
}
