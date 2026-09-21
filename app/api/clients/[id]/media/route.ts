import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {clients} from "@/db/schema";
import {getCurrentMember,canAccessClient} from "@/lib/server-workspace";
import {bucket} from "@/lib/storage";
import {assertSameOrigin,AppError,errorResponse} from "@/lib/http";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 try{const me=await getCurrentMember(),{id}=await params;
 if(!me||!await canAccessClient(me,id))throw new AppError("Imagem não disponível.",403);
 const [client]=await getDb().select().from(clients).where(eq(clients.id,id)).limit(1);
 const key=new URL(request.url).searchParams.get("kind")==="banner"?client.bannerKey:client.avatarKey;
 if(!key)throw new AppError("Imagem não encontrada.",404);
 const meta=await bucket.info(key);return bucket.response(key,meta.type);
 }catch(e){return errorResponse(e);}
}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
 try{assertSameOrigin(request);const me=await getCurrentMember(),{id}=await params;
 if(!me||!me.permissions.includes("clients.manage")||!await canAccessClient(me,id,true))throw new AppError("Você não pode editar este cliente.",403);
 const [client]=await getDb().select().from(clients).where(eq(clients.id,id)).limit(1);
 const banner=new URL(request.url).searchParams.get("kind")==="banner",key=banner?client.bannerKey:client.avatarKey;
 await getDb().update(clients).set(banner?{bannerKey:null}:{avatarKey:null}).where(eq(clients.id,id));
 if(key)await bucket.delete(key);return Response.json({ok:true});
 }catch(e){return errorResponse(e);}
}
