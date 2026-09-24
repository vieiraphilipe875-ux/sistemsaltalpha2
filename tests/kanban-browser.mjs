import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {kanbanBoard} from './kanban-flows.mjs';

export async function runKanbanBrowser({browser,base,state,check}) {
 const fixture=state.kanban,owner=fixture.owner;
 const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR',timezoneId:'America/Sao_Paulo'});
 const [cookieName,...cookieValue]=owner.cookie.split('=');
 await context.addCookies([{name:cookieName,value:cookieValue.join('='),url:base}]);
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 let client,task,customId;
 const clientName='Cliente Kanban visual';
 async function openClient() {
  await page.goto(base);
  await page.getByRole('textbox',{name:'Buscar clientes ou demandas'}).fill(clientName);
  await page.locator('.search-results').getByRole('button',{name:clientName,exact:true}).click();
  await expect(page.getByRole('button',{name:'Personalizar listas',exact:true})).toBeVisible();
 }
 async function openEditor() {
  await page.getByRole('button',{name:'Personalizar listas',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Personalizar listas',exact:true});
  await expect(dialog).toBeVisible();return dialog;
 }
 async function saveEditor(dialog) {
  const response=page.waitForResponse(item=>item.url().endsWith('/api/actions')&&item.request().postDataJSON()?.action==='saveKanbanColumns');
  await dialog.getByRole('button',{name:'Salvar listas',exact:true}).click();
  assert.equal((await response).status(),200);await expect(dialog).toHaveCount(0);
 }
 async function crmTab(name) {
  await page.goto(base);await page.getByRole('button',{name:'CRM comercial',exact:true}).click();
  await page.getByRole('tab',{name,exact:true}).click();
 }
 try {
  await check('Navegador Kanban: renomear, colorir, adicionar e ordenar listas com persistência',async()=>{
   client=await owner.action('createClient',{name:clientName,period:'SET • 2026'});
   task=(await owner.action('createDeliverable',{boardId:client.boardId,title:'Demanda visual de teste',kind:'static',slideCount:1,assigneeId:null,dueAt:'2030-10-01T13:00:00Z'})).id;
   await openClient();const dialog=await openEditor();
   await dialog.getByRole('textbox',{name:'Nome da lista 1',exact:true}).fill('Entrada de criação');
   await dialog.getByRole('button',{name:'Cor #DFEEFF para Entrada de criação',exact:true}).click();
   await dialog.getByRole('button',{name:'Mover Em produção para cima',exact:true}).click();
   await dialog.getByRole('button',{name:'Adicionar lista',exact:true}).click();
   await dialog.getByRole('textbox',{name:'Nome da lista 6',exact:true}).fill('Roteiros personalizados');
   await dialog.getByLabel('Cor personalizada de Roteiros personalizados',{exact:true}).fill('#c3d7bb');
   await saveEditor(dialog);
   let board=kanbanBoard(await owner.workspace(),'demands',client.clientId);
   assert.equal(board.columns[0].id,'production');
   assert.equal(board.columns[1].name,'Entrada de criação');assert.equal(board.columns[1].color,'#DFEEFF');
   customId=board.columns.at(-1).id;assert.equal(board.columns.at(-1).color,'#C3D7BB');
   await openClient();await expect(page.getByRole('heading',{name:'Entrada de criação',exact:true})).toBeVisible();
   assert.equal(await page.locator('section[data-column-id]').first().getAttribute('data-column-id'),'production');
   await page.screenshot({path:'evidence/kanban-custom-desktop.png',fullPage:false,animations:'disabled'});
  });

  await check('Navegador Kanban: mover por teclado e realocar cartões ao remover lista ocupada',async()=>{
   const movement=page.getByRole('combobox',{name:'Lista de Demanda visual de teste',exact:true});
   await movement.focus();await movement.press('End');await movement.press('Enter');
   await expect.poll(async()=>(await owner.workspace()).deliverables.find(item=>item.id===task).columnId).toBe(customId);
   await expect(page.locator(`section[data-column-id="${customId}"]`).getByRole('heading',{name:'Demanda visual de teste',exact:true})).toBeVisible();
   const dialog=await openEditor();
   await dialog.getByRole('button',{name:'Remover lista Roteiros personalizados',exact:true}).click();
   await dialog.getByRole('combobox',{name:'Destino de Roteiros personalizados',exact:true}).selectOption('briefing');
   await saveEditor(dialog);
   const row=(await owner.workspace()).deliverables.find(item=>item.id===task);
   assert.equal(row.columnId,'briefing');assert.equal(row.status,'briefing');
   await expect(page.locator('section[data-column-id="briefing"]').getByRole('heading',{name:'Demanda visual de teste',exact:true})).toBeVisible();
  });

  await check('Navegador Kanban: remover todas, recarregar, recomeçar e criar demanda sem perder cartões',async()=>{
   let dialog=await openEditor();await dialog.getByRole('button',{name:'Remover todas as listas',exact:true}).click();
   await saveEditor(dialog);await openClient();
   assert.deepEqual(kanbanBoard(await owner.workspace(),'demands',client.clientId).columns,[]);
   await expect(page.getByRole('heading',{name:'Monte seu fluxo',exact:true})).toBeVisible();
   await expect(page.locator('section[data-column-id="__unassigned"]').getByRole('heading',{name:'Demanda visual de teste',exact:true})).toBeVisible();
   await page.screenshot({path:'evidence/kanban-empty-preserved.png',fullPage:false,animations:'disabled'});
   dialog=await openEditor();await dialog.getByRole('button',{name:'Adicionar lista',exact:true}).click();
   await dialog.getByRole('textbox',{name:'Nome da lista 1',exact:true}).fill('Planejamento próprio');await saveEditor(dialog);
   customId=kanbanBoard(await owner.workspace(),'demands',client.clientId).columns[0].id;
   await page.getByRole('button',{name:'Nova demanda',exact:true}).click();
   const creation=page.getByRole('dialog');
   await creation.getByRole('textbox',{name:'Título da demanda',exact:true}).fill('Nova demanda após personalizar');
   await creation.getByRole('button',{name:'Selecionar responsável',exact:true}).click();
   await page.getByRole('option').filter({hasText:'Lia Kanban'}).click();
   await creation.getByLabel('Prazo',{exact:true}).fill('2030-10-01T10:00');
   await creation.getByRole('button',{name:'Criar demanda',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Nova demanda após personalizar',exact:true})).toBeVisible();
   assert.equal((await owner.workspace()).deliverables.find(item=>item.title==='Nova demanda após personalizar').columnId,customId);
   await page.getByRole('combobox',{name:'Lista de Demanda visual de teste',exact:true}).selectOption(customId);
   await expect.poll(async()=>(await owner.workspace()).deliverables.find(item=>item.id===task).columnId).toBe(customId);
  });

  await check('Navegador Kanban: conflito conserva rascunho e não sobrescreve listas salvas',async()=>{
   const dialog=await openEditor();await dialog.getByRole('textbox',{name:'Nome da lista 1',exact:true}).fill('Meu rascunho local');
   const board=kanbanBoard(await owner.workspace(),'demands',client.clientId);
   await owner.action('saveKanbanColumns',{kind:'demands',clientId:client.clientId,expectedRevision:board.revision,columns:board.columns.map(column=>({...column,name:'Edição de outra pessoa'})),moves:[]});
   const response=page.waitForResponse(item=>item.url().endsWith('/api/actions')&&item.request().postDataJSON()?.action==='saveKanbanColumns');
   await dialog.getByRole('button',{name:'Salvar listas',exact:true}).click();assert.equal((await response).status(),409);
   await expect(dialog.getByRole('textbox',{name:'Nome da lista 1',exact:true})).toHaveValue('Meu rascunho local');
   await expect(dialog.getByRole('alert').first()).toBeVisible();
   assert.equal(kanbanBoard(await owner.workspace(),'demands',client.clientId).columns[0].name,'Edição de outra pessoa');
   await page.screenshot({path:'evidence/kanban-conflict.png',fullPage:false,animations:'disabled'});
   await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();await openClient();
  });

  await check('Navegador Kanban: editor utilizável em 390 e 320 px, com foco e salvamento',async()=>{
   for(const width of [390,320]){
    await page.setViewportSize({width,height:844});const dialog=await openEditor();
    assert(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth+1),'Editor não pode cortar os controles no celular');
    const name=dialog.getByRole('textbox',{name:'Nome da lista 1',exact:true});await name.focus();await expect(name).toBeFocused();
    await name.fill(`Fluxo móvel ${width}`);
    await dialog.getByRole('button',{name:`Cor #F9E6EF para Fluxo móvel ${width}`,exact:true}).click();
    if(width===320)await page.screenshot({path:'evidence/kanban-editor-mobile.png',fullPage:false,animations:'disabled'});
    await saveEditor(dialog);
    assert.equal(kanbanBoard(await owner.workspace(),'demands',client.clientId).columns[0].name,`Fluxo móvel ${width}`);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Quadro não deve alargar a página no celular');
   }
   await page.setViewportSize({width:1440,height:1000});
  });

  await check('Navegador Kanban CRM: listas próprias em prospecção, oportunidades e clientes, movimento e remoção',async()=>{
   const lead=await owner.action('createCrmLead',{company:'Lead Kanban visual',potentialValue:20000});
   const deal=await owner.action('createCrmDeal',{company:'Oportunidade Kanban visual',value:10000});
   for(const config of [
    {tab:'Prospecção',kind:'crmLeads',name:'Primeira conversa',move:'Mover lead Lead Kanban visual',collection:'crmLeads',id:lead.id},
    {tab:'Oportunidades',kind:'crmDeals',name:'Negociação própria',move:'Mover oportunidade Oportunidade Kanban visual',collection:'crmDeals',id:deal.id},
    {tab:'Clientes',kind:'crmClients',name:'Clientes em acompanhamento',move:`Mover cliente ${clientName}`,collection:'clients',id:client.clientId},
   ]){
    await crmTab(config.tab);let dialog=await openEditor();await dialog.getByRole('button',{name:'Adicionar lista',exact:true}).click();
    await dialog.getByRole('textbox',{name:'Nome da lista 1',exact:true}).fill(config.name);
    await dialog.getByRole('button',{name:`Cor #E6E7FD para ${config.name}`,exact:true}).click();await saveEditor(dialog);
    const column=kanbanBoard(await owner.workspace(),config.kind).columns[0];
    await page.getByRole('combobox',{name:config.move,exact:true}).selectOption(column.id);
    await expect.poll(async()=>(await owner.workspace())[config.collection].find(item=>item.id===config.id).columnId).toBe(column.id);
    await crmTab(config.tab);await expect(page.locator(`[data-kanban-board="${config.kind}"] [data-kanban-column="${column.id}"]`)).toContainText(config.kind==='crmLeads'?'Lead Kanban visual':config.kind==='crmDeals'?'Oportunidade Kanban visual':clientName);
    if(config.kind==='crmClients')await page.screenshot({path:'evidence/kanban-crm-clients.png',fullPage:false,animations:'disabled'});
    dialog=await openEditor();await dialog.getByRole('button',{name:'Remover todas as listas',exact:true}).click();await saveEditor(dialog);
    await expect.poll(async()=>(await owner.workspace())[config.collection].find(item=>item.id===config.id).columnId).toBe(null);
    await expect(page.locator(`[data-kanban-board="${config.kind}"] [data-kanban-column="unassigned"]`)).toContainText(config.kind==='crmLeads'?'Lead Kanban visual':config.kind==='crmDeals'?'Oportunidade Kanban visual':clientName);
   }
  });

  await check('Navegador Kanban: leitura e execução sem edição estrutural visível',async()=>{
   for(const actor of [fixture.reader,fixture.editor]){
    const member=(await actor.workspace()).currentMember;
    await owner.action('updateMember',{id:member.id,permissions:actor===fixture.editor?['clients.view','demands.execute']:['clients.view'],clientIds:[client.clientId]});
    const limited=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR'});
    const [name,...value]=actor.cookie.split('=');await limited.addCookies([{name,value:value.join('='),url:base}]);
    const view=await limited.newPage();
    try {
     await view.goto(base);await view.getByRole('textbox',{name:'Buscar clientes ou demandas'}).fill(clientName);
     await view.locator('.search-results').getByRole('button',{name:clientName,exact:true}).click();
     await expect(view.getByRole('heading',{name:'Fluxo móvel 320',exact:true})).toBeVisible();
     await expect(view.getByRole('button',{name:'Personalizar listas',exact:true})).toHaveCount(0);
     await expect(view.getByRole('button',{name:'CRM comercial',exact:true})).toHaveCount(0);
    } finally {await limited.close();}
   }
  });
  assert.deepEqual(errors,[]);
 } catch(error) {
  await page.screenshot({path:'evidence/kanban-failure.png',fullPage:true,animations:'disabled'}).catch(()=>{});
  throw error;
 } finally {await context.close();}
}
