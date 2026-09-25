"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Check, Plus, Layers2, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketingMotion } from "./marketing-motion";
import { MotionCopy } from "./motion-copy";
import { SmoothScroll } from "./smooth-scroll";

const views = [
  { id: "overview", label: "Visão geral", image: "visao-geral", title: "O dia começa com uma visão clara.", description: "Prazos, demandas em andamento e distribuição de trabalho. Entenda o que precisa de atenção antes de abrir a primeira tarefa.", alt: "Dashboard do Postito com demandas, prazos e distribuição de tarefas por colaborador" },
  { id: "work", label: "Demandas e pautas", image: "pautas", title: "Cada entrega encontra o seu caminho.", description: "Briefing, pauta, responsável, arquivos e revisão no contexto de cada cliente. Acompanhe a produção do planejamento à aprovação.", alt: "Quadro de demandas do Postito organizado em etapas de produção, revisão e aprovação" },
  { id: "crm", label: "CRM comercial", image: "crm", title: "O próximo cliente começa aqui.", description: "Organize os contatos, acompanhe as oportunidades e transforme uma negociação em cliente da agência.", alt: "CRM do Postito com oportunidades comerciais distribuídas por etapa" },
  { id: "finance", label: "Financeiro", image: "financeiro", title: "O negócio também precisa de clareza.", description: "Acompanhe previsões, entradas, saídas e comprovantes. Tenha o financeiro perto da operação, com acesso reservado a quem precisa.", alt: "Financeiro do Postito com indicadores e tabela de receitas, despesas e previsões" },
];
const faqs = [
  ["Posso trabalhar em mais de uma agência?", "Sim. Sua conta pode participar de várias agências. Cada uma mantém seus próprios clientes, demandas e permissões, e você alterna entre os espaços pela plataforma."],
  ["Eu escolho o que cada pessoa pode acessar?", "Sim. Ao convidar alguém, você define a permissão e os clientes liberados. Também pode ajustar o acesso depois. A profissão da pessoa e as permissões são informações diferentes."],
  ["Como minha equipe recebe o convite?", "Gere um link de convite, copie e compartilhe pelo WhatsApp ou pelo canal que preferir. A pessoa entra ou cria sua conta para aceitar. Se você informar um e-mail, só essa conta poderá aceitar. Os acessos seguem o que você definiu."],
  ["O que acontece depois de criar minha conta?", "Você recebe um código de confirmação por e-mail. Depois de confirmar, pode criar o espaço da sua agência ou aceitar um convite da equipe."],
  ["As telas apresentadas são do sistema de verdade?", "Sim. São capturas da interface do Postito com dados de demonstração. Os clientes, os nomes e os valores exibidos são fictícios."],
];

