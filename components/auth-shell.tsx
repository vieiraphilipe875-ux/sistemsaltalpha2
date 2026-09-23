import Image from "next/image";
import { ArrowRight, Check, CheckCheck, Layers2 } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <aside className="auth-story" aria-label="Conheça o Postito">
        <Image
          src="/postito-logo.png"
          width={256}
          height={85}
          alt="Postito"
          priority
          className="auth-logo"
        />
        <div className="auth-story-main">
          <span className="auth-kicker">
            <span /> ESPAÇO PARA O SEU MELHOR TRABALHO
          </span>
          <h2>
            Tudo flui.
            <br />
            Cada coisa
            <br />
            <span>no seu lugar.</span>
          </h2>
          <p>
            Da primeira ideia à última aprovação,
            <br className="auth-desktop-break" /> sua agência encontra o próximo
            passo.
          </p>
          <figure
            className="auth-flow-preview"
            aria-label="Exemplo ilustrativo de um fluxo de trabalho"
          >
            <figcaption>
              <Layers2 size={16} aria-hidden="true" /> Exemplo de organização
            </figcaption>
            <div className="auth-flow-stages" aria-hidden="true">
              <span className="auth-flow-stage auth-flow-stage-brief">
                <Check size={14} /> Briefing
              </span>
              <ArrowRight size={16} className="auth-flow-arrow" />
              <span className="auth-flow-stage auth-flow-stage-create">
                Criação
              </span>
              <ArrowRight size={16} className="auth-flow-arrow" />
              <span className="auth-flow-stage auth-flow-stage-review">
                Revisão
              </span>
            </div>
            <div className="auth-example-task" aria-hidden="true">
              <div className="auth-example-topline">
                <span>PROJETO DA AGÊNCIA</span>
                <span className="auth-example-status">
                  <span /> Em criação
                </span>
              </div>
              <strong>Campanha de lançamento</strong>
              <p>Boas ideias ganham um caminho claro.</p>
              <div className="auth-example-checklist">
                <span>
                  <Check size={13} /> Alinhar o briefing
                </span>
                <span>
                  <span className="auth-example-empty-check" /> Desenvolver os
                  criativos
                </span>
              </div>
              <div className="auth-example-bottom">
                <span className="auth-example-tag">Design</span>
                <span>
                  Do plano à entrega <ArrowRight size={14} />
                </span>
              </div>
            </div>
            <div className="auth-flow-result" aria-hidden="true">
              <span>
                <CheckCheck size={18} />
              </span>
              <div>
                <strong>Menos pontas soltas.</strong>
                <span>Mais espaço para criar.</span>
              </div>
            </div>
          </figure>
        </div>
        <footer>
          <span>Demandas</span>
          <span>Clientes</span>
          <span>CRM</span>
          <span>Financeiro</span>
        </footer>
      </aside>
      <section className="auth-content">
        {children}
        <span className="auth-endnote">
          <Layers2 size={16} aria-hidden="true" />
          Cada agência com seu espaço. Você com uma conta só.
        </span>
      </section>
    </main>
  );
}
