# Postito — entrega e verificação

## Navegação pelo caminho e recorte de imagens em 24/09/2026: verificado, aguardando publicação

O caminho do topo passa a oferecer retorno à lista de clientes por clique e teclado; a página atual é identificada e não executa navegação para si mesma. Dentro da demanda, os níveis anteriores levam à lista ou ao cliente real da demanda, mesmo quando ela foi aberta pela busca sobre outra pasta. A proteção de rascunho é compartilhada com o fechamento e preserva o texto se o descarte for cancelado. A trilha fica disponível também no celular, respeitando os dados já autorizados.

A solicitação seguinte acrescenta dimensões recomendadas e editor local de recorte: foto de 512 × 512 px e banner de 1920 × 480 px, com escala proporcional, arraste, zoom e controles por teclado. O banner usa 4:1 na prévia, na pasta e no cartão para não refazer o enquadramento na exibição. A escolha é aplicada antes de iniciar o upload; cancelar preserva a imagem anterior. O resultado será uma imagem PNG estática, informado no editor. Permanecem os limites e regras de idempotência da criação de clientes.

**QA integrado: 86 testes unitários e 61 cenários de API/navegador aprovados (25 API e 36 navegador), incluindo seis testes de geometria e oito novos cenários de navegador.** TypeScript aprovado; lint sem erros e com 18 avisos preexistentes. A rodada inicial só de navegação passou em 56 cenários; duas tentativas integradas pararam em suposições incorretas de fixtures no teste de acesso restrito. O cenário passou a criar sua própria demanda privada e restaurar os dados. A revisão visual também corrigiu a coluna do modal que cortava a trilha no celular, com asserção de limites. Os 33 cenários focados passaram, seguidos pela regressão completa de 61.

Foram verificados clique/teclado, rascunho e cancelamento, acesso por atribuição, fotos inválidas, upload parcial sem duplicação, zoom, arraste por mouse e toque em 390/320 px, dimensões e pixels do PNG salvo após recarregar. Capturas usam somente fixtures; não houve edição de clientes reais. Evidências: `evidence/navigation-crop-20260924.json`, `evidence/navigation-crop-regression-20260924.json`, `breadcrumb-desktop.png`, `breadcrumb-mobile.png`, `client-image-crop-desktop.png` e `client-image-crop-mobile.png`. Build final aprovado (compilação 3,4 s e TypeScript 8,7 s), com o aviso conhecido de file tracing em `next.config.ts`/`lib/storage.ts`. Publicação em conclusão; conferência funcional autenticada hospedada não realizada.

## Distribuição de demandas no dashboard em 24/09/2026: publicado no Preview

O titular solicitou em áudio uma tabela no dashboard com colaboradores, filtro por profissão e quantidade de demandas atribuídas, para orientar quem distribui o trabalho. Pediu também criação pela área principal, com seleção do responsável, cliente e pauta; o cliente deve ser pesquisável e oferecer lista rolável antes de digitar, e a demanda salva deve aparecer no Kanban correspondente. A transcrição integral não faz parte do repositório.

Critérios desta rodada: a tabela exige `demands.create`, não uma profissão específica. Inclui apenas responsáveis ativos/elegíveis e conta somente demandas autorizadas na agência atual, com esse alcance explícito. Um carrossel conta como uma demanda, independentemente das fatias; aprovadas ficam fora de Em aberto, Com prazo hoje e Atrasadas. “Com prazo hoje” usa o dia civil local e “Atrasadas” o vencimento anterior ao instante atual; uma demanda vencida hoje pode contar nas duas. Os valores zero devem ficar explícitos. O exemplo de seis demandas diante de uma referência de doze não instala quota ou bloqueio, nem exige mudança no schema.

A criação central reutiliza o diálogo e a autorização existentes, mantendo cliente/pauta compatíveis e responsável elegível. O sucesso só é anunciado após persistência e a atualização da área de trabalho reflete a atribuição no Kanban e na tabela. A verificação cobriu acesso parcial, troca de agência, papéis, profissão, carrosséis, aprovadas, prazos locais, busca/rolagem/teclado, seleção de pauta e persistência após recarregar, em desktop e celular. No cenário de cliente sem pauta, somente a resposta de leitura foi simulada; a criação de pasta e demanda persistiu no banco local real do teste e preservou o briefing.

