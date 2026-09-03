"use client";

import { useActionState, useState } from "react";
import { login } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";

export function LoginForm() {
  const [state, action, isPending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="w-full max-w-md">
      <div className="mb-10 flex items-center gap-3 lg:hidden">
        <span className="grid size-11 place-items-center rounded-2xl bg-[#ffd84d] text-lg font-black text-[#17191d]">P</span>
        <strong>Pauta</strong>
      </div>
      <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-[#ffd84d]">
        <LockKeyhole className="size-5" />
      </span>
      <h2 className="mt-6 text-3xl font-bold tracking-[-0.04em]">Acesse seu painel</h2>
      <p className="mt-3 text-[15px] leading-6 text-white/55">
        Entre com o e-mail liberado pelo administrador e sua senha.
      </p>
      
      {state?.error && (
        <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
          {state.error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div>
          <Input 
            name="email" 
            type="email" 
            placeholder="Seu e-mail" 
            required 
            className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
        <div className="relative">
          <Input 
            name="password" 
            type={showPassword ? "text" : "password"}
            placeholder="Sua senha" 
            required 
            className="h-12 rounded-xl border-white/10 bg-white/5 pr-12 text-white placeholder:text-white/30"
          />
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#ffd84d]">
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={isPending}
        className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-[#17191d] transition hover:bg-[#ffd84d]"
      >
        {isPending ? "Entrando..." : "Entrar na Pauta"}
        <ArrowRight className="size-4" />
      </Button>
      <p className="mt-5 text-center text-sm text-white/50">
        Recebeu um código de acesso? <a href="/setup-password" className="font-semibold text-[#ffd84d] hover:underline">Criar minha senha</a>
      </p>
    </form>
  );
}
