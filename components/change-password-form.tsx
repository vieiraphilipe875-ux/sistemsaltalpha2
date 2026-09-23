"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChangePasswordForm({ onCancel }: { onCancel(): void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") || "");
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");
    setError("");
    if (password !== confirmation) { setError("As novas senhas precisam ser iguais."); return; }
    if (password === currentPassword) { setError("Escolha uma senha diferente da atual."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, password, confirmation }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível alterar a senha.");
      window.location.replace("/?passwordChanged=1");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível alterar a senha.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="space-y-4">
    <label className="block text-sm font-medium">Senha atual
      <Input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} disabled={busy} />
    </label>
    <label className="block text-sm font-medium">Nova senha
      <Input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} disabled={busy} aria-describedby="new-password-help" />
    </label>
    <p id="new-password-help" className="text-sm text-muted-foreground">Use pelo menos 10 caracteres. Essa alteração não precisa de e-mail e encerra as sessões abertas.</p>
    <label className="block text-sm font-medium">Confirmar nova senha
      <Input name="confirmation" type="password" autoComplete="new-password" required minLength={10} maxLength={128} disabled={busy} />
    </label>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>Voltar ao perfil</Button>
      <Button type="submit" disabled={busy}>{busy ? "Alterando..." : "Alterar senha"}</Button>
    </div>
  </form>;
}
