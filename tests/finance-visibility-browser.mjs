import assert from 'node:assert/strict';
import {expect} from '@playwright/test';

export async function runFinanceVisibilityBrowser({browser,base,state,check}) {
 const member=(await state.editor.workspace()).currentMember;
 const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR',reducedMotion:'no-preference'});
 const [name,...value]=state.editor.cookie.split('=');
 await context.addCookies([{name,value:value.join('='),url:base}]);
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const permissions=['clients.view','clients.manage','demands.create','demands.execute','crm.access'];
 try {
  await check('Navegador: mensalidade ausente em clientes, CRM e formulários sem acesso financeiro',async()=>{
   await state.owner.action('updateMember',{id:member.id,permissions,clientIds:[state.c1.clientId]});
   await page.goto(base);await expect(page.locator('.postito-workspace')).toBeVisible();
   await expect(page.locator('html')).not.toHaveAttribute('class',/lenis/);
   await expect(page.getByRole('button',{name:'Financeiro',exact:true})).toHaveCount(0);
   await page.getByRole('button',{name:'Clientes e pautas',exact:true}).click();
   await expect(page.locator('.client-card').filter({hasText:'Vanessa Lopes'})).toBeVisible();
   await expect(page.locator('[data-client-finance]')).toHaveCount(0);
   await page.screenshot({path:'evidence/finance-permission-client-hidden.png',fullPage:false});
   await page.getByRole('button',{name:'Novo cliente',exact:true}).click();
   await expect(page.getByLabel('Mensalidade (R$)',{exact:true})).toHaveCount(0);await page.keyboard.press('Escape');
   await page.getByRole('button',{name:'CRM comercial',exact:true}).click();await page.getByRole('tab',{name:'Clientes',exact:true}).click();
   await expect(page.locator('[data-client-finance]')).toHaveCount(0);
   await page.getByRole('button',{name:'Editar Vanessa Lopes',exact:true}).click();
   await expect(page.getByLabel('Mensalidade (R$)',{exact:true})).toHaveCount(0);await page.keyboard.press('Escape');
  });
  await check('Navegador: permissão financeira libera mensalidade; revogação a remove sem alterar cadastro',async()=>{
   const before=(await state.owner.workspace()).clients.find(c=>c.id===state.c1.clientId);
   await state.owner.action('updateMember',{id:member.id,permissions:[...permissions,'finance.access']});
   await page.reload();await page.getByRole('button',{name:'Clientes e pautas',exact:true}).click();
   await expect(page.locator('[data-client-finance]')).toHaveCount(1);
   await expect(page.locator('[data-client-finance]')).toContainText('vence dia '+before.dueDay);
   await page.screenshot({path:'evidence/finance-permission-client-visible.png',fullPage:false});
   await state.owner.action('updateMember',{id:member.id,permissions});
   await page.reload();await page.getByRole('button',{name:'Clientes e pautas',exact:true}).click();
   await expect(page.locator('[data-client-finance]')).toHaveCount(0);
   const after=(await state.owner.workspace()).clients.find(c=>c.id===state.c1.clientId);
   assert.equal(after.revenue,before.revenue);assert.equal(after.dueDay,before.dueDay);
  });
  await check('Navegador: abas financeiras sem rolagem vertical, acessíveis por teclado em desktop e celular',async()=>{
   await state.owner.action('updateMember',{id:member.id,permissions:[...permissions,'finance.access']});
   await page.reload();await page.getByRole('button',{name:'Financeiro',exact:true}).click();
   const tabs=page.getByRole('tablist',{name:'Seções do financeiro'});
   for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1000});
    assert(await tabs.evaluate(el=>el.scrollHeight<=el.clientHeight+1 && el.scrollWidth<=el.clientWidth+1),'Todas as abas devem caber sem barras');
    await tabs.getByRole('tab',{name:'Visão geral',exact:true}).focus();
    for(const name of ['Movimentações','Contas a pagar','Contas a receber','Pessoas','Relatórios']){
     await page.keyboard.press('ArrowRight');await expect(tabs.getByRole('tab',{name,exact:true})).toBeFocused();
     await expect(tabs.getByRole('tab',{name,exact:true})).toHaveAttribute('aria-selected','true');
    }
   }
   await expect(tabs.getByRole('tab',{name:'Relatórios',exact:true})).toHaveCSS('background-color','rgb(255, 255, 255)');
   await page.screenshot({path:'evidence/finance-tabs-mobile.png',fullPage:false,animations:'disabled'});
  });
  assert.deepEqual(errors,[]);
 } finally {
  await context.close();
  await state.owner.action('updateMember',{id:member.id,permissions:member.permissions,clientAccessMode:member.clientAccessMode});
 }
}