**QA local concluído: 80 testes unitários e 53 cenários E2E aprovados, sendo 25 de API e 28 de navegador.** A suíte inclui oito testes do helper de carga, com elegibilidade/zero, escopo, reatribuição, aprovação e datas locais em São Paulo e na transição de horário de verão de Nova York. A primeira E2E parou em transbordamento móvel do dashboard, antes dos cinco novos cenários da tabela; o ajuste de largura/rolagem foi aplicado e a segunda execução completa passou. TypeScript aprovado; lint dos arquivos de código alterados com zero erros e 18 avisos preexistentes. Build aprovado, com compilação em 3,1 s e etapa TypeScript em 8,2 s; permaneceu o aviso conhecido de file tracing no encadeamento `next.config.ts` → `lib/storage.ts` → rota de documentos financeiros.

Publicação confirmada no Preview: commit `2afd07ba1a1494246aa96ff194650d54215bd562`, árvore `cab1cea2b7b19faaa6f4eb8376e73f8103998809`, deployment `dpl_5PuDdWxcfJCGDNuyG29MUuHwuM5v` em **READY** (50 segundos). A [implantação](https://postito-fw9muketd-vieiraphilipe875-7609s-projects.vercel.app) e o [alias estável](https://postito-git-postito-release-020-vieiraphilipe875-7609s-projects.vercel.app/) exibem a versão; o alias abriu a tela de login no navegador. A verificação funcional autenticada hospedada permanece pendente, separada da regressão local. Produção, schema, variáveis de ambiente, acesso ADM e confirmação em cinco minutos foram preservados. Evidências: `evidence/team-workload-20260924.json`, `evidence/team-workload-regression-20260924.json` e três capturas com fixtures (`team-workload-authorized.png`, `team-workload-created-kanban.png`, `team-workload-mobile.png`). Os 72 testes unitários e 48 cenários abaixo pertencem à correção anterior. Separadamente, a recuperação real autorizada foi executada e conferida no banco; isso não comprova renderização autenticada das imagens no ambiente hospedado.

## Clientes, imagens e convites em 24/09/2026: publicado no Preview

O titular relatou que a criação de cliente exibiu aviso sobre imagens, mas persistiu o cadastro. A repetição criou outro cliente; miniatura e banner não apareceram. A inspeção do código confirmou que a validação/envio acontecia após criar e que o ID já persistido não era preservado para retentar. Também foi identificado o uso incorreto dos metadados de `Storage.info()`: o SDK retorna `size` e `contentType` na raiz, enquanto a implementação tentava ler campos diferentes em `metadata`.

A inspeção remota somente de leitura encontrou dois cadastros de mesmo nome separados por **14,534 segundos**, ambos sem imagens vinculadas, cada um com uma pasta, nenhuma tarefa e doze previsões. O mais recente possuía duas transferências PNG válidas de aproximadamente 7–9 MB no Storage, sem conclusão do vínculo. Nomes, IDs, destinatários e valores comerciais reais não integram este registro. **Recuperação real concluída após autorização explícita posterior do titular.** A revisão automática havia rejeitado a primeira execução por faltar consentimento para alterações reais, incluindo efeitos financeiros. Esse bloqueio foi resolvido pelo consentimento posterior; nenhuma tentativa indireta o contornou. Com as precondições revalidadas, a transação vinculou as duas imagens ao original, preservou seus convites, inativou a duplicata e arquivou suas doze previsões intactas, sem apagar dados ou objetos. Recuperação e rollback haviam passado em fixtures sintéticas; o rollback remoto não foi executado.

A consulta pós-commit confirmou: original ativo, avatar/banner vinculados, dois tickets concluídos, doze previsões não arquivadas e nenhum arquivamento no original, dois convites, uma pasta e nenhuma tarefa; duplicata inativa, zero previsões não arquivadas, doze arquivadas, nenhum convite, uma pasta e nenhuma tarefa. Dois objetos continuam vinculados no Storage e um registro de auditoria reversível foi gravado. A duplicata sai da lista padrão de ativos e permanece no histórico de inativos. A renderização autenticada das imagens no navegador é uma verificação separada, ainda pendente.

Correções de clientes/Storage implementadas e testadas: validar as imagens antes de persistir; compartilhar a política de JPG/PNG/WEBP/GIF até 20 MB por imagem entre interface e API; preservar o ID criado e permitir retentar upload; usar `requestId` escopada por agência/membro com unicidade no banco para que retries não repitam pasta, vínculo, previsões ou atividade; verificar os campos autoritativos do objeto. Outros anexos mantêm o limite de 50 MB. Replay não deduplica por nome, não sobrescreve dados nem restaura acesso revogado.

O titular também relatou convite por e-mail que não chega e pediu **Selecionar todos** para editor/leitor. O modo padrão de gerar link podia ser confundido com envio. A leitura dos registros encontrou dois convites não revogados: para o primeiro não foi observado evento de envio; para o segundo o painel Brevo registrou envio e entrega às 06:40 BRT. Isso não confirma posicionamento na caixa principal nem aceite do convite, e não fundamenta afirmar falha SMTP. Nenhum novo e-mail foi enviado durante essa inspeção. A interface inicia em e-mail, distingue aceite do provedor de entrega e informa que gerar link não envia mensagem. A seleção geral marca/desmarca os clientes atuais no convite/acesso, com estado parcial, preservando o escopo selecionado. O teto de 100 IDs foi removido; a autorização em lotes mantém o isolamento da agência, com testes para 150 e 1.001 clientes. Não equivale ao acesso automático a todos os clientes presentes e futuros. O fluxo passou na regressão local; aceite pelo provedor não comprova chegada à caixa postal.

Validação desta rodada: **72 testes unitários e 48 cenários E2E aprovados (25 de API e 23 de navegador)**, com fixtures isoladas. A regressão inclui validação antes de criar, clique repetido, resposta perdida após commit, upload parcial/retry, previsões únicas, personalização e remoção de imagens, leitura privada, seleção geral de leitor/editor, envio local, modo link e escopo futuro. A primeira rodada parou em um seletor de teste ambíguo para Fechar; o seletor foi delimitado ao rodapé e a suíte completa repetida com sucesso. TypeScript e build passaram; lint teve zero erros e 26 avisos preexistentes nos arquivos alterados. O build preserva o aviso conhecido de file tracing. A concorrência foi exercitada somente em PGlite. O Preview foi publicado e conferido; renderização autenticada hospedada das imagens e entrega/aceite real após a alteração ainda precisam de confirmação. Evidências: `evidence/client-media-invites-fix-20260924.json` e `evidence/client-media-invites-regression-20260924.json`; capturas de navegador usam exclusivamente dados fictícios.

Publicação confirmada: commit `20b625a4099bfa40b8cc0252d006aa9a79597e18`, árvore `cbc122efa1fccb981fbe087c57a1d7214b565921`, deployment `dpl_CqGcLGUU5gBJSn4GZTeSXpLUfkfx` em **READY** (43 segundos). A [implantação](https://postito-4z261p23f-vieiraphilipe875-7609s-projects.vercel.app) e o [alias de Preview](https://postito-git-postito-release-020-vieiraphilipe875-7609s-projects.vercel.app/) apontam para a correção; o alias abriu a tela de login no navegador. A navegação direta à resposta JSON de saúde foi bloqueada pelo cliente do navegador, portanto não é evidência de saúde hospedada nem de falha do serviço. Produção, schema, variáveis de ambiente, credenciais ADM e a regra de confirmação em cinco minutos foram preservados.

## Correção da confirmação de e-mail em 24/09/2026

O usuário confirmou recebimento do e-mail, mas relatou recusa do código e solicitou validade de **cinco minutos**. A auditoria reproduziu a seleção indevida somente do desafio mais recente. No caso real, leitura de metadados encontrou dois desafios ainda válidos, separados por 3,488 segundos, conta pendente e duas tentativas no mais recente. Nenhum código ou hash foi lido e nenhum registro hospedado ou acesso ADM foi alterado manualmente.

A correção validada localmente e publicada no Preview aceita qualquer código ainda válido, aplica o teto de cinco minutos também aos desafios legados, consome os desafios de confirmação juntos após sucesso e mantém limite agregado de cinco tentativas que o reenvio não reinicia. **A confirmação real da correção permanece pendente de novo código do usuário.** O recebimento relatado não comprova o cadastro concluído. Evidência: `evidence/email-confirmation-fix-20260924.json`; os registros históricos foram preservados.

Publicação confirmada no Preview: commit `ad64eade9adfca7d31e1b0d62d9e3d6d71b0ea09`, árvore `3d9bb57545318d65bfeca84aedc7f6286a7ff0b0`, deployment `dpl_8gyzLivZBn7eVUsGh51coVYqLMDJ` em **READY** (33 segundos). A [URL da implantação](https://postito-doa9kxpev-vieiraphilipe875-7609s-projects.vercel.app) está publicada; o [alias estável](https://postito-git-postito-release-020-vieiraphilipe875-7609s-projects.vercel.app/) foi aberto no navegador e a tela **Confirmar meu e-mail** mostrou “Ele vale por 5 minutos após o envio”. A confirmação real continua pendente de um novo código recebido pelo usuário. Não houve ativação manual de conta nem alteração de senha, ADM, schema ou variáveis de ambiente nesta correção.

Validação local concluída: **37 testes unitários aprovados, incluindo 18 novos, e 38 cenários E2E aprovados (23 de API e 15 de navegador)**. Cadastro, código, onboarding e recuperação passaram, incluindo colagem de código com espaços e texto de validade de cinco minutos. TypeScript e lint dos arquivos de código/teste alterados passaram. O build passou com o aviso já conhecido de file tracing em `next.config.ts`/`lib/storage.ts`. A primeira execução E2E parou por ausência de Chromium; após instalação pela distribuição oficial, a suíte completa encerrou com exit 0. Evidência da regressão: `evidence/email-confirmation-regression-20260924.json`. A concorrência foi testada somente em PGlite isolado, não entre várias conexões PostgreSQL hospedadas.

## Retomada do e-mail em 24/09/2026

O titular retomou o envio de e-mails para testar cadastros. A chave Brevo **Postito Preview**, criada em 24/09 e válida até **24/12/2026**, foi transferida pela interface para a Vercel sem leitura pelo modelo nem exposição de seu valor. Foram confirmados `BREVO_API_KEY` como Secret, `MAIL_PROVIDER=brevo` e `BREVO_FROM_EMAIL` como Config, com remetente já verificado e escopo exclusivo ao Preview da branch `postito/release-0.2.0`.

O redeploy `dpl_FaPmSUxSQog7UNHgRp5zsYkFVJro`, do commit `3d5bdcf8e51aca996124bfd1841281e390beb503`, concluiu em **READY**. Variáveis anteriores, código, ADM e dados foram preservados. Não houve teste de entrega durante essa configuração inicial; o recebimento relatado posteriormente e a correção da confirmação estão registrados na seção acima. Configuração e build não comprovam entrega. Consulte `evidence/brevo-preview-20260924.json` e `docs/EMAIL.md`.

Esta retomada substitui a postergação de e-mail registrada em 23/09. A remoção da troca de senha pelo perfil sem e-mail permanece vigente; produção, planos e checkout não foram antecipados.

## Reformulação visual de 23/09/2026

A direção vigente é moderna e pastel: branco frio, grafite, lilás, azul, menta e rosa, com DM Sans. Entrada, onboarding, navegação, dashboard, clientes, Kanban, CRM, financeiro, equipe e diálogos foram reformulados. Foram acrescentadas busca por `Ctrl+K`/`Cmd+K`, navegação de resultados por teclado e ações rápidas de criação respeitando as permissões.

Validação desta versão: **36 cenários de API/navegador e 19 testes unitários aprovados**, TypeScript e build aprovados, lint com zero erros e 39 avisos. A revisão incluiu desktop, celular, movimento reduzido e dashboard com texto ampliado. O transbordamento financeiro encontrado no celular foi corrigido e a regressão foi repetida. Referências, limites, decisões e evidências estão em `docs/REDESIGN-2026-09-23.md` e `evidence/results.json`.

Entrega na mesma branch de Preview e no PR de acompanhamento. Esta rodada preserva a decisão abaixo sobre autenticação, o acesso ADM existente e a postergação de e-mail, cadastro e planos.


## Histórico de 23/09/2026: autenticação e e-mail

Por solicitação explícita do titular, a opção **Seu perfil → Alterar senha** sem e-mail foi removida, junto com sua operação no servidor. O acesso ADM já provisionado, suas credenciais e seus dados permanecem preservados. Cadastro, confirmação, recuperação de senha e envio de e-mails serão retomados após finalizar o restante do sistema.

A remoção foi validada por **34 cenários de API/navegador e 19 testes unitários aprovados**, com build de produção e TypeScript também aprovados. A chamada à antiga operação retorna HTTP 400 sem alterar a senha ou encerrar a sessão; no navegador, o perfil não oferece o controle removido e continua salvando nome e profissão.

A rodada de 35 cenários abaixo é um registro histórico da versão que ainda incluía a troca de senha pelo perfil e foi substituída, para o estado atual, pela regressão descrita acima.

## Histórico de 23/09/2026: acesso administrativo

O titular adiou a configuração de envio de e-mails para avançar na operação. Foi provisionada uma conta indicada por ele, ativada individualmente e vinculada como proprietária a uma agência nova e vazia. A consulta posterior confirmou a credencial gravada e a associação ativa. Nenhuma credencial foi incluída no código, nenhum cadastro público deixou de exigir confirmação e nenhuma conta preexistente foi alterada. Essa ativação manual não comprova propriedade da caixa postal. O primeiro acesso hospedado ainda precisa ser conferido pelo titular.

A atualização anterior acrescentou **Seu perfil → Alterar senha**, sem e-mail, com senha atual obrigatória, confirmação da nova senha, revogação de sessões e novo login. Essa função foi removida pela decisão posterior registrada acima e não integra o estado atual do produto.

Também foram corrigidas duas pendências: o financeiro agora permite abrir cada comprovante/NF anexado; a nova demanda oferece somente responsáveis ativos com as permissões necessárias. Os filtros financeiros de ano e mês receberam nomes acessíveis.

Validação histórica dessa rodada: **35 cenários de API/navegador e 19 testes unitários aprovados**, TypeScript e build aprovados, lint com zero erros e 42 avisos preexistentes. Os testes percorreram senha atual incorreta, nova senha inválida, confirmação divergente, encerramento de sessões, rejeição da senha antiga, novo login, ausência de envio de e-mail, múltiplos documentos e responsáveis inelegíveis. A caixa de e-mail, os arquivos e o banco usados na regressão são locais e isolados. A entrega real de e-mails permanece adiada; a publicação continua em Preview.

## Atualização de 23/09/2026

As instruções principais enviadas pelo usuário foram consolidadas em `docs/REQUISITOS.md`. Esta rodada corrigiu o acesso à criação de pastas, separou edição de CRM e financeiro, protegeu pautas contra sobrescrita por outra edição e acrescentou avisos de rascunho. Também ajustou onboarding, permissões visuais, nomes acessíveis e menu móvel. A memória de design foi revisada.

Validação histórica local: **31 cenários de API/navegador e 19 testes unitários aprovados**, TypeScript e build aprovados; lint sem erros, com 42 avisos de manutenção. O alcance, as reproduções e as limitações estão em `docs/AUDITORIA-2026-09-23.md`. Entrega real de e-mails e homologação autenticada hospedada continuam pendentes. Esta contagem e as das seções seguintes registram versões anteriores.


Atualizado em 21 de setembro de 2026 · versão 0.2.0

## Resultado

O sistema original foi transformado em uma aplicação Next.js com PostgreSQL, autenticação, agências independentes e a identidade Postito. Foram preservados os fluxos de clientes, pastas, pautas por fatias, revisão visual, CRM e financeiro, com correções de acesso, dados e interface.

A versão foi executada e testada localmente e publicada como Preview na Vercel. O código está na branch `postito/release-0.2.0`, com [PR de acompanhamento](https://github.com/vieiraphilipe875-ux/sistemsaltalpha2/pull/1). Após a confirmação do usuário, o projeto Supabase Postito foi criado em São Paulo, com as três migrações aplicadas, 25 tabelas protegidas e um bucket privado. Os testes de vínculos e limites financeiros passaram no banco remoto. A homologação completa com e-mails e arquivos reais ainda está pendente. O código não contém credenciais, contas de demonstração pré-instaladas nem o banco real do usuário.

Em 21/09/2026, os acessos aos painéis Vercel e Supabase foram concluídos. O projeto Vercel foi renomeado para `postito`; Next.js e Node.js 24 foram conferidos. Foram configurados `APP_URL`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_STORAGE_BUCKET`, restritos à branch de Preview. A conexão usa um papel de banco exclusivo e limitado. Em seguida foram salvos `RESEND_API_KEY`, com permissão exclusiva de envio, e `RESEND_FROM_EMAIL`, com o remetente de teste do Resend. O usuário ainda não possui domínio próprio; a entrega real precisa ser validada com seu destinatário antes de ser declarada funcional. A versão não foi promovida a produção.

## Etapas executadas

1. Preservação e inspeção do projeto e do banco originais.
2. Identificação dos problemas de execução, autorização e dados.
3. Migração da arquitetura para Next.js/PostgreSQL e contas por pessoa.
4. Implementação de agências, convites, permissões e atribuição em contexto.
5. Identidade Postito, interface e documentação de design.
6. Testes integrados, uso no navegador, correções e repetição da regressão.
7. Ensaio de migração e preparação de configuração para publicação.

## Funções entregues

- Cadastro com nome, e-mail, senha e profissão; confirmação por código; login; recuperação de senha; edição de perfil e saída.
- Conta que participa de várias agências; criação e troca de espaço; associação independente em cada agência.
- Convite por link ou e-mail, papel e escopo definidos no servidor, restrição opcional por e-mail, expiração e revogação.
- Proprietário, administrador, editor e leitor; profissão independente de permissão; desativação apenas na agência selecionada.
- Pesquisa de colaborador e atribuição diretamente no cartão da demanda dentro da pasta do cliente; edição de responsável também no detalhe da demanda.
- Equipe da pasta gerenciada separadamente da responsabilidade por demanda.
- Leitura restrita: quem recebeu apenas uma tarefa não passa a ver todas as tarefas do cliente.
- Pastas mensais e visão de todas as pastas, Kanban, arrastar, edição de título/prazo/orientações e pauta por fatias.
- Upload privado, anexos, versões de arquivo final e apontamentos de revisão.
- CRM com leads, oportunidades, atividades, conversão sem duplicação e dados dos clientes.
- Financeiro com previsões, lançamentos, duplicação, arquivamento, documentos e competências da equipe; valores em centavos e projeção mensal de doze meses.
- Busca de clientes/demandas, atualização automática periódica, mensagens de erro e uso no celular.
- Logo Postito, fontes locais, paleta própria, foco visível e respeito a movimento reduzido.

## Problemas encontrados e corrigidos

| Área | Problema da origem ou encontrado na regressão | Correção |
| --- | --- | --- |
| Isolamento | Clientes sem vínculo explícito à agência | Agência obrigatória e verificação dos IDs no servidor |
| Autorização | Administrador com acesso irrestrito a dados de outras agências | Administração limitada à associação ativa |
| Consultas | Condições de acesso podiam substituir condições anteriores | Predicados combinados e verificações específicas por recurso |
| Contas | Dados internos de autenticação podiam entrar no retorno de membros | DTO de conta sem hashes/tokens |
| Sessão | Segredo JWT padrão e validação insuficiente de conta inativa | Sessão opaca, hash no banco e estado revalidado |
| Convite | Conta em outra agência podia ser recusada ou ter dados alterados | Conta global e novas associações independentes |
| Permissões | Lista vazia podia herdar poderes padrão | Vazio significa nenhum acesso |
| Cadastro | Faltavam confirmação e recuperação completas | Fluxos de código e token com consumo único |
| E-mail de teste | Recusa do Resend por destinatário não autorizado aparecia apenas como falha genérica | Mensagem específica sobre a restrição, diagnóstico sem conteúdo privado e teste do formato real do erro do SDK |
| Provedor de e-mail | O remetente de teste do Resend não atendia outros destinatários sem domínio | Adaptador Brevo preparado, com validação de aceite, timeout e diagnóstico privado; ativação real depende da conta e do remetente |
| Confirmação | A abertura da tela podia sugerir envio mesmo em cadastro repetido | Estado de envio explícito, texto neutro e atalhos para solicitar código ou criar conta |
| Interface | Componentes/ícones ausentes e propriedades incompatíveis | Correção de referências e compilação verificada |
| Vercel | Functions falhavam antes de executar por `ERR_REQUIRE_ESM`, apesar do build READY | Remoção do formato global forçado, utilitários TypeScript compatíveis e nova verificação das APIs hospedadas |
| Banco hospedado | Validação TLS falhava por falta da CA do provedor | Inclusão da CA pública oficial, restrita aos hosts Supabase, com verificação de certificado e hostname preservada |
| Perfil | Controle sem edição funcional | Formulário com persistência de nome/profissão |
| Pastas | Filtro em pasta mensal vazia escondia demandas existentes | Abertura em todas as pastas e filtro explícito |
| Demanda | Criação podia manter a pasta de outro contexto | Contexto reinicializado e pasta escolhida respeitada |
| Atribuição | Responsável não podia ser trocado no cartão | Seletor com pesquisa, estado ocupado e confirmação persistida |
| Upload | Arquivos grandes passavam pelo servidor de aplicação | Autorização e envio direto para Storage em produção |
| Limite de upload | O limite inicial de arquivo final excedia o plano gratuito escolhido | Limite de 50 MB aplicado antes da autorização e verificado na API |
| Arquivos | Leitura e escrita não verificavam todos os vínculos | Acesso autenticado por agência e demanda |
| Avatar/banner | Troca de arquivo podia manter a imagem anterior na tela | URL de recurso versionada após atualização |
| CRM | Repetir conversão podia duplicar oportunidade | Transação, bloqueio de registro e unicidade |
| Financeiro | Pagamento parcial/reabertura podia deixar valores inconsistentes | Validações, limites em banco e normalização do estado |
| Competências | Repetir geração podia falhar ou duplicar | Geração idempotente por profissional/mês |
| Recorrência | Seleção mensal era apenas uma marcação | Geração explícita de projeções para doze meses |
| Valores | Entrada brasileira podia falhar com vírgula e separador de milhar | Conversão validada para centavos |
| Datas | Vencimento podia aparecer no dia anterior; horário local perdia o fuso | Tratamento de data civil e conversão de horário no navegador |
| Gráficos | Proporção visual do funil usava largura ilustrativa | Proporção calculada com os registros reais |
| Formulários | Alguns eventos não exibiam falhas e campos careciam de rótulos | Tratamento de erro e associação de rótulos |
| Celular | Controles da pasta podiam ultrapassar a largura da tela | Quebra responsiva e orientação adequada ao toque |

## Evidência e alcance

A regressão inclui 23 cenários completos de API e navegador, com múltiplas contas/agências e dados isolados. A suíte unitária cobre hash novo/legado, permissões vazias, dinheiro, recorrência em meses curtos e datas brasileiras. `evidence/results.json` registra o resultado final dos cenários; as capturas mostram o sistema em uso com dados fictícios.

Na ativação de 21/09, após adicionar a checagem de saúde do banco, foram repetidos 15 cenários de API (incluindo a nova checagem), seis testes unitários e o build de produção. Todos passaram. O novo teste unitário também verifica retorno 503 sem exposição de erro interno quando falta a conexão em produção. Essa rodada está em `evidence/results-integration-20260921.json`; a evidência anterior de navegador foi preservada. O resultado remoto mais recente fica no PR de acompanhamento.

A correção TLS acrescenta um sétimo teste unitário: valida a identidade e a validade da CA pública oficial, a verificação obrigatória do certificado e o escopo dos hosts aceitos.

A correção da mensagem de e-mail de teste acrescenta três testes, totalizando dez: reconhecimento da recusa real do Resend mesmo sem `statusCode`, manutenção da resposta genérica para outros erros e preservação de destinatário, remetente e idempotência no envio aceito. Os dez testes unitários e os quinze cenários locais de API passaram. A nova evidência de integração está em `evidence/results-mail-integration-20260921.json`. A evidência histórica dos 23 cenários foi preservada; a suíte autônoma de navegador não foi repetida nesta rodada. A verificação hospedada usa o navegador autorizado e continua dependente da confirmação da conta pelo usuário.

A preparação da Brevo elevou a suíte para 19 testes unitários aprovados. Ela cobre o contrato de envio com respostas simuladas, falhas HTTP, resposta sem aceite, indisponibilidade de rede, privacidade dos logs e configuração por provedor. Os 16 cenários locais de API passaram; o novo cenário confirma que repetir cadastro não anuncia envio nem troca a senha, e que solicitar outro código permite concluir a confirmação. O cenário foi ajustado para criar a agência de teste antes de consultar a área de trabalho, que exige agência ativa. TypeScript, lint dos arquivos alterados (zero erros; um aviso preexistente de variável não usada) e build de produção passaram. Consulte `evidence/results-brevo-integration-20260921.json` e `evidence/brevo-adapter-20260921.json`. A entrega real pela Brevo segue pendente de conexão da conta e verificação do remetente.

Também foram executados TypeScript, lint e build de produção. O lint não reportou erros; restam avisos de manutenção, sobretudo imports não usados e recomendações de otimização de imagens. O build emite um aviso de rastreamento do adaptador local de arquivos; a lista de arquivos rastreados foi inspecionada e não incluía o diretório de dados locais. A publicação deve conferir o tamanho final das Functions.

Isso é uma auditoria com escopo e evidências, não uma garantia de inexistência de qualquer bug possível. Não foram realizados teste de carga, auditoria independente de segurança, homologação Safari/Firefox ou homologação completa da aplicação em produção. A execução no navegador usou Chromium e dimensões de desktop e celular. As verificações SQL no Supabase estão registradas em `docs/INFRAESTRUTURA.md`.

## O que falta para operação real

1. Finalizar as demais funções do sistema e suas correções, preservando o acesso ADM temporário e a remoção da troca de senha pelo perfil.
2. Concluir a ativação Brevo retomada em 24/09 e homologar cadastro, confirmação, recuperação de senha e envio de e-mails, conforme `docs/EMAIL.md`; preparar domínio autenticado para o envio definitivo.
3. Homologar esses fluxos, convites, upload direto grande, persistência e isolamento com os serviços reais.
4. Configurar o ambiente de produção, sua URL definitiva e credenciais próprias antes da promoção.
5. Promover somente a versão homologada.
6. Revisar o plano de migração dos administradores/gerentes legados antes de importar dados reais.

O link de pasta Google Drive foi mantido. Cópia automática de objetos para o Google Drive depende de uma integração própria e não está ativa. Arquivos finais possuem versões; desde 23/09/2026 a pauta rejeita versões desatualizadas e preserva o rascunho. Limpeza de objetos órfãos e paginação para bases grandes estão no roteiro posterior.

Assinaturas, preços, checkout e liberação de módulos por pagamento não foram implementados nesta etapa. A proposta de discussão está em `docs/PROXIMAS-ETAPAS.md`.
