import {expect} from '@playwright/test';
import assert from 'node:assert/strict';

export async function runRedesignControlsBrowser({page,check,base}) {
 await check('Navegador: busca por atalho, teclado e limpeza; ações rápidas de criação',async()=>{
  await page.goto(base);
  const search=page.getByRole('textbox',{name:'Buscar clientes ou demandas'});
  await expect(async()=>{await page.keyboard.press('Control+k');await expect(search).toBeFocused({timeout:500});}).toPass({timeout:10000});
  await search.fill('vanessa');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await page.getByRole('button',{name:'Gerenciar colaboradores',exact:true}).waitFor();
  await page.keyboard.press('Meta+k');await expect(search).toBeFocused();
  await search.fill('campanha');await expect(page.getByRole('region',{name:'Resultados da busca'})).toBeVisible();
  await page.getByRole('button',{name:'Limpar busca',exact:true}).click();await expect(search).toHaveValue('');
  await search.fill('café');await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');await expect(page.getByRole('region',{name:'Resultados da busca'})).toHaveCount(0);
  await page.getByRole('button',{name:'Ir para o início',exact:true}).click();
  await page.getByRole('button',{name:'Nova demanda',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({path:'evidence/nova-demanda.png',fullPage:true,animations:'disabled'});
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Novo cliente',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
 });
}

export async function runRedesignMobileBrowser({page,check}) {
 await check('Navegador: CRM, financeiro e equipe no celular; leitura ampliada',async()=>{
  for(const [name,shot] of [['CRM comercial','mobile-crm'],['Financeiro','mobile-financeiro'],['Gerenciar acessos','mobile-equipe']]) {
   await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
   await page.getByRole('button',{name,exact:true}).click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,`${name} transborda no celular`);
   await page.screenshot({path:`evidence/${shot}.png`,fullPage:true,animations:'disabled'});
  }
  await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
  await page.getByRole('button',{name:'Visão geral',exact:true}).click();
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,'Visão geral transborda com texto ampliado');
  assert.equal(await page.locator('.task-row p').first().evaluate(e=>e.clientWidth>0 && e.scrollWidth<=e.clientWidth+1),true,'Título da demanda cortado com texto ampliado');
  await page.screenshot({path:'evidence/mobile-texto-ampliado.png',fullPage:true,animations:'disabled'});
  await page.evaluate(()=>{document.documentElement.style.fontSize='';});
 });
}
