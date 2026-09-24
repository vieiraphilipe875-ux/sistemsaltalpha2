import {expect} from '@playwright/test';
import assert from 'node:assert/strict';

const cropClientName='QA Recorte com faixas';
const colors={red:[208,48,80,255],green:[48,176,96,255],blue:[48,96,208,255],left:[24,24,24,255],right:[240,208,32,255]};

export async function runClientImageCropBrowser({browser,state,check,base}) {
 async function isolated(name,run,{mobile=false}={}) {
  await check(name,async()=>{
   const context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:1000},locale:'pt-BR',hasTouch:mobile,isMobile:mobile});
   const [cookieName,...cookieValue]=state.owner.cookie.split('=');
   await context.addCookies([{name:cookieName,value:cookieValue.join('='),url:base}]);
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   try {
    await page.goto(base);await run(page,context);
    assert.deepEqual(errors,[],'O editor de recorte não pode gerar erros de execução');
   } catch(error) {
    await page.screenshot({path:'evidence/client-image-crop-failure.png',fullPage:false,animations:'disabled'}).catch(()=>{});
    throw error;
   } finally {await context.close();}
  });
 }
 async function fixture(page) {
  // A portrait image with colored horizontal bands and narrow left/right marks.
  // A width-fitted 4:1 crop must retain both marks without stretching the image.
  const data=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1600;
   const context=canvas.getContext('2d');
   context.fillStyle='#d03050';context.fillRect(0,0,1200,600);
   context.fillStyle='#30b060';context.fillRect(0,600,1200,400);
   context.fillStyle='#3060d0';context.fillRect(0,1000,1200,600);
   context.fillStyle='#181818';context.fillRect(0,0,80,1600);
   context.fillStyle='#f0d020';context.fillRect(1120,0,80,1600);
   return canvas.toDataURL('image/png').split(',')[1];
  });
  return {name:'faixas-retrato.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')};
 }
 const crop=(page,kind)=>page.getByRole('dialog',{name:`Ajustar ${kind==='avatar'?'foto':'banner'} do cliente`,exact:true});
 const preview=(page,kind)=>crop(page,kind).getByRole('img',{name:`Prévia do corte ${kind==='avatar'?'da foto':'do banner'}`,exact:true});
 async function apply(page,kind) {
  const editor=crop(page,kind);await editor.getByRole('button',{name:'Aplicar recorte',exact:true}).click();
  await expect(editor).toHaveCount(0,{timeout:15000});
 }
 async function newClient(page,name) {
  await page.getByRole('navigation',{name:'Navegação principal',exact:true}).getByRole('button',{name:'Clientes e pautas',exact:true}).click();
  await page.getByRole('button',{name:'Novo cliente',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Novo cliente',exact:true});
  await dialog.getByLabel('Nome do cliente',{exact:true}).fill(name);
  return dialog;
 }
 function mediaRequests(page) {
  const requests=[];
  page.on('request',request=>{
   if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/actions'&&request.postDataJSON()?.action==='createClient')requests.push({kind:'create',body:request.postDataJSON()});
   if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/uploads/init')requests.push({kind:'upload',body:request.postDataJSON()});
  });
  return requests;
 }
 async function client(name=cropClientName) {
  const matches=(await state.owner.workspace()).clients.filter(item=>item.name===name);
  assert.equal(matches.length,1);return matches[0];
 }
 async function customize(page) {
  await page.getByRole('textbox',{name:'Buscar clientes ou demandas',exact:true}).fill(cropClientName);
  await page.getByRole('region',{name:'Resultados da busca',exact:true}).getByRole('button',{name:cropClientName,exact:true}).click();
  await page.getByRole('button',{name:'Personalizar link do Drive',exact:true}).click();
  return page.getByRole('dialog',{name:`Personalizar ${cropClientName}`,exact:true});
 }
 async function imageDetails(page,url) {
  const response=await page.request.get(new URL(url,base).href);assert.equal(response.status(),200);
  assert.match(response.headers()['content-type'],/^image\/png/);
  const data=(await response.body()).toString('base64');
  return page.evaluate(async data=>{
   const image=new Image();image.src=`data:image/png;base64,${data}`;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
   const context=canvas.getContext('2d');context.drawImage(image,0,0);
   const pixel=x=>Array.from(context.getImageData(x,Math.floor(canvas.height/2),1,1).data);
   return {width:canvas.width,height:canvas.height,center:pixel(Math.floor(canvas.width/2)),left:pixel(32),right:pixel(canvas.width-33)};
  },data);
 }
 async function previewCenter(page,kind) {
  return preview(page,kind).evaluate(canvas=>Array.from(canvas.getContext('2d').getImageData(Math.floor(canvas.width/2),Math.floor(canvas.height/2),1,1).data));
 }

 await isolated('Navegador: cancelar recorte e arquivo que não decodifica não criam cliente nem enviam imagem',async page=>{
  const requests=mediaRequests(page),name='QA Recorte cancelado';
  let dialog=await newClient(page,name);
  await dialog.getByLabel('Foto do cliente',{exact:true}).setInputFiles(await fixture(page));
  await expect(crop(page,'avatar')).toBeVisible();assert.deepEqual(requests,[]);
  await crop(page,'avatar').getByRole('button',{name:'Cancelar',exact:true}).click();
  await expect(crop(page,'avatar')).toHaveCount(0);
  await dialog.getByRole('button',{name:'Criar cliente',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0,{timeout:15000});
  const created=await client(name);assert.equal(created.avatarUrl,null);assert.equal(created.bannerUrl,null);
  assert.equal(requests.filter(item=>item.kind==='create').length,1);
  assert.equal(requests.filter(item=>item.kind==='upload').length,0);

  dialog=await newClient(page,'QA Recorte arquivo corrompido');
  await dialog.getByLabel('Banner do cliente',{exact:true}).setInputFiles({name:'invalida.png',mimeType:'image/png',buffer:Buffer.from('Este conteúdo não é uma imagem PNG.')});
  const editor=crop(page,'banner');
  await expect(editor.getByRole('alert')).toBeVisible();
  await expect(editor.getByRole('button',{name:'Aplicar recorte',exact:true})).toBeDisabled();
  assert.equal(requests.length,1,'Falha de decodificação não inicia cadastro nem upload');
  assert(!(await state.owner.workspace()).clients.some(item=>item.name==='QA Recorte arquivo corrompido'));
  await editor.getByRole('button',{name:'Cancelar',exact:true}).click();
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
 });

 await isolated('Navegador: foto quadrada e banner de retrato respeitam zoom, recorte e pixels após recarregar',async page=>{
  const requests=mediaRequests(page),dialog=await newClient(page,cropClientName),file=await fixture(page);
  await dialog.getByLabel('Foto do cliente',{exact:true}).setInputFiles(file);
  const zoom=crop(page,'avatar').getByRole('slider',{name:'Zoom da imagem',exact:true});
  await zoom.focus();await page.keyboard.press('End');await expect(zoom).toHaveValue('3');
  await expect.poll(()=>previewCenter(page,'avatar')).toEqual(colors.green);
  await apply(page,'avatar');assert.deepEqual(requests,[],'Aplicar no cadastro prepara o arquivo sem enviá-lo');
  await dialog.getByLabel('Banner do cliente',{exact:true}).setInputFiles(file);
  await crop(page,'banner').getByRole('slider',{name:'Posição vertical',exact:true}).focus();await page.keyboard.press('Home');
  await expect.poll(()=>previewCenter(page,'banner')).toEqual(colors.red);
  await expect(crop(page,'banner').getByRole('slider',{name:'Posição horizontal',exact:true})).toBeDisabled();
  await page.screenshot({path:'evidence/client-image-crop-desktop.png',fullPage:false,animations:'disabled'});
  await apply(page,'banner');assert.deepEqual(requests,[]);
  await dialog.getByRole('button',{name:'Criar cliente',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0,{timeout:20000});
  assert.equal(requests.filter(item=>item.kind==='create').length,1);
  assert.equal(requests.filter(item=>item.kind==='upload').length,2);
  await page.reload();
  const saved=await client(),avatar=await imageDetails(page,saved.avatarUrl),banner=await imageDetails(page,saved.bannerUrl);
  assert.deepEqual({width:avatar.width,height:avatar.height,center:avatar.center},{width:512,height:512,center:colors.green});
  assert.deepEqual(banner,{width:1920,height:480,center:colors.red,left:colors.left,right:colors.right});
  await customize(page);
  const rendered=page.getByRole('dialog',{name:`Personalizar ${cropClientName}`,exact:true}).getByRole('img',{name:`Banner de ${cropClientName}`,exact:true});
  await expect.poll(()=>rendered.evaluate(image=>image.complete&&image.naturalWidth===1920&&image.naturalHeight===480)).toBe(true);
 });

 await isolated('Navegador: cancelar personalização conserva imagem; arrastar e escolher a base do banner salva somente após aplicar',async page=>{
  const requests=mediaRequests(page),before=await client(),dialog=await customize(page),file=await fixture(page);
  await dialog.getByLabel('Banner do cliente',{exact:true}).setInputFiles(file);
  const editor=crop(page,'banner'),position=editor.getByRole('slider',{name:'Posição vertical',exact:true});
  const initial=Number(await position.inputValue()),area=editor.getByRole('group',{name:'Área de corte do banner',exact:true});
  const box=await area.boundingBox();assert(box);
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2-30,{steps:5});await page.mouse.up();
  await expect.poll(async()=>Number(await position.inputValue())).toBeGreaterThan(initial);
  await editor.getByRole('button',{name:'Cancelar',exact:true}).click();
  assert.deepEqual(requests,[]);assert.equal((await client()).bannerUrl,before.bannerUrl);
  await dialog.getByLabel('Banner do cliente',{exact:true}).setInputFiles(file);
  await crop(page,'banner').getByRole('slider',{name:'Posição vertical',exact:true}).focus();await page.keyboard.press('End');
  await expect.poll(()=>previewCenter(page,'banner')).toEqual(colors.blue);
  assert.deepEqual(requests,[]);await apply(page,'banner');
  await expect(page.getByText('Banner atualizado',{exact:true})).toBeVisible();
  assert.equal(requests.filter(item=>item.kind==='upload').length,1);assert.equal(requests.filter(item=>item.kind==='create').length,0);
  await page.reload();const after=await client();assert.notEqual(after.bannerUrl,before.bannerUrl);assert.equal(after.avatarUrl,before.avatarUrl);
  assert.deepEqual(await imageDetails(page,after.bannerUrl),{width:1920,height:480,center:colors.blue,left:colors.left,right:colors.right});
 });

 await isolated('Navegador: editor de imagem cabe em 390 e 320 px e arraste por toque persiste o recorte exibido',async(page,context)=>{
  const touch=await context.newCDPSession(page);
  for(const width of [390,320]) {
   await page.setViewportSize({width,height:844});
   const dialog=await customize(page);
   await dialog.getByLabel('Banner do cliente',{exact:true}).setInputFiles(await fixture(page));
   const editor=crop(page,'banner'),area=editor.getByRole('group',{name:'Área de corte do banner',exact:true});
   await expect(editor.getByRole('button',{name:'Aplicar recorte',exact:true})).toBeEnabled();
   const bounds=await editor.boundingBox();assert(bounds);
   assert(bounds.x>=-1&&bounds.x+bounds.width<=width+1&&bounds.y>=-1&&bounds.y+bounds.height<=845,`Editor contido na tela de ${width}px`);
   assert.equal(await editor.evaluate(element=>element.scrollWidth<=element.clientWidth+1),true,`Editor sem transbordamento em ${width}px`);
   const box=await area.boundingBox();assert(box&&box.width>0&&box.height>0);
   assert(Math.abs(box.width/box.height-4)<0.15,'Prévia do banner preserva proporção 4:1');
   const position=editor.getByRole('slider',{name:'Posição vertical',exact:true}),initial=Number(await position.inputValue());
   const x=box.x+box.width/2,y=box.y+box.height*0.75;
   await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-box.height*0.4}]});
   await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await expect.poll(async()=>Number(await position.inputValue())).toBeGreaterThan(initial);
   const expectedPixel=await previewCenter(page,'banner');
   if(width===390)await page.screenshot({path:'evidence/client-image-crop-mobile.png',fullPage:false,animations:'disabled'});
   await apply(page,'banner');await expect(page.getByText('Banner atualizado',{exact:true})).toBeVisible();
   await page.reload();const image=await imageDetails(page,(await client()).bannerUrl);
   assert.equal(image.width,1920);assert.equal(image.height,480);assert.deepEqual(image.center,expectedPixel);
  }
  await touch.detach();
 },{mobile:true});
}
