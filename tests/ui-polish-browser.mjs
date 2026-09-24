import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {PNG}=createRequire(import.meta.url)('playwright-core/lib/utilsBundle');
import {expect} from '@playwright/test';

export async function runUiPolishBrowser({browser,base,state,check}) {
 const errors=[];
 const contexts=[];
 async function newPage(options={},authenticated=false) {
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR',timezoneId:'America/Sao_Paulo',reducedMotion:'reduce',...options});
  contexts.push(context);
  if(authenticated){const [name,...value]=state.owner.cookie.split('=');await context.addCookies([{name,value:value.join('='),url:base}]);}
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));return page;
 }
 try {
  await check('Navegador: pontuação e letras completas em todos os títulos animados, de 320 a 1440 px',async()=>{
   const page=await newPage();
   for(const width of [1440,1337,1100,768,390,320]){
    await page.setViewportSize({width,height:1000});await page.goto(base);await page.evaluate(()=>document.fonts.ready);
    const headings=page.locator('h1,h2,h3,.footer-wordmark').filter({has:page.locator('.motion-word-wrap')});
    assert(await headings.count()>3);
    for(let index=0;index<await headings.count();index++){
     const heading=headings.nth(index);
     const clipped=await heading.screenshot({animations:'disabled'});
     // Compare the actual raster to the same text with all animation masks removed.
     const override=await page.addStyleTag({content:'.motion-word-wrap{overflow:visible!important}'});
     const unclipped=await heading.screenshot({animations:'disabled'});
     await override.evaluate(element=>element.remove());
     const a=PNG.sync.read(clipped),b=PNG.sync.read(unclipped);
     let missingInk=0;
     for(let p=0;p<a.data.length;p+=4){if(Math.max(b.data[p],b.data[p+1],b.data[p+2])<100&&Math.max(a.data[p],a.data[p+1],a.data[p+2])>=100)missingInk++;}
     // Compositor rounding can change pale pill edges, but must not remove letter ink.
     assert(missingInk<=3,`Há glifos cortados em ${width}px: ${await heading.innerText()}`);
    }
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
    if([1440,390].includes(width)){
     await page.evaluate(()=>scrollTo(0,0));
     await page.screenshot({path:`evidence/ui-polish-hero-${width}.png`,animations:'disabled'});
     await page.locator('.landing-final').screenshot({path:`evidence/ui-polish-final-${width}.png`,animations:'disabled'});
    }
   }
  });
  await check('Navegador: ajuda do CRM por mouse e teclado, Escape preserva o formulário e a próxima ação cria atividade',async()=>{
   const page=await newPage({},true);await page.goto(base);
   await page.getByRole('button',{name:'CRM comercial',exact:true}).click();
   await page.getByRole('button',{name:'Ajuda: Pipeline ponderado',exact:true}).hover();
   await expect(page.getByRole('tooltip')).toContainText('50%');
   await page.getByRole('button',{name:'Novo lead',exact:true}).click();
   const dialog=page.getByRole('dialog');
   await expect(dialog).toContainText('Lead é uma pessoa ou empresa');
   const help=dialog.getByRole('button',{name:'Ajuda: Data da próxima ação',exact:true});
   await help.hover();await expect(page.getByRole('tooltip')).toContainText('Dia e horário');
   await page.locator('[data-slot=tooltip-content]').hover();
   await expect(page.getByRole('tooltip')).toBeVisible();
   await page.screenshot({path:'evidence/ui-polish-crm-help-desktop.png',animations:'disabled'});
   await page.mouse.move(0,0);await expect(page.getByRole('tooltip')).toHaveCount(0);
   await dialog.getByLabel('Valor potencial (R$)',{exact:true}).focus();await page.keyboard.press('Tab');
   await expect(help).toBeFocused();await expect(page.getByRole('tooltip')).toBeVisible();
   await page.keyboard.press('Escape');await expect(page.getByRole('tooltip')).toHaveCount(0);await expect(dialog).toBeVisible();
   await dialog.getByLabel('Empresa ou nome',{exact:true}).fill('Lead com próximo passo');
   await dialog.getByLabel('Próxima ação',{exact:true}).fill('Ligar para confirmar interesse');
   await dialog.getByLabel('Data da próxima ação',{exact:true}).fill('2030-10-02T10:00');
   const response=page.waitForResponse(r=>r.url()===base+'/api/actions'&&r.request().postDataJSON()?.action==='createCrmLead');
   await dialog.getByRole('button',{name:'Criar lead',exact:true}).click();assert.equal((await response).status(),200);
   await expect(dialog).toHaveCount(0);
   const workspace=await state.owner.workspace();const lead=workspace.crmLeads.find(row=>row.company==='Lead com próximo passo');assert(lead);
   assert.equal(lead.nextActionAt,'2030-10-02T13:00:00.000Z');
   assert(workspace.crmActivities.some(row=>row.leadId===lead.id&&row.title===lead.nextAction&&row.dueAt===lead.nextActionAt));
   await page.getByRole('tab',{name:'Oportunidades',exact:true}).click();
   await page.getByRole('button',{name:'Oportunidade',exact:true}).click();
   await page.getByRole('button',{name:'Ajuda: Fechamento previsto',exact:true}).focus();
   await expect(page.getByRole('tooltip')).toContainText('concluir a venda');
   await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toBeVisible();
  });
  await check('Navegador: ajudas por toque e formulários de CRM acessíveis em 390 e 320 px',async()=>{
   const page=await newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true},true);
   await page.goto(base);await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
   await page.getByRole('button',{name:'CRM comercial',exact:true}).click();
   await page.getByRole('button',{name:'Novo lead',exact:true}).click();
   const dialog=page.getByRole('dialog');
   for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    const help=dialog.getByRole('button',{name:'Ajuda: Data da próxima ação',exact:true});
    await help.tap();await expect(page.getByRole('tooltip')).toContainText('Dia e horário');
    await expect.poll(async()=>{const box=await page.locator('[data-slot=tooltip-content]').boundingBox();return {left:Boolean(box&&box.x>=0),right:Boolean(box&&box.x+box.width<=width),top:Boolean(box&&box.y>=0),bottom:Boolean(box&&box.y+box.height<=844)};}).toEqual({left:true,right:true,top:true,bottom:true});
    if(width===390)await page.screenshot({path:'evidence/ui-polish-crm-help-mobile.png',animations:'disabled'});
    await help.tap();await expect(page.getByRole('tooltip')).toHaveCount(0);
    await dialog.getByRole('button',{name:'Criar lead',exact:true}).scrollIntoViewIfNeeded();
    const action=await dialog.getByRole('button',{name:'Criar lead',exact:true}).boundingBox();
    assert(action&&action.y>=0&&action.y+action.height<=844);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
   }
   await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
   await page.getByRole('tab',{name:'Oportunidades',exact:true}).click();
   await page.getByRole('button',{name:'Oportunidade',exact:true}).click();
   await page.getByRole('button',{name:'Ajuda: Fechamento previsto',exact:true}).tap();
   await expect(page.getByRole('tooltip')).toContainText('concluir a venda');
   await page.getByLabel('Empresa',{exact:true}).tap();await expect(page.getByRole('tooltip')).toHaveCount(0);
   await page.getByRole('button',{name:'Criar oportunidade',exact:true}).scrollIntoViewIfNeeded();
   const action=await page.getByRole('button',{name:'Criar oportunidade',exact:true}).boundingBox();
   assert(action&&action.y>=0&&action.y+action.height<=844);
   assert.deepEqual(errors,[]);
  });
 }finally{for(const context of contexts)await context.close();}
}
