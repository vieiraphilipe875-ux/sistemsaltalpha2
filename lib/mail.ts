import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Resend } from "resend";
import { z } from "zod";
import { AppError } from "./http";

export const escapeHtml = (value:string) => value.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
export function localMail() { return process.env.MAIL_TRANSPORT === "local" && process.env.NODE_ENV !== "production" && !process.env.VERCEL; }
function mailProvider() {
  const provider = process.env.MAIL_PROVIDER || "resend";
  if (provider !== "resend" && provider !== "brevo") throw new AppError("O serviço de e-mail precisa ser configurado pelo responsável pela plataforma.", 503);
  return provider;
}
export function assertMailConfigured() {
  if (localMail()) return;
  const configured = mailProvider() === "brevo"
    ? process.env.BREVO_API_KEY?.trim() && z.string().trim().email().safeParse(process.env.BREVO_FROM_EMAIL).success
    : process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL;
  if (!configured || !process.env.APP_URL) throw new AppError("O envio de e-mails ainda precisa ser configurado pelo responsável pela plataforma.",503);
}

async function sendBrevo(to: string, subject: string, html: string, idempotencyKey?: string) {
  let status: number | null = null;
  let reason = "network_error";
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY!,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Postito", email: process.env.BREVO_FROM_EMAIL!.trim() },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        ...(idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}),
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    status = response.status;
    reason = status === 429 ? "rate_limited" : "provider_error";
    if (response.status === 201) {
      reason = "invalid_response";
      const result: unknown = await response.json();
      if (z.object({ messageId: z.string().min(1) }).safeParse(result).success) return;
    }
  } catch {
    // Provider bodies and network errors may contain credentials or email content.
    // Do not log them, retry automatically, or switch providers after an uncertain send.
  }
  console.error("Postito: envio de e-mail recusado", { provider: "brevo", reason, status });
  throw new AppError(status === 429
    ? "O envio de e-mails está temporariamente limitado. Aguarde e tente novamente."
    : "Não foi possível enviar o e-mail. Tente novamente.", 502);
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
  if (mailProvider() === "brevo") return sendBrevo(to, subject, html, idempotencyKey);
  const result=await new Resend(process.env.RESEND_API_KEY).emails.send({from:process.env.RESEND_FROM_EMAIL!,to,subject,html},idempotencyKey?{idempotencyKey}:undefined);
  if (result.error) {
    const testRecipientRestricted = result.error.name === "validation_error"
      && result.error.message.startsWith("You can only send testing emails to your own email address");
    console.error("Postito: envio de e-mail recusado", {
      provider: "resend",
      reason: testRecipientRestricted ? "test_recipient_restricted" : "provider_error",
      status: result.error.statusCode ?? null,
    });
    throw new AppError(testRecipientRestricted
      ? "Esta versão de teste só envia e-mails para o endereço autorizado pelo responsável. Para usar outro endereço, o envio precisa ser liberado."
      : "Não foi possível enviar o e-mail. Tente novamente.", 502);
  }
}
