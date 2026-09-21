# Postito

Gerenciamento de demandas, clientes, CRM e financeiro para agências. Esta versão evolui o sistema original para contas globais, agências isoladas, permissões por espaço, atribuição pesquisável e identidade própria.

## Rodar localmente

Requer Node.js 22.13 ou superior e npm. O banco local é PostgreSQL via PGlite, persistido em disco. Não é um mock. Ele suporta um processo por diretório; encerre o servidor antes de executar migrações nesse mesmo diretório.

```bash
npm ci
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Abra `http://localhost:3000`, crie sua conta e confirme o código recebido. Em desenvolvimento, `MAIL_TRANSPORT=local` grava as mensagens em `.data/mail/`. Abra a mensagem JSON para obter o código; esse diretório nunca é servido pela aplicação. Não existem contas administrativas nem senhas padrão.

Depois da confirmação, crie uma agência ou aceite um convite. O proprietário pode criar clientes, atribuir demandas e convidar a equipe. A mesma conta pode participar de várias agências sem compartilhar os dados entre elas.

## Verificação

```bash
npm test
npm run typecheck
npx playwright install chromium
npm run test:e2e
npm run build
```

O teste integrado cria seu próprio banco e caixa de e-mails com contas `example.invalid`. Ele inicia e encerra o servidor automaticamente e não envia e-mails reais. As capturas e o resultado ficam em `evidence/`; os dados temporários ficam em `.data/qa/`. As interfaces são testadas com Chromium em desktop e celular. A compilação não substitui a homologação na infraestrutura de produção.

## Documentação

- `docs/ENTREGA.md`: alterações, correções e limites verificados.
- `docs/DESIGN.md`: identidade Postito e diretrizes para evitar visual genérico.
- `docs/ARQUITETURA.md`: contas, agências, permissões e segurança.
- `docs/DEPLOY.md`: PostgreSQL, Supabase Storage, Resend e Vercel.
- `docs/MIGRACAO.md`: importação conservadora do SQLite original.
- `docs/PROXIMAS-ETAPAS.md`: sugestões e assinatura para uma etapa futura.

## Situação da publicação

O projeto contém código, migrações, testes e configuração Vercel. O Supabase Postito foi criado em São Paulo, com as migrações aplicadas e bucket privado de 50 MB por arquivo. Em 21/09/2026, o acesso ao painel Vercel foi confirmado e o projeto existente foi renomeado para `postito`; Next.js e Node.js 24 foram conferidos. Consulte `docs/INFRAESTRUTURA.md` antes de provisionar recursos adicionais. Ainda faltam configurar as credenciais de servidor e o remetente Resend, enviar o código desta entrega, publicar e homologar a aplicação. Nenhuma nova versão foi publicada nesta entrega. Assinaturas e checkout permanecem fora desta versão, conforme solicitado.
