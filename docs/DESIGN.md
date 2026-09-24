# Postito: memória de design

Versão 4 · 24 de setembro de 2026

## Direção vigente

O titular pediu uma nova reformulação inspirada no Made With GSAP, incluindo os sites de sua galeria, com suavidade na rolagem e uma landing page antes do login. A direção moderna com cores pastéis permanece. Esta versão atualiza a composição anterior e mantém descartados papel, trigo, verdes terrosos e Instrument Serif.

O Postito é uma ferramenta de trabalho para uma agência inteira: organizar a produção, encontrar o próximo passo e acompanhar o negócio. A marca mantém o nome e o símbolo próprios, agora aplicados a superfícies claras, tipografia sem serifa e cores suaves. A proposta visual não afirma exclusividade jurídica do nome.

Não existe uma lista universal capaz de identificar um site feito por IA. As restrições abaixo são decisões deste projeto, não um detector de autoria. Lilás e azul pastel estão expressamente permitidos pelo pedido atual; a restrição anterior a cores usadas automaticamente não proíbe a paleta escolhida.

## Sistema visual

| Elemento | Decisão |
| --- | --- |
| Marca | Wordmark Postito em minúsculas; símbolo de duas abas sobrepostas, sem textura de papel |
| Fundo principal | Branco e canvas `#F5F6F8`; apresentação em quase branco |
| Texto e ações principais | Grafite `#22272D` |
| Destaque de ação | Lima pastel `#D9E8B9`, com texto escuro |
| Azul pastel | `#DFEEFF` |
| Lilás pastel | `#E6E7FD` |
| Menta pastel | `#DFF3EB` |
| Rosa pastel | `#F9E6EF` |
| Tipografia | DM Sans, hospedada no projeto; sem fonte serif editorial |
| Navegação | Lateral grafite `#222A2B`, seleção pastel e barra superior arredondada; menu adaptado ao celular |
| Hierarquia | Tipografia expressiva na landing; indicadores antes das listas e títulos compactos no sistema |
| Superfícies | Fundos sólidos, bordas discretas, arredondamento controlado e sombra apenas para separar camadas |
| Formulários | Rótulos visíveis; texto de entrada com 16 px no celular |
| Dados | Números reais, valores financeiros formatados e estados vazios explicados |
| Movimento | GSAP na apresentação, Lenis no scroll por roda; modo nativo com movimento reduzido/toque; respostas curtas nas ações internas |

Pastel é cor de superfície, seleção e agrupamento. Texto, ícones relevantes e foco precisam continuar legíveis. Não depender somente da cor para informar prioridade, atraso, erro, permissão ou conclusão. Alertas mantêm significado: erro em vermelho, confirmação em verde e atenção em âmbar, acompanhados de rótulo ou ícone apropriado.

## Composição e comportamento por área

- Dashboard: apresentar indicadores úteis antes das listas e manter visível a próxima ação. Ações rápidas abrem os diálogos reais de criação e obedecem às permissões existentes.
- Navegação e busca: lateral grafite, estado atual pastel e busca acionável por `Ctrl+K` ou `Cmd+K`. Resultados devem permitir navegação por teclado e limpeza da busca.
- Clientes e demandas: cartões e colunas Kanban com superfícies pastéis, conteúdo compacto, prazo e responsável pesquisável. Forma e rótulo distinguem estados mesmo sem percepção de cor.
- Equipe: lista com pessoa, profissão, papel e ação de acesso. Profissão não se confunde com permissão.
- CRM e financeiro: tabelas claras e alinhamento que facilite comparação. Contato e status podem ser editados sem reescrever campos financeiros omitidos.
- Pauta e revisão: preservar indicação de rascunho não salvo e tratamento de conflito. O visual não pode esconder que a versão exibida ficou desatualizada.
- Diálogos: contexto curto, ação principal específica, erros recuperáveis, foco visível e fechamento identificável. Campos condicionais permanecem no contexto da operação.
- Entrada e cadastro: painel pastel com captura real da interface e formulário claro. Preservar cadastro, confirmação por código, recuperação e convites já implementados; não reintroduzir troca de senha pelo perfil.

## Apresentação pública e referências de 24/09

Visitantes da raiz veem a apresentação da plataforma. O cabeçalho mantém Entrar e Criar conta à direita; propósito, demonstração de funcionalidades, sequência de trabalho, diferenciais, dúvidas e chamada final compõem a página. A pessoa já conectada continua chegando ao sistema. Convites conservam seu destino e escopo.

