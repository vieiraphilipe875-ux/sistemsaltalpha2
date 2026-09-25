import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { financialDocuments } from "@/db/schema";
import { getCurrentMember, canAccessFinancialDocument, canManageDeliverable } from "@/lib/server-workspace";
import { bucket } from "@/lib/storage";
import { AppError, errorResponse, assertSameOrigin } from "@/lib/http";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{const me=await getCurrentMember();const {id}=await params;
 if(!me||!await canAccessFinancialDocument(me.id,id))throw new AppError("Arquivo não disponível.",403);
 const [row]=await getDb().select().from(financialDocuments).where(eq(financialDocuments.id,id)).limit(1);
 return bucket.response(row.storageKey,row.mimeType,/^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm|quicktime))$/.test(row.mimeType)?undefined:row.fileName);
 }catch(e){return errorResponse(e);}
}
