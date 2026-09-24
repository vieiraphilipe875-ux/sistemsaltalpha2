# Arquitetura e regras de acesso

## Componentes

Next.js 16 e React 19 na aplicação; Drizzle para acesso a PostgreSQL; PGlite somente para desenvolvimento e testes; `postgres` para a conexão de produção. Supabase hospeda PostgreSQL e arquivos privados. Os adaptadores de e-mail atendem confirmação, recuperação e convites; a configuração Brevo foi salva no Preview em 24/09/2026 e o usuário relatou recebimento. A confirmação apresentou falha após reenvio; sua correção passou na regressão local, foi publicada no Preview e a nova tela foi conferida. A confirmação real depende de novo código do usuário. A autenticação desta versão é própria, implementada no servidor; ela **não usa Supabase Auth**.

O banco fica no schema `postito`, fora da API pública de dados. A migração ativa RLS nas tabelas e revoga acesso público, `anon` e `authenticated`. Na Vercel, a conexão usa `postito_runtime`, um papel exclusivo do backend com leitura e escrita nas tabelas da aplicação. Ele não é proprietário, não pode criar tabelas/papéis e não possui `BYPASSRLS` nem acesso aos dados de `auth`/`storage`.

As políticas `postito_backend_access` se aplicam apenas a esse papel de servidor. Elas permitem as operações do backend; o isolamento entre pessoas e agências continua sendo autorizado pela aplicação em cada operação. Não são políticas de isolamento por usuário do Supabase Auth. Não conceder esse papel a `anon`, `authenticated` ou `authenticator`, nem expor o schema na Data API. O provisionamento está em `scripts/provision-runtime-role.sql`; tabelas futuras precisam de grants e políticas explícitos. A conexão de migração deve usar uma credencial administrativa separada da conexão de execução.

## Conta, agência e cliente

`members` representa a pessoa. `agencies` representa o espaço. `agency_memberships` associa a pessoa a cada agência, com papel, permissões e escopo próprios. A profissão pertence à conta e não concede poderes administrativos.

| Papel | Acesso padrão |
| --- | --- |
| Proprietário | Administração integral da própria agência |
| Administrador | Administração da agência; sem transferir propriedade nem conceder administração a outra pessoa |
| Editor | Clientes e produção conforme permissões e escopo configurados |
| Leitor | Leitura dos clientes e demandas permitidos; sem alterações |

O proprietário é representado internamente por `role=manager`, por compatibilidade com a origem. Campos de financeiro/CRM chamados `agencyOwnerId` agora apontam para **a agência**, e não para o usuário proprietário.

Um cliente tem uma agência explícita. Pastas pertencem ao cliente e demandas pertencem à pasta. Uma atribuição direta permite ver a demanda e identificar sua pasta/cliente. Ela não abre as outras demandas do cliente. `client_members` representa a concessão explícita da pasta; com ela, a pessoa vê as demandas daquele cliente, conforme as permissões que possui.

Trocar agência altera a agência ativa da sessão. Desativar uma associação impede acesso a esse espaço e mantém o acesso às outras agências. Não existe administrador global com acesso automático aos dados de todos.

## Autenticação

- Senha nova protegida por scrypt com salt individual. Hashes PBKDF2/SHA-256 legados são aceitos na importação e atualizados no login.
- Conta pendente não autentica com senha antes da confirmação do e-mail.
- Política de confirmação solicitada em 24/09, com correção validada localmente e publicada no Preview: código aleatório de seis dígitos, validade de cinco minutos desde a criação, inclusive para desafios legados. Qualquer código ainda válido da conta pode confirmar; no sucesso, consumir os desafios de confirmação juntos. Limitar a cinco tentativas agregadas, sem reiniciar esse limite por reenvio, além dos limites adicionais por conta.
- Recuperação usa token aleatório de 256 bits, expiração de 30 minutos e consumo único.
- Redefinição de senha encerra todas as sessões da conta.
- A troca de senha pelo perfil sem e-mail foi removida por decisão do titular em 23/09/2026. Não manter interface ou operação de servidor para esse fluxo. O titular retomou cadastro, confirmação, recuperação de senha e envio de e-mails; os fluxos existentes devem ser homologados com conta de teste controlada, sem afirmar entrega antes da evidência real.
- O provisionamento manual de uma conta pelo titular não instala credenciais padrão nem concede administração global. A ativação individual permitiu operar durante a postergação de e-mails; os fluxos públicos mantêm a confirmação obrigatória.
- A remoção da troca de senha pelo perfil preserva o acesso ADM já provisionado, suas credenciais e seus dados.
- Sessão opaca guardada em cookie HttpOnly, SameSite=Lax, Secure em produção. No banco é guardado somente o hash do token, com validade de sete dias.
- Código e token de recuperação são armazenados como hashes; não constam no payload da área de trabalho.
- Limites persistidos em banco reduzem abuso de login, cadastro, convites e envio de e-mails. Na Vercel há também limite de envio por IP informado pela plataforma.

Convites expiram em sete dias, aceitam uma pessoa e podem ser revogados. Um convite com e-mail exige a conta correspondente. A permissão fica no registro do convite, não em parâmetros editáveis do link. A aceitação verifica se quem convidou continua autorizado.

O provedor é selecionado por `MAIL_PROVIDER`; a configuração Brevo exige `BREVO_API_KEY`, `BREVO_FROM_EMAIL` e `APP_URL`. A chave **Postito Preview**, criada em 24/09/2026 e válida até 24/12/2026, foi salva como Secret somente no Preview da branch `postito/release-0.2.0`, preservando variáveis anteriores, código e dados. Seu valor não integra o repositório. A implantação e a entrega são verificações distintas; estado atual em `docs/EMAIL.md` e `evidence/brevo-preview-20260924.json`.

