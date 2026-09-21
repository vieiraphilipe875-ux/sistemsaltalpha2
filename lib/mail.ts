import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Resend } from "resend";
import { AppError } from "./http";

export const escapeHtml = (value:string) => value.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
export function localMail() { return process.env.MAIL_TRANSPORT === "local" && process.env.NODE_ENV !== "production" && !process.env.VERCEL; }
export function assertMailConfigured() {
  if (!localMail() && (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL || !process.env.APP_URL)) throw new AppError("O envio de e-mails ainda precisa ser configurado pelo responsável pela plataforma.",503);
}
export async function sendMail(to:string,subject:string,content:string,idempotencyKey?:string) {
  assertMailConfigured();
  const html=`<div style="background:#f5f3eb;padding:32px;font-family:Arial,sans-serif;color:#242a24"><div style="max-width:520px;margin:auto;background:#fff;padding:32px;border:1px solid #e3e5dc"><h2 style="color:#34483b">postito<span style="color:#718453">.</span></h2>${content}<p style="font-size:12px;color:#596257;margin-top:32px">Sua agência, com tudo no lugar.</p></div></div>`;
  if (localMail()) {
    const dir=process.env.POSTITO_MAIL_DIR || ".data/mail";
    await mkdir(dir,{recursive:true});
    await writeFile(`${dir}/${Date.now()}-${randomUUID()}.json`,JSON.stringify({to,subject,html}),{mode:0o600});
    return;
  }
  const result=await new Resend(process.env.RESEND_API_KEY).emails.send({from:process.env.RESEND_FROM_EMAIL!,to,subject,html},idempotencyKey?{idempotencyKey}:undefined);
  if (result.error) throw new AppError("Não foi possível enviar o e-mail. Tente novamente.",502);
}
