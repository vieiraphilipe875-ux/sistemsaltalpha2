# Postito — infraestrutura provisionada

Atualizado em 21/09/2026. O Preview está publicado; a ativação completa ainda depende do remetente de e-mails e da homologação dos serviços reais.

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
| Variáveis de ambiente | Cinco configuradas exclusivamente para a branch de Preview |
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
| `RESEND_API_KEY` | Pendente |
| `RESEND_FROM_EMAIL` | Pendente |

Todos os valores cadastrados estão restritos a Preview da branch `postito/release-0.2.0`. O nome legado `SUPABASE_SERVICE_ROLE_KEY` armazena uma chave moderna `sb_secret_…`, aceita pelo SDK fixado no projeto; ela não vai para o navegador.

O primeiro Preview foi publicado pelo GitHub a partir de `0ba70486d9a525662d820c3706bef13ee41e5138`. Após configurar as cinco variáveis, a [republicação](https://vercel.com/vieiraphilipe875-7609s-projects/postito/61u2cQ5yprQDkAZZGF32CLfd1qSN) também terminou em READY. O [PR](https://github.com/vieiraphilipe875-ux/sistemsaltalpha2/pull/1) acompanha a validação da checagem de saúde adicionada em seguida.

## Pendências para publicar

1. Informar o domínio remetente, cadastrá-lo e verificar o DNS no Resend; a consulta atual não retornou domínios cadastrados.
2. Criar e salvar a chave de envio e o endereço remetente e republicar o Preview.
3. Homologar cadastro, confirmação, recuperação, convites, múltiplas agências e arquivos privados com contas controladas.
4. Configurar produção, URL definitiva e credenciais próprias, e promover a versão homologada.
5. Revisar o plano de importação do sistema antigo antes de levar dados operacionais para o banco de produção.

Não houve envio real de e-mails, upload de objetos ou importação de dados operacionais nesta ativação. Os testes locais de aplicação são separados das verificações remotas descritas acima.
