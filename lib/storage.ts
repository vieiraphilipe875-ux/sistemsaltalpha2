import { mkdir, readFile, writeFile, unlink, stat } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { AppError } from "./http";
export const remoteStorage=()=>Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
export function privateStore(){
 if(!remoteStorage())throw new AppError("Armazenamento privado não configurado.",503);
 return createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from(process.env.SUPABASE_STORAGE_BUCKET || "postito-private");
}
function localPath(key:string){
 if(process.env.VERCEL || process.env.NODE_ENV==="production")throw new AppError("Armazenamento privado não configurado.",503);
 const root=resolve(/* turbopackIgnore: true */ process.env.POSTITO_STORAGE_DIR || ".data/files"),path=resolve(/* turbopackIgnore: true */ root,key);
 if(!path.startsWith(root+sep))throw new AppError("Caminho de arquivo inválido.");return path;
}
export const bucket={
 async put(key:string,data:Uint8Array,options?:{httpMetadata?:{contentType?:string}}){
  const type=options?.httpMetadata?.contentType || "application/octet-stream";
  if(remoteStorage()){const {error}=await privateStore().upload(key,data,{contentType:type,upsert:false});if(error)throw new AppError("Falha no armazenamento.",502);return;}
  const path=localPath(key);await mkdir(dirname(path),{recursive:true});await writeFile(path,data);await writeFile(path+".meta",JSON.stringify({type}));
 },
 async info(key:string){
  if(remoteStorage()) {const {data,error}=await privateStore().info(key);if(error||!data)throw new AppError("Upload ainda não encontrado.");return {size:Number(data.metadata?.size),type:String(data.metadata?.mimetype || "")};}
  const path=localPath(key);const [s,meta]=await Promise.all([stat(path),readFile(path+".meta","utf8")]);return {size:s.size,type:JSON.parse(meta).type as string};
 },
 async delete(keys:string|string[]){
  const list=Array.isArray(keys)?keys:[keys];
  if(remoteStorage()){const {error}=await privateStore().remove(list);if(error)throw new AppError("Não foi possível remover o arquivo.",502);return;}
  for(const key of list){await unlink(localPath(key)).catch(()=>{});await unlink(localPath(key)+".meta").catch(()=>{});}
 },
 async response(key:string,mime:string,fileName?:string){
  if(remoteStorage()) {const {data,error}=await privateStore().createSignedUrl(key,60,fileName?{download:fileName}:undefined);if(error||!data)throw new AppError("Arquivo não encontrado.",404);return new Response(null,{status:302,headers:{Location:data.signedUrl,"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});}
  const bytes=await readFile(localPath(key)).catch(()=>null);if(!bytes)throw new AppError("Arquivo não encontrado.",404);
  return new Response(bytes,{headers:{"Content-Type":mime,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox",...(fileName?{"Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`}:{})}});
 }
};
