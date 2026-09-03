import { PautaApp } from "@/components/pauta-app";
import { LoginForm } from "@/components/login-form";
import { getWorkspaceData } from "@/lib/server-workspace";
import { CheckCircle2, Layers3, LockKeyhole } from "lucide-react";
import { verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await verifySession();
  if (!session) {
    return <main className="relative grid min-h-screen overflow-hidden bg-[#101318] px-5 py-10 text-white lg:grid-cols-[1.15fr_.85fr] lg:p-6">
      <div className="pointer-events-none absolute -left-24 top-1/3 size-96 rounded-full bg-[#6957ff]/20 blur-3xl" />
      <section className="relative hidden min-h-[calc(100vh-3rem)] flex-col justify-between overflow-hidden rounded-[32px] bg-gradient-to-br from-[#6e5eff] via-[#5848e5] to-[#33288f] p-12 lg:flex">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#ffd84d] text-lg font-black text-[#17191d]">P</span><div><strong className="block">Pauta</strong><span className="text-sm text-white/60">Gestão de conteúdo</span></div></div>
        <div className="max-w-xl"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/80"><Layers3 className="size-4" />Da pauta à aprovação</span><h1 className="mt-6 text-5xl font-bold leading-[1.04] tracking-[-0.055em]">Todo o conteúdo da agência em um fluxo visual.</h1><p className="mt-5 max-w-lg text-lg leading-8 text-white/68">Organize fatias, referências, responsáveis, arquivos finais e alterações sem depender de apresentações espalhadas.</p></div>
        <div className="grid grid-cols-3 gap-3">{["Briefing visual", "Prazos inteligentes", "Revisão na arte"].map((label) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 text-sm font-semibold text-white/75"><CheckCircle2 className="mb-3 size-5 text-[#ffd84d]" />{label}</div>)}</div>
      </section>
      <section className="relative grid place-items-center px-1 py-10 sm:px-8">
        <LoginForm />
      </section>
    </main>;
  }
  const data = await getWorkspaceData();
  if (!data) {
    return <main className="grid min-h-screen place-items-center bg-[#f3f5f7] p-6"><div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-700"><LockKeyhole className="size-5" /></span><h1 className="mt-5 text-xl font-bold">Acesso ainda não liberado</h1><p className="mt-2 text-sm leading-6 text-slate-500">O seu usuário não tem acesso ou os dados foram corrompidos.</p></div></main>;
  }
  return <PautaApp initialData={data} />;
}
