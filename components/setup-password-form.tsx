"use client";

import { useActionState, useState } from "react";
import { setupPassword } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export function SetupPasswordForm({ defaultToken, defaultEmail }: { defaultToken: string; defaultEmail: string }) {
  const [state, action, isPending] = useActionState(setupPassword, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
          {state.error}
        </div>
      )}
      
      <input type="hidden" name="token" value={defaultToken} />

      <div>
        <label className="mb-1.5 block text-sm font-semibold">E-mail convidado</label>
        <Input name="email" type="email" defaultValue={defaultEmail} readOnly={Boolean(defaultEmail)} placeholder="voce@empresa.com" required className="rounded-xl read-only:bg-slate-50 read-only:text-slate-500" />
      </div>

      {!defaultToken && <div>
        <label className="mb-1.5 block text-sm font-semibold">Código de acesso</label>
        <Input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" placeholder="000000" required className="rounded-xl text-center text-lg font-bold tracking-[0.35em]" />
      </div>}

      <div>
        <label className="mb-1.5 block text-sm font-semibold">Nova senha</label>
        <div className="relative"><Input 
            name="password" 
            type={showPassword ? "text" : "password"}
            placeholder="Mínimo 8 caracteres" 
            required 
            minLength={8}
            autoComplete="new-password"
            className="rounded-xl pr-11"
          /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6e5eff]">{showPassword ? <EyeOff className="size-4"/> : <Eye className="size-4"/>}</button></div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold">Confirmar senha</label>
        <div className="relative"><Input
            name="passwordConfirmation"
            type={showConfirmation ? "text" : "password"}
            placeholder="Digite a senha novamente"
            required
            minLength={8}
            autoComplete="new-password"
            className="rounded-xl pr-11"
          /><button type="button" onClick={() => setShowConfirmation((value) => !value)} aria-label={showConfirmation ? "Ocultar confirmação" : "Mostrar confirmação"} title={showConfirmation ? "Ocultar confirmação" : "Mostrar confirmação"} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6e5eff]">{showConfirmation ? <EyeOff className="size-4"/> : <Eye className="size-4"/>}</button></div>
      </div>

      <Button 
        type="submit" 
        disabled={isPending}
        className="w-full rounded-xl bg-[#17191d]"
      >
        {isPending ? "Salvando..." : "Definir senha e entrar"}
      </Button>
    </form>
  );
}
