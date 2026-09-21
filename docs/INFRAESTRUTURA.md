# Postito — infraestrutura provisionada

Atualizado em 21/09/2026. O Preview está publicado. O remetente de teste do Resend foi configurado; a ativação completa depende da homologação dos serviços reais e de um domínio verificado para atender outros destinatários.

## Recursos criados

| Recurso | Configuração |
| --- | --- |
| Projeto | Postito |
| Referência Supabase | `olfkjpfluqifslrhppsu` |
| Organização | `kybspwlnaoueaxtgwykg` |
| Região | São Paulo, `sa-east-1` |
| Custo inicial informado e aprovado | US$ 0/mês |
| URL da API | `https://olfkjpfluqifslrhppsu.supabase.co` |
| Banco | PostgreSQL 17.6, schema privado `postito` |
| Migrações de aplicação | `0000_pink_the_twelve`, `0001_safe_dracula`, `0002_private_boundaries` |
| Migrações registradas no Supabase | `postito_initial_schema`, `postito_runtime_database_access` |
| Papel de execução | `postito_runtime`, exclusivo do servidor |
| Storage | Bucket `postito-private`, privado, limite `52428800` bytes |

[Abrir projeto no Supabase](https://supabase.com/dashboard/project/olfkjpfluqifslrhppsu).

O plano gratuito limita o tamanho por arquivo a 50 MB. A API da aplicação e o bucket foram alinhados a esse limite. Não foi contratado upgrade. [Limites oficiais do Storage](https://supabase.com/docs/guides/storage/uploads/file-limits).

## Verificação remota

- 25 tabelas no schema `postito`, todas com RLS ativada.
- `anon` e `authenticated` sem acesso ao schema nem às tabelas.
- Três registros em `drizzle.__drizzle_migrations`, com hashes SHA-256 e datas idênticos aos arquivos da entrega. Isso preserva a continuidade do comando de migração do projeto.
- 74 constraints presentes no schema.
- Inserção e consulta de uma cadeia temporária de pessoa, agência, cliente, pasta e demanda aprovadas.
- E-mail duplicado, responsável inexistente, mais de 30 fatias, valor financeiro negativo e pagamento superior ao total foram recusados pelo banco.
- Os registros de teste foram executados em transação com rollback. Contagens finais de contas, agências, clientes, demandas e lançamentos: zero.
- O bucket foi consultado após a criação: `public=false` e limite de 50 MB.

Após provisionar `postito_runtime`, as 25 tabelas têm políticas limitadas a esse papel de backend. Os grants de leitura, inserção, atualização e exclusão foram conferidos nas 25 tabelas. O papel não é proprietário e não possui poderes administrativos, criação de schema/tabelas, associação a outros papéis, `BYPASSRLS` ou leitura dos dados de `auth` e `storage`. `anon`, `authenticated` e `authenticator` continuam sem acesso ao schema. A autorização por usuário/agência permanece na aplicação.

O verificador de segurança retornou zero erros e zero alertas; resta um aviso informativo de RLS sem política no histórico privado `drizzle.__drizzle_migrations`, que não é usado pelo runtime. [Explicação do verificador](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

O teste de impersonação por `SET ROLE` foi recusado pelo contexto do conector; ele não é registrado como teste de CRUD aprovado. Não foram concedidas permissões adicionais apenas para contornar essa limitação. A checagem `/api/health` verifica conexão e permissão de leitura pela credencial real de execução, sem devolver registros. Ela não certifica escrita, e-mail, arquivos ou autorização dos fluxos completos.

## Vercel: acesso confirmado

O login pelo navegador foi concluído em 21/09/2026. O acesso à conta, à equipe e às configurações do projeto foi confirmado. O projeto existente `sistemsaltalpha2` foi renomeado para `postito`.

| Item | Estado verificado |
| --- | --- |
| Equipe | `vieiraphilipe875-7609s-projects` |
| Projeto | `postito` |
| ID do projeto | `prj_9q20IOViIjPpMcuEQkvRTP9z0ePW` |
| Plano | Hobby, sem upgrade contratado |
| Framework | Next.js |
| Node.js | 24.x |
| Diretório raiz | Raiz do repositório |
| Variáveis de ambiente | Sete configuradas exclusivamente para a branch de Preview |
| Repositório vinculado | `vieiraphilipe875-ux/sistemsaltalpha2`, branch `postito/release-0.2.0` |
| Publicação | Preview READY; produção ainda não promovida |

[Abrir configurações do Postito na Vercel](https://vercel.com/vieiraphilipe875-7609s-projects/postito/settings/general).

O acesso pelo painel está funcional. Separadamente, a integração de automação Vercel ainda recusou acesso à equipe (403), e o terminal encontrou uma restrição de rede para a API. Essas limitações não significam que o login no painel continua pendente.

O login no painel Supabase foi concluído. A credencial privada do Storage e a conexão PostgreSQL foram salvas como Secret na Vercel, sem inclusão no código. A conexão usa o pooler transacional compartilhado da região São Paulo, porta 6543, usuário `postito_runtime.olfkjpfluqifslrhppsu`, com `sslmode=verify-full` e `prepare:false`. A senha administrativa do banco não foi alterada. [Conexões oficiais do Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [papéis de acesso](https://supabase.com/docs/guides/database/postgres/roles).

| Variável | Escopo e estado |
| --- | --- |
| `APP_URL` | Config, URL estável do Preview |
| `DATABASE_URL` | Secret, papel limitado do backend |
| `SUPABASE_URL` | Config, projeto Postito |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret, chave privada moderna de Storage |
| `SUPABASE_STORAGE_BUCKET` | Config, `postito-private` |
| `RESEND_API_KEY` | Secret, chave exclusiva do Preview com permissão `sending_access` |
| `RESEND_FROM_EMAIL` | Config, `Postito <onboarding@resend.dev>` para testes |

Todos os valores cadastrados estão restritos a Preview da branch `postito/release-0.2.0`. O nome legado `SUPABASE_SERVICE_ROLE_KEY` armazena uma chave moderna `sb_secret_…`, aceita pelo SDK fixado no projeto; ela não vai para o navegador.

O primeiro Preview foi publicado pelo GitHub a partir de `0ba70486d9a525662d820c3706bef13ee41e5138`. Após configurar as cinco variáveis, a [republicação](https://vercel.com/vieiraphilipe875-7609s-projects/postito/61u2cQ5yprQDkAZZGF32CLfd1qSN) também terminou em READY. O [PR](https://github.com/vieiraphilipe875-ux/sistemsaltalpha2/pull/1) acompanha a validação da checagem de saúde adicionada em seguida.

## Conexão de execução verificada

O teste hospedado revelou dois problemas que não apareciam no build: `ERR_REQUIRE_ESM` ao carregar as Functions e `SELF_SIGNED_CERT_IN_CHAIN` na conexão PostgreSQL. Foram corrigidos o formato global de módulos e a confiança na CA pública oficial do Supabase, mantendo a validação TLS.

No commit `9147481ec791fd4cdf9c58a7ad78f5317bb87bb8`, a [implantação de teste](https://vercel.com/vieiraphilipe875-7609s-projects/postito/4P6HjKq2Juc5KFmBRPUDpgyD5RzL) terminou com sucesso. Em 21/09/2026 às 03:18:00 UTC, o log Vercel confirmou `GET /api/health` com HTTP 200. Uma consulta independente a `pg_stat_activity` confirmou uma conexão de `postito_runtime`. Esse resultado verifica carregamento da Function, autenticação do banco, TLS e permissão de leitura da tabela privada, sem ler registros de contas. A resposta JSON não pôde ser exibida pelo navegador usado na inspeção; a comprovação veio dos registros do servidor e do banco.

Persistem pendentes escrita por fluxos autenticados, entrega real de e-mail, upload real e homologação completa online. A suíte local de API e navegador é evidência separada. A verificação desta ativação está em `evidence/activation-20260921.json`.

## E-mail sem domínio próprio

O usuário informou que ainda não possui domínio. O sistema pode continuar no endereço gerado pela Vercel. A conexão do Resend respondeu às consultas de domínios e chaves; havia duas chaves anteriores, que foram preservadas. Foi criada uma chave separada, `Postito Preview 2026-09-21`, limitada ao envio, e salva como Secret na branch de Preview. O valor não consta no repositório.

O remetente `onboarding@resend.dev` permite testes para o endereço associado à conta Resend; não libera cadastro por e-mail para toda a equipe. O usuário indicou um destinatário próprio para a validação, mas a correspondência com a conta Resend e a entrega real ainda precisam ser confirmadas pelo fluxo. Não se deve presumir sucesso apenas porque as variáveis foram salvas. [Restrição oficial do Resend](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain), [endereços gerados pela Vercel](https://vercel.com/docs/deployments/generated-urls).

A [publicação com essas duas variáveis](https://vercel.com/vieiraphilipe875-7609s-projects/postito/DXK2BtTp7eA2nz3o7FF5pKzwjgza), do commit `ce7016f5355e67861de03a4afbd22efde041f78b`, concluiu com sucesso. O cadastro normal foi aberto e recebeu os dados pelo formulário seguro, mas a aplicação retornou “Revise os campos informados.”. A consulta ao Resend não retornou e-mails enviados. Isso não comprova entrega nem confirmação de conta e não permite determinar qual campo foi recusado. Nenhum valor de senha ou código foi lido. A compra de domínio não foi realizada.

A próxima etapa é a revisão do cadastro pelo usuário na tela já aberta. Não desativar a confirmação de e-mail nem inserir contas ativas diretamente no banco para evitar essa etapa. A senha e o código devem ser informados pelo usuário no formulário seguro.

Na tentativa seguinte, o cadastro chegou ao envio e a Function retornou 502. O log do Resend de 21/09 às 06:48:16 UTC confirmou `POST /emails` com 403 e `validation_error`: o destinatário informado no cadastro era diferente do endereço associado à conta Resend. Isso confirma a causa da recusa e que a conexão com o provedor respondeu; não comprova entrega. A conferência dos logs extraiu apenas os endereços e a resposta de erro, sem exibir corpo do e-mail, código ou credenciais.

O tratamento em `lib/mail.ts` passou a explicar a restrição do remetente de teste, sem revelar o endereço privado da conta na tela pública. O diagnóstico do servidor registra apenas provedor, categoria e status disponível. O SDK pode devolver o erro sem `statusCode`; a identificação usa a categoria e a mensagem oficial, com teste específico para esse formato. As demais falhas mantêm a mensagem genérica. A restrição do provedor continua respeitada: o próximo cadastro de teste deve usar o endereço permitido, indicado ao usuário na conversa.

## Pendências para publicar

1. Concluir o cadastro no Preview publicado e validar o remetente de teste com o destinatário indicado pelo usuário.
2. Para liberar envio aos demais usuários, cadastrar e verificar um domínio próprio no Resend e substituir o remetente de teste.
3. Homologar cadastro, confirmação, recuperação, convites, múltiplas agências e arquivos privados com contas controladas.
4. Configurar produção, URL definitiva e credenciais próprias, e promover a versão homologada.
5. Revisar o plano de importação do sistema antigo antes de levar dados operacionais para o banco de produção.

Não houve envio real de e-mails, upload de objetos ou importação de dados operacionais nesta ativação. Os testes locais de aplicação são separados das verificações remotas descritas acima.
