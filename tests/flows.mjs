import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
export async function runFlows({base,mailDir,check}){
 await check('Saúde do banco sem exposição de dados ou cache',async()=>{
  const response=await fetch(base+'/api/health');
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(await response.json(),{database:'ok'});
 });
 const password='QA-Postito-2026!';
 class Actor{
  constructor(email,name){this.email=email;this.name=name;this.cookie='';}
  async req(path,body,expected=200,method='POST',extra={}){
   const r=await fetch(base+path,{method,headers:{Origin:base,...(this.cookie?{Cookie:this.cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...extra},body:body?JSON.stringify(body):undefined});
   const cookie=r.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];
   const responseText=await r.text();let data;
   try{data=JSON.parse(responseText);}catch{throw new Error(`${method} ${path} ${body?.action||''}: HTTP ${r.status}, resposta não JSON: ${responseText.slice(0,220)}`);}
   assert.equal(r.status,expected,`${method} ${path} ${body?.action||''}: ${JSON.stringify(data)}`);return data;
  }
  action(action,params={},status=200){return this.req('/api/actions',{action,...params},status);}
  workspace(status=200){return this.req('/api/workspace',null,status,'GET');}
  auth(action,body={},status=200){return this.req('/api/auth/'+action,{email:this.email,...body},status);}
 }
 async function emailFor(actor,subject){
  const files=(await readdir(mailDir)).sort().reverse();
  for(const f of files){const mail=JSON.parse(await readFile(mailDir+'/'+f,'utf8'));if(mail.to===actor.email&&mail.subject.includes(subject))return mail.html;}
  throw new Error('Mensagem de teste não encontrada');
 }
 async function register(actor){
  await actor.auth('signup',{name:actor.name,password,profession:'designer'});
  await actor.auth('login',{password},401);
  const html=await emailFor(actor,'Confirme');const code=html.match(/>(\d{6})<\/p>/)?.[1];assert(code);
  await actor.auth('verify',{code:'------'},400);
  await actor.auth('verify',{code});
  await actor.auth('verify',{code},400);
 }
 const owner=new Actor('owner@example.invalid','Marina Costa'),editor=new Actor('editor@example.invalid','Bruno Nunes'),reader=new Actor('reader@example.invalid','Clara Alves'),outside=new Actor('outside@example.invalid','Daniel Reis');
 await check('Cadastro, confirmação obrigatória, código de uso único',async()=>{for(const actor of [owner,editor,reader,outside])await register(actor);});
 await check('Cadastro pendente: repetição não anuncia envio; reenvio permite concluir sem trocar a senha',async()=>{
  const pending=new Actor('pending@example.invalid','Paula Teste');
  const first=await pending.auth('signup',{name:pending.name,password,profession:'designer'});
  assert.equal(first.emailStatus,'accepted');
  const before=(await readdir(mailDir)).length;
  const duplicate=await pending.auth('signup',{name:'Nome alterado',password:'Different-Fixture-Password!',profession:'designer'});
  assert.equal(duplicate.emailStatus,'not_requested');
  assert.match(duplicate.message,/não gerou um novo código/);
  assert.equal((await readdir(mailDir)).length,before);
  await pending.auth('resend');
  assert.equal((await readdir(mailDir)).length,before+1);
  const html=await emailFor(pending,'Confirme');
  const code=html.match(/>(\d{6})<\/p>/)?.[1];assert(code);
  await pending.auth('verify',{code});
  await pending.auth('login',{password:'Different-Fixture-Password!'},401);
  await pending.auth('login',{password});
  await pending.action('createAgency',{name:'Agência de teste de confirmação'});
  assert.equal((await pending.workspace()).currentMember.name,'Paula Teste');
 });
 let agency,otherAgency,c1,c2,otherClient,task,hiddenTask;
 await check('Confirmação: reenvio não invalida código ainda válido; sucesso consome todos',async()=>{
  const reordered=new Actor('reordered@example.invalid','Teste Ordem de Entrega');
  await reordered.auth('signup',{name:reordered.name,password,profession:'designer'});
  const firstHtml=await emailFor(reordered,'Confirme');
  const firstCode=firstHtml.match(/>(\d{6})<\/p>/)?.[1];assert(firstCode);
  await reordered.auth('resend');
  const secondHtml=await emailFor(reordered,'Confirme');
  const secondCode=secondHtml.match(/>(\d{6})<\/p>/)?.[1];assert(secondCode);
  await reordered.auth('verify',{code:firstCode});
  await reordered.auth('verify',{code:secondCode},400);
  await reordered.auth('login',{password});
  assert.match(firstHtml,/Válido por 5 minutos/);
  assert.match(secondHtml,/Válido por 5 minutos/);
 });
 await check('Confirmação: reenvio não reinicia o limite de cinco tentativas',async()=>{
  const limited=new Actor('limited-code@example.invalid','Teste Limite de Código');
  await limited.auth('signup',{name:limited.name,password,profession:'designer'});
  const html=await emailFor(limited,'Confirme');
  const code=html.match(/>(\d{6})<\/p>/)?.[1];assert(code);
  const wrongCode=String((Number(code)+1)%1000000).padStart(6,'0');
  for(let attempt=0;attempt<5;attempt++) await limited.auth('verify',{code:wrongCode},400);
  await limited.auth('resend');
  const resent=(await emailFor(limited,'Confirme')).match(/>(\d{6})<\/p>/)?.[1];assert(resent);
  await limited.auth('verify',{code:resent},400);
  await limited.auth('login',{password},401);
 });
 await check('Agências independentes e autorização de criação',async()=>{
  agency=(await owner.action('createAgency',{name:'Estúdio Horizonte'})).agencyId;
  otherAgency=(await outside.action('createAgency',{name:'Agência Norte'})).agencyId;
  c1=await owner.action('createClient',{name:'Vanessa Lopes',handle:'@vanessalopes',period:'SET • 2026',revenue:250000,dueDay:31});
  c2=await owner.action('createClient',{name:'Café da Praça',period:'SET • 2026'});
  otherClient=await outside.action('createClient',{name:'Cliente exclusivo Norte'});
  assert.equal((await owner.workspace()).clients.length,2);
  assert.equal((await outside.workspace()).clients.length,1);
  await owner.action('switchAgency',{agencyId:otherAgency},403);
  await owner.action('updateClient',{id:otherClient.clientId,driveUrl:'https://example.com'},403);
  await owner.action('createClient',{name:'Invalido',revenue:-1},400);
 });
 await check('Convite restrito ao e-mail, agência e uso único',async()=>{
  const link=(await owner.action('inviteMember',{email:editor.email,role:'editor',clientIds:[],clientAccessMode:'selected',delivery:'email'})).link;
  const token=new URL(link).searchParams.get('invite');
  assert((await emailFor(editor,'Convite')).includes(token));
  await outside.action('acceptInvite',{token},403);
  await editor.action('acceptInvite',{token});await editor.action('acceptInvite',{token},400);
  assert.equal((await editor.workspace()).clients.length,0);
  const inv=await owner.action('inviteMember',{role:'viewer',clientIds:[c1.clientId],clientAccessMode:'selected'});
  await reader.action('acceptInvite',{token:new URL(inv.link).searchParams.get('invite')});
  assert.equal((await reader.workspace()).clients.length,1);
 });
 let ownerId,editorId,readerId;
 await check('Atribuição: apenas a demanda recebida e sua pasta aparecem',async()=>{
  ownerId=(await owner.workspace()).currentMember.id;editorId=(await editor.workspace()).currentMember.id;readerId=(await reader.workspace()).currentMember.id;
  task=(await owner.action('createDeliverable',{boardId:c1.boardId,title:'Campanha de primavera',kind:'carousel',slideCount:3,assigneeId:editorId,dueAt:'2026-10-01T15:00:00Z',notes:'Composição orgânica e luz natural.'})).id;
  hiddenTask=(await owner.action('createDeliverable',{boardId:c1.boardId,title:'Planejamento interno',kind:'static',slideCount:1,assigneeId:ownerId,dueAt:'2026-10-02T15:00:00Z'})).id;
  const workspace=await editor.workspace();assert.equal(workspace.clients.length,1);assert.deepEqual(workspace.deliverables.map(t=>t.id),[task]);assert.equal(workspace.transactions.length,0);assert.equal(workspace.crmLeads.length,0);assert.equal(workspace.clients[0].revenue,0);
  assert(!/passwordHash|tokenHash|setupToken/.test(JSON.stringify(workspace)));
  await editor.action('updateDeliverable',{id:hiddenTask,status:'production'},403);
  await editor.action('updateDeliverable',{id:task,title:'Escalando permissão'},403);
  await editor.action('updateDeliverable',{id:task,status:'approved'},403);
  await editor.action('updateDeliverable',{id:task,status:'production'});
  await editor.action('updateDeliverable',{id:task,status:'review'});
  await reader.action('updateDeliverable',{id:task,status:'production'},403);
  await reader.action('createClient',{name:'Não autorizado'},403);
  await reader.action('inviteMember',{role:'editor'},403);
 });
 await check('Acesso explícito à pasta, pesquisa de equipe e reassociação',async()=>{
  await owner.action('assignClientMember',{clientId:c1.clientId,memberId:editorId});
  assert.equal((await editor.workspace()).deliverables.length,2);
  await editor.action('updateDeliverable',{id:task,title:'Campanha de primavera'});
  await owner.action('updateDeliverable',{id:task,assigneeId:ownerId});
  await owner.action('assignClientMember',{clientId:c1.clientId,memberId:editorId,remove:true});
  assert.equal((await editor.workspace()).clients.length,0);
  await owner.action('updateDeliverable',{id:task,assigneeId:editorId});
  await owner.action('updateDeliverable',{id:task,assigneeId:readerId},400);
  await owner.action('updateDeliverable',{id:task,assigneeId:(await outside.workspace()).currentMember.id},400);
 });
 await check('Pastas, pauta, referências e validação de dados',async()=>{
  await owner.action('createBoard',{clientId:c1.clientId,period:'OUT • 2026'});
  await owner.action('saveSlides',{deliverableId:task,expectedSlideIds:(await owner.workspace()).deliverables.find(t=>t.id===task).slides.map(s=>s.id),slides:[{position:1,copy:'Um novo olhar',direction:'Foto editorial'},{position:2,copy:'Conheça a coleção',direction:'Detalhes'}]});
  assert.equal((await owner.workspace()).deliverables.find(t=>t.id===task).slideCount,2);
  await owner.action('saveSlides',{deliverableId:task,slides:[]},400);
  await owner.action('createDeliverableReference',{deliverableId:task,url:'https://example.com/referencia',description:'Moodboard'});
  await owner.action('createDeliverableReference',{deliverableId:task,url:'javascript:alert(1)'},400);
  await owner.action('updateDeliverable',{id:task,dueAt:'impossível'},400);
  await owner.action('createDeliverable',{boardId:otherClient.boardId,title:'Invasão',kind:'static',slideCount:1,assigneeId:null,dueAt:'2026-10-01'},403);
 });
 await check('Pauta: duas edições da mesma versão não sobrescrevem o trabalho salvo',async()=>{
  const original=(await owner.workspace()).deliverables.find(t=>t.id===task).slides;
  const revision=original.map(s=>s.id);
  const winner=original.map(s=>({...s,copy:s.position===1?'Primeira edição salva':s.copy}));
  const saved=await owner.action('saveSlides',{deliverableId:task,expectedSlideIds:revision,slides:winner});
  await owner.action('saveSlides',{deliverableId:task,expectedSlideIds:revision,slides:original},409);
  assert.equal((await owner.workspace()).deliverables.find(t=>t.id===task).slides[0].copy,'Primeira edição salva');
  const refreshed=(await owner.workspace()).deliverables.find(t=>t.id===task).slides;
  assert.deepEqual(saved.slideIds,refreshed.map(s=>s.id));
  await owner.action('saveSlides',{deliverableId:task,expectedSlideIds:saved.slideIds,slides:original});
  await owner.action('saveSlides',{deliverableId:task,slides:original},400);
 });
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4QAAAABJRU5ErkJggg==','base64');
 async function upload(actor,purpose,targetId,bytes=png,mimeType='image/png'){
  const ticket=await actor.req('/api/uploads/init',{purpose,targetId,fileName:'teste.'+(mimeType==='application/pdf'?'pdf':'png'),fileSize:bytes.length,mimeType,...(purpose==='attachment'?{slidePosition:1}:{})});
  const put=await fetch(new URL(ticket.url,base),{method:'PUT',headers:{Origin:base,Cookie:actor.cookie,'Content-Type':mimeType},body:bytes});assert.equal(put.status,200);
  await actor.req('/api/uploads/complete',{id:ticket.id});await actor.req('/api/uploads/complete',{id:ticket.id},400);return ticket.id;
 }
 let asset,attachment;
 await check('Arquivos privados: envio, versão, leitura, revisão e exclusão',async()=>{
  asset=await upload(editor,'asset',task);await upload(editor,'asset',task);
  attachment=await upload(editor,'attachment',task);
  const ws=await owner.workspace();assert.equal(ws.deliverables.find(t=>t.id===task).assets.length,2);assert.equal(ws.deliverables.find(t=>t.id===task).assets[1].version,2);
  let r=await fetch(base+'/api/assets/'+asset,{headers:{Cookie:owner.cookie}});assert.equal(r.status,200);assert.equal((await r.arrayBuffer()).byteLength,png.length);
  r=await fetch(base+'/api/assets/'+asset,{headers:{Cookie:outside.cookie}});assert.equal(r.status,403);
  await reader.req('/api/uploads/init',{purpose:'asset',targetId:task,fileName:'x.png',mimeType:'image/png',fileSize:10},403);
  await editor.req('/api/uploads/init',{purpose:'asset',targetId:hiddenTask,fileName:'x.png',mimeType:'image/png',fileSize:10},403);
  await owner.req('/api/uploads/init',{purpose:'attachment',targetId:task,fileName:'x.png',mimeType:'image/png',fileSize:10,slidePosition:30},400);
  await owner.req('/api/uploads/init',{purpose:'asset',targetId:task,fileName:'limite.png',mimeType:'image/png',fileSize:50*1024*1024});
  const oversized=await owner.req('/api/uploads/init',{purpose:'asset',targetId:task,fileName:'grande.png',mimeType:'image/png',fileSize:50*1024*1024+1},400);
  assert.match(oversized.error,/50 MB/);
  await editor.action('addAnnotation',{assetId:asset,slideNumber:1,x:40,y:25,comment:'Revisão sem acesso completo'},403);
  const note=(await owner.action('addAnnotation',{assetId:asset,slideNumber:1,x:40,y:25,comment:'Ajustar contraste do título'})).annotation;
  await editor.action('resolveAnnotation',{id:note.id,status:'resolved'});
  await reader.action('resolveAnnotation',{id:note.id,status:'open'},403);
  await owner.action('updateDeliverable',{id:task,status:'approved'});
  await editor.req('/api/attachments/'+attachment,null,403,'DELETE');
  await owner.req('/api/attachments/'+attachment,null,200,'DELETE');
  await upload(owner,'avatar',c1.clientId);
  assert.equal((await fetch(base+'/api/clients/'+c1.clientId+'/media?kind=avatar',{headers:{Cookie:owner.cookie}})).status,200);
  await owner.req('/api/clients/'+c1.clientId+'/media?kind=avatar',null,200,'DELETE');
 });
 let txId,workerId,competencyId,lead,deal;
 await check('Financeiro: previsão, parcial, quitação, reabertura e arquivo',async()=>{
  assert.equal((await owner.workspace()).transactions.filter(t=>t.clientId===c1.clientId).length,12);
  const input={type:'expense',amount:120000,category:'Software',status:'open',competence:'2026-09',dueDate:'2026-09-30',clientId:null,recurring:false,description:'Ferramentas da agência'};
  await owner.action('createTransaction',input);
  txId=(await owner.workspace()).transactions.find(t=>t.description===input.description).id;
  await owner.action('updateTransaction',{id:txId,status:'partial',paidAmount:30000});
  await owner.action('updateTransaction',{id:txId,status:'partial',paidAmount:130000},400);
  await owner.action('updateTransaction',{id:txId,status:'paid'});
  assert.equal((await owner.workspace()).transactions.find(t=>t.id===txId).paidAmount,120000);
  await owner.action('updateTransaction',{id:txId,status:'open'});
  const reopened=(await owner.workspace()).transactions.find(t=>t.id===txId);assert.equal(reopened.paidAmount,0);assert.equal(reopened.paymentDate,null);
  await owner.action('duplicateTransaction',{id:txId});
  const copy=(await owner.workspace()).transactions.find(t=>t.description.includes('(cópia)'));await owner.action('archiveTransaction',{id:copy.id});assert((await owner.workspace()).transactions.find(t=>t.id===copy.id).archivedAt);
  const recurring=await owner.action('createTransaction',{...input,description:'Serviço recorrente',recurring:true,recurrence:'monthly'});assert.equal(recurring.forecasts,11);assert.equal((await owner.workspace()).transactions.filter(t=>t.description==='Serviço recorrente').length,12);
  await owner.action('createTransaction',{...input,status:'partial',paidAmount:200000},400);
  await editor.action('createTransaction',input,403);
  await outside.action('updateTransaction',{id:txId,status:'paid'},404);
  await upload(owner,'transaction',txId);await upload(owner,'transaction',txId);
 });
 await check('Equipe financeira: competência idempotente, notas e ajustes',async()=>{
  await owner.action('createFinanceWorker',{name:'Fornecedor Criativo',employmentType:'pj',monthlyAmount:200000,paymentDay:31,invoiceRequired:true});
  workerId=(await owner.workspace()).financeWorkers[0].id;
  await owner.action('updateFinanceWorker',{id:workerId,monthlyAmount:210000});
  await owner.action('createWorkerCompetency',{workerId,competence:'2026-02'});await owner.action('createWorkerCompetency',{workerId,competence:'2026-02'});
  const rows=(await owner.workspace()).workerCompetencies;assert.equal(rows.length,1);assert(rows[0].dueDate.startsWith('2026-02-28'));competencyId=rows[0].id;
  await owner.action('updateWorkerCompetency',{id:competencyId,adjustments:-300000},400);
  await upload(owner,'competency',competencyId);
  assert.equal((await owner.workspace()).workerCompetencies[0].invoiceStatus,'received');
  await owner.action('updateWorkerCompetency',{id:competencyId,invoiceStatus:'validated',status:'paid'});
 });
 await check('CRM: lead, conversão idempotente, negócio e atividades',async()=>{
  lead=(await owner.action('createCrmLead',{company:'Casa Aurora',potentialValue:480000,nextAction:'Agendar conversa',nextActionAt:'2026-10-01T13:00:00Z'})).id;
  await owner.action('updateCrmLead',{id:lead,status:'qualifying',score:75});
  deal=(await owner.action('convertCrmLead',{id:lead,value:480000})).dealId;
  assert.equal((await owner.action('convertCrmLead',{id:lead,value:480000})).dealId,deal);
  await owner.action('updateCrmDeal',{id:deal,stage:'proposal'});
  await owner.action('updateCrmDeal',{id:deal,stage:'lost'},400);
  await owner.action('updateCrmDeal',{id:deal,stage:'won'});
  assert.equal((await owner.workspace()).crmDeals.find(d=>d.id===deal).probability,100);
  await owner.action('createCrmDeal',{company:'Ateliê Âmbar',value:360000});
  await owner.action('createCrmActivity',{leadId:lead,type:'meeting',title:'Reunião inicial'});
  await owner.action('completeCrmActivity',{id:(await owner.workspace()).crmActivities[0].id});
  await outside.action('updateCrmLead',{id:lead,status:'sql'},404);
  await outside.action('createCrmActivity',{leadId:lead,type:'note',title:'Escopo inválido'},403);
  await owner.action('updateClientCrm',{id:c1.clientId,status:'active',contactName:'Vanessa',email:'vanessa@example.invalid',revenue:270000,dueDay:10});
 });
 await check('Múltiplas agências na mesma conta, troca e desativação local',async()=>{
  const invitation=await outside.action('inviteMember',{role:'editor',clientAccessMode:'all'});
  await editor.action('acceptInvite',{token:new URL(invitation.link).searchParams.get('invite')});
  const ws=await editor.workspace();assert.equal(ws.agencies.length,2);assert.equal(ws.clients.length,1);assert.equal(ws.clients[0].id,otherClient.clientId);
  await editor.action('switchAgency',{agencyId:agency});
  await owner.action('deactivateMember',{id:editorId});await editor.workspace(401);
  await editor.action('switchAgency',{agencyId:otherAgency});assert.equal((await editor.workspace()).agency.id,otherAgency);
  await owner.action('updateMember',{id:editorId,status:'active',permissions:['clients.view','demands.execute']});
  await editor.action('switchAgency',{agencyId:agency});
  await owner.action('updateMember',{id:readerId,role:'viewer',permissions:[]});
  await owner.action('updateMember',{id:ownerId,role:'viewer'},400);
  const revoked=await owner.action('inviteMember',{role:'viewer'});const rows=(await owner.workspace()).invites;await owner.action('revokeInvite',{id:rows.find(i=>!i.usedAt&&!i.revokedAt).id});
  await outside.action('acceptInvite',{token:new URL(revoked.link).searchParams.get('invite')},400);
 });
 await check('Permissões vazias não concedem acesso; origem externa bloqueada',async()=>{
  await owner.action('updateMember',{id:editorId,permissions:[]});const ws=await editor.workspace();assert.equal(ws.currentMember.permissions.length,0);assert.equal(ws.clients.length,0);
  await editor.action('updateDeliverable',{id:task,status:'production'},403);
  await owner.req('/api/actions',{action:'createAgency',name:'CSRF'},403,'POST',{Origin:'https://outro.example.invalid'});
  await owner.action('updateMember',{id:editorId,permissions:['clients.view','demands.create','demands.execute'],clientIds:[c1.clientId]});
 });
 await check('Editor com pasta liberada cria pastas sem gerenciar clientes',async()=>{
  await editor.action('createBoard',{clientId:c1.clientId,period:'NOV • 2026'});
  await editor.action('createBoard',{clientId:c2.clientId,period:'NOV • 2026'},403);
  await reader.action('createBoard',{clientId:c1.clientId,period:'NOV • 2026'},403);
 });
 await check('CRM sem financeiro edita contato e status sem alterar cobranças',async()=>{
  const before=await owner.workspace();
  const contact={id:c1.clientId,status:'active',contactName:'Vanessa Lopes',phone:'11900000000',email:'vanessa@example.invalid',notes:'Contato atualizado'};
  await owner.action('updateMember',{id:editorId,permissions:['clients.view','demands.create','demands.execute','crm.access']});
  await editor.action('updateClientCrm',contact);
  await editor.action('updateClientCrm',{...contact,status:'inactive'});
  await editor.action('updateClientCrm',{...contact,revenue:1},403);
  await editor.action('updateClientCrm',{...contact,dueDay:1},403);
  await editor.action('updateClientCrm',{...contact,id:c2.clientId},403);
  await editor.action('updateClientCrm',contact);
  const after=await owner.workspace(),client=after.clients.find(c=>c.id===c1.clientId),previous=before.clients.find(c=>c.id===c1.clientId);
  assert.equal(client.contactName,contact.contactName);
  assert.equal(client.revenue,previous.revenue);assert.equal(client.dueDay,previous.dueDay);
  assert.deepEqual(after.transactions,before.transactions);
  assert.equal((await editor.workspace()).clients.find(c=>c.id===c1.clientId).revenue,0);
  await owner.action('updateMember',{id:editorId,permissions:['clients.view','demands.create','demands.execute']});
 });
 await check('Administrador atua na agência sem conceder administração ou alterar proprietário',async()=>{
  const invitation=await owner.action('inviteMember',{role:'admin',clientAccessMode:'selected',clientIds:[]});
  await outside.action('acceptInvite',{token:new URL(invitation.link).searchParams.get('invite')});
  const ws=await outside.workspace();assert.equal(ws.currentMember.role,'admin');assert.equal(ws.clients.length,2);
  await outside.action('inviteMember',{role:'admin'},403);
  await outside.action('updateMember',{id:readerId,role:'admin'},403);
  await outside.action('updateMember',{id:ownerId,role:'editor'},400);
  await outside.action('updateClient',{id:otherClient.clientId,driveUrl:''},403);
  await outside.action('switchAgency',{agencyId:otherAgency});
  await owner.action('deactivateMember',{id:ws.currentMember.id});
  assert.equal((await outside.workspace()).agency.id,otherAgency);
 });
 await check('Alteração direta de senha indisponível preserva credenciais e sessão',async()=>{
  const next='Nova-Senha-Perfil-2026!';
  const previousCookie=outside.cookie;
  const countBefore=(await readdir(mailDir)).length;
  const rejected=await outside.auth('change-password',{currentPassword:password,password:next,confirmation:next},400);
  assert.equal(rejected.error,'Ação inválida.');
  assert.equal(outside.cookie,previousCookie);
  assert.equal((await outside.workspace()).agency.id,otherAgency);
  assert.equal((await readdir(mailDir)).length,countBefore);
  await outside.auth('login',{password:next},401);
  await outside.auth('login',{password});
 });
 await check('Senha: link único, senha antiga recusada e sessões encerradas',async()=>{
  const previousCookie=reader.cookie;
  await reader.auth('forgot');const html=await emailFor(reader,'Redefina');const link=html.match(/href="([^"]+)"/)[1].replaceAll('&amp;','&');const url=new URL(link);const fields={id:url.searchParams.get('id'),token:url.searchParams.get('token'),password:'Nova-Senha-QA-2026!'};
  await reader.auth('reset',fields);await reader.auth('reset',fields,400);
  reader.cookie=previousCookie;await reader.workspace(401);
  await reader.auth('login',{password},401);await reader.auth('login',{password:fields.password});
  await reader.auth('profile',{name:'Clara Alves',profession:'account'});
  await reader.auth('logout');await reader.workspace(401);
 });
 await check('Exclusões verificadas e dados persistidos após recarregar',async()=>{
  const temporary=await owner.action('createClient',{name:'Cliente temporário'});
  await owner.action('deleteClient',{id:temporary.clientId},409);await owner.action('updateClientStatus',{id:temporary.clientId,status:'inactive'});await owner.action('updateClientStatus',{id:temporary.clientId,status:'active'});await owner.action('updateClientStatus',{id:temporary.clientId,status:'inactive'});await owner.action('deleteClient',{id:temporary.clientId});
  await owner.action('deleteDeliverable',{id:hiddenTask});assert(!(await owner.workspace()).deliverables.some(t=>t.id===hiddenTask));
  assert.equal((await owner.workspace()).clients.length,2);
 });
 await check('Cliente: retries simultâneos criam um cadastro, uma pauta e uma previsão por mês',async()=>{
  const requestId=crypto.randomUUID();
  const payload={requestId,name:'Cliente QA idempotência',period:'Pauta única',revenue:12000,dueDay:9};
  const results=await Promise.all(Array.from({length:3},()=>owner.action('createClient',payload)));
  assert.equal(new Set(results.map(r=>r.clientId)).size,1);
  assert.equal(new Set(results.map(r=>r.boardId)).size,1);
  assert.equal(results.filter(r=>!r.replayed).length,1);
  const clientId=results[0].clientId;
  const replay=await owner.action('createClient',{...payload,name:'Não sobrescrever',revenue:99999});
  assert.equal(replay.clientId,clientId);assert.equal(replay.replayed,true);
  const ws=await owner.workspace();
  assert.equal(ws.clients.filter(c=>c.id===clientId).length,1);
  assert.equal(ws.clients.find(c=>c.id===clientId).name,payload.name);
  assert.equal(ws.boards.filter(b=>b.clientId===clientId).length,1);
  const forecasts=ws.transactions.filter(t=>t.clientId===clientId);
  assert.equal(forecasts.length,12);assert(forecasts.every(t=>t.amount===12000));
  await owner.action('updateClientStatus',{id:clientId,status:'inactive'});
  await owner.action('deleteClient',{id:clientId});
 });
 await check('Imagem do cliente: limite de 20 MB, vínculo, leitura privada e troca com URL nova',async()=>{
  for(const purpose of ['avatar','banner']){
   await owner.req('/api/uploads/init',{purpose,targetId:c1.clientId,fileName:'limite.png',mimeType:'image/png',fileSize:20*1024*1024});
   const over=await owner.req('/api/uploads/init',{purpose,targetId:c1.clientId,fileName:'grande.png',mimeType:'image/png',fileSize:20*1024*1024+1},400);
   assert.match(over.error,/20 MB/);
   await owner.req('/api/uploads/init',{purpose,targetId:c1.clientId,fileName:'documento.pdf',mimeType:'application/pdf',fileSize:20},400);
   await upload(owner,purpose,c1.clientId);
  }
  const first=(await owner.workspace()).clients.find(c=>c.id===c1.clientId);
  for(const url of [first.avatarUrl,first.bannerUrl]){
   assert(url);
   const response=await fetch(base+url,{headers:{Cookie:owner.cookie}});
   assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');
   assert.deepEqual(Buffer.from(await response.arrayBuffer()),png);
   assert.equal((await fetch(base+url,{headers:{Cookie:outside.cookie}})).status,403);
   assert.equal((await fetch(base+url)).status,403);
  }
  await upload(owner,'avatar',c1.clientId);
  assert.notEqual((await owner.workspace()).clients.find(c=>c.id===c1.clientId).avatarUrl,first.avatarUrl);
  for(const kind of ['avatar','banner'])await owner.req(`/api/clients/${c1.clientId}/media?kind=${kind}`,null,200,'DELETE');
 });
 return {owner,editor,reader,outside,agency,c1,task,password,emailFor};
}
