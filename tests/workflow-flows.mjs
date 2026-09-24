import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

export async function runWorkflowFlows({Actor,register,check,outside,upload}) {
 const owner=new Actor('workflow-owner@example.invalid','Joana Gestão');
 const copy=new Actor('workflow-copy@example.invalid','Camila Copy');
 const design=new Actor('workflow-design@example.invalid','Felipe Design');
 let client,copyId,designId,ownerId,task,config,coverId;
 const label={id:randomUUID(),name:'Campanha urgente',color:'#EEDDAA'};
 const board=async()=> (await owner.workspace()).kanbanBoards.find(b=>b.kind==='demands'&&b.clientId===client.clientId);
 const save=async columns=>{config=await board();await owner.action('saveKanbanColumns',{kind:'demands',clientId:client.clientId,expectedRevision:config.revision,columns,moves:[]});config=await board();};
 await check('Fluxo: etapas configuradas sem ampliar o acesso dos executores à pasta',async()=>{
  for(const person of [owner,copy,design])await register(person);
  await owner.action('createAgency',{name:'Agência Workflow QA'});
  client=await owner.action('createClient',{name:'Cliente Workflow QA',period:'SET • 2026'});
  ownerId=(await owner.workspace()).currentMember.id;
  for(const person of [copy,design]){const invitation=await owner.action('inviteMember',{role:'editor',permissions:['clients.view','demands.execute'],clientIds:[],clientAccessMode:'selected'});await person.action('acceptInvite',{token:new URL(invitation.link).searchParams.get('invite')});}
  copyId=(await copy.workspace()).currentMember.id;designId=(await design.workspace()).currentMember.id;
  config=await board();
  await save(config.columns.map(c=>({...c,...({briefing:{name:'Copy',assigneeId:copyId,dueHours:12,nextColumnId:'production'},production:{name:'Design',assigneeId:designId,dueHours:18,nextColumnId:'review'},review:{name:'Conferência',assigneeId:ownerId,dueHours:6,nextColumnId:'approved'},changes:{name:'Alterações do design',assigneeId:designId,dueHours:4,nextColumnId:'review'}}[c.id]||{})})));
  const before=config;
  await owner.action('saveKanbanColumns',{kind:'demands',clientId:client.clientId,expectedRevision:config.revision,columns:config.columns.map(c=>c.id==='production'?{...c,assigneeId:(outside.id||randomUUID())}:c),moves:[]},409);
  assert.deepEqual(await board(),before);
  assert.equal((await design.workspace()).deliverables.length,0);
 });
 await check('Fluxo: criação urgente aplica responsável, prazo e notificação apenas ao destinatário',async()=>{
  const start=Date.now();
  task=(await owner.action('createDeliverable',{boardId:client.boardId,title:'Campanha com passagem de etapas',kind:'static',slideCount:1,assigneeId:null,dueAt:'2030-10-01T13:00:00Z',priority:'urgent',labels:[label]})).id;
  const ws=await copy.workspace();const row=ws.deliverables.find(t=>t.id===task);
  assert.equal(row.assigneeId,copyId);assert.equal(row.assignedById,ownerId);assert.equal(row.priority,'urgent');assert.deepEqual(row.labels,[label]);
  assert(Math.abs(Date.parse(row.dueAt)-start-12*3_600_000)<10_000);
  assert.equal(ws.notifications.filter(n=>n.deliverableId===task&&n.kind==='urgent').length,1);
  const notice=ws.notifications[0];
  await design.action('markNotificationRead',{id:notice.id},404);
  await outside.action('markNotificationRead',{id:notice.id},404);
  await copy.action('markNotificationRead',{id:notice.id});assert((await copy.workspace()).notifications[0].readAt);
  assert.equal((await design.workspace()).clients.length,0);
  assert(!(await owner.workspace()).notifications.some(n=>n.deliverableId===task));
 });
 await check('Fluxo: concluir copy transfere para design, muda prazo e remove leitura/edição anterior',async()=>{
  await copy.action('updateDeliverable',{id:task,priority:'normal'},403);
  await copy.action('updateDeliverable',{id:task,completeStage:true,expectedColumnId:'changes'},409);
  const start=Date.now();await copy.action('updateDeliverable',{id:task,completeStage:true,expectedColumnId:'briefing'});
  const ws=await design.workspace();const row=ws.deliverables.find(t=>t.id===task);
  assert.equal(row.columnId,'production');assert.equal(row.assigneeId,designId);assert.equal(row.assignedById,copyId);
  assert(Math.abs(Date.parse(row.dueAt)-start-18*3_600_000)<10_000);
  assert(ws.notifications.some(n=>n.deliverableId===task&&n.kind==='urgent'&&!n.readAt));
  const old=await copy.workspace();assert.equal(old.deliverables.length,0);assert.equal(old.clients.length,0);assert.equal(old.notifications.length,0);
  await copy.action('updateDeliverable',{id:task,completeStage:true,expectedColumnId:'briefing'},403);
  await design.action('updateDeliverable',{id:task,columnId:'approved'},403);
 });
 await check('Fluxo: conferência recebe entrega, alteração volta ao designer e aprovação encerra',async()=>{
  await design.action('updateDeliverable',{id:task,completeStage:true,expectedColumnId:'production'});
  let row=(await owner.workspace()).deliverables.find(t=>t.id===task);assert.equal(row.assigneeId,ownerId);assert.equal(row.status,'review');
  assert.equal((await design.workspace()).deliverables.length,0);
  await owner.action('updateDeliverable',{id:task,columnId:'changes'});
  row=(await design.workspace()).deliverables.find(t=>t.id===task);assert.equal(row.status,'changes');assert.equal(row.assigneeId,designId);
  await design.action('updateDeliverable',{id:task,completeStage:true,expectedColumnId:'changes'});
  await owner.action('updateDeliverable',{id:task,completeStage:true,expectedColumnId:'review'});
  const ws=await owner.workspace();row=ws.deliverables.find(t=>t.id===task);assert.equal(row.status,'approved');assert(ws.notifications.some(n=>n.deliverableId===task&&n.message==='Demanda aprovada.'));
  await owner.action('updateDeliverable',{id:task,completeStage:true,expectedColumnId:'review'},409);
 });
 await check('Classificação e capas: persiste escolhas, rejeita arquivos de outra demanda e etiquetas inválidas',async()=>{
  await upload(owner,'attachment',task);
  let row=(await owner.workspace()).deliverables.find(t=>t.id===task);coverId=row.attachments[0].id;
  for(const mode of ['image','full','none','auto']){
   await owner.action('updateDeliverable',{id:task,cover:{mode,fileId:coverId,fileKind:'attachment'}});
   row=(await owner.workspace()).deliverables.find(t=>t.id===task);assert.equal(row.coverMode,mode);assert.equal(row.coverFileId,['none','auto'].includes(mode)?null:coverId);
  }
  const other=(await owner.action('createDeliverable',{boardId:client.boardId,columnId:'production',title:'Outra demanda de capa',kind:'static',slideCount:1,assigneeId:null,dueAt:'2030-10-01T13:00:00Z'})).id;
  await owner.action('updateDeliverable',{id:other,cover:{mode:'full',fileId:coverId,fileKind:'attachment'}},400);
  await owner.action('updateDeliverable',{id:task,labels:[label,label]},400);
  const renamed={...label,name:'Aprovada para publicar',color:'#DFF3EB'};
  await owner.action('updateDeliverable',{id:task,priority:'high',labels:[renamed]});
  row=(await owner.workspace()).deliverables.find(t=>t.id===task);assert.equal(row.priority,'high');assert.deepEqual(row.labels,[renamed]);
  const lead=(await owner.action('createCrmLead',{company:'Lead urgente QA',potentialValue:0,priority:'urgent',labels:[label]})).id;
  await owner.action('updateCrmLead',{id:lead,priority:'low',labels:[renamed]});
  const result=(await owner.workspace()).crmLeads.find(l=>l.id===lead);assert.equal(result.priority,'low');assert.deepEqual(result.labels,[renamed]);
 });
 await check('Fluxo: responsável sem permissão bloqueia transferência inteira, sem notificação ou perda de etapa',async()=>{
  await owner.action('updateMember',{id:designId,permissions:['clients.view'],clientIds:[],clientAccessMode:'selected'});
  const before=(await owner.workspace()).deliverables.find(t=>t.id===task);
  await owner.action('updateDeliverable',{id:task,columnId:'production'},409);
  assert.deepEqual((await owner.workspace()).deliverables.find(t=>t.id===task),before);
  await owner.action('updateMember',{id:designId,permissions:['clients.view','demands.execute'],clientIds:[],clientAccessMode:'selected'});
 });
 return {owner,copy,design,client,task,copyId,designId,ownerId,coverId};
}
