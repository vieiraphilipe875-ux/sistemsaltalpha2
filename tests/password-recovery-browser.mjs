import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

export async function runPasswordRecoveryBrowser({browser,state,check,base}) {
 const errors=[];
 async function assertPrehydrationDisabled(cookies,selector) {
  const context=await browser.newContext({javaScriptEnabled:false});
  try {
   if(cookies)await context.addCookies(cookies);
   const page=await context.newPage();await page.goto(base);
   const form=page.locator(selector);await expect(form).toBeVisible();
   await expect(form).toHaveAttribute('method','post');
   const controls=await form.locator('input,button').all();assert(controls.length>0);
   for(const control of controls)await expect(control).toBeDisabled();
  } finally {await context.close();}
 }
 async function withForm(fn) {
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'pt-BR'});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  try {
   await page.goto(base);
   await fn({page,context});
  } catch(error) {
   await page.screenshot({path:'evidence/password-recovery-failure.png',fullPage:true}).catch(()=>{});
   await writeFile('evidence/password-recovery-failure.txt',(await page.locator('body').innerText().catch(()=>'')).slice(0,18000));
   throw error;
  } finally {
   await context.close();
  }
 }
 const authResponse=(page,action)=>page.waitForResponse(response=>response.url()===base+'/api/auth/'+action&&response.request().method()==='POST');
 async function requestFromForgot(page,email) {
  await page.getByRole('button',{name:'Esqueci minha senha',exact:true}).click();
  await page.getByLabel('E-mail',{exact:true}).fill(email);
  const response=authResponse(page,'forgot');
  await page.getByRole('button',{name:'Enviar link',exact:true}).click();
  assert.equal((await response).status(),200);
  await expect(page.getByRole('heading',{name:'Um lugar para o seu trabalho.',exact:true})).toBeVisible();
  await expect(page.getByLabel('E-mail',{exact:true})).toHaveValue(email);
  await expect(page.getByRole('status')).toContainText(/cadastro|cadastr/i);
  await assert.rejects(state.emailFor({email},'Redefina'),/Mensagem de teste não encontrada/);
 }
 async function confirmFromMailbox(page,email) {
  const html=await state.emailFor({email},'Confirme');
  const code=html.match(/>(\d{6})<\/p>/)?.[1];assert(code);
  await page.getByLabel('Código de confirmação').fill(code);
  const response=authResponse(page,'verify');
  await page.getByRole('button',{name:'Confirmar e continuar',exact:true}).click();
  assert.equal((await response).status(),200);
  await expect(page.getByLabel('Nome da agência')).toBeVisible();
 }
 await check('Navegador: recuperação sem cadastro volta ao cadastro, preserva e-mail e não envia recuperação',async()=>{
  await assertPrehydrationDisabled(null,'.auth-form');
  await withForm(async({page})=>{
   const email='recovery-unknown-browser@example.invalid';
   await requestFromForgot(page,email);
   await assert.rejects(state.emailFor({email},''),/Mensagem de teste não encontrada/);
   await page.getByLabel('Seu nome').fill('Lara Cadastro');
   await page.getByLabel('Sua profissão').selectOption('designer');
   await page.locator('input[name=password]').fill(state.password);
   await page.getByLabel('Confirmar senha',{exact:true}).fill(state.password);
   const signup=authResponse(page,'signup');
   await page.getByRole('button',{name:'Criar minha conta',exact:true}).click();
   assert.equal((await signup).status(),200);
   await expect(page.getByLabel('Código de confirmação')).toBeVisible();
   await expect(page.getByLabel('E-mail',{exact:true})).toHaveValue(email);
   await confirmFromMailbox(page,email);
   await assert.rejects(state.emailFor({email},'Redefina'),/Mensagem de teste não encontrada/);
  });
 });
 await check('Navegador: recuperação pendente volta ao cadastro e exige confirmação explícita por código',async()=>{
  await withForm(async({page,context})=>{
   const email='recovery-pending-browser@example.invalid';
   const signup=await context.request.post(base+'/api/auth/signup',{headers:{Origin:base},data:{name:'Pedro Confirmação',email,password:state.password,profession:'designer'}});
   assert.equal(signup.status(),200);
   await page.getByLabel('E-mail',{exact:true}).fill(email);
   await page.locator('input[name=password]').fill(state.password);
   const login=authResponse(page,'login');
   await page.getByRole('button',{name:'Entrar',exact:true}).click();
   assert.equal((await login).status(),401);
   await expect(page.getByRole('alert')).toBeVisible();
   await requestFromForgot(page,email);
   const stillPending=await context.request.post(base+'/api/auth/login',{headers:{Origin:base},data:{email,password:state.password}});
   assert.equal(stillPending.status(),401,'Solicitar recuperação não pode confirmar cadastro pendente');
   await page.getByRole('button',{name:'Já comecei o cadastro: confirmar e-mail',exact:true}).click();
   await expect(page.getByLabel('E-mail',{exact:true})).toHaveValue(email);
   await page.getByRole('button',{name:'Ainda não tenho cadastro',exact:true}).click();
   await page.getByLabel('Seu nome').fill('Nome que não deve sobrescrever');
   await page.getByLabel('Sua profissão').selectOption('copywriter');
   await page.locator('input[name=password]').fill('Nao-Trocar-Pelo-Cadastro-2026!');
   await page.getByLabel('Confirmar senha',{exact:true}).fill('Nao-Trocar-Pelo-Cadastro-2026!');
   const repeated=authResponse(page,'signup');
   await page.getByRole('button',{name:'Criar minha conta',exact:true}).click();
   const repeatedResponse=await repeated;assert.equal(repeatedResponse.status(),200);
   assert.equal((await repeatedResponse.json()).emailStatus,'not_requested');
   await expect(page.getByLabel('Código de confirmação')).toBeVisible();
   await expect(page.getByRole('status')).toContainText('não gerou um novo código');
   const resend=authResponse(page,'resend');
   await page.getByRole('button',{name:'Solicitar código',exact:true}).click();
   assert.equal((await resend).status(),200);
   await expect(page.getByRole('status')).toContainText(/código/);
   await confirmFromMailbox(page,email);
   await expect(page.getByRole('heading',{name:'Olá, Pedro.',exact:true})).toBeVisible();
   const unchangedPassword=await context.request.post(base+'/api/auth/login',{headers:{Origin:base},data:{email,password:'Nao-Trocar-Pelo-Cadastro-2026!'}});
   assert.equal(unchangedPassword.status(),401);
   const originalPassword=await context.request.post(base+'/api/auth/login',{headers:{Origin:base},data:{email,password:state.password}});
   assert.equal(originalPassword.status(),200,'Repetir cadastro não deve trocar a senha original');
   await assertPrehydrationDisabled(await context.cookies(),'.onboarding-create');
   await assert.rejects(state.emailFor({email},'Redefina'),/Mensagem de teste não encontrada/);
  });
  assert.deepEqual(errors,[]);
 });
}
