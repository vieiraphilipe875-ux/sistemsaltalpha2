# Próximas decisões de produto

## Modelo de uso recomendado

Manter uma conta por pessoa e cobrar pelo espaço da agência. Um profissional que colabora com três agências não deveria precisar de três cadastros nem pagar três assinaturas individuais para aceitar convites. Cada agência decide quais clientes e módulos libera.

Uma demanda tem um responsável principal; a equipe da pasta funciona como conjunto de colaboradores. Isso torna explícito quem precisa entregar, sem impedir colaboração. Uma futura função de observadores pode acompanhar o trabalho sem receber a responsabilidade.

## Melhorias seguintes

| Prioridade | Melhoria | Por que depois desta base |
| --- | --- | --- |
| Próxima | Filtros salvos e calendário de produção | Acelerar o uso diário com dados e permissões estáveis |
| Próxima | Histórico e comparação de versões da pauta | Recuperar textos antigos e comparar mudanças; a detecção de conflito já impede sobrescrita silenciosa |
| Próxima | Central de notificações e preferências de e-mail | Avisar atribuição, prazo e revisão sem gerar excesso de mensagens |
| Próxima | Modelos de demanda e checklist por formato | Reduzir trabalho repetido do briefing |
| Após validação | Papel de cliente aprovador | Diferenciar leitor interno de cliente que pode aprovar ou pedir ajustes |
| Após validação | Automações e integrações de Drive | Definir quem autoriza, onde os arquivos ficam e como tratar falhas |
| Escala | Paginação, busca no servidor e fila de uploads | A área de trabalho atual carrega os registros autorizados em conjunto |
| Escala | Política de retenção e limpeza de objetos órfãos | Controlar armazenamento e histórico sem excluir arquivos em uso |

## Assinaturas — proposta para conversa

| Faixa conceitual | Valor entregue |
| --- | --- |
| Organização | Agências, clientes, demandas, equipe e arquivos dentro de limites definidos |
| Gestão | Organização + CRM e financeiro |
| Operação ampliada | Gestão + automações, relatórios e controles adicionais quando existirem |

Não há preços nem checkout implementados. Antes de definir valores, precisamos de hipóteses de uso, custos de arquivos/e-mails, limites por agência, teste gratuito, cancelamento, carência e tratamento de inadimplência.

Na implementação futura, o pagamento deve liberar recursos na agência por meio de eventos verificados no servidor. O retorno visual do checkout não é prova suficiente de pagamento. Eventos repetidos precisam ser idempotentes; cancelamentos e mudanças de plano devem atualizar os direitos de uso sem apagar dados. As verificações de módulo devem existir também nas rotas de API. O desenho do checkout, fornecedor e valores fica para a conversa solicitada.