export function MarketingSite() {
  return <div id="postito-landing" className="landing" data-design="motion-5">
    <a className="landing-skip" href="#conteudo">Pular para o conteúdo</a>
    <header className="landing-header">
      <Link href="/" aria-label="Postito, início" className="landing-brand"><Image src="/postito-logo.png" alt="Postito" width={159} height={54} priority /></Link>
      <nav aria-label="Navegação principal" className="landing-nav"><a href="#plataforma">Plataforma</a><a href="#diferenciais">Por que Postito</a><a href="#duvidas">Dúvidas</a></nav>
      <div className="landing-account"><Link href="/login" className="landing-login">Entrar</Link><Link href="/cadastro" className="landing-button landing-button-small"><span>Criar conta</span><ArrowUpRight size={17} aria-hidden="true" /></Link></div>
    </header>
    <main id="conteudo">
      <section className="landing-hero">
        <div className="hero-intro landing-container">
          <div className="landing-overline"><span>O espaço de trabalho da sua agência</span><span>Planejar. Criar. Entregar.</span></div>
          <h1 aria-label="Sua agência. Em boa ordem."><span className="hero-line" aria-hidden="true" data-hero-line><MotionCopy text="Sua agência." /></span><span className="hero-line" aria-hidden="true" data-hero-line><MotionCopy text="Em boa" /> <span className="hero-order"><MotionCopy text="ordem." /></span></span></h1>
          <div className="landing-hero-bottom"><p>Do primeiro briefing à última aprovação.<br />Um lugar para o trabalho fluir e as boas ideias acontecerem.</p><div className="landing-hero-actions"><Link className="landing-button" data-magnetic href="/cadastro"><span className="button-roll"><span>Começar com o Postito</span><span aria-hidden="true">Começar com o Postito</span></span><ArrowUpRight size={20} aria-hidden="true" /></Link><a className="landing-text-link" href="#plataforma">Conhecer por dentro <ArrowDown size={18} aria-hidden="true" /></a></div></div>
          <div className="hero-scroll-cue" aria-hidden="true"><span>Seu trabalho, em perspectiva</span><ArrowDown size={16} /></div>
        </div>
        <div className="hero-product-scene"><div className="hero-product-stage">
          <div className="hero-satellite hero-satellite-left" aria-hidden="true"><span>Da ideia</span><Image src="/marketing/pautas.webp" alt="" width={1600} height={1050} sizes="35vw" /></div>
          <div className="hero-satellite hero-satellite-right" aria-hidden="true"><span>Ao negócio</span><Image src="/marketing/crm.webp" alt="" width={1600} height={1050} sizes="35vw" /></div>
          <figure className="hero-product"><div className="product-frame-caption"><span><Layers2 size={16} aria-hidden="true" /> Postito / Seu espaço de trabalho</span><span>Visão geral</span></div><Image src="/marketing/visao-geral.webp" alt={views[0].alt} width={1600} height={1050} priority sizes="(max-width: 700px) 100vw, 90vw" /><figcaption>Interface real. Dados de demonstração.</figcaption></figure>
          <span className="hero-stamp" aria-hidden="true">Menos dispersão.<br />Mais criação.</span>
        </div></div>
        <div className="landing-module-strip" aria-label="Áreas da plataforma"><div className="module-track"><span>Demandas & pautas</span><Plus aria-hidden="true" /><span>Clientes & equipe</span><Plus aria-hidden="true" /><span>CRM & financeiro</span><Plus aria-hidden="true" /><span className="module-result">Tudo conectado</span></div></div>
      </section>

      <section className="landing-mission" aria-labelledby="mission-heading"><div className="landing-container"><p className="landing-label">01 / Nosso propósito</p><h2 id="mission-heading">{"Mais espaço para criar. Mais clareza para fazer acontecer.".split(" ").map((word,index)=><span className="mission-word" key={index}>{word} </span>)}</h2><div className="mission-bottom"><span className="mission-symbol" aria-hidden="true"><Layers2 strokeWidth={1} /></span><p>O Postito nasceu para organizar o trabalho de uma agência inteira. Conectar quem planeja, quem cria e quem cuida do negócio, do briefing à última aprovação.</p></div></div></section>

      <section className="landing-flow" aria-labelledby="flow-heading"><div className="flow-scene"><div className="flow-heading landing-container"><p className="landing-label">02 / Da ideia à entrega</p><h2 id="flow-heading">Um fluxo. Todas as pontas.</h2><span className="flow-progress-label" aria-hidden="true">Continue explorando <ArrowRight size={18} /></span></div><div className="flow-viewport"><div className="landing-flow-grid">{[
        ["01", "Organize o contexto.", "O briefing, a pauta, os arquivos e a revisão ficam junto da demanda. A próxima ideia já começa com tudo no lugar.", "Cliente → Pauta", "pautas", "Uma pauta, do planejamento à aprovação"],
        ["02", "Conecte as pessoas.", "Veja a carga da equipe e distribua as demandas. Cada pessoa encontra seus clientes, seus prazos e seu próximo passo.", "Equipe → Produção", "visao-geral", "Visão da produção e da distribuição de demandas"],
        ["03", "Enxergue o negócio.", "A produção anda, e você acompanha o resto. Contatos no CRM e previsões no financeiro, com permissões próprias para cada acesso.", "Comercial → Financeiro", "financeiro", "Previsões e lançamentos financeiros da agência"],
      ].map(([number,title,description,tag,screen,alt])=><article className="landing-flow-item" key={number}><div className="flow-copy"><span className="flow-number">{number}</span><h3>{title}</h3><p>{description}</p><span className="flow-tag">{tag}<ArrowUpRight size={20} aria-hidden="true" /></span></div><figure className="flow-screen"><Image src={`/marketing/${screen}.webp`} alt={alt} width={1600} height={1050} sizes="(max-width: 900px) 100vw, 65vw" /><figcaption>Postito com dados de demonstração</figcaption></figure></article>)}</div></div><div className="flow-progress landing-container" aria-hidden="true"><span /></div></div></section>

      <section className="landing-platform landing-container" id="plataforma" aria-labelledby="platform-heading"><div className="landing-section-heading"><p className="landing-label">03 / Explore por dentro</p><h2 id="platform-heading" aria-label="Toda a operação. Uma visão em comum." data-motion-heading><MotionCopy text="Toda a operação." /><br /><span><MotionCopy text="Uma visão em comum." /></span></h2><p>Escolha uma área e veja os detalhes da interface.</p></div>
        <Tabs defaultValue="work" className="product-tour" data-reveal><TabsList aria-label="Áreas do Postito" className="tour-tabs">{views.map(view=><TabsTrigger key={view.id} value={view.id}>{view.label}</TabsTrigger>)}</TabsList>{views.map((view,index)=><TabsContent key={view.id} value={view.id} className="tour-panel"><div className="tour-panel-heading"><div><span className="tour-index">0{index+1}</span><h3>{view.title}</h3></div><p>{view.description}</p></div><div className={`tour-screen tour-screen-${view.id}`}><Image src={`/marketing/${view.image}.webp`} alt={view.alt} width={1600} height={1050} sizes="(max-width: 700px) 100vw, 90vw" /></div><p className="tour-caption">Captura do Postito com dados fictícios para demonstração.</p></TabsContent>)}</Tabs>
      </section>

      <section className="landing-difference" id="diferenciais" aria-labelledby="difference-heading"><div className="landing-container"><div className="landing-section-heading"><p className="landing-label">04 / Por que Postito</p><h2 id="difference-heading" aria-label="O valor está nas conexões." data-motion-heading><MotionCopy text="O valor está" /><br /><MotionCopy text="nas conexões." /></h2><p>Quando a operação fica espalhada, você precisa reunir o contexto. No Postito, as informações acompanham o trabalho.</p></div><div className="difference-table" data-reveal role="table" aria-label="Ferramentas separadas e operação conectada no Postito"><div role="row" className="difference-table-head"><div role="columnheader">Na rotina</div><div role="columnheader">Em ferramentas separadas</div><div role="columnheader">Com o Postito</div></div>{[
        ["Contexto do cliente", "Arquivos, briefing e tarefas em lugares diferentes.", "Pasta, pauta e demanda no mesmo contexto."],
        ["Trabalho em equipe", "Consultar listas para descobrir responsáveis e prazos.", "Atribuição de demandas e visão da distribuição."],
        ["Mais de uma agência", "Reunir acessos e encontrar o espaço certo.", "Uma conta com espaços separados por agência."],
        ["Controle de acesso", "Conferir permissões em cada ferramenta.", "Clientes liberados e permissões definidos por agência."],
        ["Visão do negócio", "Alternar entre produção, contatos e controles financeiros.", "Demandas, CRM e financeiro na mesma plataforma."],
      ].map(([context,separate,postito])=><div role="row" key={context}><div role="rowheader">{context}</div><div role="cell">{separate}</div><div role="cell"><Check size={17} aria-hidden="true" />{postito}</div></div>)}</div><p className="difference-note">Comparação entre formas de organizar a operação. As funções e os acessos dependem das permissões da sua agência.</p></div></section>

      <section className="landing-faq landing-container" id="duvidas" aria-labelledby="faq-heading"><div><p className="landing-label">05 / Antes de começar</p><h2 id="faq-heading" aria-label="Vamos deixar tudo claro." data-motion-heading><MotionCopy text="Vamos deixar" /><br /><MotionCopy text="tudo claro." /></h2></div><div className="faq-list">{faqs.map(([question,answer])=><details key={question} data-reveal><summary>{question}<Plus size={20} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></section>

      <section className="landing-final"><div className="landing-container"><span className="final-orbit" aria-hidden="true"><ArrowUpRight strokeWidth={1} /></span><p className="landing-label">Seu próximo projeto começa aqui</p><h2 aria-label="Dê espaço às boas ideias." data-motion-heading><MotionCopy text="Dê espaço" /><br /><MotionCopy text="às boas ideias." /></h2><Link href="/cadastro" className="landing-button" data-magnetic><span className="button-roll"><span>Criar minha conta</span><span aria-hidden="true">Criar minha conta</span></span> <ArrowUpRight size={20} aria-hidden="true" /></Link><Link href="/login" className="landing-text-link">Já tenho conta <ArrowRight size={18} aria-hidden="true" /></Link></div></section>
    </main>
    <footer className="landing-footer landing-container"><div className="footer-top"><p>Organização para fazer<br />o trabalho fluir.</p><nav aria-label="Rodapé"><a href="#plataforma">Plataforma</a><a href="#diferenciais">Diferenciais</a><Link href="/login">Entrar</Link><Link href="/cadastro">Criar conta</Link></nav></div><div className="footer-wordmark" aria-hidden="true"><MotionCopy text="postito" /></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Postito</span><span>Sua agência, com tudo no lugar.</span><a href="#conteudo">Voltar ao início <ArrowUpRight size={14} aria-hidden="true" /></a></div></footer>
    <SmoothScroll />
    <MarketingMotion />
  </div>;
}
