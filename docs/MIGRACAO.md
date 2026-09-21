# Migração do sistema anterior

O RAR recebido foi preservado. O importador lê uma cópia do SQLite original em modo somente leitura e recusa um banco de destino que já contenha contas.

## Ensaio realizado

O arquivo de banco extraído continha 7 contas, 2 clientes, 3 pastas, 1 demanda com 3 fatias e 2 lançamentos financeiros. A importação foi executada em outro diretório PostgreSQL local. Não havia registros de arquivos anexados/finais vinculados a transferir nesse banco.

As contas antigas incluíam administradores globais de desenvolvimento e três gerentes. A proposta gera cinco espaços de agência, correspondentes aos antigos proprietários/administradores, e usa o criador das pastas para determinar o espaço de cada cliente. Uma pessoa explicitamente ligada a um cliente de outro espaço ganha uma associação restrita adicional. Essa divisão deve ser revisada com o proprietário do produto antes de importar em produção; não pressupõe que existam cinco agências comerciais reais.

## Executar em um destino novo

```bash
npm run db:migrate
npm run db:import -- --source /caminho/backup.sqlite --plan-out /caminho/plano.json
```

O primeiro comando do importador apenas cria a proposta e o relatório. Revise nomes de espaços, agência de cada cliente e eventual `financialFallbackOwner`. IDs legados que não são UUIDs são convertidos de forma determinística, mantendo as referências relacionadas.

```bash
npm run db:import -- --source /caminho/backup.sqlite --plan /caminho/plano.json --apply
```

O destino deve estar vazio. Não há opção de sobrescrever ou apagar registros existentes. Interrompa o servidor local durante a importação se ele usar o mesmo diretório PGlite.

## Acesso após importar

Senhas protegidas existentes são preservadas. Contas ativas e pendentes passam a exigir confirmação de e-mail; contas inativas permanecem inativas. Tokens antigos de convite/configuração não são reutilizados. A pessoa pode solicitar um novo código de confirmação e, depois, recuperar a senha. Caso a conta antiga não tivesse senha definida, deve usar recuperação após confirmar o e-mail.

O sistema anterior não tinha isolamento consistente de agência. Por isso, o importador preserva concessões explícitas e atribuições, sem transportar o antigo acesso administrativo global.

## Conferir

Compare as quantidades de contas, clientes, pastas, demandas, fatias e valores. Inspecione cada associação de agência proposta. Guarde a fonte original, o plano e um backup do destino antes de iniciar operação. Se houver arquivos referenciados em outro backup, migre os objetos físicos para Storage privado e confira a leitura autenticada de cada categoria; copiar apenas as linhas do banco não copia arquivos.
