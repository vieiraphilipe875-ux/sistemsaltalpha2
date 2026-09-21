# Postito — infraestrutura provisionada

Atualizado em 21/09/2026. Esta configuração complementa a entrega local e não equivale à publicação da aplicação.

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
| Migração registrada no Supabase | `postito_initial_schema` |
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

O verificador de segurança retornou apenas avisos informativos de RLS sem políticas, referentes às tabelas privadas da aplicação e ao histórico de migrações. Esse bloqueio é intencional: a aplicação usa autenticação própria e acesso pelo servidor proprietário das tabelas, com autorização por agência em cada operação. Não adicionar políticas públicas para ocultar esse aviso. [Explicação do verificador](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

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
| Variáveis de ambiente | Nenhuma cadastrada |
| Repositório vinculado | `vieiraphilipe875-ux/sistemsaltalpha2`, ainda com o código original |
| Publicação | A tentativa antiga falhou; nenhuma versão desta entrega foi enviada ou publicada |

[Abrir configurações do Postito na Vercel](https://vercel.com/vieiraphilipe875-7609s-projects/postito/settings/general).

O acesso pelo painel está funcional. Separadamente, a integração de automação Vercel ainda recusou acesso à equipe (403), e o terminal encontrou uma restrição de rede para a API. Essas limitações não significam que o login no painel continua pendente.

Para obter as credenciais do projeto Supabase, foi iniciado o login no painel pelo método GitHub escolhido pelo usuário. O GitHub informou que a conta não aceita login por senha. Essa autenticação precisa ser concluída por um método compatível da conta. Nenhuma credencial de servidor foi obtida ou inserida na Vercel.

## Pendências para publicar

1. Concluir o acesso ao painel Supabase para configurar as credenciais do projeto existente.
2. Configurar `DATABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` como segredos de servidor no ambiente de destino. As integrações usadas no provisionamento não forneceram essas credenciais à aplicação.
3. Informar o domínio remetente, cadastrá-lo e verificar o DNS no Resend; não havia domínios cadastrados.
4. Enviar o código desta entrega ao projeto Vercel, configurar as demais variáveis de `docs/DEPLOY.md`, publicar um Preview e homologar os fluxos usando os serviços reais.
5. Revisar o plano de importação do sistema antigo antes de levar dados operacionais para este banco.

Não houve envio real de e-mails, upload de objetos ao bucket ou publicação na Vercel nesta ativação. Os testes locais de aplicação são separados das verificações remotas descritas acima.
