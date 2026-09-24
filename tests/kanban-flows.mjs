import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

export function kanbanBoard(workspace,kind,clientId=null) {
 const board=workspace.kanbanBoards.find(item=>item.kind===kind&&item.clientId===clientId);
 assert(board,`Quadro ${kind}/${clientId} deve estar disponível`);
 return board;
}

export async function runKanbanFlows({Actor,register,check,outside,foreignClientId}) {
 const owner=new Actor('kanban-owner@example.invalid','Lia Kanban');
 const editor=new Actor('kanban-editor@example.invalid','Rui Kanban');
 const reader=new Actor('kanban-reader@example.invalid','Ana Kanban');
 let client,secondClient,editorId,task,approved,agency;
 const get=async(kind,clientId=null)=>kanbanBoard(await owner.workspace(),kind,clientId);
 async function save(kind,clientId,columns,moves=[],actor=owner) {
  const before=await get(kind,clientId);
  await actor.action('saveKanbanColumns',{kind,...(clientId?{clientId}:{}),expectedRevision:before.revision,columns,moves});
  const after=await get(kind,clientId);
  assert.equal(after.revision,before.revision+1);
  assert.deepEqual(after.columns,columns);
  return after;
 }
 const custom=(name='Lista personalizada')=>({id:randomUUID(),name,color:'#B8D4C6',status:null});

 await check('Kanban: padrões preservados e fixtures isoladas por agência/cliente',async()=>{
  for(const actor of [owner,editor,reader])await register(actor);
  agency=(await owner.action('createAgency',{name:'Estúdio Kanban QA'})).agencyId;
  client=await owner.action('createClient',{name:'Cliente Kanban API',period:'SET • 2026'});
  secondClient=await owner.action('createClient',{name:'Cliente independente QA',period:'SET • 2026'});
  for(const [actor,role] of [[editor,'editor'],[reader,'viewer']]){
   const invitation=await owner.action('inviteMember',{role,clientAccessMode:'selected',clientIds:[client.clientId]});
   await actor.action('acceptInvite',{token:new URL(invitation.link).searchParams.get('invite')});
  }
  editorId=(await editor.workspace()).currentMember.id;
  const workspace=await owner.workspace();
  const defaults={demands:['briefing','production','review','changes','approved'],crmLeads:['new','research','contacting','connected','qualifying','sql','nurture','disqualified'],crmDeals:['discovery','solution','proposal','negotiation','decision','contract','won','lost'],crmClients:['prospecting','active','inactive']};
  for(const [kind,statuses] of Object.entries(defaults)){
   const board=kanbanBoard(workspace,kind,kind==='demands'?client.clientId:null);
   assert.equal(board.revision,0);
   assert.deepEqual(board.columns.map(column=>column.status),statuses);
   for(const column of board.columns){assert.equal(column.id,column.status);assert.match(column.color,/^#[\da-f]{6}$/i);assert(column.name.trim());}
  }
  task=(await owner.action('createDeliverable',{boardId:client.boardId,title:'Demanda Kanban API',kind:'static',slideCount:1,dueAt:'2030-10-01T13:00:00Z',assigneeId:editorId})).id;
  approved=(await owner.action('createDeliverable',{boardId:client.boardId,title:'Demanda aprovada preservada',kind:'static',slideCount:1,dueAt:'2030-10-01T13:00:00Z',assigneeId:editorId})).id;
  await owner.action('updateDeliverable',{id:approved,status:'approved'});
  assert.equal((await owner.workspace()).deliverables.find(item=>item.id===task).columnId,'briefing');
 });

 let demandCustom;
 await check('Kanban: renomear, colorir, ordenar e criar listas sem alterar significado ou outro cliente',async()=>{
  const beforeSecond=await get('demands',secondClient.clientId);
  const initial=await get('demands',client.clientId);demandCustom=custom('Em diagramação');
  const columns=[demandCustom,...initial.columns.map(column=>column.id==='briefing'?{...column,name:'Entrada de pautas',color:'#B7C8EB'}:column).reverse()];
  const saved=await save('demands',client.clientId,columns);
  assert.equal(saved.columns.find(column=>column.id==='briefing').status,'briefing');
  assert.deepEqual(await get('demands',secondClient.clientId),beforeSecond);
  await owner.action('updateDeliverable',{id:task,columnId:demandCustom.id});
  let row=(await owner.workspace()).deliverables.find(item=>item.id===task);
  assert.equal(row.columnId,demandCustom.id);assert.equal(row.status,'briefing');
  const created=await owner.action('createDeliverable',{boardId:client.boardId,title:'Criada na lista personalizada',kind:'static',slideCount:1,assigneeId:null,dueAt:'2030-10-01T13:00:00Z',columnId:demandCustom.id});
  row=(await owner.workspace()).deliverables.find(item=>item.id===created.id);
  assert.equal(row.columnId,demandCustom.id);assert.equal(row.status,'briefing');
  await owner.action('createDeliverable',{boardId:secondClient.boardId,title:'Lista de outro cliente',kind:'static',slideCount:1,assigneeId:null,dueAt:'2030-10-01T13:00:00Z',columnId:demandCustom.id},409);
  await owner.action('updateDeliverable',{id:task,columnId:'production'});
  row=(await owner.workspace()).deliverables.find(item=>item.id===task);
  assert.equal(row.status,'production');assert.equal(row.columnId,'production');
 });

 await check('Kanban: revisões antigas e remoção sem destino falham sem escrita parcial',async()=>{
  const before=await get('demands',client.clientId);
  const saved=await save('demands',client.clientId,before.columns.map(column=>column.id===demandCustom.id?{...column,color:'#AABBDD'}:column));
  await owner.action('saveKanbanColumns',{kind:'demands',clientId:client.clientId,expectedRevision:before.revision,columns:before.columns,moves:[]},409);
  assert.deepEqual(await get('demands',client.clientId),saved);
  await owner.action('saveKanbanColumns',{kind:'demands',clientId:client.clientId,expectedRevision:saved.revision,columns:saved.columns.filter(column=>column.id!=='production'),moves:[]},400);
  assert.deepEqual(await get('demands',client.clientId),saved);
  const invalid=saved.columns.map(column=>column.id==='approved'?{...column,status:'briefing'}:column);
  await owner.action('saveKanbanColumns',{kind:'demands',clientId:client.clientId,expectedRevision:saved.revision,columns:invalid,moves:[]},400);
  assert.deepEqual(await get('demands',client.clientId),saved);
 });

 await check('Kanban: leitor, execução isolada e outra agência não configuram listas',async()=>{
  const board=await get('demands',client.clientId);
  const payload={kind:'demands',clientId:client.clientId,expectedRevision:board.revision,columns:board.columns,moves:[]};
  await reader.action('saveKanbanColumns',payload,403);
  await outside.action('saveKanbanColumns',payload,403);
  await owner.action('saveKanbanColumns',{...payload,clientId:foreignClientId},403);
  await owner.action('updateMember',{id:editorId,permissions:['clients.view','demands.execute'],clientIds:[client.clientId]});
  await editor.action('saveKanbanColumns',payload,403);
  await editor.action('updateDeliverable',{id:task,columnId:demandCustom.id});
  assert.equal((await owner.workspace()).deliverables.find(item=>item.id===task).status,'production');
  await editor.action('updateDeliverable',{id:task,columnId:'approved'},403);
  await owner.action('updateMember',{id:editorId,permissions:['clients.view','demands.create','demands.execute'],clientAccessMode:'selected',clientIds:[]});
  await editor.action('saveKanbanColumns',payload,403);
  const restricted=await editor.workspace();
  assert(!restricted.kanbanBoards.some(item=>item.kind==='demands'&&item.clientId===secondClient.clientId));
  assert(!restricted.kanbanBoards.some(item=>item.kind.startsWith('crm')));
  await owner.action('updateMember',{id:editorId,permissions:['clients.view','demands.create','demands.execute'],clientIds:[client.clientId]});
  await save('demands',client.clientId,board.columns,[],editor);
 });

 await check('Kanban: remover ocupadas e a última lista mantém demandas e aprovação, inclusive quadro vazio',async()=>{
  let board=await get('demands',client.clientId);
  await save('demands',client.clientId,board.columns.filter(column=>column.id!=='approved'),[{fromColumnId:'approved',toColumnId:demandCustom.id}]);
  let row=(await owner.workspace()).deliverables.find(item=>item.id===approved);
  assert.equal(row.columnId,demandCustom.id);assert.equal(row.status,'approved');
  board=await get('demands',client.clientId);
  const beforeIds=(await owner.workspace()).deliverables.map(item=>item.id).sort();
  await save('demands',client.clientId,[],board.columns.map(column=>({fromColumnId:column.id,toColumnId:null})));
  const workspace=await owner.workspace();
  assert.deepEqual(workspace.deliverables.map(item=>item.id).sort(),beforeIds);
  assert(workspace.deliverables.every(item=>item.columnId===null));
  assert.equal(workspace.deliverables.find(item=>item.id===approved).status,'approved');
  assert.deepEqual((await get('demands',client.clientId)).columns,[]);
  const emptyCreated=await owner.action('createDeliverable',{boardId:client.boardId,title:'Criada sem listas',kind:'static',slideCount:1,assigneeId:null,dueAt:'2030-10-01T13:00:00Z'});
  assert.equal((await owner.workspace()).deliverables.find(item=>item.id===emptyCreated.id).columnId,null);
  const first=custom('Novo começo');await save('demands',client.clientId,[first]);
  await owner.action('updateDeliverable',{id:task,columnId:first.id});
  assert.equal((await owner.workspace()).deliverables.find(item=>item.id===task).columnId,first.id);
  await save('demands',client.clientId,[],[{fromColumnId:first.id,toColumnId:null}]);
 });

 await check('Kanban CRM: personalização independente, leads criados e movidos nas novas listas',async()=>{
  const outsideBefore=(await outside.workspace()).kanbanBoards;
  const dealsBefore=await get('crmDeals');
  const initial=await get('crmLeads');const first=custom('Contato por indicação');
  const columns=[first,...initial.columns.map(column=>column.id==='new'?{...column,name:'Novas conversas',color:'#EEDDAA'}:column).reverse()];
  await save('crmLeads',null,columns);
  const lead=await owner.action('createCrmLead',{company:'Lead na lista personalizada',potentialValue:45000,columnId:first.id});
  let row=(await owner.workspace()).crmLeads.find(item=>item.id===lead.id);
  assert.equal(row.columnId,first.id);assert.equal(row.status,'new');
  await owner.action('updateCrmLead',{id:lead.id,columnId:'qualifying'});
  row=(await owner.workspace()).crmLeads.find(item=>item.id===lead.id);
  assert.equal(row.columnId,'qualifying');assert.equal(row.status,'qualifying');
  await owner.action('updateCrmLead',{id:lead.id,columnId:first.id});
  assert.equal((await owner.workspace()).crmLeads.find(item=>item.id===lead.id).status,'qualifying');
  const converted=await owner.action('convertCrmLead',{id:lead.id,value:45000});
  assert.equal((await owner.action('convertCrmLead',{id:lead.id,value:45000})).dealId,converted.dealId);
  const workspace=await owner.workspace();
  assert.equal(workspace.crmLeads.find(item=>item.id===lead.id).status,'sql');
  assert.equal(workspace.crmDeals.find(item=>item.id===converted.dealId).columnId,'discovery');
  assert.deepEqual(await get('crmDeals'),dealsBefore);
  assert.deepEqual((await outside.workspace()).kanbanBoards,outsideBefore);
  await save('crmLeads',null,[],columns.map(column=>({fromColumnId:column.id,toColumnId:null})));
  row=(await owner.workspace()).crmLeads.find(item=>item.id===lead.id);
  assert.equal(row.columnId,null);assert.equal(row.status,'sql');
  assert.deepEqual((await get('crmLeads')).columns,[]);
 });

 await check('Kanban CRM: ganho/perda e motivo preservados ao renomear, mover e remover listas',async()=>{
  const initial=await get('crmDeals');const first=custom('Aguardando retorno');
  const columns=[first,...initial.columns.map(column=>column.id==='won'?{...column,name:'Contrato fechado',color:'#C0DDCC'}:column)];
  await save('crmDeals',null,columns);
  const deal=await owner.action('createCrmDeal',{company:'Oportunidade de teste',value:99000,columnId:first.id});
  assert.equal((await owner.workspace()).crmDeals.find(item=>item.id===deal.id).columnId,first.id);
  await owner.action('updateCrmDeal',{id:deal.id,columnId:'lost'},400);
  await owner.action('updateCrmDeal',{id:deal.id,columnId:'won'});
  let row=(await owner.workspace()).crmDeals.find(item=>item.id===deal.id);
  assert.equal(row.stage,'won');assert.equal(row.probability,100);
  await owner.action('updateCrmDeal',{id:deal.id,columnId:first.id});
  row=(await owner.workspace()).crmDeals.find(item=>item.id===deal.id);
  assert.equal(row.stage,'won');assert.equal(row.probability,100);
  await owner.action('updateCrmDeal',{id:deal.id,columnId:'lost',lossReason:'Projeto adiado no teste'});
  row=(await owner.workspace()).crmDeals.find(item=>item.id===deal.id);
  assert.equal(row.stage,'lost');assert.equal(row.probability,0);assert.equal(row.lossReason,'Projeto adiado no teste');
  const won=await owner.action('createCrmDeal',{company:'Ganho preservado',value:50000});
  await owner.action('updateCrmDeal',{id:won.id,columnId:'won'});
  await save('crmDeals',null,[],columns.map(column=>({fromColumnId:column.id,toColumnId:null})));
  const workspace=await owner.workspace();
  assert.equal(workspace.crmDeals.find(item=>item.id===won.id).stage,'won');
  row=workspace.crmDeals.find(item=>item.id===deal.id);
  assert.equal(row.stage,'lost');assert.equal(row.columnId,null);assert.equal(row.lossReason,'Projeto adiado no teste');
 });

 await check('Kanban CRM clientes: remover listas preserva cadastro, status e previsões financeiras',async()=>{
  const initial=await get('crmClients');const first=custom('Acompanhamento');
  const columns=[...initial.columns,first];await save('crmClients',null,columns);
  const before=await owner.workspace();
  await owner.action('updateClientCrm',{id:client.clientId,columnId:first.id});
  let row=(await owner.workspace()).clients.find(item=>item.id===client.clientId);
  assert.equal(row.columnId,first.id);assert.equal(row.status,'active');
  await save('crmClients',null,[],columns.map(column=>({fromColumnId:column.id,toColumnId:null})));
  const after=await owner.workspace();row=after.clients.find(item=>item.id===client.clientId);
  assert.equal(row.columnId,null);assert.equal(row.status,'active');
  assert.equal(row.revenue,before.clients.find(item=>item.id===client.clientId).revenue);
  assert.deepEqual(after.transactions,before.transactions);
  const created=await owner.action('createClient',{name:'Cliente sem listas CRM'});
  assert.equal((await owner.workspace()).clients.find(item=>item.id===created.clientId).columnId,null);
  assert.deepEqual((await get('crmClients')).columns,[]);
 });

 await check('Kanban CRM: permissões e escopo governam edição estrutural, sem conceder clientes futuros',async()=>{
  for(const kind of ['crmLeads','crmDeals','crmClients']){
   const board=await get(kind);const payload={kind,expectedRevision:board.revision,columns:[],moves:[]};
   await reader.action('saveKanbanColumns',payload,403);
   await editor.action('saveKanbanColumns',payload,403);
  }
  await owner.action('updateMember',{id:editorId,permissions:['clients.view','demands.create','demands.execute','crm.access'],clientIds:[client.clientId]});
  await save('crmLeads',null,[],[],editor);
  await save('crmDeals',null,[],[],editor);
  let board=await get('crmClients');
  await editor.action('saveKanbanColumns',{kind:'crmClients',expectedRevision:board.revision,columns:[],moves:[]},403);
  await owner.action('updateMember',{id:editorId,permissions:['clients.view','clients.manage','crm.access'],clientIds:[client.clientId]});
  await editor.action('saveKanbanColumns',{kind:'crmClients',expectedRevision:board.revision,columns:[],moves:[]},403);
  await owner.action('updateMember',{id:editorId,permissions:['clients.view','clients.manage','crm.access'],clientAccessMode:'all'});
  await save('crmClients',null,[],[],editor);
  await owner.action('updateMember',{id:editorId,permissions:['clients.view','demands.create','demands.execute'],clientAccessMode:'selected',clientIds:[client.clientId]});
 });

 return {owner,editor,reader,client,secondClient,task,approved,agency};
}
