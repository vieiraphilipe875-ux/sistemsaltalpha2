import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "cloudflare:workers";

const SECRET = new TextEncoder().encode(env.JWT_SECRET || "default_dev_secret_key_123456789");

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const iterations = 210_000;
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
  return `pbkdf2$${iterations}$${toBase64(salt)}$${toBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash.startsWith("pbkdf2$")) {
    const legacy = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
    const legacyHash = Array.from(new Uint8Array(legacy)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return legacyHash === hash;
  }

  const [, iterationsText, saltText, expectedText] = hash.split("$");
  const iterations = Number(iterationsText);
  if (!iterations || !saltText || !expectedText) return false;
  try {
    const fromBase64 = (value: string) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromBase64(saltText), iterations }, key, 256));
    const expected = fromBase64(expectedText);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
    return difference === 0;
  } catch {
    return false;
  }
}

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
  const session = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function verifySession() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("session")?.value;
  if (!cookie) return null;

  try {
    const { payload } = await jwtVerify(cookie, SECRET, {
      algorithms: ["HS256"],
    });
    return payload as { userId: string };
  } catch (error) {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
