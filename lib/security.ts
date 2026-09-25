import {
  randomBytes,
  createHash,
  scrypt,
  timingSafeEqual,
  pbkdf2,
} from "node:crypto";
import { promisify } from "node:util";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimits } from "@/db/schema";
import { AppError } from "./http";

export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (e, k) => (e ? reject(e) : resolve(k)),
    ),
  );
  return `scrypt$${salt}$${key.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  try {
    if (encoded.startsWith("scrypt$")) {
      const [, salt, hash] = encoded.split("$");
      const expected = Buffer.from(hash, "hex");
      const actual = await new Promise<Buffer>((resolve, reject) =>
        scrypt(
          password,
          salt,
          64,
          { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
          (e, k) => (e ? reject(e) : resolve(k)),
        ),
      );
      return (
        expected.length === actual.length && timingSafeEqual(expected, actual)
      );
    }
    if (encoded.startsWith("pbkdf2$")) {
      const [, iterations, salt, hash] = encoded.split("$");
      const count = Number(iterations);
      if (count < 10000 || count > 1000000) return false;
      const actual = await promisify(pbkdf2)(
        password,
        Buffer.from(salt, "base64"),
        count,
        32,
        "sha256",
      );
      const expected = Buffer.from(hash, "base64");
      return (
        expected.length === actual.length && timingSafeEqual(expected, actual)
      );
    }
    // Legacy SHA-256 is accepted only for imported accounts and upgraded at login.
    if (/^[a-f0-9]{64}$/.test(encoded))
      return timingSafeEqual(
        Buffer.from(digest(password)),
        Buffer.from(encoded),
      );
    return false;
  } catch {
    return false;
  }
}
export async function rateLimit(key: string, limit = 10, minutes = 15) {
  const now = new Date().toISOString(),
    reset = new Date(Date.now() + minutes * 60000).toISOString();
  const [result] = await getDb()
    .insert(rateLimits)
    .values({ key: digest(key), count: 1, resetAt: reset })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.resetAt} < ${now} then 1 else ${rateLimits.count}+1 end`,
        resetAt: sql`case when ${rateLimits.resetAt} < ${now} then ${reset} else ${rateLimits.resetAt} end`,
      },
    })
    .returning({ count: rateLimits.count });
  if (result.count > limit)
    throw new AppError(
      "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
      429,
    );
}
