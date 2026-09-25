import {expect} from '@playwright/test';
import assert from 'node:assert/strict';

export async function runTeamWorkloadBrowser({browser,state,check,base}) {
 const initial=await state.owner.workspace();
 const editor=initial.members.find(member=>member.email===state.editor.email);
 assert(editor,'Planejador da fixture disponível');
 const originalClientIds=initial.clientMembers.filter(grant=>grant.memberId===editor.id).map(grant=>grant.clientId);
 const owner=initial.currentMember,permissions=['clients.view','demands.create','demands.execute'];
 const otherInitial=await state.outside.workspace();
 const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR',timezoneId:'America/Sao_Paulo'});
 const [cookieName,...cookieValue]=state.editor.cookie.split('=');
 await context.addCookies([{name:cookieName,value:cookieValue.join('='),url:base}]);
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const dateParts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(part=>[part.type,part.value]));
 const today=`${dateParts.year}-${dateParts.month}-${dateParts.day}`;
 const yesterday=new Date(new Date(`${today}T12:00:00Z`).getTime()-86400000).toISOString().slice(0,10);
 const dueToday=`${today}T23:59:00-03:00`,duePast=`${yesterday}T12:00:00-03:00`;
 const names={first:'QA Carga Aurora',second:'QA Carga Bosque',hidden:'QA Carga Restrito'};
 let first,second,hidden,createdTask;
 const table=()=>page.getByRole('table',{name:'Carga de demandas por colaborador',exact:true});
 const row=name=>table().getByRole('row').filter({has:page.getByRole('button',{name:`Nova demanda para ${name}`,exact:true})});
 async function counts(name,expected) {
  const cells=row(name).locator('td');
  await expect(cells.nth(1)).toHaveText(String(expected[0]));
  await expect(cells.nth(2)).toHaveText(String(expected[1]));
  await expect(cells.nth(3)).toHaveText(String(expected[2]));
 }
 async function task(actor,boardId,title,assigneeId,dueAt) {
  return actor.action('createDeliverable',{boardId,title,assigneeId,dueAt,kind:'static',slideCount:1});
 }
 async function chooseClient(name,search='') {
  await page.getByRole('combobox',{name:'Selecionar cliente',exact:true}).click();
  if(search)await page.getByRole('combobox',{name:'Buscar cliente',exact:true}).fill(search);
  await page.getByRole('option').filter({hasText:name}).click();
 }
 try {
  await check('Navegador: carga da equipe respeita clientes autorizados, profissão, busca e demandas concluídas',async()=>{
   await state.editor.action('switchAgency',{agencyId:state.agency});
   first=await state.owner.action('createClient',{name:names.first,period:'QA Carga inicial',revenue:15500});
   second=await state.owner.action('createClient',{name:names.second,period:'QA Carga Bosque'});
   hidden=await state.owner.action('createClient',{name:names.hidden,period:'QA Carga privada'});
   await state.owner.action('createBoard',{clientId:first.clientId,period:'QA Carga segunda pauta'});
   await state.owner.action('updateMember',{id:editor.id,role:'editor',status:'active',permissions,clientAccessMode:'selected',clientIds:[first.clientId,second.clientId]});
   await state.editor.auth('profile',{name:editor.name,profession:'video_editor'});
   await task(state.owner,first.boardId,'QA Carga Atrasada',editor.id,duePast);
   await task(state.owner,first.boardId,'QA Carga Hoje',editor.id,dueToday);
   const approved=await task(state.owner,first.boardId,'QA Carga Aprovada',editor.id,dueToday);
   await state.owner.action('updateDeliverable',{id:approved.id,status:'approved'});
   await task(state.owner,second.boardId,'QA Carga Proprietário',owner.id,dueToday);
   for(let index=0;index<3;index++)await task(state.owner,hidden.boardId,`QA Carga Oculta ${index}`,owner.id,duePast);
   const visible=await state.editor.workspace();
   assert.equal(visible.currentMember.clientAccessMode,'selected');
   assert(!visible.currentMember.permissions.includes('finance.access'));
   assert.equal(visible.transactions.length,0);
   assert(!("revenue" in visible.clients.find(client=>client.id===first.clientId)));
   assert(!("dueDay" in visible.clients.find(client=>client.id===first.clientId)));
   assert(!visible.clients.some(client=>client.id===hidden.clientId));
   assert(!visible.deliverables.some(item=>item.title.startsWith('QA Carga Oculta')));
   await page.goto(base);
   await expect(page.getByRole('heading',{name:'Carga da equipe',exact:true})).toBeVisible();
   await counts(editor.name,[2,1,1]);await counts(owner.name,[1,1,0]);
   await expect(table().getByRole('row').filter({hasText:otherInitial.currentMember.name})).toHaveCount(0);
   const search=page.getByRole('textbox',{name:'Buscar colaborador na carga da equipe',exact:true});
   await search.fill(editor.name.split(' ')[0]);
   await expect(row(editor.name)).toBeVisible();await expect(row(owner.name)).toHaveCount(0);
   const profession=page.getByLabel('Filtrar profissão da equipe',{exact:true});
   await profession.selectOption('designer');await expect(row(editor.name)).toHaveCount(0);
   await search.fill('');await expect(row(owner.name)).toBeVisible();
   await profession.selectOption('video_editor');await expect(row(editor.name)).toBeVisible();await expect(row(owner.name)).toHaveCount(0);
   await profession.selectOption('');
   await page.screenshot({path:'evidence/team-workload-authorized.png',fullPage:true,animations:'disabled'});
  });

  await check('Navegador: nova demanda pela equipe pesquisa cliente, mantém responsável e atualiza carga e Kanban',async()=>{
   await page.getByRole('button',{name:`Nova demanda para ${editor.name}`,exact:true}).click();
   const dialog=page.getByRole('dialog',{name:'Criar nova demanda',exact:true});
   await expect(dialog.getByRole('button',{name:'Selecionar responsável',exact:true})).toContainText(editor.name);
   await expect(dialog.getByRole('combobox',{name:'Selecionar cliente',exact:true})).not.toContainText(names.first);
   await dialog.getByRole('combobox',{name:'Selecionar cliente',exact:true}).click();
   await expect(page.getByRole('option').filter({hasText:names.first})).toBeVisible();
   await expect(page.getByRole('option').filter({hasText:names.second})).toBeVisible();
   await expect(page.getByRole('option').filter({hasText:names.hidden})).toHaveCount(0);
   const search=page.getByRole('combobox',{name:'Buscar cliente',exact:true});
   await search.fill('Bosque');
   await expect(page.getByRole('option').filter({hasText:names.first})).toHaveCount(0);
   await page.getByRole('option').filter({hasText:names.second}).click();
   await dialog.getByLabel('Título da demanda',{exact:true}).fill('QA Demanda central da equipe');
   await dialog.getByLabel('Orientação geral',{exact:true}).fill('Preservar o briefing ao trocar o cliente.');
   await chooseClient(names.first,'Aurora');
   await expect(dialog.getByLabel('Título da demanda',{exact:true})).toHaveValue('QA Demanda central da equipe');
   await expect(dialog.getByLabel('Orientação geral',{exact:true})).toHaveValue('Preservar o briefing ao trocar o cliente.');
   await dialog.getByRole('combobox',{name:'Selecionar pauta',exact:true}).click();
   await page.getByRole('option').filter({hasText:'QA Carga segunda pauta'}).click();
   await dialog.getByLabel('Prazo',{exact:true}).fill(`${today}T23:59`);
   const response=page.waitForResponse(result=>new URL(result.url()).pathname==='/api/actions'&&result.request().postDataJSON()?.action==='createDeliverable');
   await dialog.getByRole('button',{name:'Criar demanda',exact:true}).click();
   const saved=await response;assert.equal(saved.status(),200);
   assert.equal(saved.request().postDataJSON().assigneeId,editor.id);
   const newBoard=(await state.owner.workspace()).boards.find(board=>board.clientId===first.clientId&&board.period==='QA Carga segunda pauta');
   assert(newBoard);assert.equal(saved.request().postDataJSON().boardId,newBoard.id);
   await expect(dialog).toHaveCount(0);
   await counts(editor.name,[3,2,1]);
   createdTask=(await state.editor.workspace()).deliverables.find(item=>item.title==='QA Demanda central da equipe');assert(createdTask);
   assert.equal(createdTask.assigneeId,editor.id);assert.equal(createdTask.boardId,newBoard.id);
   assert.equal(createdTask.dueAt,new Date(dueToday).toISOString(),'Prazo local de São Paulo convertido e persistido em UTC');
   await page.reload();await counts(editor.name,[3,2,1]);
   await page.getByRole('button',{name:'Clientes e pautas',exact:true}).click();
   await page.getByRole('heading',{name:names.first,exact:true}).click();
   await expect(page.getByRole('heading',{name:createdTask.title,exact:true})).toBeVisible();
   await expect(page.getByRole('button',{name:`Responsável por ${createdTask.title}`,exact:true})).toContainText(editor.name);
   await page.screenshot({path:'evidence/team-workload-created-kanban.png',fullPage:true,animations:'disabled'});
   await state.editor.action('createDeliverable',{boardId:hidden.boardId,title:'QA Escopo recusado',assigneeId:editor.id,dueAt:dueToday,kind:'static',slideCount:1},403);
   await page.goto(base);await page.getByRole('button',{name:'Nova demanda',exact:true}).click();
   await expect(page.getByRole('dialog').getByRole('button',{name:'Selecionar responsável',exact:true})).toHaveText('Selecionar responsável');
   await expect(page.getByRole('dialog').getByRole('combobox',{name:'Selecionar cliente',exact:true})).not.toContainText(names.first);
   await page.keyboard.press('Escape');
  });

  await check('Navegador: leitor e execução sem planejamento não recebem carga da equipe nem criação',async()=>{
   for(const [role,limitedPermissions] of [['viewer',['clients.view']],['editor',['clients.view','demands.execute']]]) {
    await state.owner.action('updateMember',{id:editor.id,role,permissions:limitedPermissions});
    await page.goto(base);await page.getByRole('textbox',{name:'Buscar clientes ou demandas',exact:true}).waitFor();
    await expect(page.getByRole('heading',{name:'Carga da equipe',exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Nova demanda',exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:`Nova demanda para ${editor.name}`,exact:true})).toHaveCount(0);
    await state.editor.action('createDeliverable',{boardId:first.boardId,title:`QA Criação recusada ${role}`,assigneeId:owner.id,dueAt:dueToday,kind:'static',slideCount:1},403);
   }
   await state.owner.action('updateMember',{id:editor.id,role:'editor',permissions});
  });

  await check('Navegador: trocar agência mantém carga, responsáveis e clientes isolados',async()=>{
   const otherClient=otherInitial.clients[0];assert(otherClient);
   const otherBoard=otherInitial.boards.find(board=>board.clientId===otherClient.id);assert(otherBoard);
   await task(state.outside,otherBoard.id,'QA Carga Outra Agência',editor.id,duePast);
   await page.goto(base);await counts(editor.name,[3,2,1]);
   await page.getByLabel('Trocar agência',{exact:true}).selectOption(otherInitial.agency.id);
   await expect(page.getByLabel('Trocar agência',{exact:true})).toHaveValue(otherInitial.agency.id);
   await expect(table()).toBeVisible();await counts(editor.name,[1,0,1]);
   await expect(row(owner.name)).toHaveCount(0);
   await page.getByRole('button',{name:'Nova demanda',exact:true}).click();
   await page.getByRole('combobox',{name:'Selecionar cliente',exact:true}).click();
   await expect(page.getByRole('option').filter({hasText:otherClient.name})).toBeVisible();
   await expect(page.getByRole('option').filter({hasText:names.first})).toHaveCount(0);
   await expect(page.getByRole('option').filter({hasText:names.second})).toHaveCount(0);
   await page.keyboard.press('Escape');await page.keyboard.press('Escape');
   await page.getByLabel('Trocar agência',{exact:true}).selectOption(state.agency);
   await expect(page.getByLabel('Trocar agência',{exact:true})).toHaveValue(state.agency);
   await counts(editor.name,[3,2,1]);
   assert.deepEqual(errors,[]);
  });

  await check('Navegador: carga no celular e cliente sem pauta simulada permitem criar pasta e demanda reais sem perder briefing',async()=>{
   await page.setViewportSize({width:390,height:844});
   await expect(page.getByRole('heading',{name:'Carga da equipe',exact:true})).toBeVisible();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,'A tabela deve rolar no próprio contêiner, sem transbordar a página');
   await page.screenshot({path:'evidence/team-workload-mobile.png',fullPage:true,animations:'disabled'});
   // Simulate the authorized read of an imported client without a board. Only
   // this read fixture is intercepted; createBoard/createDeliverable use the DB.
   await page.route('**/api/workspace',async route=>{
    const response=await route.fetch(),workspace=await response.json();
    workspace.boards=workspace.boards.filter(board=>board.id!==second.boardId);
    await route.fulfill({response,json:workspace});
   });
   const refreshed=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/workspace');
   await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await refreshed;
   await page.getByRole('button',{name:`Nova demanda para ${editor.name}`,exact:true}).click();
   const dialog=page.getByRole('dialog',{name:'Criar nova demanda',exact:true});
   await chooseClient(names.second,'Bosque');
   await expect(dialog.getByRole('status')).toContainText('Este cliente ainda não tem uma pauta.');
   await expect(dialog.getByRole('combobox',{name:'Selecionar pauta',exact:true})).toBeDisabled();
   await expect(dialog.getByRole('button',{name:'Criar demanda',exact:true})).toBeDisabled();
   await dialog.getByLabel('Título da demanda',{exact:true}).fill('QA Demanda móvel com nova pasta');
   await dialog.getByLabel('Orientação geral',{exact:true}).fill('Briefing preservado durante a criação da pasta.');
   await dialog.getByRole('button',{name:'Nova pasta',exact:true}).click();
   const boardDialog=page.getByRole('dialog',{name:'Nova Pasta (Mês)',exact:true});
   await boardDialog.getByLabel('Período / Nome da Pasta',{exact:true}).fill('QA Carga pasta móvel');
   await boardDialog.getByRole('button',{name:'Criar pasta',exact:true}).click();
   await expect(boardDialog).toHaveCount(0);
   await expect(dialog.getByRole('combobox',{name:'Selecionar pauta',exact:true})).toContainText('QA Carga pasta móvel');
   await page.unroute('**/api/workspace');
   await expect(dialog.getByLabel('Título da demanda',{exact:true})).toHaveValue('QA Demanda móvel com nova pasta');
   await expect(dialog.getByLabel('Orientação geral',{exact:true})).toHaveValue('Briefing preservado durante a criação da pasta.');
   await dialog.getByRole('combobox',{name:'Formato da demanda',exact:true}).click();
   await page.getByRole('option',{name:'Post estático',exact:true}).click();
   await dialog.getByLabel('Prazo',{exact:true}).fill(`${today}T23:59`);
   await dialog.getByRole('button',{name:'Criar demanda',exact:true}).click();
   await expect(dialog).toHaveCount(0);
   const workspace=await state.editor.workspace();
   const board=workspace.boards.find(item=>item.clientId===second.clientId&&item.period==='QA Carga pasta móvel');
   const created=workspace.deliverables.find(item=>item.title==='QA Demanda móvel com nova pasta');
   assert(board);assert(created);assert.equal(created.boardId,board.id);assert.equal(created.assigneeId,editor.id);
   assert.equal(created.notes,'Briefing preservado durante a criação da pasta.');
   await page.reload();await counts(editor.name,[4,3,1]);
   assert.deepEqual(errors,[]);
  });
 } catch(error) {
  await page.screenshot({path:'evidence/team-workload-failure.png',fullPage:true,animations:'disabled'}).catch(()=>{});
  throw error;
 } finally {
  await context.close();
  await state.editor.action('switchAgency',{agencyId:state.agency});
  await state.owner.action('updateMember',{id:editor.id,role:editor.role,status:editor.status,permissions:editor.permissions,clientAccessMode:editor.clientAccessMode,clientIds:originalClientIds});
  await state.editor.auth('profile',{name:editor.name,profession:editor.profession});
 }
}
