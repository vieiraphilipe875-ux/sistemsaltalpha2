# Envio de e-mails do Postito

Atualizado em 24/09/2026.

## Recuperação e cadastro incompleto em 24/09/2026

O caso relatado foi identificado por consulta somente de metadados: endereço cadastrado com status `pending`, sem confirmação do e-mail, sem desafio de recuperação e com uma tentativa registrada. Os logs Brevo consultados não mostravam recuperação. A aplicação antiga só enviava para `active`, mas devolvia uma mensagem condicional que não oferecia saída para a pendência. Não houve falha de entrega identificada nesse caso, porque nenhum envio foi iniciado.

O titular determinou que o usuário volte ao cadastro nesse estado. A recuperação agora retorna `nextStep=signup` para endereço inexistente ou cadastro pendente; a interface conserva o e-mail, abre o cadastro e orienta concluir a confirmação. Não envia recuperação, não ativa a conta, não troca senha e não duplica o cadastro existente. Cadastro repetido continua encaminhando à confirmação, com a opção Solicitar código. Contas ativas mantêm o link de 30 minutos; inativas não recebem link. O direcionamento condicional solicitado distingue esses estados de conta ativa, embora inexistente e pendente recebam exatamente a mesma resposta.

Nenhum e-mail real ou alteração manual de conta foi necessário para identificar o problema. A validação local passou em 86 testes unitários e 64 cenários de API/navegador, além de TypeScript, lint e build. Evidência em `evidence/password-recovery-20260924.json`, separando testes locais de navegação hospedada e de entrega real.

## Confirmação após reenvio: correção publicada no Preview

O usuário relatou recebimento do e-mail e recusa do código. A auditoria reproduziu o defeito: a confirmação consultava somente o desafio mais recente e podia recusar um código anterior ainda válido. Uma consulta somente leitura encontrou dois desafios criados com **3,488 segundos** de diferença, ambos válidos na inspeção, conta pendente e duas tentativas no mais recente. Nenhum código ou hash foi lido; não se afirma qual deles foi digitado pelo usuário.

Por solicitação do titular, a validade passa a ser **cinco minutos**, inclusive como teto para desafios legados contados desde sua criação. A correção aceita qualquer código ainda válido da conta, consome os desafios de confirmação juntos após sucesso e mantém **cinco tentativas agregadas**, sem zerar o limite por reenvio. A recuperação de senha mantém sua política própria de 30 minutos.

Validação local concluída: **37 testes unitários aprovados, incluindo 18 novos, e 38 cenários E2E aprovados (23 de API e 15 de navegador)**. Cadastro, código, onboarding e recuperação passaram, incluindo colagem de código com espaços e texto de validade de cinco minutos. TypeScript e lint dos arquivos de código/teste alterados passaram. O build passou com o aviso já conhecido de file tracing em `next.config.ts`/`lib/storage.ts`. A primeira execução E2E parou por ausência de Chromium; após instalação pela distribuição oficial, a suíte completa encerrou com exit 0. Evidência da regressão: `evidence/email-confirmation-regression-20260924.json`. A concorrência foi testada somente em PGlite isolado, não entre várias conexões PostgreSQL hospedadas. **A correção foi publicada no Preview; a confirmação real permanece pendente de novo código do usuário.** Não houve alteração manual do banco hospedado nem do ADM nesta investigação. Evidência desta rodada: `evidence/email-confirmation-fix-20260924.json`; a evidência anterior da ativação foi preservada.

