import {expect} from '@playwright/test';
import assert from 'node:assert/strict';

// Two valid, distinct PNGs. These fixtures and every account below are local QA data.
const bluePng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGN067nzn4GBgYGJAQoAKHICsa3Bvs8AAAAASUVORK5CYII=','base64');
const pinkPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGM8kdLzn4GBgYGJAQoAKeQCuwB/NLQAAAAASUVORK5CYII=','base64');
const png=(name,buffer=bluePng)=>({name,mimeType:'image/png',buffer});

export async function runClientMediaBrowser({browser,state,check,base}) {
 async function isolated(name,run) {
  await check(name,async()=>{
   const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR'});
   const [cookieName,...cookieValue]=state.owner.cookie.split('=');
   await context.addCookies([{name:cookieName,value:cookieValue.join('='),url:base}]);
   const page=await context.newPage(),runtimeErrors=[];
   page.on('pageerror',error=>runtimeErrors.push(error.message));
   // Expected HTTP/network faults stay in this context, apart from the ordinary
   // navigation suite's console-error gate. JavaScript crashes still fail here.
   try {
    await page.goto(base);
    await page.getByRole('button',{name:'Clientes e pautas',exact:true}).click();
    await run(page);
    assert.deepEqual(runtimeErrors,[],'O fluxo de imagens não deve causar falhas de execução');
   } catch(error) {
    await page.screenshot({path:'evidence/client-media-failure.png',fullPage:true,animations:'disabled'}).catch(()=>{});
    throw error;
   } finally {await context.close();}
  });
 }
 async function newClient(page,name,revenue='0') {
  await page.getByRole('button',{name:'Novo cliente',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Nome do cliente',{exact:true}).fill(name);
  await dialog.getByLabel('Período da primeira pauta',{exact:true}).fill('QA • Imagens');
  await dialog.getByLabel('Mensalidade (R$)',{exact:true}).fill(revenue);
  return dialog;
 }
 function observeCreates(page) {
  const requests=[];
  page.on('request',request=>{
   if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/actions') {
    const body=request.postDataJSON();if(body?.action==='createClient')requests.push(body);
   }
  });
  return requests;
 }
 async function oneClient(name,forecasts=0) {
  const workspace=await state.owner.workspace();
  const matches=workspace.clients.filter(client=>client.name===name);
  assert.equal(matches.length,1,`${name}: deve existir um só cliente`);
  const client=matches[0];
  assert.equal(workspace.boards.filter(board=>board.clientId===client.id).length,1,'Uma única pauta inicial');
  assert.equal(workspace.transactions.filter(transaction=>transaction.clientId===client.id).length,forecasts,'Previsões não podem ser duplicadas');
  return client;
 }
 function card(page,name) {
  return page.locator('.client-card').filter({has:page.getByRole('heading',{name,exact:true})});
 }
 async function decodedImage(image) {
  await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate(element=>element.complete&&element.naturalWidth>0),{timeout:10000}).toBe(true);
 }
 async function openBoard(page,name) {
  await page.getByRole('button',{name:'Clientes e pautas',exact:true}).click();
  await card(page,name).getByRole('heading',{name,exact:true}).click();
  await page.getByRole('button',{name:'Personalizar link do Drive',exact:true}).waitFor();
 }
 async function identityVisible(page,name) {
  await decodedImage(card(page,name).getByRole('img',{name,exact:true}));
  await decodedImage(card(page,name).getByRole('img',{name:`Banner de ${name}`,exact:true}));
  await openBoard(page,name);
  await decodedImage(page.locator('.client-board-identity').getByRole('img',{name,exact:true}));
  await decodedImage(page.locator('.client-board-cover').getByRole('img',{name:`Banner de ${name}`,exact:true}));
 }

 await isolated('Navegador: imagens inválidas bloqueiam cadastro; imagens válidas persistem sem duplicar no clique repetido',async page=>{
  const name='QA Imagens Validadas',requests=observeCreates(page);
  const dialog=await newClient(page,name);
  await dialog.getByLabel('Foto do cliente',{exact:true}).setInputFiles({name:'foto-grande.jpg',mimeType:'image/jpeg',buffer:Buffer.alloc(20*1024*1024+1)});
  await dialog.getByLabel('Banner do cliente',{exact:true}).setInputFiles({name:'banner.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')});
  await dialog.getByRole('button',{name:'Criar cliente',exact:true}).click();
  await expect(dialog.getByRole('alert').filter({hasText:'Foto do cliente: o limite é 20 MB'})).toBeVisible();
  await expect(dialog.getByRole('alert').filter({hasText:'Banner do cliente: use JPG, PNG, WEBP ou GIF.'})).toBeVisible();
  assert.equal(requests.length,0,'Validação deve acontecer antes de chamar createClient');
  assert.equal((await state.owner.workspace()).clients.filter(client=>client.name===name).length,0);
  await dialog.getByLabel('Foto do cliente',{exact:true}).setInputFiles(png('foto.png'));
  await dialog.getByLabel('Banner do cliente',{exact:true}).setInputFiles(png('banner.png',pinkPng));
  await dialog.getByRole('button',{name:'Criar cliente',exact:true}).evaluate(button=>{button.click();button.click();});
  await expect(dialog).toHaveCount(0,{timeout:20000});
  assert.equal(requests.length,1,'Cliques imediatos devem iniciar apenas um cadastro');
  const client=await oneClient(name);assert(client.avatarUrl&&client.bannerUrl);
  await identityVisible(page,name);
  await page.reload();await page.getByRole('button',{name:'Clientes e pautas',exact:true}).click();
  await identityVisible(page,name);
  await page.screenshot({path:'evidence/client-media-persisted.png',fullPage:true,animations:'disabled'});
 });

 await isolated('Navegador: falha parcial no banner retoma apenas a imagem pendente e mantém cliente, pauta e previsões únicos',async page=>{
  const name='QA Imagens Retomada',requests=observeCreates(page),counts={avatar:0,banner:0},bannerTickets=new Set();
  let failBanner=true;
  await page.route('**/api/uploads/init',async route=>{
   const body=route.request().postDataJSON();if(body.purpose in counts)counts[body.purpose]++;
   const response=await route.fetch();
   if(body.purpose==='banner')bannerTickets.add((await response.json()).id);
   await route.fulfill({response});
  });
  await page.route('**/api/uploads/complete',async route=>{
   if(failBanner&&bannerTickets.has(route.request().postDataJSON().id)) {
    failBanner=false;
    await route.fulfill({status:503,json:{error:'Falha simulada ao concluir o banner.'}});
   } else await route.continue();
  });
  const dialog=await newClient(page,name,'125');
  await dialog.getByLabel('Foto do cliente',{exact:true}).setInputFiles(png('foto.png'));
  await dialog.getByLabel('Banner do cliente',{exact:true}).setInputFiles(png('banner.png',pinkPng));
  await dialog.getByRole('button',{name:'Criar cliente',exact:true}).click();
  await expect(dialog.getByRole('alert').filter({hasText:'Cliente criado.'})).toBeVisible({timeout:20000});
  await expect(dialog.getByText('Foto salva',{exact:true})).toBeVisible();
  await expect(dialog.getByLabel('Foto do cliente',{exact:true})).toBeDisabled();
  const partial=await oneClient(name,12);assert(partial.avatarUrl);assert.equal(partial.bannerUrl,null);
  await page.screenshot({path:'evidence/client-media-partial.png',fullPage:true,animations:'disabled'});
  await dialog.getByRole('button',{name:'Tentar enviar novamente',exact:true}).click();
  await expect(dialog).toHaveCount(0,{timeout:20000});
  const complete=await oneClient(name,12);assert.equal(complete.id,partial.id);assert(complete.avatarUrl&&complete.bannerUrl);
  assert.equal(requests.length,1,'Retomar upload não pode recriar o cliente');
  assert.deepEqual(counts,{avatar:1,banner:2},'Uma imagem já salva não deve ser reenviada');
  await identityVisible(page,name);
 });

 await isolated('Navegador: resposta de criação perdida após commit é recuperada com a mesma chave sem duplicar previsões',async page=>{
  const name='QA Cadastro Resposta Perdida',requests=[],responses=[];
  await page.route('**/api/actions',async route=>{
   const body=route.request().postDataJSON();
   if(body.action!=='createClient'||body.name!==name)return route.continue();
   requests.push(body);
   const response=await route.fetch();assert.equal(response.status(),200);
   responses.push(await response.json());
   if(requests.length===1)await route.abort('failed');
   else await route.fulfill({response});
  });
  const dialog=await newClient(page,name,'185');
  await dialog.getByRole('button',{name:'Criar cliente',exact:true}).click();
  await expect(dialog.getByRole('button',{name:'Confirmar cadastro',exact:true})).toBeVisible({timeout:20000});
  const committed=await oneClient(name,12);
  await dialog.getByRole('button',{name:'Confirmar cadastro',exact:true}).click();
  await expect(dialog).toHaveCount(0,{timeout:20000});
  const recovered=await oneClient(name,12);assert.equal(recovered.id,committed.id);
  assert.equal(requests.length,2);assert.match(requests[0].requestId,/^[0-9a-f-]{36}$/i);
  assert.equal(requests[1].requestId,requests[0].requestId,'A retomada conserva a chave da tentativa original');
  assert.equal(responses[0].replayed,false);assert.equal(responses[1].replayed,true);
  assert.equal(responses[0].clientId,responses[1].clientId);
 });

 await isolated('Navegador: concluir cadastro com imagem pendente abre um novo formulário sem reutilizar cliente ou arquivos',async page=>{
  const partialName='QA Cadastro Parcial Fechado',freshName='QA Cadastro Novo Depois',requests=observeCreates(page);
  await page.route('**/api/uploads/init',async route=>{
   if(route.request().postDataJSON().purpose==='banner')await route.fulfill({status:503,json:{error:'Falha simulada de preparação do banner.'}});
   else await route.continue();
  });
  let dialog=await newClient(page,partialName);
  await dialog.getByLabel('Banner do cliente',{exact:true}).setInputFiles(png('pendente.png'));
  await dialog.getByRole('button',{name:'Criar cliente',exact:true}).click();
  await expect(dialog.getByRole('alert').filter({hasText:'Cliente criado.'})).toBeVisible({timeout:20000});
  const partial=await oneClient(partialName);
  await dialog.getByRole('button',{name:'Concluir sem imagens pendentes',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button',{name:'Novo cliente',exact:true}).click();
  dialog=page.getByRole('dialog');
  await expect(dialog.getByLabel('Nome do cliente',{exact:true})).toHaveValue('');
  assert.equal(await dialog.getByLabel('Banner do cliente',{exact:true}).evaluate(input=>input.files.length),0);
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  await dialog.getByLabel('Nome do cliente',{exact:true}).fill(freshName);
  await dialog.getByRole('button',{name:'Criar cliente',exact:true}).click();
  await expect(dialog).toHaveCount(0,{timeout:20000});
  const fresh=await oneClient(freshName);assert.notEqual(fresh.id,partial.id);
  assert.equal(requests.length,2);assert.notEqual(requests[0].requestId,requests[1].requestId);
  assert.equal(fresh.avatarUrl,null);assert.equal(fresh.bannerUrl,null);
  await oneClient(partialName);
 });

 await isolated('Navegador: personalizar troca e remove foto e banner com persistência após recarregar',async page=>{
  const name='QA Imagens Validadas';
  await openBoard(page,name);
  await page.getByRole('button',{name:'Personalizar link do Drive',exact:true}).click();
  let dialog=page.getByRole('dialog',{name:`Personalizar ${name}`,exact:true});
  const before=await oneClient(name);
  await dialog.getByLabel('Foto do cliente',{exact:true}).setInputFiles(png('nova-foto.png',pinkPng));
  await expect(page.getByText('Foto atualizada',{exact:true})).toBeVisible();
  await dialog.getByLabel('Banner do cliente',{exact:true}).setInputFiles(png('novo-banner.png'));
  await expect(page.getByText('Banner atualizado',{exact:true})).toBeVisible();
  const updated=await oneClient(name);assert.notEqual(updated.avatarUrl,before.avatarUrl);assert.notEqual(updated.bannerUrl,before.bannerUrl);
  assert.deepEqual(await (await page.request.get(new URL(updated.avatarUrl,base).href)).body(),pinkPng);
  assert.deepEqual(await (await page.request.get(new URL(updated.bannerUrl,base).href)).body(),bluePng);
  await dialog.locator('[data-slot="dialog-footer"]').getByRole('button',{name:'Fechar',exact:true}).click();
  await page.reload();await page.getByRole('button',{name:'Clientes e pautas',exact:true}).click();
  await identityVisible(page,name);
  await page.getByRole('button',{name:'Personalizar link do Drive',exact:true}).click();
  dialog=page.getByRole('dialog',{name:`Personalizar ${name}`,exact:true});
  const photoSection=dialog.getByLabel('Foto do cliente',{exact:true}).locator('..').locator('..');
  await photoSection.getByRole('button',{name:'Remover',exact:true}).click();
  await expect(page.getByText('Foto removida',{exact:true})).toBeVisible();
  const bannerSection=dialog.getByLabel('Banner do cliente',{exact:true}).locator('..').locator('..');
  await bannerSection.getByRole('button',{name:'Remover',exact:true}).click();
  await expect(page.getByText('Banner removido',{exact:true})).toBeVisible();
  await dialog.locator('[data-slot="dialog-footer"]').getByRole('button',{name:'Fechar',exact:true}).click();
  await page.reload();await page.getByRole('button',{name:'Clientes e pautas',exact:true}).click();
  const removed=await oneClient(name);assert.equal(removed.avatarUrl,null);assert.equal(removed.bannerUrl,null);
  await expect(card(page,name).getByRole('img')).toHaveCount(0);
  await openBoard(page,name);
  await expect(page.locator('.client-board-identity img, .client-board-cover img')).toHaveCount(0);
 });
}
