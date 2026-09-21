import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and,eq } from "drizzle-orm";
import { getDb } from "@/db";
import { uploadTickets, deliverables } from "@/db/schema";
import { getCurrentMember } from "@/lib/server-workspace";
import { acceptedTypes,authorizeUpload,finishUpload } from "@/lib/uploads";
import { remoteStorage,privateStore,bucket } from "@/lib/storage";
import { assertSameOrigin,AppError,errorResponse } from "@/lib/http";
import { rateLimit } from "@/lib/security";
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
 try{
  assertSameOrigin(request);const me=await getCurrentMember();if(!me)throw new AppError("Entre na sua conta.",401);
  const {action}=await params,raw=await request.json();
  if(action==="complete")return Response.json(await finishUpload(z.object({id:z.string().uuid()}).parse(raw).id,me));
  if(action!=="init")throw new AppError("Ação inválida.");
  const p=z.object({purpose:z.enum(["asset","attachment","avatar","banner","transaction","competency"]),targetId:z.string().uuid(),fileName:z.string().min(1).max(255),mimeType:z.string().refine(s=>acceptedTypes.includes(s)),fileSize:z.number().int().min(1).max(200*1024*1024),slidePosition:z.number().int().min(1).max(30).nullable().optional()}).parse(raw);
  await authorizeUpload(me,p.purpose,p.targetId);await rateLimit(`upload:${me.id}`,100,60);
  if(["avatar","banner"].includes(p.purpose) && (!/^image\/(png|jpeg|webp|gif)$/.test(p.mimeType)||p.fileSize>10*1024*1024))throw new AppError("Use PNG, JPG, WEBP ou GIF de até 10 MB.");
  if(p.fileSize>50*1024*1024)throw new AppError("O limite de cada arquivo é 50 MB.");
  if(p.slidePosition){const [task]=await getDb().select().from(deliverables).where(eq(deliverables.id,p.targetId)).limit(1);if(!task||p.slidePosition>task.slideCount)throw new AppError("Fatia não encontrada.");}
  const id=randomUUID(),storageKey=`${me.agencyOwnerId}/${p.purpose}/${id}`,createdAt=new Date().toISOString();
  const signed=remoteStorage()?await privateStore().createSignedUploadUrl(storageKey,{upsert:false}):null;
  if(signed?.error)throw new AppError("Não foi possível preparar o envio.",502);
  await getDb().insert(uploadTickets).values({...p,id,storageKey,agencyId:me.agencyOwnerId!,memberId:me.id,createdAt,expiresAt:new Date(Date.now()+30*60000).toISOString()});
  return Response.json({id,url:signed?.data?.signedUrl || `/api/uploads/local?id=${id}`,remote:Boolean(signed),token:signed?.data?.token});
 }catch(e){return errorResponse(e);}
}
export async function PUT(request:Request){
 try{
  assertSameOrigin(request);if(remoteStorage()||process.env.VERCEL||process.env.NODE_ENV==="production")throw new AppError("Use o envio direto autorizado.",400);
  const me=await getCurrentMember();if(!me)throw new AppError("Entre na sua conta.",401);
  const id=new URL(request.url).searchParams.get("id") || "";
  const [t]=await getDb().select().from(uploadTickets).where(and(eq(uploadTickets.id,id),eq(uploadTickets.memberId,me.id),eq(uploadTickets.agencyId,me.agencyOwnerId!))).limit(1);
  if(!t||t.consumedAt||t.expiresAt<new Date().toISOString())throw new AppError("Envio inválido.");
  await authorizeUpload(me,t.purpose,t.targetId);
  if(!request.body)throw new AppError("Arquivo vazio.");
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let length=0;
  while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>t.fileSize){await reader.cancel();throw new AppError("Arquivo maior que o permitido.",413);}chunks.push(value);}
  if(length!==t.fileSize)throw new AppError("Arquivo incompleto.");
  await bucket.put(t.storageKey,Buffer.concat(chunks),{httpMetadata:{contentType:t.mimeType}});return Response.json({ok:true});
 }catch(e){return errorResponse(e);}
}
