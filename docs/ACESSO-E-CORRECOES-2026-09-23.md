# Acesso administrativo e continuidade

## Decisão posterior e estado atual

O titular solicitou remover a troca de senha pelo perfil sem e-mail. A interface e a operação de servidor desse fluxo foram removidas. O acesso ADM já provisionado, suas credenciais e seus dados foram preservados. Cadastro, confirmação, recuperação de senha e envio de e-mails serão retomados após finalizar o restante do sistema.

A remoção foi validada por **34 cenários de API/navegador e 19 testes unitários aprovados**, com build de produção e TypeScript também aprovados. A antiga operação retorna HTTP 400 sem mudar senha ou sessão; o perfil não exibe a opção e mantém a edição de nome e profissão.

As alterações e os 35 cenários descritos nas seções históricas abaixo pertencem à versão anterior, que ainda oferecia a troca de senha no perfil. Essa contagem histórica foi substituída, para o estado atual, pela regressão descrita acima.

## Pedido atendido

Priorizar acesso ao Postito sem depender da configuração do provedor de e-mail; manter o andamento das correções. O titular autorizou uma conta específica. Ela foi criada manualmente no banco existente, com hash scrypt e associação de proprietário a uma agência vazia. O provisionamento não faz parte do deploy nem é executado automaticamente. Dados de acesso não constam deste documento ou do repositório.

A confirmação foi uma ativação administrativa individual, não uma entrega de código. Cadastros públicos continuam pendentes até confirmar o e-mail. O envio real foi adiado por decisão do titular, sem reativar credenciais de diagnóstico ou mudar provedores.

## Alterações da rodada anterior

1. Troca de senha no perfil, independente do e-mail: foi implementada e testada com senha atual, confirmação, invalidação de desafios e sessões e retorno ao login. Foi removida pela decisão posterior do titular e não integra o estado atual do produto.
2. Lista de documentos financeiros: cada comprovante de lançamento e nota fiscal de competência tem seu próprio link autorizado. Antes, o lançamento abria somente o primeiro arquivo e a competência apenas informava a contagem.
3. Responsáveis elegíveis: nova demanda usa a mesma regra dos demais seletores, limitando opções a pessoas ativas com acesso a clientes e execução de demandas.
4. Filtros financeiros identificados para navegação acessível e testes.

## Verificação histórica da rodada anterior

| Verificação | Resultado |
| --- | --- |
| API e navegador Chromium, desktop/celular | 35 cenários aprovados |
| Testes unitários | 19 aprovados |
| TypeScript | Aprovado |
| Build de produção | Aprovado; aviso preexistente no rastreamento de arquivos locais |
| ESLint | Zero erros; 42 avisos de manutenção |
| Banco hospedado | Conta e vínculo ativos, hash conferido, agência sem clientes |
| Envio real de e-mail | Adiado; nenhum envio nesta rodada |
| Primeiro login da conta provisionada na Vercel | A conferir pelo titular; não substituído por teste local |

Os cenários dessa rodada verificaram senha atual incorreta, nova senha curta, confirmação divergente, senha igual à atual, revogação das sessões existentes, rejeição da senha antiga, login com a nova, agência preservada e nenhum novo arquivo de e-mail. No navegador, verificaram múltiplos comprovantes, leitura autorizada das notas e exclusão de colaboradores inativos/sem acesso nas opções. A primeira execução identificou um seletor de teste ambíguo; recebeu nome acessível específico antes da repetição completa aprovada.

Evidências registradas naquela rodada: `evidence/results.json`, `evidence/documentos-financeiros.png` e `evidence/notas-fiscais.png`. O arquivo de resultados é atualizado pelas novas execuções e deve ser lido conforme a versão registrada. Dados de teste são fictícios.

## Pendências preservadas

Finalizar o restante do sistema antes de retomar cadastro, confirmação, recuperação de senha, entrega real de mensagens e domínio/remetente definitivo. Permanecem pendentes a homologação completa dos serviços hospedados e a promoção a produção. Planos, valores e checkout continuam para discussão posterior. A revisão anterior identificou como hipótese de teste futuro uma corrida preexistente entre login já em andamento e revogação de sessões; não foi reproduzida naquela rodada e não constitui verificação de segurança independente.
