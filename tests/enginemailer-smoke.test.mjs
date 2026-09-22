import test from 'node:test';
import assert from 'node:assert/strict';
import { smoke } from '../scripts/enginemailer-smoke.mjs';

const now = 100000;
const config = { apiKey: 'test-only-key', email: 'owner@example.test', expiresAt: now + 60000 };
const env = { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'postito/email-smoke-20260922',
  POSTITO_MAIL_SMOKE_CONFIG: JSON.stringify(config) };

test('never sends outside isolated preview or after expiry', async () => {
  let calls = 0;
  const send = async () => { calls++; throw Error('must not call'); };
  assert.equal((await smoke({ env: {...env, VERCEL_ENV: 'production'}, now, send })).outcome, 'skipped');
  assert.equal((await smoke({ env, now: config.expiresAt, send })).outcome, 'skipped');
  assert.equal(calls, 0);
});
test('submits one self-addressed message and requires a transaction id', async () => {
  let calls = 0;
  const result = await smoke({ env, now, send: async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.enginemailer.com/RESTAPI/V2/Submission/SendEmail');
    assert.equal(options.headers.APIKey, config.apiKey);
    assert.equal(options.redirect, 'error');
    const body = JSON.parse(options.body);
    assert.equal(body.ToEmail, config.email);
    assert.equal(body.SenderEmail, config.email);
    return Response.json({Result:{StatusCode:'200',Status:'OK',TransactionID:'test-transaction'}});
  }});
  assert.equal(calls, 1);
  assert.equal(result.outcome, 'accepted');
});
test('provider rejection remains failure even with HTTP 200; secrets are redacted', async () => {
  const result = await smoke({ env, now, send: async () => Response.json({Result:{
    StatusCode:'500', ErrorMessage:`Invalid Sender Email Domain! ${config.email} ${config.apiKey}`}}) });
  assert.equal(result.outcome, 'rejected');
  assert.match(result.providerMessage, /Invalid Sender Email Domain/);
  assert.ok(!JSON.stringify(result).includes(config.apiKey));
  assert.ok(!JSON.stringify(result).includes(config.email));
  assert.equal((await smoke({ env, now, send: async () => Response.json({Result:{StatusCode:'200'}}) })).outcome, 'rejected');
});
test('connection failure is not retried and does not print private errors', async () => {
  let calls = 0;
  const result = await smoke({env, now, send: async () => {calls++; throw Error(config.apiKey);}});
  assert.equal(calls, 1);
  assert.equal(result.outcome, 'connection_error');
  assert.ok(!JSON.stringify(result).includes(config.apiKey));
});
