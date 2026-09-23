# Diretrizes permanentes do Postito

Leia `docs/REQUISITOS.md`, `docs/DESIGN.md`, `docs/ARQUITETURA.md` e `docs/ENTREGA.md` antes de alterar a aplicação. Estes arquivos registram decisões do projeto; instruções explícitas futuras do usuário têm prioridade.

- Organize a execução: reproduzir falha, corrigir, testar o fluxo afetado, revisar regressões, só então avançar.
- Não declare que todos os bugs possíveis foram eliminados. Registre exatamente o que foi testado e onde.
- Preserve profissão separada de permissão. Acesso é por associação à agência; uma conta não é uma agência.
- Sempre autorize no servidor, incluindo leitura de arquivos e IDs enviados pelo navegador. Nunca use apenas controles visuais como segurança.
- Cliente por atribuição não significa acesso integral à pasta. O responsável vê suas tarefas; uma concessão explícita libera a pasta conforme suas permissões.
- Não devolva hashes, tokens, credenciais ou dados comerciais/financeiros a quem não tem permissão.
- Nunca inclua banco real, e-mails locais, variáveis secretas ou cache de execução no pacote de código.
- Novas tabelas pertencem ao schema privado `postito`; mantenha RLS ativada e acesso de `anon`/`authenticated` revogado. A autorização da aplicação usa o servidor, não Supabase Auth.
- Para alterações em autenticação, escopo ou financeiro, execute `npm test`, `npm run test:e2e`, `npm run typecheck` e `npm run build`. Use fixtures isoladas.
- Mantenha foco visível, rótulos acessíveis, nomes nos botões de ícone, estados de erro e opção de movimento reduzido.
- Não introduza neon, gradientes automáticos, brilhos decorativos, ícones de estrelinha sem função ou grades de cartões iguais em todas as telas.
- Preserve o RAR original. A migração lê uma cópia e só escreve em destino novo.
- Planos, valores e checkout exigem decisão de produto posterior; não transforme previsões financeiras em cobranças reais.
- Decisão do titular de 23/09/2026: remover a troca de senha pelo perfil sem e-mail. Retomar cadastro, confirmação, recuperação de senha e envio de e-mails após finalizar o restante do sistema. Preservar o acesso ADM já provisionado, suas credenciais e seus dados.

- A pauta deve detectar revisão desatualizada antes de gravar e preservar o rascunho em conflito. Mudanças de contato/status no CRM não podem reescrever dados financeiros omitidos.
