# Arquitetura e regras de acesso

## Componentes

Next.js 16 e React 19 na aplicação; Drizzle para acesso a PostgreSQL; PGlite somente para desenvolvimento e testes; `postgres` para a conexão de produção. Supabase é o destino proposto para PostgreSQL e arquivos privados. Resend envia confirmação, recuperação e convites. A autenticação desta versão é própria, implementada no servidor; ela **não usa Supabase Auth**.

O banco fica no schema `postito`, fora da API pública de dados. A migração ativa RLS nas tabelas e revoga acesso público, `anon` e `authenticated`. Na Vercel, a conexão usa `postito_runtime`, um papel exclusivo do backend com leitura e escrita nas tabelas da aplicação. Ele não é proprietário, não pode criar tabelas/papéis e não possui `BYPASSRLS` nem acesso aos dados de `auth`/`storage`.

As políticas `postito_backend_access` se aplicam apenas a esse papel de servidor. Elas permitem as operações do backend; o isolamento entre pessoas e agências continua sendo autorizado pela aplicação em cada operação. Não são políticas de isolamento por usuário do Supabase Auth. Não conceder esse papel a `anon`, `authenticated` ou `authenticator`, nem expor o schema na Data API. O provisionamento está em `scripts/provision-runtime-role.sql`; tabelas futuras precisam de grants e políticas explícitos. A conexão de migração deve usar uma credencial administrativa separada da conexão de execução.

## Conta, agência e cliente

`members` representa a pessoa. `agencies` representa o espaço. `agency_memberships` associa a pessoa a cada agência, com papel, permissões e escopo próprios. A profissão pertence à conta e não concede poderes administrativos.

| Papel | Acesso padrão |
| --- | --- |
| Proprietário | Administração integral da própria agência |
| Administrador | Administração da agência; sem transferir propriedade nem conceder administração a outra pessoa |
| Editor | Clientes e produção conforme permissões e escopo configurados |
| Leitor | Leitura dos clientes e demandas permitidos; sem alterações |

O proprietário é representado internamente por `role=manager`, por compatibilidade com a origem. Campos de financeiro/CRM chamados `agencyOwnerId` agora apontam para **a agência**, e não para o usuário proprietário.

Um cliente tem uma agência explícita. Pastas pertencem ao cliente e demandas pertencem à pasta. Uma atribuição direta permite ver a demanda e identificar sua pasta/cliente. Ela não abre as outras demandas do cliente. `client_members` representa a concessão explícita da pasta; com ela, a pessoa vê as demandas daquele cliente, conforme as permissões que possui.

Trocar agência altera a agência ativa da sessão. Desativar uma associação impede acesso a esse espaço e mantém o acesso às outras agências. Não existe administrador global com acesso automático aos dados de todos.

## Autenticação

- Senha nova protegida por scrypt com salt individual. Hashes PBKDF2/SHA-256 legados são aceitos na importação e atualizados no login.
- Conta pendente não autentica com senha antes da confirmação do e-mail.
- Código aleatório de seis dígitos: validade de 15 minutos, cinco tentativas por desafio e limites adicionais por conta.
- Recuperação usa token aleatório de 256 bits, expiração de 30 minutos e consumo único.
- Redefinição de senha encerra todas as sessões da conta.
- Sessão opaca guardada em cookie HttpOnly, SameSite=Lax, Secure em produção. No banco é guardado somente o hash do token, com validade de sete dias.
- Código e token de recuperação são armazenados como hashes; não constam no payload da área de trabalho.
- Limites persistidos em banco reduzem abuso de login, cadastro, convites e envio de e-mails. Na Vercel há também limite de envio por IP informado pela plataforma.

Convites expiram em sete dias, aceitam uma pessoa e podem ser revogados. Um convite com e-mail exige a conta correspondente. A permissão fica no registro do convite, não em parâmetros editáveis do link. A aceitação verifica se quem convidou continua autorizado.

## Arquivos

O navegador solicita autorização de envio, recebe URL assinada e envia diretamente para Supabase Storage. A conclusão confirma proprietário, agência, finalidade, tamanho e MIME antes de vincular o arquivo. Isso evita colocar arquivos grandes no corpo de uma Function da Vercel, cujo limite documentado é 4,5 MB. [Limites da Vercel](https://vercel.com/docs/functions/limitations).

O bucket é privado. A leitura exige autorização no servidor; a resposta remota entrega um link assinado de curta duração. Um link assinado já emitido permanece utilizável até expirar. As pastas locais de arquivos e e-mails são apenas para desenvolvimento e ficam bloqueadas quando `NODE_ENV=production` ou `VERCEL` está definido.

Limites desta versão: arquivo final e outros anexos até 50 MB; avatar/banner até 10 MB. O limite foi alinhado ao plano gratuito do Supabase e é validado antes de autorizar o envio. A checagem de tamanho/MIME não é antivírus nem inspeção profunda do conteúdo.

## Consistência e atualização

Operações compostas usam transação. Conversão de lead e criação de competência protegem contra duplicatas; as migrações adicionam unicidade e limites financeiros. Valores monetários usam centavos inteiros. Recorrência manual cria uma projeção de doze meses, sem efetuar cobrança. Campos de mês e vencimento respeitam meses curtos.

A interface confirma alterações após a resposta do servidor, atualiza a área de trabalho a cada 15 segundos enquanto a aba está visível e ao recuperar foco. A pauta usa controle de concorrência: o navegador envia os IDs das fatias da versão que abriu; dentro da transação, o servidor bloqueia a demanda, confere essa revisão e rejeita versões antigas com HTTP 409 antes de escrever. Cada gravação gera novos IDs de fatia. O rascunho permanece no navegador; carregar a versão atual exige confirmar seu descarte. Fechar a pauta ou sair da página com alterações também gera aviso. Isso evita sobrescrita silenciosa; não implementa coedição em tempo real nem histórico recuperável de textos. Arquivos finais já possuem versões.

Criar uma pasta exige `demands.create` e acesso explícito ao cliente, sem exigir `clients.manage`. Uma atribuição isolada continua insuficiente. `updateClientCrm` aceita alterações parciais; somente payloads que incluem mensalidade ou dia do vencimento exigem `finance.access` e atualizam previsões. Alterar contato ou status preserva valores, datas e lançamentos ocultos ao perfil comercial.
