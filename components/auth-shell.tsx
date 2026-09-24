import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Layers2 } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return <main className="auth-shell auth-shell-v4">
    <aside className="auth-story" aria-label="Conheça o Postito">
      <Link href="/" aria-label="Postito, início"><Image src="/postito-logo.png" width={256} height={85} alt="Postito" priority className="auth-logo" /></Link>
      <div className="auth-story-main">
        <span className="auth-kicker">SUA AGÊNCIA, EM BOA ORDEM</span>
        <h2>Espaço para<br />boas ideias.<br /><span>E para realizar.</span></h2>
        <p>Demandas, clientes e equipe conectados. Entre para continuar de onde o trabalho parou.</p>
        <figure className="auth-product-preview" aria-label="Quadro do Postito com dados de demonstração"><Image src="/marketing/pautas.webp" alt="Demandas organizadas por etapa no Postito, com dados de demonstração" width={1600} height={1050} sizes="(max-width: 767px) 0px, 50vw" /></figure>
      </div>
      <footer><span>Demandas</span><span>Clientes</span><span>CRM</span><span>Financeiro</span></footer>
    </aside>
    <section className="auth-content"><Link href="/" className="auth-back"><ArrowLeft size={14} aria-hidden="true" />Conhecer o Postito</Link>{children}<span className="auth-endnote"><Layers2 size={15} aria-hidden="true" />Cada agência com seu espaço. Você com uma conta só.</span></section>
  </main>;
}
