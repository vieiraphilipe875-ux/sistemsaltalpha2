# Postito — entrega e verificação

Atualizado em 21 de setembro de 2026 · versão 0.2.0

## Resultado

O sistema original foi transformado em uma aplicação Next.js com PostgreSQL, autenticação, agências independentes e a identidade Postito. Foram preservados os fluxos de clientes, pastas, pautas por fatias, revisão visual, CRM e financeiro, com correções de acesso, dados e interface.

A versão foi executada e testada localmente e publicada como Preview na Vercel. O código está na branch `postito/release-0.2.0`, com [PR de acompanhamento](https://github.com/vieiraphilipe875-ux/sistemsaltalpha2/pull/1). Após a confirmação do usuário, o projeto Supabase Postito foi criado em São Paulo, com as três migrações aplicadas, 25 tabelas protegidas e um bucket privado. Os testes de vínculos e limites financeiros passaram no banco remoto. A homologação completa com e-mails e arquivos reais ainda está pendente. O código não contém credenciais, contas de demonstração pré-instaladas nem o banco real do usuário.

Em 21/09/2026, os acessos aos painéis Vercel e Supabase foram concluídos. O projeto Vercel foi renomeado para `postito`; Next.js e Node.js 24 foram conferidos. Foram configurados `APP_URL`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_STORAGE_BUCKET`, restritos à branch de Preview. A conexão usa um papel de banco exclusivo e limitado. O Resend está conectado, mas ainda precisa de domínio remetente e chave de envio. A versão não foi promovida a produção.

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
| Interface | Componentes/ícones ausentes e propriedades incompatíveis | Correção de referências e compilação verificada |
| Vercel | Functions falhavam antes de executar por `ERR_REQUIRE_ESM`, apesar do build READY | Remoção do formato global forçado, utilitários TypeScript compatíveis e nova verificação das APIs hospedadas |
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

Também foram executados TypeScript, lint e build de produção. O lint não reportou erros; restam avisos de manutenção, sobretudo imports não usados e recomendações de otimização de imagens. O build emite um aviso de rastreamento do adaptador local de arquivos; a lista de arquivos rastreados foi inspecionada e não incluía o diretório de dados locais. A publicação deve conferir o tamanho final das Functions.

Isso é uma auditoria com escopo e evidências, não uma garantia de inexistência de qualquer bug possível. Não foram realizados teste de carga, auditoria independente de segurança, homologação Safari/Firefox ou homologação completa da aplicação em produção. A execução no navegador usou Chromium e dimensões de desktop e celular. As verificações SQL no Supabase estão registradas em `docs/INFRAESTRUTURA.md`.

## O que falta para operação real

1. Cadastrar e verificar o domínio remetente no Resend e configurar a chave de envio e o endereço remetente.
2. Homologar cadastro, confirmação, recuperação, convites, upload direto grande, persistência e isolamento com os serviços reais.
3. Configurar o ambiente de produção, sua URL definitiva e credenciais próprias antes da promoção.
4. Promover somente a versão homologada.
5. Revisar o plano de migração dos administradores/gerentes legados antes de importar dados reais.

O link de pasta Google Drive foi mantido. Cópia automática de objetos para o Google Drive depende de uma integração própria e não está ativa. Arquivos finais possuem versões; edição simultânea da pauta ainda pode prevalecer pela última gravação. Limpeza de objetos órfãos e paginação para bases grandes estão no roteiro posterior.

Assinaturas, preços, checkout e liberação de módulos por pagamento não foram implementados nesta etapa. A proposta de discussão está em `docs/PROXIMAS-ETAPAS.md`.
