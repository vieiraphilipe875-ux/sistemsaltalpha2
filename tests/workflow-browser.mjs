import assert from 'node:assert/strict';
import {expect} from '@playwright/test';

export async function runWorkflowBrowser({browser,base,state,check}){
 const fixture=state.workflow,{owner,client,design,copy}=fixture,contexts=[],errors=[];
 async function pageFor(actor,options={}){const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR',timezoneId:'America/Sao_Paulo',reducedMotion:'reduce',...options});contexts.push(context);const [name,...value]=actor.cookie.split('=');await context.addCookies([{name,value:value.join('='),url:base}]);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);return page;}
 async function openClient(page){await page.goto(base);await page.getByRole('textbox',{name:'Buscar clientes ou demandas'}).fill('Cliente Workflow QA');await page.locator('.search-results').getByRole('button',{name:'Cliente Workflow QA',exact:true}).click();await expect(page.locator('[data-column-id="production"]')).toBeVisible();}
 async function action(page,name,trigger){const pending=page.waitForResponse(r=>r.url()===base+'/api/actions'&&r.request().postDataJSON()?.action===name);await trigger();assert.equal((await pending).status(),200);}
 let page=await pageFor(owner),custom=fixture.visualColumn,created=fixture.visualCard;
 try{
  await check('Navegador: dashboard por permissão e agenda da equipe com dias, atribuidor e horário',async()=>{
   page=await pageFor(owner);
   await expect(page.getByRole('button',{name:'Abrir resumo financeiro'})).toBeVisible();await expect(page.getByRole('button',{name:'Abrir resumo do CRM'})).toBeVisible();
   await page.getByRole('button',{name:'Ver agenda de Felipe Design'}).click();
   const agenda=page.getByRole('dialog',{name:'Agenda de Felipe Design'});await expect(agenda).toContainText('Outra demanda de capa');await expect(agenda).toContainText('Atribuída por Joana Gestão');assert(await agenda.locator('time').count()>0);
   await page.screenshot({path:'evidence/workflow-agenda-desktop.png',animations:'disabled'});
   await page.keyboard.press('Escape');
   const designer=await pageFor(design);await expect(designer.getByRole('region',{name:'Resumo da operação'})).toBeVisible();await expect(designer.getByText('Próximas entregas',{exact:true})).toBeVisible();
   await expect(designer.getByRole('button',{name:'Abrir resumo financeiro'})).toHaveCount(0);await expect(designer.getByRole('heading',{name:'Carga da equipe'})).toHaveCount(0);await expect(designer.getByRole('heading',{name:'Clientes ativos'})).toHaveCount(0);
  });
  await check('Navegador: lista visual, renomear pelo título, configurar etapa e criar cartão dentro da lista',async()=>{
   await openClient(page);await page.getByRole('button',{name:'Adicionar lista',exact:true}).click();
   let dialog=page.getByRole('dialog',{name:'Adicionar lista',exact:true});await dialog.getByLabel('Nome da lista',{exact:true}).fill('Ajustes visuais');await dialog.getByLabel('Responsável da etapa',{exact:true}).selectOption(fixture.designId);await dialog.getByLabel('Prazo da etapa em horas').fill('6');await dialog.getByLabel('Próxima etapa',{exact:true}).selectOption('review');
   await action(page,'saveKanbanColumns',()=>dialog.getByRole('button',{name:'Criar lista',exact:true}).click());await expect(dialog).toHaveCount(0);
   custom=(await owner.workspace()).kanbanBoards.find(b=>b.kind==='demands'&&b.clientId===client.clientId).columns.find(c=>c.name==='Ajustes visuais').id;
   await page.getByRole('button',{name:'Renomear lista Ajustes visuais'}).click();dialog=page.getByRole('dialog',{name:'Editar lista'});await dialog.getByLabel('Nome da lista',{exact:true}).fill('Ajustes finais');await dialog.getByLabel('Cor personalizada da lista').fill('#eeddaa');await action(page,'saveKanbanColumns',()=>dialog.getByRole('button',{name:'Salvar alterações'}).click());
   await page.getByRole('button',{name:'Adicionar cartão em Ajustes finais'}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Título da demanda',{exact:true}).fill('Cartão criado na própria lista');await dialog.getByLabel('Prioridade',{exact:true}).selectOption('urgent');await dialog.getByLabel('Nova etiqueta').fill('Publicar hoje');await dialog.getByRole('button',{name:'Adicionar etiqueta',exact:true}).click();
   await expect(dialog).toContainText('Definido na lista Ajustes finais');await action(page,'createDeliverable',()=>dialog.getByRole('button',{name:'Criar demanda',exact:true}).click());await expect(dialog).toHaveCount(0);
   created=(await owner.workspace()).deliverables.find(t=>t.title==='Cartão criado na própria lista');assert.equal(created.columnId,custom);assert.equal(created.assigneeId,fixture.designId);assert.equal(created.priority,'urgent');assert.equal(created.labels[0].name,'Publicar hoje');
   await expect(page.locator(`[data-column-id="${custom}"] [data-task-card="${created.id}"]`)).toBeVisible();
   await page.getByRole('button',{name:'Arrastar lista Ajustes finais'}).dragTo(page.getByRole('button',{name:'Arrastar lista Aprovadas'}));
   await expect.poll(async()=> (await owner.workspace()).kanbanBoards.find(b=>b.kind==='demands'&&b.clientId===client.clientId).columns[4].id).toBe(custom);
   assert.equal((await owner.workspace()).deliverables.find(t=>t.id===created.id).columnId,custom);
   await page.screenshot({path:'evidence/workflow-board-desktop.png',animations:'disabled'});
  });
  await check('Navegador: capas no topo, inteiras e compactas; modal escuro e prazo legível',async()=>{
   await owner.action('updateDeliverable',{id:fixture.task,status:'production',columnId:custom,cover:{mode:'image',fileId:fixture.coverId,fileKind:'attachment'}});await openClient(page);
   let card=page.locator(`[data-task-card="${fixture.task}"]`);await expect(card).toHaveAttribute('data-cover-mode','image');
   await card.locator('.task-card-open').click();let dialog=page.getByRole('dialog');const box=await dialog.boundingBox();assert(box&&box.x>10&&box.y>10&&box.height<940);
   const backdrop=await page.locator('[data-slot=dialog-overlay]').evaluate(e=>getComputedStyle(e).backgroundColor);assert(backdrop.includes('0.7')||backdrop.includes('0.70'));
   await dialog.getByRole('button',{name:'Capa',exact:true}).click();await action(page,'updateDeliverable',()=>page.getByRole('button',{name:'Imagem inteira',exact:true}).click());await page.keyboard.press('Escape');await expect(page.locator('[data-slot=popover-content]')).toHaveCount(0);await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
   await expect(card).toHaveAttribute('data-cover-mode','full');await card.locator('.task-card-open').click();dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Capa',exact:true}).click();await action(page,'updateDeliverable',()=>page.getByRole('button',{name:'Sem capa',exact:true}).click());await page.keyboard.press('Escape');await expect(page.locator('[data-slot=popover-content]')).toHaveCount(0);await page.keyboard.press('Escape');await expect(card).toHaveAttribute('data-cover-mode','none');
   await owner.action('updateDeliverable',{id:fixture.task,dueAt:new Date(Date.now()+2*3600000).toISOString()});await openClient(page);card=page.locator(`[data-task-card="${fixture.task}"]`);await expect(card.locator('[data-deadline-tone]')).toHaveAttribute('data-deadline-tone','urgent');
   await owner.action('updateDeliverable',{id:fixture.task,dueAt:new Date(Date.now()-3600000).toISOString()});await openClient(page);await expect(card.locator('[data-deadline-tone]')).toHaveAttribute('data-deadline-tone','late');
  });
  await check('Navegador: notificação urgente, passagem entre duas pessoas e dashboard atualizado',async()=>{
   await owner.action('updateDeliverable',{id:fixture.task,columnId:'briefing',priority:'urgent'});
   const producer=await pageFor(copy);await producer.getByRole('button',{name:/Notificações,/}).click();await expect(producer.getByText('Demanda urgente para você. Confira o prazo.').first()).toBeVisible();
   await producer.getByRole('button').filter({hasText:'Campanha com passagem de etapas'}).last().click();let dialog=producer.getByRole('dialog');await expect(dialog).toBeVisible();await action(producer,'updateDeliverable',()=>dialog.getByRole('button',{name:'Concluir etapa → Design',exact:true}).click());await expect(dialog).toHaveCount(0);
   const recipient=await pageFor(design);await expect(recipient.locator('.task-row').filter({hasText:'Campanha com passagem de etapas'})).toBeVisible();
   const current=(await design.workspace()).deliverables.find(t=>t.id===fixture.task);assert.equal(current.assignedById,fixture.copyId);assert.equal(current.columnId,'production');
   await recipient.setViewportSize({width:390,height:844});await recipient.screenshot({path:'evidence/workflow-dashboard-mobile.png',animations:'disabled'});assert(await recipient.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
  });
  await check('Navegador: remover lista ocupada preserva cartões e controles cabem em celular',async()=>{
   await openClient(page);await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Opções da lista Ajustes finais'}).click();await page.getByRole('menuitem',{name:'Remover lista',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Remover lista'});await dialog.getByLabel('Mover cartões para',{exact:true}).selectOption('production');await action(page,'saveKanbanColumns',()=>dialog.getByRole('button',{name:'Remover e mover cartões'}).click());
   await expect.poll(async()=>(await owner.workspace()).deliverables.find(t=>t.id===created.id).columnId).toBe('production');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));assert.deepEqual(errors,[]);
  });
 }catch(error){await page?.screenshot({path:'evidence/workflow-failure.png',animations:'disabled'}).catch(()=>{});throw error;}finally{for(const context of contexts)await context.close();}
}
