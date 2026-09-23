# Acesso administrativo e continuidade

## Pedido atendido

Priorizar acesso ao Postito sem depender da configuração do provedor de e-mail; manter o andamento das correções. O titular autorizou uma conta específica. Ela foi criada manualmente no banco existente, com hash scrypt e associação de proprietário a uma agência vazia. O provisionamento não faz parte do deploy nem é executado automaticamente. Dados de acesso não constam deste documento ou do repositório.

A confirmação foi uma ativação administrativa individual, não uma entrega de código. Cadastros públicos continuam pendentes até confirmar o e-mail. O envio real foi adiado por decisão do titular, sem reativar credenciais de diagnóstico ou mudar provedores.

## Alterações

1. Troca de senha no perfil, independente do e-mail: exige sessão e senha atual, nova senha de dez a 128 caracteres e confirmação. Compara o hash anterior na atualização, invalida desafios e sessões em transação, limpa o cookie e retorna ao login.
2. Lista de documentos financeiros: cada comprovante de lançamento e nota fiscal de competência tem seu próprio link autorizado. Antes, o lançamento abria somente o primeiro arquivo e a competência apenas informava a contagem.
3. Responsáveis elegíveis: nova demanda usa a mesma regra dos demais seletores, limitando opções a pessoas ativas com acesso a clientes e execução de demandas.
4. Filtros financeiros identificados para navegação acessível e testes.

## Verificação

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

Os cenários novos verificam senha atual incorreta, nova senha curta, confirmação divergente, senha igual à atual, revogação das sessões existentes, rejeição da senha antiga, login com a nova, agência preservada e nenhum novo arquivo de e-mail. No navegador, verificam múltiplos comprovantes, leitura autorizada das notas e exclusão de colaboradores inativos/sem acesso nas opções. A primeira execução identificou um seletor de teste ambíguo; recebeu nome acessível específico antes da repetição completa aprovada.

Evidências: `evidence/results.json`, `evidence/documentos-financeiros.png` e `evidence/notas-fiscais.png`. Dados de teste são fictícios.

## Pendências preservadas

Homologação completa dos serviços hospedados, entrega real de mensagens, domínio/remetente definitivo e promoção a produção. Planos, valores e checkout continuam para discussão posterior. A revisão identificou como hipótese de teste futuro uma corrida preexistente entre login já em andamento e revogação de sessões; não foi reproduzida nesta rodada e não constitui verificação de segurança independente.
