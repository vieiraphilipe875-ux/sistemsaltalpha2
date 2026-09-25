# Publicação na Vercel

## Estado desta entrega

O projeto Supabase **Postito** foi criado em 20/09/2026, em São Paulo (`sa-east-1`), após confirmação do custo inicial informado de US$ 0/mês. As três migrações foram aplicadas, com 25 tabelas privadas e histórico Drizzle sincronizado. O bucket privado `postito-private` também foi criado, com limite de 50 MB. Os vínculos, limites financeiros e bloqueios de acesso público foram verificados no banco remoto. Consulte `docs/INFRAESTRUTURA.md`.

A aplicação está publicada em [Preview](https://postito-git-postito-release-020-vieiraphilipe875-7609s-projects.vercel.app), com o código na branch `postito/release-0.2.0`. Os painéis Vercel e Supabase estão acessíveis. As sete variáveis de URL, banco, Storage e Resend foram salvas somente para essa branch. O Resend usa seu remetente de teste, restrito ao endereço da conta. A integração alternativa com Brevo foi preparada a pedido do usuário; sua ativação depende da conta e do remetente verificados. Consulte `docs/EMAIL.md`. Não há credenciais no código e a versão não foi promovida a produção.

## Ordem de ativação

A criação do projeto, as migrações, o bucket e as credenciais de Preview já foram configurados para o projeto registrado em `docs/INFRAESTRUTURA.md`. Não criar um segundo projeto para repetir essa ativação. O histórico de migrações contém os hashes e datas exatos dos arquivos atuais; `npm run db:migrate` deve aplicar somente migrações posteriores. Execute migrações com uma conexão administrativa autorizada: `postito_runtime` não possui permissão de DDL.

1. Selecionar a organização Supabase, consultar o custo/plano e confirmar o projeto. Para a operação no Brasil, escolher uma região próxima à hospedagem.
2. Criar o projeto e obter uma conexão PostgreSQL de servidor. Usar pooler transacional com `prepare:false`, já configurado no código. Aplicar as migrações com uma conexão autorizada a criar schema/tabelas.
3. Criar o bucket privado `postito-private`. Não criar política de leitura pública. O plano gratuito adotado limita cada arquivo a 50 MB, e a aplicação foi ajustada para rejeitar tamanhos maiores antes de emitir autorização de envio.
4. Configurar um provedor de e-mail: Brevo para o teste sem domínio, com conta/remetente verificados, ou Resend com domínio autenticado. Seguir `docs/EMAIL.md`; definir o remetente e a chave privada de API correspondentes.
5. Enviar o código desta entrega ao projeto Vercel `postito`, cujo acesso pelo painel já foi confirmado, e configurar as variáveis abaixo. O build usa Next.js nativo; não depende de Cloudflare, D1, R2 ou vinext.
6. Aplicar as migrações em uma base de homologação, publicar Preview e executar os testes com duas agências e usuários controlados.
7. Validar entrega real de e-mail, código, recuperação, convite, troca de agência e arquivos privados. Conferir também um arquivo maior que 4,5 MB enviado diretamente ao bucket.
8. Revisar a proposta de importação dos dados originais, aplicar em uma base nova e conferir contagens e associações.
9. Promover a versão homologada para Production e definir a URL definitiva em `APP_URL`. E-mails antigos apontam para a URL que existia no momento do envio.

## Variáveis privadas

| Variável | Conteúdo |
| --- | --- |
| `APP_URL` | Origem HTTPS exata da aplicação publicada |
| `DATABASE_URL` | Conexão PostgreSQL de `postito_runtime`; pooler transacional e `sslmode=verify-full` |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Credencial privada de servidor para Storage |
| `SUPABASE_STORAGE_BUCKET` | `postito-private` |
| `MAIL_PROVIDER` | `brevo` ou `resend`; ausência mantém Resend |
| `RESEND_API_KEY` | Chave privada, obrigatória quando o provedor é Resend |
| `RESEND_FROM_EMAIL` | Remetente autorizado no Resend |
| `BREVO_API_KEY` | Chave privada, obrigatória quando o provedor é Brevo |
| `BREVO_FROM_EMAIL` | Endereço verificado na Brevo, sem nome de exibição |

Não adicionar prefixo `NEXT_PUBLIC_` a credenciais privadas. Não usar `MAIL_TRANSPORT=local` em produção. Usar bancos e credenciais distintos em Preview e Production.

A conexão Supabase verifica certificado e hostname. `db/tls.ts` contém a CA pública indicada pelo painel Supabase, com validade até 26/04/2031, e mantém `rejectUnauthorized: true`. Essa CA é aplicada somente aos hosts Supabase reconhecidos. Não resolver `SELF_SIGNED_CERT_IN_CHAIN` desativando a verificação TLS. O certificado público pode ser atualizado quando o provedor anunciar uma rotação. [SSL no Supabase](https://supabase.com/docs/guides/platform/ssl-enforcement).

## Comandos

```bash
npm ci
npm run check:env
npm run db:migrate
npm run build
```

O build não aplica migrações automaticamente. Isso evita alteração de dados de produção durante uma simples compilação. As migrações são executadas na etapa de implantação controlada, antes da promoção do código compatível. Nesse comando, forneça `DATABASE_URL` administrativo apenas ao processo de migração; mantenha a conexão limitada nas Functions. Não use a senha administrativa como solução para erro de permissão de uma tabela nova: aplique os grants e a política apropriados.

O arquivo `vercel.json` configura o framework, build, região `gru1` e duração máxima de 60 segundos nas rotas de API. Respeite os limites efetivos da conta Vercel. Arquivos grandes usam upload direto; aumentar a duração da Function não aumenta seu limite de corpo.

O pacote raiz não força um formato global de módulos. Isso permite ao Next.js compilar o TypeScript e ao carregador Vercel executar o JavaScript CommonJS gerado para as Functions. Os utilitários TypeScript de migração/importação usam uma função assíncrona de entrada; os utilitários `.mjs` preservam seu formato ESM explícito. Não definir `type: module` ou `type: commonjs` globalmente sem verificar compilação e APIs hospedadas: um build pode terminar em READY e ainda falhar ao carregar uma Function com `ERR_REQUIRE_ESM`.

## Homologação mínima em serviços reais

- `GET /api/health` retorna HTTP 200 e apenas `{ "database": "ok" }`, sem cache. Em falha de conexão, retorna 503 sem detalhes internos. A resposta confirma banco e leitura, não entrega de e-mails nem Storage.
- Código chega ao e-mail controlado e não autentica duas vezes.
- Esqueceu a senha envia link válido para o domínio correto; senha anterior e sessão anterior são recusadas depois da troca.
- Pessoa convidada para duas agências vê apenas os clientes permitidos em cada uma.
- Leitor recebe recusa do servidor ao tentar alterar uma demanda.
- Arquivo privado não abre sem sessão nem em outra agência; envio grande chega completo.
- Reiniciar ou redeployar não apaga clientes, demandas ou arquivos.
- Logs não contêm senhas, hashes, tokens de sessão nem credenciais.
- Backup e procedimento de restauração do banco são definidos antes de usar dados operacionais.

Esses itens dependem da configuração real dos provedores e não foram substituídos pelos testes locais.
