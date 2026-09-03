# SISTEMA AGÊNCIA SALT

Esta pasta contém o código-fonte completo do sistema de pautas da Agência Salt.

## Abrir no Antigravity

1. Extraia a pasta em `Documentos` no seu computador.
2. Abra o Antigravity.
3. Escolha **Open Folder / Abrir pasta**.
4. Selecione a pasta `SISTEMA AGÊNCIA SALT`.
5. No terminal do projeto, execute:

```bash
npm run install:ci
npm run dev
```

O projeto requer Node.js 22.13 ou superior.

## Estrutura principal

- `app/`: páginas, autenticação e rotas da API.
- `components/`: interface do dashboard, quadros, pautas e revisão.
- `db/`: estrutura do banco de dados.
- `drizzle/`: migrações do banco.
- `lib/`: permissões, dados e tipos do sistema.
- `public/`: arquivos públicos.
- `.openai/hosting.json`: configuração da versão publicada no ChatGPT Sites.

## Tecnologias

- React e TypeScript
- Next.js/Vinext
- Tailwind CSS
- Cloudflare D1 para dados
- Cloudflare R2 para anexos
- Drizzle ORM

## Observação importante

O sistema publicado usa a autenticação do ChatGPT Sites e os serviços Cloudflare fornecidos pela hospedagem. O banco de produção, os arquivos enviados pelos usuários e as senhas não fazem parte deste pacote. Para hospedar fora do ChatGPT Sites, será necessário configurar um banco, armazenamento de arquivos e autenticação equivalentes.