| Referência observada | Elementos aproveitados |
| --- | --- |
| [Made With GSAP](https://madewithgsap.com/) | Tipografia grande, navegação em cápsulas, mudança de escala de imagens, seção escura com leitura progressiva e movimento vinculado à rolagem |
| [Galeria de sites](https://madewithgsap.com/showcase) e [coleção de efeitos](https://madewithgsap.com/effects/) | Diversidade de composições e transições para orientar uma linguagem própria |
| [LxL Creative](https://www.lxlcreative.co.uk/) | Hierarquia com imagens grandes, texto de forte presença e composição por seções |
| [Studio Namma](https://studionamma.com/) | Tipografia escura sobre fundo claro, bastante espaço e navegação compacta |

As páginas públicas foram inspecionadas. O efeito 115 mostrou exigência de associação; seu código e demonstração completa não foram acessados. Não houve compra, cópia de código pago, imagens ou identidade dos sites. A implementação e o texto são próprios. A inspiração em galeria complementa as referências anteriores abaixo.

As quatro capturas em `public/marketing` são da própria interface: dashboard, demandas, CRM e financeiro. `scripts/capture-marketing.mjs` gera contas, clientes, demandas e valores fictícios em banco e caixa postal locais isolados. Informar essa condição perto das imagens. Não usar imagem gerada para representar funcionalidades inexistentes. Não inventar depoimentos, métricas de adoção, preços ou uma comparação factual com marcas concorrentes. A comparação entregue é entre uma operação espalhada em ferramentas separadas e o fluxo conectado do Postito.

Na landing, GSAP anima entrada de títulos, revelação de seções, escala da captura e cor das palavras da seção de propósito. Lenis suaviza a roda do mouse, preservando rolagem nativa em toque, movimento reduzido, campos, áreas internas e modais. Preferência de movimento pode mudar durante a sessão. Limpar efeitos e instâncias ao desmontar; o conteúdo não depende de animação para ficar visível. Base técnica: [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) e [Lenis](https://github.com/darkroomengineering/lenis).

## Histórico: referências consultadas em 23/09

As decisões do Postito são adaptações, não cópias. A inspeção visual foi feita nas páginas públicas acessíveis; títulos de demonstrações sem vídeo inspecionado não comprovam detalhes de animação.

| Fonte | O que foi efetivamente observado | Adaptação ao Postito |
| --- | --- | --- |
| [Awwwards: Pastel Scroll Project Page](https://www.awwwards.com/inspiration/pastel-scroll-project-page) | Página e visual acessíveis. Galeria com fundo quase branco, tipografia sans, busca ampla, ações compactas e destaque menta; composição de projeto arejada e imagens grandes. | Espaçamento, hierarquia e contraste entre superfície neutra e ação. Evitar transportar scroll de portfólio para a operação diária. |
| [Design Spells: Luma](https://designspells.com/spells/modal-transitions-and-animations-in-luma) | Demonstração visual carregada: modal branco arredondado, overlay discreto, controles de voltar/fechar, campos condicionais e ação grafite. | Diálogos coesos, com transição curta e campos no mesmo contexto. |
| [Design Spells: Linear](https://designspells.com/spells/progress-indicator-animation-in-linear) | Demonstração visual carregada: propriedades em linhas e status compacto com ícone e rótulo; quadro observado no estado concluído. | Status legível e feedback breve de conclusão sem perder o contexto. |
| [Design Spells: Granola](https://designspells.com/spells/sidebar-icon-animation-in-granola) | Título e classificação de animação de ícone da sidebar verificados; vídeo não inspecionado. | Referência conceitual para resposta discreta da navegação a foco e seleção. |
| [Design Spells: Dropbox](https://designspells.com/spells/file-upload-animation-in-dropbox) | Título e classificação de animação de upload verificados; vídeo não inspecionado. | Referência conceitual para feedback junto ao anexo. Percentual somente com medição real. |
| [Monologue oficial](https://www.monologue.to/) | Site confirmado por busca e inspecionado visualmente. A versão atual usa fundo escuro, títulos serif, corpo mono, botões com relevo e categorias segmentadas com marcadores coloridos. | Aproveitar agrupamento por capacidade e controles segmentados. Descartar serif, relevo e paleta escura nesta direção. |

O [preview específico do Monologue no Mobbin](https://mobbin.com/sites/monologue-dfd894e7-101b-4679-aa3e-d75a2db3bc3c/66238a42-7413-4b88-a880-f20e738a69d1/preview) indicado pelo titular não foi recuperado por busca/open nesta rodada. Não foi possível inspecionar essa captura nem confirmar que corresponde à versão atual do site oficial. Nenhum login, assinatura ou contorno de restrição foi realizado.

Fontes gerais indicadas: [Awwwards](https://www.awwwards.com/), [Design Spells desktop](https://designspells.com/?tag=desktop) e [shadcn/ui](https://ui.shadcn.com/). O shadcn permanece base adaptável de comportamento, sem impor aparência padrão. A decisão anterior de atribuir um responsável principal por demanda e tratar equipe da pasta separadamente permanece; referência funcional registrada: [Linear, atribuição](https://linear.app/docs/assigning-issues).

## Movimento e feedback

Aplicar pequenas respostas onde ajudam a entender a ação. Como orientação de composição, hover e foco podem responder em aproximadamente 140 ms; diálogos podem aparecer com opacidade e deslocamento vertical de até 6 px em aproximadamente 180 ms. Esses valores são diretrizes do Postito, não medidas extraídas dos sites pesquisados.

Abas podem transicionar o indicador de seleção. Botões de gravação podem exibir estado ocupado e confirmação breve sem mudar de largura. Anexos podem informar envio, sucesso ou falha individualmente. Nenhuma animação deve simular persistência, exibir porcentagem fictícia, bloquear a interação ou atrasar o resultado. Não há compromisso de implementar todo efeito citado nesta rodada: a verificação deve registrar os comportamentos realmente entregues.

## Evitar e substituir

| Evitar neste projeto | Usar no Postito | Motivo |
| --- | --- | --- |
| Papel envelhecido, trigo, verde terroso e serif editorial | Branco frio, pastéis definidos e DM Sans | Atender à direção moderna solicitada |
| Neon, brilho decorativo e gradiente automático roxo/azul | Superfícies sólidas, incluindo azul e lilás pastel | Preservar identidade e leitura |
| Vidro e desfoque sobre informação de trabalho | Fundos legíveis e bordas discretas | Contraste e desempenho |
| Cartões idênticos para toda informação | Lista para equipe, tabela para financeiro e colunas para Kanban | A estrutura segue a tarefa |
| Ícone decorativo em cada número | Tipografia, alinhamento e rótulo útil | Reduzir ruído |
| Estrelinhas, robôs e mensagens vagas de inteligência | Ícones de ação e nomes específicos | Não sugerir funções inexistentes |
| Títulos gigantes em telas internas | Título moderado e contexto curto | Manter o trabalho visível |
| Cantos, sombras e relevos exagerados | Separação discreta conforme a camada | Diferenciar campo, cartão e modal |
| Texto pastel ou cinza quase invisível | Texto grafite e auxiliares legíveis | Informação secundária também precisa ser lida |
| Animação contínua sem significado | Transições curtas de estado | Comunicar sem distrair |
| Gráficos com proporções fictícias | Valores reais, zero real e estados vazios | Não distorcer decisões |
| CTA genérico ou ação rápida sem destino | Ação específica ligada ao fluxo real e à permissão | Previsibilidade |
| Layout válido só com poucos registros | Conferir nomes longos, tabelas e celular | Sustentar uso real |
| Remover convenções para parecer diferente | Busca, menus, foco e linguagem conhecida | Personalidade com previsibilidade |

## Regra para novas telas e verificação

Antes de desenhar, escrever: quem usa, que decisão precisa tomar, qual ação principal, quais informações são necessárias e quais estados podem ocorrer. Reutilizar a paleta e a tipografia, escolhendo a estrutura adequada ao conteúdo. Conferir vazio, carregamento, erro, acesso negado, texto longo, foco por teclado e tela estreita. Guardar capturas e resultados da versão testada.

Este documento, `docs/REDESIGN-2026-09-24.md` e `AGENTS.md` registram a direção vigente. `docs/REDESIGN-2026-09-23.md` preserva o histórico. A conclusão dos testes deve ser preenchida no registro da rodada com evidência real, sem herdar automaticamente a aprovação de versões anteriores.
