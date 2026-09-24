# Requisitos do Postito

Consolidação de 23/09/2026 da mensagem principal enviada pelo usuário nesta conversa, do plano anterior e das decisões recuperadas do chat “Aprimorar sistema CRM”. A mensagem principal está disponível integralmente; não se afirma ter uma transcrição integral de todas as demais mensagens antigas. Esta consolidação permite continuar o trabalho sem solicitar novamente as instruções já recebidas.

Atualização de 24/09/2026: o titular retomou e-mail/cadastro para viabilizar testes e autorizou a chave Brevo **Postito Preview**, com validade de três meses, salva como segredo na Vercel. A configuração está salva apenas no Preview da branch `postito/release-0.2.0`, com redeploy READY. Depois, relatou recebimento do e-mail e rejeição do código, e pediu expiração em cinco minutos. A correção da confirmação passou na regressão local, foi publicada no Preview e a nova tela foi conferida; a confirmação real permanece pendente de novo código do usuário. Detalhes em `docs/EMAIL.md` e nas evidências de ativação/correção de 24/09.

Rodada de clientes/convites de 24/09/2026: o titular relatou duplicação de cliente após aviso de arquivo e ausência de miniatura/banner. Pediu também verificar o convite por e-mail que não chega e acrescentar seleção geral dos clientes atuais para editor/leitor. A correção passou em **72 testes unitários e 48 cenários E2E**, TypeScript e build, e foi publicada no Preview; o alias exibiu a tela de login. A renderização autenticada hospedada das imagens e a entrega/aceite real de convites após a alteração ainda exigem confirmação. A recuperação real foi inicialmente rejeitada pela revisão automática por faltar consentimento específico. O titular depois autorizou expressamente a ação; as precondições foram revalidadas, a transação executada e o resultado conferido no banco. O cliente original recebeu as duas imagens e manteve os convites; a duplicata foi inativada e suas 12 previsões arquivadas, com histórico e reversão preservados. Evidência: `evidence/client-media-invites-fix-20260924.json`.

Nova rodada solicitada em áudio em 24/09/2026: tabela de colaboradores no dashboard para distribuir demandas, filtro por profissão, contagem atribuída e criação central com cliente pesquisável, pauta e responsável. O exemplo de seis demandas frente a uma referência de doze orienta a decisão humana; não solicita quota automática ou bloqueio. Implementação concluída e QA próprio aprovado em 80 testes unitários e 53 cenários de API/navegador; Preview publicado em READY e tela pública de login conferida; verificação autenticada hospedada permanece pendente. A reparação dos registros reais foi autorizada posteriormente e concluída em uma ação separada da implementação do dashboard; sua verificação não substitui o QA da nova função. Evidência própria: `evidence/team-workload-20260924.json`.

Rodada de navegação e imagens de 24/09: o titular pediu navegação clicável no caminho “Clientes e pautas > Cliente”, semelhante ao uso de pastas, e dimensões recomendadas com prévia de recorte para foto e banner. Implementação concluída e QA próprio aprovado em 86 testes unitários e 61 cenários de API/navegador; Preview publicado em READY.

## Objetivo e método

Evoluir o sistema original de gerenciamento de agência para Postito: demandas, CRM e financeiro, com banco de dados e hospedagem Vercel. Preservar o trabalho existente. Antes da execução, organizar sessões, etapas e tarefas na ordem de dependência; corrigir a base antes de ampliar funções. Verificar elementos ausentes, navegação, cliques, todos os botões, persistência e erros. Para cada criação/correção: testar, corrigir falhas, repetir o cenário afetado e a regressão prevista em AGENTS.md. Registrar cobertura e pendências sem prometer ausência de todo bug possível.

## Matriz de instruções

