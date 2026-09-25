import { clientImageError } from "./client-media-policy";

export async function uploadFile(purpose:"asset"|"attachment"|"avatar"|"banner"|"transaction"|"competency",targetId:string,file:File,slidePosition?:number){
 if(purpose==="avatar"||purpose==="banner"){
  const error=clientImageError(file,purpose==="avatar"?"Foto do cliente":"Banner do cliente");
  if(error)throw new Error(error);
 }
 const init=await fetch("/api/uploads/init",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({purpose,targetId,fileName:file.name,mimeType:file.type||"application/octet-stream",fileSize:file.size,slidePosition})});
 const ticket=await init.json();if(!init.ok)throw new Error(ticket.error||"Não foi possível iniciar o envio.");
 const upload=await fetch(ticket.url,{method:"PUT",headers:{"Content-Type":file.type||"application/octet-stream",...(ticket.remote?{"x-upsert":"false"}:{})},body:file});
 if(!upload.ok)throw new Error("Falha no envio do arquivo. Tente novamente.");
 const complete=await fetch("/api/uploads/complete",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:ticket.id})});
 const result=await complete.json();if(!complete.ok)throw new Error(result.error||"Não foi possível concluir o envio.");return result;
}
export async function uploadRequest(url:string,options:RequestInit){
 if(options.method==="DELETE")return fetch(url,options);
 const target=new URL(url,"http://localhost");
 let file=options.body instanceof File?options.body:null;
 let purpose:"asset"|"attachment"|"avatar"|"banner"|"transaction"|"competency"="asset",targetId=target.searchParams.get("deliverableId")||"";
 const slidePosition=Number(target.searchParams.get("slidePosition"))||undefined;
 if(url.includes("/clients/")){purpose=target.searchParams.get("kind")==="banner"?"banner":"avatar";targetId=target.pathname.split("/")[3];}
 if(url.includes("/attachments/"))purpose="attachment";
 if(options.body instanceof FormData){
  const form=options.body;file=form.get("file") as File;
  purpose=form.get("workerCompetencyId")?"competency":"transaction";
  targetId=String(form.get("workerCompetencyId") || form.get("transactionId") || "");
 }
 if(!file)throw new Error("Selecione um arquivo.");
 return Response.json(await uploadFile(purpose,targetId,file,slidePosition));
}
