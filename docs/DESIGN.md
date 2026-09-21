# Postito — memória de design

Versão 1 · 20 de setembro de 2026

## Intenção

Uma ferramenta de trabalho para uma agência inteira: organizar a produção, encontrar o próximo passo e acompanhar o negócio. A identidade parte da organização em papéis, abas e espaços, com marca Postito e composição próprias. A proposta visual não afirma exclusividade jurídica do nome.

Não existe uma lista universal capaz de identificar um site feito por IA. Os padrões abaixo são restrições deste projeto, combinando o pedido do fundador com a análise das referências. Eles não são um detector de autoria.

## O que a pesquisa mudou

Uma avaliação do Nielsen Norman Group descreve interfaces genéricas quando os requisitos visuais são vagos, e ressalta problemas de hierarquia, contraste, excesso de cor e agrupamento. A consequência para o Postito é registrar decisões concretas e avaliar as telas com dados e interações reais, em vez de aceitar a primeira composição. [Estudo do NN/g](https://www.nngroup.com/articles/ai-prototyping/).

O shadcn fornece componentes cujo código pode ser adaptado. Foi usado como base de comportamento, com cores, tipografia e composição do Postito. Componentes acessíveis ainda precisam de rótulos e testes no contexto final. [shadcn/ui](https://ui.shadcn.com/).

A coleção desktop do Design Spells foi tratada como referência para feedback e pequenos movimentos. O Awwwards serviu para explorar direção visual e ritmo; os efeitos de uma vitrine não foram copiados para operações financeiras ou gestão de tarefas. [Design Spells](https://designspells.com/?tag=desktop), [Awwwards](https://www.awwwards.com/).

A atribuição em contexto usa uma pessoa responsável por demanda, com pesquisa e possibilidade de limpar a atribuição. Essa decisão encontra paralelo no modelo documentado pelo Linear. A equipe da pasta é um conceito separado. [Linear: atribuição de tarefas](https://linear.app/docs/assigning-issues).

## Evitar e substituir

| Evitar neste projeto | Usar no Postito | Motivo |
| --- | --- | --- |
| Neon, ciano ou roxo como tema automático | Verde profundo, papel e tons terrosos | Identidade coerente com organização e trabalho criativo |
| Gradiente aplicado a todo cabeçalho ou botão | Superfícies sólidas; imagem de cliente quando houver | Hierarquia mais clara |
| Vidro e desfoque sobre informação de trabalho | Fundos legíveis e bordas discretas | Leitura, contraste e desempenho |
| Todas as informações dentro de cartões idênticos | Linhas para equipe, tabela para financeiro, colunas para Kanban | A forma deve seguir a tarefa |
| Um ícone decorativo em cada número | Tipografia e alinhamento como hierarquia | Reduzir ruído |
| Estrelinhas, robôs e mensagens vagas de “inteligência” | Ícones ligados a ações e nomes específicos | Não sugerir funções inexistentes |
| Títulos enormes em cada tela interna | Título moderado e contexto curto | Manter o trabalho visível |
| Cantos e sombras exagerados em todos os elementos | Variação discreta conforme camada | Diferenciar campo, cartão e modal |
| Texto cinza quase invisível | Texto auxiliar legível e foco perceptível | Informação secundária ainda precisa ser lida |
| Animação contínua sem significado | Transições curtas em hover, seleção e abertura | Comunicar mudança sem distrair |
| Efeito visual que atrasa uma ação | Resultado confirmado, erro recuperável e estado ocupado | Confiança no uso diário |
| Gráficos preenchidos com proporções fictícias | Valores reais, zero real e estados vazios | Não distorcer decisões |
| Tela vazia sem contexto | Explicar filtro, acesso ou ausência de registros | Evitar impressão de falha |
| CTA genérico repetido | “Atribuir responsável”, “Salvar pauta”, “Gerar convite” | Mostrar o que acontecerá |
| Layout bonito apenas com três registros curtos | Testar nomes longos, listas, tabelas e celular | Sustentar o uso real |
| Remover convenções para parecer diferente | Preservar busca, menus, foco e linguagem conhecida | Personalidade com previsibilidade |

## Sistema visual adotado

| Elemento | Decisão |
| --- | --- |
| Marca | Wordmark Postito em minúsculas; símbolo de duas abas sobrepostas |
| Verde principal | `#34483B` |
| Verde secundário | `#526949` |
| Papel | `#F5F4EE` / `#ECEBDC` |
| Detalhe de marca | Trigo, próximo de `#DFCD97` |
| Fonte de interface | DM Sans, hospedada junto ao projeto |
| Fonte editorial | Instrument Serif, para entrada e indicadores selecionados |
| Navegação | Lateral estável no desktop; menu no celular |
| Equipe | Lista com pessoa, profissão, papel e ação de acesso |
| Demanda | Cartão compacto, prazo e responsável pesquisável |
| Financeiro | Valores em centavos na origem; formatação monetária na tela |
| Movimento | Curto e vinculado a estado; respeitar `prefers-reduced-motion` |

Os tons de alerta continuam semânticos: erros em vermelho, confirmação em verde e atenção em âmbar. Não é necessário colorir toda a tela para transmitir esses estados.

## Regra para novas telas

Antes de desenhar, escrever: quem usa, que decisão precisa tomar, qual ação principal, que informações são necessárias e quais estados podem ocorrer. Reutilizar o sistema visual, mas escolher a estrutura adequada ao conteúdo. Conferir vazio, carregamento, erro, acesso negado, texto longo, foco por teclado e tela estreita. Guardar capturas de referência junto aos resultados dos testes.

Este documento e `AGENTS.md` são a memória durável do projeto. Eles devem acompanhar as próximas versões e ser usados como contexto em futuras alterações.