| ID | Instrução do usuário | Critério de implementação/verificação |
| --- | --- | --- |
| U01 | Auditar todo o sistema, inclusive elementos e botões | Inventário por tela, operação, papel e resultado; API e navegador |
| U02 | Corrigir erros antes dos aprimoramentos | Bugs de acesso, execução e dados têm prioridade |
| U03 | Planejar por etapas e tarefas cronológicas | Dependências e critérios de conclusão no plano |
| U04 | Testar cada alteração e repetir a regressão | Resultados por rodada, ambiente e versão; corrigir antes de avançar |
| U05 | Sistema com database e Vercel | PostgreSQL, arquivos privados e Preview verificável; homologar antes de produção |
| U06 | Nome Postito e logo própria | Aplicação consistente da marca inspirada em organização; não afirmar exclusividade jurídica |
| U07 | UI/UX sofisticada e diferente | Legibilidade, hierarquia, fluxo, estados e adaptação a desktop/celular |
| U08 | Evitar aparência genérica, simples e neon associada à IA | Restrições concretas em DESIGN.md; identidade própria sem alegar detector universal de autoria |
| U09 | Pesquisar padrões e guardar documento/memória do que não fazer | DESIGN.md e AGENTS.md acompanham o código e orientam novas alterações |
| U10 | Pesquisar funções e animações em plataformas evoluídas | Design Spells, Awwwards, shadcn e referências funcionais; propostas adequadas ao uso |
| U11 | Login e cadastro funcionais | Nome, e-mail, senha, profissão; conta persistente e login válido |
| U12 | Confirmar cadastro com código por e-mail | Envio, validade, tentativas e consumo único; simulação não comprova entrega real |
| U13 | Recuperar senha com link por e-mail | Envio, token válido, redefinição e novo login; revogar sessões antigas |
| U14 | Selecionar profissão na agência, como designer | Profissão no perfil, independente de papel/permissão |
| U15 | Uma pessoa em três ou mais agências | Conta global, vínculos e seleção de agência, sem misturar dados |
| U16 | Agência convida por e-mail ou link com permissões | Editor/leitor/administrador, escopo armazenado no servidor, aceite e revogação |
| U17 | Mostrar clientes/demandas atribuídos ou liberados | Entrada no espaço autorizado; tarefa atribuída não libera outras tarefas da pasta |
| U18 | Atribuir colaborador dentro da pasta do cliente | Seletor pesquisável no cartão/demanda; nomes elegíveis; persistência e movimentação no Kanban |
| U19 | Manter e aprimorar CRM e financeiro | Clientes, contatos, funil, atividades, lançamentos, previsões e competências respeitam acesso |
| U20 | Discutir planos e assinatura depois | Não implementar preço, compra ou cobrança antes das decisões solicitadas |
| U21 | Considerar CRM/financeiro em plano médio/master | Hipótese de produto, sem bloqueios comerciais definitivos nesta fase |
| U22 | Trabalhar no Work, com modelo citado pelo usuário | Sessão em Work; não afirmar mudança de modelo sem confirmação do ambiente |
| U23 | Propor ideias melhores e poder executá-las | Melhorias pertinentes podem ser implementadas e testadas; contratação e decisões comerciais continuam dependentes do titular |
| U24 | Adiar envio de e-mail e liberar uma conta administrativa indicada pelo titular | Provisionamento individual no banco, limitado à própria agência; nenhuma credencial padrão no código e nenhum atalho público de autenticação |
| U25 | Continuar as alterações pendentes | Corrigir pendências verificadas e repetir a regressão |
| U26 | Remover a troca de senha sem e-mail e retomar cadastro/e-mail após finalizar o restante do sistema | Remover a opção do perfil e sua operação no servidor; preservar o acesso ADM, suas credenciais e seus dados; manter cadastro, confirmação e recuperação por e-mail no roteiro posterior |
| U27 | Reformular todo o design com cores pastéis, moderno e sem aparência rústica; pesquisar Awwwards, Design Spells desktop e o preview Monologue do Mobbin | Aplicar DESIGN.md versão 3 a navegação, dashboard, clientes, demandas, Kanban, CRM, financeiro, formulários e entrada; DM Sans sem serif, canvas frio, grafite e pastéis; verificar desktop/celular, teclado, estados e permissões; registrar referências efetivamente observadas e limitações de acesso, sem afirmar que a captura do Mobbin foi vista |
| U28 | Retomar envio de e-mails e cadastro para testes; autorizar chave Brevo Postito Preview por três meses e seu armazenamento seguro na Vercel | Configurar apenas a branch de Preview, preservar ADM/dados e variáveis anteriores; validar entrega, código e recuperação com conta controlada pelo usuário; não confundir configuração/build com envio homologado |
| U29 | Corrigir a rejeição do código recebido e reduzir sua validade para cinco minutos | Aceitar qualquer código ainda válido da conta e consumir os desafios de confirmação juntos após sucesso; limitar a cinco tentativas agregadas sem reinício por reenvio; aplicar teto de cinco minutos aos desafios legados; preservar ADM e validar localmente e no Preview |
| U30 | Corrigir cliente duplicado após aviso de imagem e ausência de foto/miniatura/banner | Validar imagens antes de persistir; aceitar JPG/PNG/WEBP/GIF até 20 MB por imagem com regra compartilhada; preservar o ID e o resultado parcial após falhas; criação idempotente por agência/membro sem duplicar previsões; corrigir verificação do objeto no Storage e conferir persistência após recarregar |
| U31 | Verificar convite por e-mail que não chega e acrescentar “Selecionar todos” para editor/leitor | Auditar criação, envio, feedback e aceite do convite; oferecer seleção geral dos clientes atuais liberados no convite/acesso para editor/leitor; preservar o escopo selecionado, distinto de acesso automático a clientes futuros; testar seleção parcial/todos/nenhum; distinguir aceite do provedor de entrega real |
| U32 | Exibir no dashboard tabela dos colaboradores, filtro por cargo/profissão e quantidade de demandas atribuídas para orientar a distribuição | Exibir a quem possui `demands.create`; incluir responsáveis ativos/elegíveis, independentemente do nome da profissão; contar somente tarefas autorizadas da agência atual, uma unidade por demanda/carrossel, com `approved` fora das contagens abertas/de prazo; “hoje” por dia civil local e “atrasadas” por vencimento anterior ao instante atual; explicar o alcance parcial e não criar quota/bloqueio a partir do exemplo de 12 |
| U33 | Criar demandas pela área principal, escolhendo colaborador, cliente e pauta; oferecer pesquisa e lista de clientes rolável antes de digitar; atualizar o Kanban do cliente | Reutilizar o diálogo e as autorizações existentes; oferecer clientes/pautas e responsáveis permitidos, lista inicial, busca, teclado e estado vazio; salvar a demanda vinculada à pauta correta e atualizar Kanban e contagem após resposta do servidor; verificar persistência depois de recarregar |
| U34 | Clicar nos níveis anteriores do caminho no topo para voltar à lista de clientes ou à pasta do cliente | Caminho acessível por clique/teclado, página atual identificada, funcional em celular; na demanda, resolver o cliente real e preservar o aviso de rascunho antes de sair; não ampliar o acesso autorizado |
| U35 | Informar tamanho da foto/banner e mostrar área de corte com ajuste de posição antes de salvar | Recomendar foto 512 × 512 (1:1) e banner 1920 × 480 (4:1), aceitar outras dimensões sem distorcer, oferecer arraste/zoom e controles por teclado; prévia e exibição final na mesma proporção; cancelar não altera imagem persistida; validar tipo/20 MB antes do processamento; testar criação, personalização, upload e persistência |
| U36 | Recuperação só envia para e-mail de conta cadastrada; cadastro ainda incompleto retorna ao cadastro | Conta ativa recebe recuperação; endereço inexistente ou pendente retorna `nextStep=signup`, sem envio, com e-mail preservado na tela. Pendência é concluída pelo código de confirmação, sem recriar conta, sobrescrever credenciais ou ativar por link de senha. Inativa permanece sem envio/acesso. Testar os percursos e distinguir caixa local da entrega real |
| U37 | Criar minha conta envia automaticamente o código; renomear Solicitar código para Reenviar código | Cadastro novo e retomada de cadastro pendente enviam após clicar em Criar minha conta; botão Reenviar código funcional; validade de cinco minutos e limite de tentativas preservados; repetição compartilha limite de reenvio, não duplica conta nem altera dados/credenciais; conta já confirmada não recebe novo código |
| U38 | Todo convite com e-mail deve enviar automaticamente uma mensagem com botão para acessar o quadro, mantendo a restrição ao destinatário | Servidor envia mesmo com canal link/omitido; só a conta correspondente aceita e recebe as permissões/clientes definidos. Botão Acessar quadro preserva o convite pelo login/cadastro até o aceite. Sem e-mail, gerar somente link; falha de envio não anuncia sucesso e revoga o convite. Testar canal legado, destinatário incorreto, escopo, uso único e percurso pelo botão |
| U39 | Reformular a plataforma com estética e animações do Made With GSAP e referências internas da galeria; criar LP antes do login com ações no topo, funcionalidades, objetivos, diferenciais e prints | Aplicar DESIGN.md v4; LP pública na raiz, `/login` e `/cadastro` próprios, sessão válida entra no sistema e convite conserva o destino. Capturas reais com dados fictícios; comparação de fluxo sem alegações inventadas. Rolagem suave, animações com redução de movimento, teclado, toque e celular; repetir regressão de autenticação e operação |