A falha de confirmação reproduzida selecionava apenas o desafio mais recente. A investigação do caso real leu somente metadados de dois desafios válidos, separados por 3,488 segundos, sem códigos ou hashes e sem gravações no banco hospedado. Recebimento informado pelo usuário e confirmação concluída são evidências distintas; acompanhar a correção em `evidence/email-confirmation-fix-20260924.json`.

## Arquivos

O navegador solicita autorização de envio, recebe URL assinada e envia diretamente para Supabase Storage. A conclusão confirma proprietário, agência, finalidade, tamanho e MIME antes de vincular o arquivo. Isso evita colocar arquivos grandes no corpo de uma Function da Vercel, cujo limite documentado é 4,5 MB. [Limites da Vercel](https://vercel.com/docs/functions/limitations).

O bucket é privado. A leitura exige autorização no servidor; a resposta remota entrega um link assinado de curta duração. Um link assinado já emitido permanece utilizável até expirar. As pastas locais de arquivos e e-mails são apenas para desenvolvimento e ficam bloqueadas quando `NODE_ENV=production` ou `VERCEL` está definido.

Limites desta rodada de 24/09: arquivo final e outros anexos até 50 MB; avatar/banner em JPG, PNG, WEBP ou GIF até 20 MB por imagem. A política de imagens fica em um módulo compartilhado pela interface e pela API, para manter aviso e validação alinhados. Arquivos vazios, formatos não aceitos e imagens acima do limite devem ser recusados antes da criação do cliente e novamente antes da autorização de upload. A checagem de tamanho/MIME não é antivírus nem inspeção profunda do conteúdo. A publicação e homologação desta rodada permanecem pendentes.

O resultado de `Storage.info()` do SDK instalado fornece `size` e `contentType` na raiz. A finalização utiliza esses campos autoritativos; `metadata` é conteúdo personalizado e não determina tamanho/MIME. Resposta ausente, inválida ou com tamanho diferente do autorizado interrompe a conclusão sem vincular um objeto não verificado. Transferência concluída no Storage e vínculo persistido no cliente são etapas distintas. A regressão precisa verificar miniatura/banner e recarregamento, além da resposta do upload.

## Consistência e atualização

Operações compostas usam transação. Conversão de lead e criação de competência protegem contra duplicatas; as migrações adicionam unicidade e limites financeiros. Valores monetários usam centavos inteiros. Recorrência manual cria uma projeção de doze meses, sem efetuar cobrança. Campos de mês e vencimento respeitam meses curtos.

A criação de cliente aceita `requestId` UUID opcional. O navegador reutiliza a chave enquanto repete a mesma tentativa lógica. O servidor deriva um UUID escopado por agência e membro e faz `INSERT ... ON CONFLICT DO NOTHING` pela chave primária dentro da transação. Somente a inserção vencedora cria o vínculo do usuário, a pasta inicial e as previsões. Replays devolvem os IDs existentes, sem sobrescrever dados ou repetir atividade; revalidam o acesso à pasta e não restauram concessões removidas. Nomes iguais continuam permitidos em solicitações diferentes. Chamadas antigas sem `requestId` preservam o comportamento anterior. A pasta retornada pode ser nula se todas as pastas tiverem sido removidas posteriormente; o replay não as recria.

Se o cliente já foi persistido e uma imagem falhar depois, a interface deve mostrar esse resultado parcial, conservar o ID e oferecer nova tentativa do arquivo. A falha de envio não pode voltar a executar uma criação com outro identificador. A correção automática do fluxo futuro é separada da reconciliação de duplicatas reais existentes, que exige inspeção específica de dados relacionados.

Rodada de convites de 24/09 em investigação: verificar envio, feedback e aceite, além da seleção geral solicitada para editor/leitor. O modo padrão de gerar link podia ser confundido com envio de e-mail; distinguir explicitamente o canal solicitado e o resultado devolvido. O painel Brevo registrou envio e entrega do último convite existente, sem comprovar posicionamento na caixa principal. O padrão da interface será e-mail; gerar link deve informar que não envia mensagem, e o estado de aceite pelo provedor não deve declarar entrega. Não assumir falha do provedor sem evidência. “Selecionar todos” marca os clientes atuais liberados no convite/acesso, mantendo `clientAccessMode=selected`; é diferente do escopo `all`, que também inclui clientes futuros automaticamente. A seleção geral deve oferecer desmarcação e estado parcial e preservar escopo de agência, permissões do papel e restrições do servidor.

A interface confirma alterações após a resposta do servidor, atualiza a área de trabalho a cada 15 segundos enquanto a aba está visível e ao recuperar foco. A pauta usa controle de concorrência: o navegador envia os IDs das fatias da versão que abriu; dentro da transação, o servidor bloqueia a demanda, confere essa revisão e rejeita versões antigas com HTTP 409 antes de escrever. Cada gravação gera novos IDs de fatia. O rascunho permanece no navegador; carregar a versão atual exige confirmar seu descarte. Fechar a pauta ou sair da página com alterações também gera aviso. Isso evita sobrescrita silenciosa; não implementa coedição em tempo real nem histórico recuperável de textos. Arquivos finais já possuem versões.

Criar uma pasta exige `demands.create` e acesso explícito ao cliente, sem exigir `clients.manage`. Uma atribuição isolada continua insuficiente. `updateClientCrm` aceita alterações parciais; somente payloads que incluem mensalidade ou dia do vencimento exigem `finance.access` e atualizam previsões. Alterar contato ou status preserva valores, datas e lançamentos ocultos ao perfil comercial.
