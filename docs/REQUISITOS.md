# Requisitos do Postito

Consolidação de 23/09/2026 da mensagem principal enviada pelo usuário nesta conversa, do plano anterior e das decisões recuperadas do chat “Aprimorar sistema CRM”. A mensagem principal está disponível integralmente; não se afirma ter uma transcrição integral de todas as demais mensagens antigas. Esta consolidação permite continuar o trabalho sem solicitar novamente as instruções já recebidas.

Atualização de 24/09/2026: o titular retomou e-mail/cadastro para viabilizar testes e autorizou a chave Brevo **Postito Preview**, com validade de três meses, salva como segredo na Vercel. A configuração está salva apenas no Preview da branch `postito/release-0.2.0`; redeploy READY e entrega real ainda pendente. Detalhes e limites em `docs/EMAIL.md` e `evidence/brevo-preview-20260924.json`.

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

## Ordem de execução

1. Consolidar contexto, regras, repositório e serviços existentes.
2. Reproduzir falhas da base e corrigir com testes.
3. Preservar o acesso administrativo solicitado e remover a troca de senha pelo perfil sem e-mail, conforme a decisão mais recente do titular.
4. Conferir multiagência, convites, papéis, escopos e arquivos.
5. Conferir a operação de clientes, pastas, demandas, pauta e revisão.
6. Conferir CRM e financeiro, dados e permissões.
7. Reformular integralmente UI/UX conforme U27 e DESIGN.md versão 3: direção moderna pastel, substituindo papel e tons terrosos; verificar fluxos e registrar evidências em REDESIGN-2026-09-23.md.
8. Conforme a retomada U28, concluir a configuração Brevo e homologar cadastro, confirmação, recuperação de senha e envio real com conta de teste; executar a regressão pertinente e registrar o resultado hospedado.
9. Conversa futura sobre planos, limites, preços e checkout.

A homologação de e-mail foi adiada pelo titular em 23/09/2026 para avançar na operação. Em seguida, ele decidiu remover a troca de senha pelo perfil sem e-mail e retomar cadastro, confirmação, recuperação e envio de e-mails somente após finalizar o restante do sistema. A ativação manual de uma conta indicada é uma ação administrativa individual; não comprova propriedade da caixa postal nem elimina a confirmação dos cadastros públicos. O acesso ADM, suas credenciais e seus dados permanecem preservados. Testes isolados de mensagens continuam sem comprovar entrega real.

A retomada registrada em U28 substitui apenas a postergação de e-mail/cadastro. Não autoriza reintroduzir a troca de senha pelo perfil sem e-mail, alterar ADM/dados ou antecipar planos e checkout.

## Sugestões e decisões de produto

- Direção visual mais recente: DM Sans, fundo branco frio, grafite e superfícies azul/lilás/menta/rosa pastel. Dashboard com indicadores antes das listas, busca por atalho e teclado, limpeza da busca e ações rápidas reais, reutilizando diálogos com permissão. A reformulação não antecipa e-mail, cadastro ou monetização; sua verificação é registrada separadamente dos resultados de versões anteriores.
- Implementado nesta rodada: detectar conflitos de pauta e avisar sobre rascunho não salvo; separar edição comercial e financeira; explicar o alcance integral do administrador.
- Próximas sugestões: “Meu trabalho” entre agências, filtros salvos, modelos/checklists de demanda e notificações configuráveis. A visualização deve preservar a agência de origem e o acesso do usuário.
- Depois da homologação: papel de cliente aprovador com aprovação/pedido de ajustes, diferente do leitor interno.
- Na conversa de monetização: avaliar assinatura por agência, mantendo uma conta para colaboradores convidados. Faixas, valores, limites e checkout não foram decididos.
- E-mail e cadastro retomados: concluir ativação Brevo e homologar confirmação e recuperação com conta controlada; depois avaliar domínio próprio verificado. Não comprar domínio, repetir envios incertos ou reativar credenciais desativadas automaticamente.

## Fontes e memória

Mensagem principal do usuário nesta sessão; plano de ação de 23/09; AGENTS.md; docs/DESIGN.md; docs/ARQUITETURA.md; docs/ENTREGA.md; docs/PROXIMAS-ETAPAS.md; PR nº 1 e seu registro até 22/09.

Referências indicadas: https://designspells.com/?tag=desktop · https://www.awwwards.com/ · https://ui.shadcn.com/ · https://mobbin.com/sites/monologue-dfd894e7-101b-4679-aa3e-d75a2db3bc3c/66238a42-7413-4b88-a880-f20e738a69d1/preview

O preview específico do Mobbin não foi recuperado nesta pesquisa. O site oficial https://www.monologue.to/ foi confirmado e inspecionado como referência complementar; a versão atual é visualmente diferente da direção pastel solicitada e não foi confirmada como a mesma captura do Mobbin. Fontes observadas e adaptações estão em DESIGN.md e REDESIGN-2026-09-23.md.

Esta memória registra decisões de projeto em arquivos persistentes. Não representa uma afirmação de acesso automático a todo o histórico de chats ou de memória pessoal universal entre conversas.