## Ordem de execução

1. Consolidar contexto, regras, repositório e serviços existentes.
2. Reproduzir falhas da base e corrigir com testes.
3. Preservar o acesso administrativo solicitado e remover a troca de senha pelo perfil sem e-mail, conforme a decisão mais recente do titular.
4. Conferir multiagência, convites, papéis, escopos e arquivos.
5. Conferir a operação de clientes, pastas, demandas, pauta e revisão.
6. Conferir CRM e financeiro, dados e permissões.
7. Reformular integralmente UI/UX conforme U27 e DESIGN.md versão 3: direção moderna pastel, substituindo papel e tons terrosos; verificar fluxos e registrar evidências em REDESIGN-2026-09-23.md.
8. Conforme U28/U29, validar a correção da confirmação com expiração de cinco minutos e homologar cadastro, recuperação de senha e envio real com conta de teste; executar a regressão pertinente e registrar o resultado hospedado.
9. U30/U31: correção de clientes, uploads e convites publicada após regressão própria. Homologar imagens e entrega/aceite reais. A recuperação dos registros existentes foi concluída após autorização explícita, revalidação das precondições e conferência pós-transação; verificar separadamente a renderização autenticada das imagens.
10. Conforme U32/U33, implementar a tabela de distribuição de demandas e criação central, verificar escopo, contagens, escolha de cliente/pauta/responsável e atualização do Kanban; executar QA próprio e conferir a publicação desta versão.
11. U39: pesquisar a referência e sua galeria, definir direção v4, implementar landing e visual interno, gerar capturas fictícias reais, testar fluxos e movimento, publicar no Preview e conferir as rotas hospedadas.
12. Conversa futura sobre planos, limites, preços e checkout.

