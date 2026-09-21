import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import test from "node:test";
import { postgresTlsOptions } from "../db/tls";

test("Supabase usa a CA oficial e mantém a verificação TLS", () => {
  const options = postgresTlsOptions("postgresql://fixture@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=verify-full");
  assert.equal(options.ssl?.rejectUnauthorized, true);
  const certificate = new X509Certificate(options.ssl!.ca);
  assert.equal(certificate.fingerprint256.replaceAll(":", "").toLowerCase(), "807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa");
  assert(certificate.ca);
  assert(Date.parse(certificate.validTo) > Date.now());
  assert.equal(postgresTlsOptions("postgresql://fixture@db.example.supabase.co/postgres").ssl?.rejectUnauthorized, true);
  assert.equal(postgresTlsOptions("postgresql://fixture@aws-0-sa-east-1.pooler.supabase.com.example.invalid/postgres").ssl, undefined);
});
