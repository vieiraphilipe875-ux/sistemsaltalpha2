# Envio de e-mails do Postito

Atualizado em 21/09/2026.

## Decisão para o teste sem domínio

A alternativa escolhida é **Brevo**. O plano gratuito inclui 300 mensagens por dia, sem limite de duração. Essa cota inclui confirmação, reenvio, recuperação e convites; não representa 300 contas no Postito. Ao atingir a cota, o provedor pode enfileirar mensagens, tornando códigos curtos inúteis se forem entregues após a expiração. [Limites oficiais](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan).

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

O backend aceita exatamente um provedor. A ausência de `MAIL_PROVIDER` mantém o Resend para compatibilidade com o Preview existente. Para ativar a Brevo, salvar na mesma branch de Preview:

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
- A solicitação de código e a recuperação preservam mensagens condicionais para não confirmar publicamente a existência de uma conta.
- Falha ao enviar remove o desafio recém-criado; a conta continua pendente. Não ativar pessoas diretamente no banco para contornar a confirmação.

## Validação real ainda necessária

O adaptador possui testes com respostas simuladas da API. Os cenários locais usam caixa de e-mail isolada. Esses testes não comprovam entrega por Brevo.

Para completar a homologação: conectar a conta gratuita, verificar o remetente, conferir a autorização para e-mails transacionais, salvar a chave de API privadamente e publicar. Enviar uma mensagem ao endereço controlado pelo usuário, conferir o evento de entrega no provedor e confirmar o recebimento com ele. Então validar cadastro, código, recuperação, senha anterior recusada, sessões revogadas e convite. Senhas e códigos reais devem ser informados pelo usuário na interface segura.

Nesta etapa, a Brevo não foi ativada no ambiente hospedado. As credenciais atuais do Resend permanecem preservadas; sua recusa conhecida de destinatário não foi contornada. Não houve compra, contratação paga ou promoção para produção.
