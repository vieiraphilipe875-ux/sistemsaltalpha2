import {expect} from '@playwright/test';
import assert from 'node:assert/strict';

export async function runBreadcrumbBrowser({browser,state,check,base}) {
 const workspace=await state.owner.workspace();
 const task=workspace.deliverables.find(item=>item.id===state.task);
 const board=workspace.boards.find(item=>item.id===task?.boardId);
 const client=workspace.clients.find(item=>item.id===board?.clientId);
 const otherClient=workspace.clients.find(item=>item.id!==client?.id&&item.status==='active');
 assert(task&&client&&otherClient,'Clientes e demanda da fixture disponíveis');
 const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR',timezoneId:'America/Sao_Paulo'});
 const [cookieName,...cookieValue]=state.owner.cookie.split('=');
 await context.addCookies([{name:cookieName,value:cookieValue.join('='),url:base}]);
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const path=()=>page.getByRole('navigation',{name:'Caminho de navegação',exact:true});
 const demandPath=()=>page.getByRole('navigation',{name:'Caminho da demanda',exact:true});
 const current=nav=>nav.locator('[aria-current="page"]');
 async function searchOpen(name) {
  await page.getByRole('textbox',{name:'Buscar clientes ou demandas',exact:true}).fill(name);
  await page.getByRole('region',{name:'Resultados da busca',exact:true}).getByRole('button',{name,exact:true}).click();
 }
 async function assertClient() {
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(current(path())).toHaveText(client.name);
  await expect(page.getByRole('heading',{name:task.title,exact:true})).toBeVisible();
 }
 async function assertList() {
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(current(path())).toHaveText('Clientes e pautas');
  await expect(page.getByRole('heading',{name:'Clientes',exact:true})).toBeVisible();
  await expect(path().getByRole('button')).toHaveCount(0);
 }
 try {
  await check('Navegador: trilha do cliente volta à lista por teclado e distingue a página atual',async()=>{
   await page.goto(base);await searchOpen(client.name);
   await expect(current(path())).toHaveText(client.name);
   await expect(current(path())).toHaveCount(1);
   await expect(path().getByRole('button',{name:`Voltar para ${client.name}`,exact:true})).toHaveCount(0);
   const parent=path().getByRole('button',{name:'Voltar para Clientes e pautas',exact:true});
   await parent.focus();await expect(parent).toBeFocused();
   await page.screenshot({path:'evidence/breadcrumb-desktop.png',fullPage:true,animations:'disabled'});
   await page.keyboard.press('Enter');await assertList();
  });

  await check('Navegador: trilha da demanda usa o cliente real e protege o rascunho antes de voltar',async()=>{
   await searchOpen(otherClient.name);
   await expect(current(path())).toHaveText(otherClient.name);
   await searchOpen(task.title);
   await expect(current(demandPath())).toHaveText(task.title);
   await expect(demandPath().getByRole('button',{name:`Voltar para ${otherClient.name}`,exact:true})).toHaveCount(0);
   await demandPath().getByRole('button',{name:`Voltar para ${client.name}`,exact:true}).click();
   await assertClient();

   // Both parent destinations must preserve the same unsaved-draft guard.
   for(const [label,assertDestination] of [[client.name,assertClient],['Clientes e pautas',assertList]]) {
    await searchOpen(task.title);
    await page.getByRole('tab',{name:'Pauta visual',exact:true}).click();
    const copy=page.getByPlaceholder('Texto da fatia 1');
    const draft=`Rascunho local da trilha para ${label}`;
    await copy.fill(draft);
    const parent=demandPath().getByRole('button',{name:`Voltar para ${label}`,exact:true});
    const canceled=page.waitForEvent('dialog');
    const cancelClick=parent.click();
    const prompt=await canceled;
    assert.match(prompt.message(),/alterações não salvas/i);
    await prompt.dismiss();await cancelClick;
    await expect(copy).toHaveValue(draft);
    await expect(current(demandPath())).toHaveText(task.title);
    const accepted=page.waitForEvent('dialog');
    const acceptClick=parent.click();
    await (await accepted).accept();await acceptClick;
    await assertDestination();
    const persisted=(await state.owner.workspace()).deliverables.find(item=>item.id===task.id);
    assert.deepEqual(persisted.slides.map(({copy,direction})=>({copy,direction})),task.slides.map(({copy,direction})=>({copy,direction})),'Descartar ao navegar não grava o rascunho');
   }
  });

  await check('Navegador: trilha de cliente e demanda permanece acionável no celular sem transbordar',async()=>{
   for(const width of [390,320]) {
    await page.setViewportSize({width,height:844});
    await searchOpen(client.name);
    await expect(path()).toBeVisible();
    await expect(current(path())).toHaveText(client.name);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,`Pasta sem transbordamento em ${width}px`);
    await path().getByRole('button',{name:'Voltar para Clientes e pautas',exact:true}).click();
    await assertList();
    await searchOpen(task.title);
    await expect(demandPath()).toBeVisible();
    const trailBounds=await demandPath().boundingBox(),dialogBounds=await page.getByRole('dialog').boundingBox();
    assert(trailBounds&&dialogBounds&&trailBounds.x>=dialogBounds.x-1&&trailBounds.x+trailBounds.width<=dialogBounds.x+dialogBounds.width+1,`Trilha contida no modal em ${width}px`);
    assert.equal(await demandPath().evaluate(element=>element.scrollWidth<=element.clientWidth+1),true,`Trilha da demanda cabe em ${width}px`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,`Demanda sem transbordamento em ${width}px`);
    if(width===390)await page.screenshot({path:'evidence/breadcrumb-mobile.png',fullPage:false,animations:'disabled'});
    await demandPath().getByRole('button',{name:`Voltar para ${client.name}`,exact:true}).click();
    await assertClient();
    await path().getByRole('button',{name:'Voltar para Clientes e pautas',exact:true}).click();
    await assertList();
   }
   assert.deepEqual(errors,[]);
  });

  await check('Navegador: trilha de execução mantém Minhas demandas e não libera outras tarefas do cliente',async()=>{
   const editor=workspace.members.find(member=>member.email===state.editor.email);
   assert(editor,'Responsável da fixture disponível');
   let hiddenTask;
   const originalClientIds=workspace.clientMembers.filter(grant=>grant.memberId===editor.id).map(grant=>grant.clientId);
   const limitedContext=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR'});
   const [name,...value]=state.editor.cookie.split('=');
   await limitedContext.addCookies([{name,value:value.join('='),url:base}]);
   const limited=await limitedContext.newPage();
   limited.on('pageerror',error=>errors.push(error.message));
   const limitedPath=()=>limited.getByRole('navigation',{name:'Caminho de navegação',exact:true});
   const limitedDemandPath=()=>limited.getByRole('navigation',{name:'Caminho da demanda',exact:true});
   async function openAssignedTask() {
    await limited.getByRole('textbox',{name:'Buscar clientes ou demandas',exact:true}).fill(task.title);
    await limited.getByRole('region',{name:'Resultados da busca',exact:true}).getByRole('button',{name:task.title,exact:true}).click();
   }
   try {
    hiddenTask={...(await state.owner.action('createDeliverable',{boardId:task.boardId,title:'QA Trilha tarefa privada',kind:'static',slideCount:1,assigneeId:workspace.currentMember.id,dueAt:'2030-10-02T15:00:00Z'})),title:'QA Trilha tarefa privada'};
    await state.owner.action('updateMember',{id:editor.id,role:'editor',permissions:['clients.view','demands.execute'],clientAccessMode:'selected',clientIds:[]});
    await state.owner.action('updateDeliverable',{id:task.id,assigneeId:editor.id,status:'production'});
    const restricted=await state.editor.workspace();
    assert(restricted.deliverables.some(item=>item.id===task.id));
    assert(!restricted.deliverables.some(item=>item.id===hiddenTask.id));
    assert(!restricted.clientMembers.some(grant=>grant.memberId===editor.id));
    await limited.goto(base);await openAssignedTask();
    await expect(limitedDemandPath().getByRole('button',{name:'Voltar para Minhas demandas',exact:true})).toBeVisible();
    await limitedDemandPath().getByRole('button',{name:`Voltar para ${client.name}`,exact:true}).click();
    await expect(limited.getByRole('dialog')).toHaveCount(0);
    await expect(current(limitedPath())).toHaveText(client.name);
    await expect(limited.getByRole('heading',{name:task.title,exact:true})).toBeVisible();
    await expect(limited.getByRole('heading',{name:hiddenTask.title,exact:true})).toHaveCount(0);
    await expect(limited.getByRole('button',{name:'Nova demanda',exact:true})).toHaveCount(0);
    await limitedPath().getByRole('button',{name:'Voltar para Minhas demandas',exact:true}).click();
    await expect(current(limitedPath())).toHaveText('Minhas demandas');
    await openAssignedTask();
    await limitedDemandPath().getByRole('button',{name:'Voltar para Minhas demandas',exact:true}).click();
    await expect(limited.getByRole('dialog')).toHaveCount(0);
    await expect(current(limitedPath())).toHaveText('Minhas demandas');
    await expect(limited.getByRole('heading',{name:'Clientes',exact:true})).toBeVisible();
    assert.deepEqual(errors,[]);
   } finally {
    await limitedContext.close();
    await state.owner.action('updateDeliverable',{id:task.id,assigneeId:task.assigneeId,status:task.status});
    await state.owner.action('updateMember',{id:editor.id,role:editor.role,permissions:editor.permissions,clientAccessMode:editor.clientAccessMode,clientIds:originalClientIds});
    if(hiddenTask)await state.owner.action('deleteDeliverable',{id:hiddenTask.id});
   }
  });
 } finally {
  await context.close();
 }
}
