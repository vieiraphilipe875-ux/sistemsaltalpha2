# Auditoria de 23/09/2026

Base: `28ff6b87cda969c85dd3bc5c9cf246ba4261876e`, branch `postito/release-0.2.0`. Trabalho iniciado em `postito/auditoria-20260923`. Requisitos da mensagem principal consolidados em `docs/REQUISITOS.md`.

## Correções e evidências

| Área | Constatação | Resultado |
| --- | --- | --- |
| Ambiente de teste | Inicialização encontrou catálogo local PGlite corrompido ao manter os dados dentro da árvore de código observada | Banco, caixa de e-mail e arquivos de teste isolados em diretório temporário fora do projeto; regressões passaram. A causa interna exata da corrupção não foi afirmada |
| Primeira agência | O fluxo de cadastro apresentou criação de agência recusada intermitentemente | Formulário lê o nome diretamente de FormData; campo possui limites; teste confere nome enviado e resposta antes de prosseguir |
| Pastas | Editor com planejamento e cliente liberado recebia 403 e não tinha o controle adequado na interface | API e botão Nova Pasta usam planejamento + escopo explícito; leitor e cliente fora do escopo continuam bloqueados |
| CRM | Atualizar contato/status exigia mensalidade e acesso financeiro | Payload parcial; contato e status funcionam sem financeiro, preservando cobranças; tentativa de enviar mensalidade ou vencimento sem permissão recebe 403 |
| Cadastro de cliente | Campos financeiros eram oferecidos a gestores de clientes sem essa permissão | Campos e payload financeiro condicionados ao acesso; valor monetário convertido em centavos com parseMoney |
| Pauta | Uma gravação desatualizada sobrescrevia a anterior, reproduzida na API | Conferência de revisão em transação com bloqueio da demanda; resposta 409 preserva dados salvos e rascunho na tela |
| Rascunho | Fechar podia perder texto ainda não salvo | Indicação de alterações, aviso de descarte ao fechar/sair, atualização explícita após conflito e botão salvar desativado quando não há alteração |
| Equipe | Administrador via opção de editar outro administrador; escopo limitado podia sugerir efeito inexistente | Controle reservado ao proprietário; convite explica que administrador acessa toda a agência |
| Navegação | Ícones sem nomes acessíveis e menu móvel fora da tela ainda alcançável | Botões nomeados; menu recolhido fica invisível também ao foco; fechamento de diálogo em português |
| Retorno de gravação | Falha de atualização após sucesso da API podia parecer falha ao salvar | Gravação aceita permanece confirmada, com orientação de atualizar a tela |

## Rodada final local

- **31 cenários de integração aprovados:** 20 de API e 11 de navegador, incluindo o cenário que verifica ausência de erros inesperados no percurso.
- **19 testes unitários aprovados.**
- **Build e TypeScript aprovados.**
- **Lint: zero erros, 42 avisos de manutenção**, sobretudo imports/variáveis não usados e otimização de imagens. Build também conserva aviso de tracing de caminhos dinâmicos; não houve erro de compilação.
- Capturas inspecionadas no desktop e em 390 px: Kanban, revisão, conflito de pauta, CRM de editor e painel móvel.
- Resultado detalhado: `evidence/results.json`; erros de navegador: `evidence/browser-errors.json` (vazio na rodada aprovada).

Ambiente: Next.js em servidor local, PostgreSQL via PGlite, armazenamento e e-mails locais, contas fictícias em `example.invalid`. Os testes não enviam mensagens para destinatários reais nem modificam o banco hospedado.

### Cobertura

Cadastro, confirmação obrigatória, reenvio, login, senha, perfil; agência, convite, papéis, escopos e revogação; atribuição por tarefa e liberação de pasta; clientes, pastas, Kanban, edição, fatias e conflito; upload, leitura privada, versões, anexos e revisão; CRM, conversão sem duplicação, contatos e status; financeiro, parcial, quitação, reabertura, recorrência e competências; origem externa bloqueada, isolamento e navegação móvel.

Os testes demonstram os cenários registrados. Não são garantia de ausência de todo defeito, teste de carga, auditoria jurídica ou certificação de acessibilidade.

## Verificação hospedada e bloqueios

A página de entrada do Preview abriu no navegador em 23/09. A navegação direta a `/api/health` foi bloqueada pelo cliente de navegador; uma consulta externa retornou HTML em vez do JSON esperado, portanto não foi contada como aprovação do banco remoto. O plugin Vercel não autorizou a equipe consultada; não foram solicitadas permissões mais amplas nem alteradas as variáveis.

A consulta atual ao Resend retornou nenhum domínio cadastrado. Permanecem os registros anteriores: restrição do remetente de teste, falha na criação de credenciais Brevo e recusa de autenticação Enginemailer. A chave de diagnóstico Enginemailer continua desativada. Nenhum e-mail real foi enviado nesta rodada.

A entrega real de confirmação, recuperação e convite e a regressão autenticada completa no ambiente hospedado continuam pendentes. Produção não está homologada; planos e checkout ficam para a conversa futura solicitada.

## Publicação e recuperação

As alterações não exigem migração de schema. A branch de Preview deve receber um avanço normal, sem force-push e sem merge de main. Após publicação, reabrir abas antigas antes de editar: o contrato de salvar pauta passa a exigir a revisão lida. Em caso de falha, a versão-base acima permite retorno ao deployment anterior; preservam-se banco, arquivos e configurações. O status efetivo da publicação deve ser registrado no PR e na entrega final.
