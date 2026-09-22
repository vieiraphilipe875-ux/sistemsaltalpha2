import { pathToFileURL } from 'node:url';

const branch = 'postito/email-smoke-20260922';
const endpoint = 'https://api.enginemailer.com/RESTAPI/V2/Submission/SendEmail';

// Diagnostic branch only. No server endpoint, no database, no automatic retry.
export async function smoke({ env = process.env, send = fetch, now = Date.now() } = {}) {
  if (env.VERCEL_ENV !== 'preview' || env.VERCEL_GIT_COMMIT_REF !== branch) {
    return { outcome: 'skipped', reason: 'wrong_environment' };
  }
  let config;
  try { config = JSON.parse(env.POSTITO_MAIL_SMOKE_CONFIG || ''); }
  catch { return { outcome: 'skipped', reason: 'missing_config' }; }
  const { apiKey, email, expiresAt } = config;
  if (typeof apiKey !== 'string' || !apiKey.trim() || typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !Number.isFinite(expiresAt) || expiresAt <= now || expiresAt - now > 3600000) {
    return { outcome: 'skipped', reason: 'invalid_or_expired_config' };
  }
  const redact = value => String(value || '').split(apiKey).join('[secret]')
    .split(email).join('[email]').replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/[\r\n\u0000-\u001f]/g, ' ').slice(0, 300);
  try {
    const response = await send(endpoint, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', APIKey: apiKey },
      body: JSON.stringify({ ToEmail: email, SenderEmail: email, SenderName: 'Postito',
        Subject: 'Postito: teste de entrega pela Vercel',
        SubmittedContent: '<p>Esta é uma mensagem de teste de entrega do Postito, solicitada por você. Ela não contém código de acesso e não altera sua conta.</p>' })
    });
    const data = await response.json().catch(() => null);
    const result = data?.Result;
    const accepted = response.ok && String(result?.StatusCode) === '200' &&
      typeof result?.TransactionID === 'string' && result.TransactionID.trim().length > 0;
    return { outcome: accepted ? 'accepted' : 'rejected', httpStatus: response.status,
      providerStatus: redact(result?.StatusCode), providerMessage: redact(result?.ErrorMessage || result?.Status),
      transactionId: accepted ? redact(result.TransactionID) : undefined };
  } catch (error) {
    const code = error?.cause?.code || error?.code || error?.name;
    return { outcome: 'connection_error', reason: /^[A-Z_a-z0-9]+$/.test(code) ? code : 'network_error' };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log('[POSTITO_EMAIL_TEST]', JSON.stringify(await smoke()));
  console.log('Diagnostic completed. Deployment intentionally stopped; no application was published.');
  process.exitCode = 1;
}