Publicação confirmada no Preview: commit `ad64eade9adfca7d31e1b0d62d9e3d6d71b0ea09`, árvore `3d9bb57545318d65bfeca84aedc7f6286a7ff0b0`, deployment `dpl_8gyzLivZBn7eVUsGh51coVYqLMDJ` em **READY** (33 segundos). A [URL da implantação](https://postito-doa9kxpev-vieiraphilipe875-7609s-projects.vercel.app) está publicada; o [alias estável](https://postito-git-postito-release-020-vieiraphilipe875-7609s-projects.vercel.app/) foi aberto no navegador e a tela **Confirmar meu e-mail** mostrou “Ele vale por 5 minutos após o envio”. A confirmação real continua pendente de um novo código recebido pelo usuário. Não houve ativação manual de conta nem alteração de senha, ADM, schema ou variáveis de ambiente nesta correção.

## Estado da ativação em 24/09/2026

O titular retomou a configuração de e-mail para testar cadastros. A chave Brevo **Postito Preview** foi criada com validade até **24/12/2026**. Seu valor foi transferido pela interface para a Vercel, sem leitura pelo modelo nem registro em logs ou no repositório.

A Vercel confirmou `BREVO_API_KEY` como Secret, `MAIL_PROVIDER=brevo` e `BREVO_FROM_EMAIL` como Config, com remetente já verificado. As três variáveis estão restritas ao Preview da branch `postito/release-0.2.0`; as variáveis anteriores foram preservadas. O redeploy `dpl_FaPmSUxSQog7UNHgRp5zsYkFVJro`, do commit `3d5bdcf8e51aca996124bfd1841281e390beb503`, concluiu em **READY**. Não houve alteração de código, acesso ADM ou dados nesta configuração.

Ao concluir essa configuração, a entrega ainda não havia sido testada. Posteriormente, o usuário relatou o recebimento, mas a confirmação falhou conforme a seção acima. A configuração salva e o build não comprovam o fluxo completo. Evidência histórica da ativação: `evidence/brevo-preview-20260924.json`. Renovar a chave antes de seu vencimento para evitar interrupção do envio.

## Decisão para o teste sem domínio

A alternativa escolhida é **Brevo**. Na consulta registrada em 21/09, o plano gratuito incluía 300 mensagens por dia, sem limite de duração. Essa cota inclui confirmação, reenvio, recuperação e convites; não representa 300 contas no Postito. Ao atingir a cota, o provedor pode enfileirar mensagens, tornando códigos curtos inúteis se forem entregues após a expiração. [Limites oficiais](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan).

A Brevo permite verificar um remetente por código enviado à sua caixa de entrada. Para endereços gratuitos ou domínios não autenticados, documenta a substituição temporária do remetente por um endereço do próprio serviço, inclusive em mensagens transacionais. É uma opção para este teste, condicionada à ativação da conta; não é garantia de entrega nem substitui o domínio próprio na operação definitiva. [Verificação do remetente](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email), [substituição temporária](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders).

Outras opções consultadas:

| Serviço | Gratuidade consultada | Implicação para este projeto |
| --- | --- | --- |
| Brevo | 300 mensagens/dia | Selecionado para teste após verificar conta e remetente |
| Mailjet | 6.000 mensagens/mês, máximo de 200/dia | Alternativa pesquisada; integração e entrega não testadas |
| SMTP2GO | 1.000 mensagens/mês | O cadastro consultado rejeita e-mails de domínios públicos, como Gmail; inadequado para começar apenas com o endereço atual |
| MailerSend | 500 mensagens/mês no plano gratuito, após aprovação | A página consultada exige cartão para ativar esse plano; não selecionado |

Fontes: [Mailjet](https://www.mailjet.com/pricing/), [SMTP2GO](https://www.smtp2go.com/pricing/), [MailerSend](https://www.mailersend.com/pricing).

## Configuração da integração

O backend aceita exatamente um provedor. A ausência de `MAIL_PROVIDER` mantém o Resend para compatibilidade. A configuração Brevo salva em 24/09 na mesma branch de Preview usa:

| Variável | Valor |
| --- | --- |
| `MAIL_PROVIDER` | `brevo` |
| `BREVO_API_KEY` | Chave privada da conta Brevo, como Secret |
| `BREVO_FROM_EMAIL` | Endereço verificado no painel, sem nome de exibição |
| `APP_URL` | Origem HTTPS do Preview, já configurada |

O nome de exibição é Postito. O endereço real do responsável não deve ser gravado no repositório. Não usar o remetente de teste do Resend na Brevo. Depois de salvar as variáveis, publicar novamente a mesma branch. `npm run check:env` verifica as variáveis do provedor selecionado.

A integração faz `POST https://api.brevo.com/v3/smtp/email`, com a chave no cabeçalho `api-key`, remetente e destinatário explícitos, e chave de idempotência no campo `headers` da mensagem. Somente HTTP 201 com `messageId` válido é aceite. Falhas, respostas inválidas e indisponibilidade não viram sucesso. Há limite de dez segundos; não há repetição ou troca automática de provedor após uma resposta incerta. Logs contêm apenas provedor, motivo classificado e status HTTP. [Contrato oficial da API](https://developers.brevo.com/reference/send-transac-email).

## Cadastro e mensagens da interface

- Um cadastro novo só retorna `emailStatus=accepted` após o aceite do transporte.
- Repetir cadastro existente retorna `emailStatus=not_requested` e informa que esse pedido não gerou código. Isso não altera senha, profissão ou nome armazenados.
- A confirmação usa texto neutro, botão Solicitar código e atalho para criar uma conta, sem afirmar que um envio ocorreu apenas porque a tela abriu.
- A solicitação de código mantém mensagem condicional. Na recuperação, a decisão posterior descrita acima direciona inexistente/pendente ao cadastro; não afirmar resposta indistinguível de conta ativa.
- Falha ao enviar remove o desafio recém-criado; a conta continua pendente. Não ativar pessoas diretamente no banco para contornar a confirmação.
- Política da correção validada localmente: códigos válidos por cinco minutos; reenvio não invalida antecipadamente outro código ainda válido nem reinicia as cinco tentativas agregadas. Após confirmar, os desafios de confirmação são consumidos juntos.

## Validação real ainda necessária

O adaptador possui testes com respostas simuladas da API. Os cenários locais usam caixa de e-mail isolada. Esses testes não comprovam entrega por Brevo.

Para completar a homologação: usar o cadastro normal com uma conta de teste controlada pelo usuário. Se ela já estiver pendente, usar **Confirmar meu e-mail → Solicitar código**; repetir o cadastro não gera novo envio. Conferir o aceite e o evento de entrega no provedor e confirmar o recebimento com o usuário. Então validar código, recuperação, senha anterior recusada, sessões revogadas e convite em contexto de teste. Senhas e códigos reais devem ser informados pelo usuário na interface segura. Não usar a conta ADM para esses testes.

As credenciais anteriores do Resend permanecem preservadas; sua recusa conhecida de destinatário não foi contornada. Não houve envio transacional durante a configuração inicial; o recebimento posterior foi relatado pelo usuário. Não houve compra, contratação paga ou promoção para produção.
