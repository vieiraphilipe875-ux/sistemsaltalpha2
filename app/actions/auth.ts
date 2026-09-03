"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { verifyPassword, createSession, deleteSession, hashPassword } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function login(prevState: any, formData: FormData) {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Preencha todos os campos." };
  }

  const db = getDb();
  const [member] = await db.select().from(members).where(eq(members.email, email)).limit(1);

  if (!member || !member.passwordHash) {
    return { error: "E-mail ou senha incorretos." };
  }

  const isValid = await verifyPassword(password, member.passwordHash);
  if (!isValid) {
    return { error: "E-mail ou senha incorretos." };
  }

  if (member.status === "pending") {
    return { error: "Acesso pendente. Acesse o link de primeiro acesso." };
  }

  await createSession(member.id);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/");
}

export async function setupPassword(prevState: any, formData: FormData) {
  const token = formData.get("token")?.toString().trim();
  const code = formData.get("code")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();
  const passwordConfirmation = formData.get("passwordConfirmation")?.toString();

  if (!email || (!token && !code) || !password || password.length < 8) {
    return { error: "Informe o e-mail, o código recebido e uma senha com pelo menos 8 caracteres." };
  }
  if (password !== passwordConfirmation) {
    return { error: "As senhas não coincidem." };
  }

  const db = getDb();
  const [member] = await db.select().from(members).where(eq(members.email, email)).limit(1);

  const storedToken = member?.setupToken ?? "";
  const [expiresAtText, storedCode] = storedToken.split(".");
  const matchesInvite = Boolean(member && storedToken && (storedToken === token || storedCode === code));
  const isExpired = !Number(expiresAtText) || Date.now() > Number(expiresAtText);
  if (!matchesInvite || isExpired || member?.status !== "pending") {
    return { error: "Código de acesso inválido, já utilizado ou expirado." };
  }

  const hashed = await hashPassword(password);
  await db.update(members)
    .set({ passwordHash: hashed, status: "active", setupToken: null })
    .where(eq(members.id, member.id));

  await createSession(member.id);
  redirect("/");
}