A homologação de e-mail foi adiada pelo titular em 23/09/2026 para avançar na operação. Em seguida, ele decidiu remover a troca de senha pelo perfil sem e-mail e retomar cadastro, confirmação, recuperação e envio de e-mails somente após finalizar o restante do sistema. A ativação manual de uma conta indicada é uma ação administrativa individual; não comprova propriedade da caixa postal nem elimina a confirmação dos cadastros públicos. O acesso ADM, suas credenciais e seus dados permanecem preservados. Testes isolados de mensagens continuam sem comprovar entrega real.

A retomada registrada em U28 substitui apenas a postergação de e-mail/cadastro. Não autoriza reintroduzir a troca de senha pelo perfil sem e-mail, alterar ADM/dados ou antecipar planos e checkout.

## Sugestões e decisões de produto

- Direção visual mais recente, U39: DM Sans, navegação grafite, canvas claro e pastéis. Apresentação pública com títulos expressivos e movimento inspirado no Made With GSAP, suas referências LxL Creative e Studio Namma; telas operacionais mantêm foco no trabalho. A landing usa funções existentes e não antecipa monetização. Verificação em REDESIGN-2026-09-24.md.
- Implementado nesta rodada: detectar conflitos de pauta e avisar sobre rascunho não salvo; separar edição comercial e financeira; explicar o alcance integral do administrador.
- Próximas sugestões: “Meu trabalho” entre agências, filtros salvos, modelos/checklists de demanda e notificações configuráveis. A visualização deve preservar a agência de origem e o acesso do usuário.
- Distribuição no dashboard implementada: tabela por colaborador e profissão, carga visível da agência atual e criação central. O número de 12 citado no áudio não define periodicidade, capacidade persistida ou limite de contratação; não implementá-los por inferência. Uma capacidade configurável por pessoa/período pode ser discutida depois, sem impedir o fluxo solicitado agora.
- Depois da homologação: papel de cliente aprovador com aprovação/pedido de ajustes, diferente do leitor interno.
- Na conversa de monetização: avaliar assinatura por agência, mantendo uma conta para colaboradores convidados. Faixas, valores, limites e checkout não foram decididos.
- E-mail e cadastro retomados: concluir ativação Brevo e homologar confirmação e recuperação com conta controlada; depois avaliar domínio próprio verificado. Não comprar domínio, repetir envios incertos ou reativar credenciais desativadas automaticamente.

## Fontes e memória

Mensagem principal do usuário nesta sessão; áudio de 24/09 sobre distribuição de demandas e criação central, resumido neste documento sem publicar a transcrição integral; plano de ação de 23/09; AGENTS.md; docs/DESIGN.md; docs/ARQUITETURA.md; docs/ENTREGA.md; docs/PROXIMAS-ETAPAS.md; PR nº 1 e seu registro até 22/09.

Referências indicadas: https://designspells.com/?tag=desktop · https://www.awwwards.com/ · https://ui.shadcn.com/ · https://mobbin.com/sites/monologue-dfd894e7-101b-4679-aa3e-d75a2db3bc3c/66238a42-7413-4b88-a880-f20e738a69d1/preview

Referência mais recente: https://madewithgsap.com/ e sua galeria/coleção de efeitos, incluindo inspeção pública de https://www.lxlcreative.co.uk/ e https://studionamma.com/. O efeito com restrição de associação não foi acessado integralmente. Não houve contratação ou cópia de código pago.

O preview específico do Mobbin não foi recuperado nesta pesquisa. O site oficial https://www.monologue.to/ foi confirmado e inspecionado como referência complementar; a versão atual é visualmente diferente da direção pastel solicitada e não foi confirmada como a mesma captura do Mobbin. Fontes observadas e adaptações estão em DESIGN.md e REDESIGN-2026-09-23.md.

Esta memória registra decisões de projeto em arquivos persistentes. Não representa uma afirmação de acesso automático a todo o histórico de chats ou de memória pessoal universal entre conversas.
