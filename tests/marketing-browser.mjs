import assert from 'node:assert/strict';
import {expect} from '@playwright/test';

export async function runMarketingBrowser({browser,base,state,check}) {
 const errors=[];
 async function withPage(options,run){const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR',...options});const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));try{await run(page,context);}catch(error){await page.screenshot({path:'evidence/redesign-v4-failure.png',fullPage:true}).catch(()=>{});throw error;}finally{await context.close();}}
 await check('Navegador: landing pública apresenta Postito, login e cadastro com rotas próprias',async()=>{
  await withPage({reducedMotion:'reduce'},async page=>{
   await page.goto(base);await expect(page.getByRole('heading',{level:1})).toHaveText('Sua agência.Em boa ordem.');
   assert.equal(await page.locator('.auth-form').count(),0);
   await page.screenshot({path:'evidence/redesign-v4-landing-hero.png',fullPage:false,animations:'disabled'});
   const header=page.locator('.landing-header');await expect(header.getByRole('link',{name:'Entrar',exact:true})).toHaveAttribute('href','/login');await expect(header.getByRole('link',{name:'Criar conta',exact:true})).toHaveAttribute('href','/cadastro');
   await header.getByRole('link',{name:'Entrar',exact:true}).click();await expect(page).toHaveURL(base+'/login');await expect(page.getByLabel('E-mail',{exact:true})).toBeEnabled();
   await page.getByRole('link',{name:'Conhecer o Postito',exact:true}).click();await expect(page.locator('.landing')).toBeVisible();
   await page.locator('.landing-header').getByRole('link',{name:'Criar conta',exact:true}).click();await expect(page).toHaveURL(base+'/cadastro');await expect(page.getByLabel('Seu nome',{exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'Criar minha conta',exact:true})).toBeVisible();
  });
 });
 await check('Navegador: apresentação alterna capturas reais, âncoras, FAQ e navegação por teclado',async()=>{
  await withPage({reducedMotion:'reduce'},async page=>{
   await page.goto(base);await page.getByRole('link',{name:'Conhecer por dentro',exact:true}).click();
   await expect.poll(async()=>Math.abs(await page.locator('#plataforma').evaluate(el=>el.getBoundingClientRect().top))).toBeLessThan(130);
   for(const name of ['Visão geral','Demandas e pautas','CRM comercial','Financeiro']){
    await page.getByRole('tab',{name,exact:true}).click();const panel=page.getByRole('tabpanel');await expect(panel).toBeVisible();await expect.poll(()=>panel.locator('img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
   }
   await page.getByRole('tab',{name:'Visão geral',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Demandas e pautas',exact:true})).toHaveAttribute('aria-selected','true');
   const question=page.locator('summary').filter({hasText:'Como minha equipe recebe o convite?'});await question.click();await expect(page.locator('details[open]')).toContainText('Acessar quadro');await question.click();
   const targets=await page.locator('a[href^="#"]').evaluateAll(links=>links.map(link=>link.getAttribute('href')).filter(href=>href&&href!=='#'));for(const target of targets)assert.equal(await page.locator(target).count(),1);
   await page.screenshot({path:'evidence/redesign-v4-landing-desktop.png',fullPage:true,animations:'disabled'});
  });
 });
 await check('Navegador: rolagem suave e animações respeitam mudança de movimento reduzido',async()=>{
  await withPage({reducedMotion:'no-preference'},async page=>{
   await page.goto(base);await expect(page.locator('html')).toHaveAttribute('data-scroll-mode','smooth');
   await page.mouse.move(1200,750);await page.mouse.wheel(0,600);await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(200);
   await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('html')).toHaveAttribute('data-scroll-mode','native');await expect(page.locator('.hero-product')).toHaveCSS('transform','none');
   await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.locator('html')).toHaveAttribute('data-scroll-mode','smooth');
   await page.locator('.landing-header').getByRole('link',{name:'Entrar',exact:true}).click();await expect(page.getByLabel('E-mail',{exact:true})).toBeEnabled();
   await expect(page.locator('html')).not.toHaveAttribute('class',/lenis/);
   assert.equal(await page.locator('.pin-spacer').count(),0);
   await page.getByRole('link',{name:'Conhecer o Postito',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-scroll-mode','smooth');await expect(page.locator('.pin-spacer')).toHaveCount(2);
  });
 });
 await check('Navegador: landing e cadastro no celular, sem transbordamento e com rolagem nativa por toque',async()=>{
  await withPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'},async page=>{
   for(const width of [390,320]){
    await page.setViewportSize({width,height:844});await page.goto(base);await expect(page.locator('html')).toHaveAttribute('data-scroll-mode','native');
    await expect(page.locator('.landing-header').getByRole('link',{name:'Entrar',exact:true})).toBeVisible();await expect(page.locator('.landing-header').getByRole('link',{name:'Criar conta',exact:true})).toBeVisible();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
    for(const selector of ['.landing-header','.landing-hero h1','.landing-account','.tour-tabs','.difference-table','.faq-list']){
     const box=await page.locator(selector).boundingBox();assert(box&&box.x>=-1&&box.x+box.width<=width+1,`${selector} precisa caber em ${width}px`);
    }
   }
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:'evidence/redesign-v4-landing-mobile.png',fullPage:true,animations:'disabled'});
   await page.locator('.landing-header').getByRole('link',{name:'Criar conta',exact:true}).click();await expect(page.getByLabel('Seu nome',{exact:true})).toBeEnabled();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));await page.screenshot({path:'evidence/redesign-v4-signup-mobile.png',fullPage:true,animations:'disabled'});
  });
 });
 await check('Navegador: scroll amplia a composição e percorre os três capítulos da landing',async()=>{
  await withPage({reducedMotion:'no-preference'},async page=>{
   await page.goto(base);await expect(page.locator('.landing')).toHaveAttribute('data-motion','full');
   await expect(page.locator('.landing-flow')).toHaveAttribute('data-rail','active');
   await expect.poll(()=>page.locator('.hero-product img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
   const scale=()=>page.locator('.hero-product').evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m11);
   assert(await scale()<.75);
   await expect(page.locator('.landing')).toHaveAttribute('data-intro','ready');
   await page.screenshot({path:'evidence/motion-v5-hero.png',fullPage:false});
   const heroY=await page.locator('.hero-product-stage').evaluate(el=>el.getBoundingClientRect().top+window.scrollY-104);
   await page.evaluate(y=>window.scrollTo(0,y),heroY+960);await expect.poll(scale).toBeGreaterThan(.995);
   await page.screenshot({path:'evidence/motion-v5-product.png',fullPage:false});
   const mission=page.locator('.mission-word').last();const initialOpacity=await mission.evaluate(el=>Number(getComputedStyle(el).opacity));
   const missionY=await page.locator('.landing-mission h2').evaluate(el=>el.getBoundingClientRect().bottom+window.scrollY-300);
   await page.evaluate(y=>window.scrollTo(0,y),missionY);await expect.poll(()=>mission.evaluate(el=>Number(getComputedStyle(el).opacity))).toBeGreaterThan(.98);assert(initialOpacity<.5);
   const flowY=await page.locator('.flow-scene').evaluate(el=>el.getBoundingClientRect().top+window.scrollY-92);
   const cards=page.locator('.landing-flow-item');const travel=await page.locator('.landing-flow-grid').evaluate(el=>el.scrollWidth-window.innerWidth);
   for(const [index,progress] of [[0,0],[1,.5],[2,1]]){
    await page.evaluate(y=>window.scrollTo(0,y),flowY+travel*progress);
    await expect.poll(()=>cards.nth(index).evaluate(el=>Math.abs(el.getBoundingClientRect().left-window.innerWidth*.03))).toBeLessThan(3);
    const box=await cards.nth(index).boundingBox();assert(box.y>=90&&box.y+box.height<=1000);
    await page.screenshot({path:`evidence/motion-v5-chapter-${index+1}.png`,fullPage:false});
   }
   await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.pin-spacer')).toHaveCount(0);
   await expect(page.locator('.landing-flow')).not.toHaveAttribute('data-rail','active');
   await expect(page.locator('.landing-flow-grid')).toHaveCSS('display','grid');
   await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1100,height:740});await expect(page.locator('.pin-spacer')).toHaveCount(2);
   await page.setViewportSize({width:820,height:740});await expect(page.locator('.pin-spacer')).toHaveCount(0);
   await page.setViewportSize({width:390,height:844});await expect(page.locator('.pin-spacer')).toHaveCount(0);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  });
 });
 await check('Navegador: motion por toque preserva o scroll nativo e o acesso a todas as seções',async()=>{
  await withPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'},async page=>{
   await page.goto(base);await expect(page.locator('.landing')).toHaveAttribute('data-motion','full');
   await expect(page.locator('html')).toHaveAttribute('data-scroll-mode','native');await expect(page.locator('.pin-spacer')).toHaveCount(0);
   await page.getByRole('link',{name:'Conhecer por dentro',exact:true}).click();await expect(page.getByRole('tab',{name:'Financeiro',exact:true})).toBeVisible();
   await page.getByRole('tab',{name:'Financeiro',exact:true}).click();await expect(page.getByRole('tabpanel')).toContainText('O negócio também precisa de clareza.');
   await page.locator('.landing-final h2').scrollIntoViewIfNeeded();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
   await page.screenshot({path:'evidence/motion-v5-mobile.png',fullPage:true});
  });
 });
 await check('Navegador: conteúdo público sem JavaScript e usuário conectado segue para o sistema',async()=>{
  await withPage({javaScriptEnabled:false},async page=>{await page.goto(base);await expect(page.getByRole('heading',{level:1})).toBeVisible();await expect(page.locator('.landing-flow-item')).toHaveCount(3);await expect(page.locator('.landing-flow-item').last()).toHaveCSS('position','static');await page.locator('.landing-header').getByRole('link',{name:'Entrar',exact:true}).click();await expect(page.locator('.auth-form')).toBeVisible();await expect(page.getByLabel('E-mail',{exact:true})).toBeDisabled();});
  await withPage({reducedMotion:'reduce'},async(page,context)=>{const [name,...value]=state.owner.cookie.split('=');await context.addCookies([{name,value:value.join('='),url:base}]);await page.goto(base+'/login');await expect(page).toHaveURL(base+'/');await expect(page.locator('.postito-workspace')).toBeVisible();assert.equal(await page.locator('.landing').count(),0);});
  assert.deepEqual(errors,[]);
 });
}
