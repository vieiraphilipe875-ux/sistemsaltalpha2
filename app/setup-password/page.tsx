import { SetupPasswordForm } from "@/components/setup-password-form";
import { LockKeyhole } from "lucide-react";

export const dynamic = "force-dynamic";

export default function SetupPassword({ searchParams }: { searchParams: { token?: string; email?: string } }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f5f7] p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#ffd84d] text-[#17191d]">
          <LockKeyhole className="size-5" />
        </span>
        <h1 className="mt-5 text-center text-xl font-bold">Confirme seu acesso</h1>
        <p className="mt-2 text-center text-sm leading-6 text-slate-500">
          Use o código recebido por e-mail e crie sua senha pessoal. O convite é válido por 24 horas e só pode ser utilizado uma vez.
        </p>
        
        <div className="mt-8">
          <SetupPasswordForm 
            defaultToken={searchParams.token || ""} 
            defaultEmail={searchParams.email || ""} 
          />
        </div>
      </div>
    </main>
  );
}
