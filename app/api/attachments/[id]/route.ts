import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { attachments } from "@/db/schema";
import { getCurrentMember, canAccessAttachment, canManageDeliverable } from "@/lib/server-workspace";
import { bucket } from "@/lib/storage";
import { AppError, errorResponse, assertSameOrigin } from "@/lib/http";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{const me=await getCurrentMember();const {id}=await params;
 if(!me||!await canAccessAttachment(me.id,id))throw new AppError("Arquivo não disponível.",403);
 const [row]=await getDb().select().from(attachments).where(eq(attachments.id,id)).limit(1);
 return bucket.response(row.storageKey,row.mimeType,/^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm|quicktime)|application\/pdf)$/.test(row.mimeType)?undefined:row.fileName);
 }catch(e){return errorResponse(e);}
}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
 try{assertSameOrigin(request);const me=await getCurrentMember();const {id}=await params;
 const [row]=await getDb().select().from(attachments).where(eq(attachments.id,id)).limit(1);
 if(!me||!row||!await canManageDeliverable(me.id,row.deliverableId))throw new AppError("Você não pode remover este anexo.",403);
 await getDb().delete(attachments).where(eq(attachments.id,id));await bucket.delete(row.storageKey);return Response.json({ok:true});
 }catch(e){return errorResponse(e);}
}
