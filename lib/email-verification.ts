import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "../db/schema";
import { digest } from "./security";
import {
  VERIFICATION_CODE_MAX_ATTEMPTS,
  VERIFICATION_CODE_TTL_MINUTES,
} from "./auth-policy";

type VerificationDatabase = Pick<PgliteDatabase<typeof schema>, "transaction">;
type Clock = () => Date;
const currentTime: Clock = () => new Date();
const ttlMilliseconds = VERIFICATION_CODE_TTL_MINUTES * 60_000;
const { members, authChallenges } = schema;

function activeChallenges(memberId: string, now: Date) {
  return and(
    eq(authChallenges.memberId, memberId),
    eq(authChallenges.kind, "verify"),
    isNull(authChallenges.consumedAt),
    gt(authChallenges.expiresAt, now.toISOString()),
    // Also cap challenges issued by older releases at five minutes.
    gt(authChallenges.createdAt, new Date(now.getTime() - ttlMilliseconds).toISOString()),
  );
}

/** The injected database keeps tests isolated from the runtime connection. */
export async function createVerificationChallenge(
  db: VerificationDatabase,
  challenge: { id: string; memberId: string; tokenHash: string },
  clock: Clock = currentTime,
) {
  return db.transaction(async (tx) => {
    const [user] = await tx.select({ id: members.id, status: members.status })
      .from(members).where(eq(members.id, challenge.memberId)).for("update");
    if (!user || user.status !== "pending") return false;

    const now = clock();
    const active = await tx.select({ attempts: authChallenges.attempts })
      .from(authChallenges).where(activeChallenges(user.id, now));
    // A resend shares the current attempt budget, including when older codes expire.
    const attempts = Math.max(0, ...active.map((entry) => entry.attempts));
    await tx.insert(authChallenges).values({
      ...challenge,
      kind: "verify",
      attempts,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMilliseconds).toISOString(),
    });
    return true;
  });
}

/** Returns the confirmed member ID, or null for every invalid/limited account. */
export async function verifyEmailCode(
  db: VerificationDatabase,
  email: string,
  code: string,
  clock: Clock = currentTime,
) {
  if (!/^\d{6}$/.test(code)) return null;
  return db.transaction(async (tx) => {
    // Serialize verification and resend for this account. Recheck status under lock.
    const [user] = await tx.select({ id: members.id, status: members.status })
      .from(members).where(eq(members.email, email.trim().toLowerCase())).for("update");
    if (!user || user.status !== "pending") return null;

    const now = clock();
    const active = await tx.select().from(authChallenges)
      .where(activeChallenges(user.id, now));
    const attempts = Math.max(0, ...active.map((entry) => entry.attempts));
    if (!active.length || attempts >= VERIFICATION_CODE_MAX_ATTEMPTS) return null;

    await tx.update(authChallenges).set({ attempts: attempts + 1 })
      .where(inArray(authChallenges.id, active.map((entry) => entry.id)));
    const matches = active.some((entry) => entry.tokenHash === digest(`${entry.id}:${code}`));
    if (!matches) return null;

    // A single successful confirmation invalidates every code for the account.
    await tx.update(authChallenges).set({ consumedAt: now.toISOString() })
      .where(and(eq(authChallenges.memberId, user.id), eq(authChallenges.kind, "verify"), isNull(authChallenges.consumedAt)));
    await tx.update(members).set({ status: "active", emailVerifiedAt: now.toISOString() })
      .where(eq(members.id, user.id));
    return user.id;
  });
}
