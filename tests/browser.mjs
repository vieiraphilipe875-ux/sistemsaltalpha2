import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
export async function runBrowser({base,state,check}){
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR',timezoneId:'America/Sao_Paulo'});
 const page=await context.newPage();const errors=[];let expectedConflict=false;
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&!(expectedConflict&&/409/.test(m.text())))errors.push(m.text());});
 async function snapshot(name){await page.screenshot({path:'evidence/'+name+'.png',fullPage:true});}
 async function closeDialog(){await page.keyboard.press('Escape');}
 try{
  await check('Navegador: login, logo, navegação e busca de clientes',async()=>{
   await page.goto(base);await page.getByRole('button',{name:'Confirmar meu e-mail'}).click();await expect(page.getByRole('heading',{name:'Confirme seu e-mail.'})).toBeVisible();await page.getByRole('button',{name:'Voltar para entrar'}).click();await page.getByRole('textbox',{name:'E-mail',exact:true}).fill(state.owner.email);
   await page.locator('input[name=password]').fill(state.password);
   await page.getByRole('button',{name:'Mostrar senha'}).click();await expect(page.locator('input[name=password]')).toHaveAttribute('type','text');
   await page.getByRole('button',{name:'Entrar',exact:true}).click();
   await page.getByRole('button',{name:'Clientes e pautas',exact:true}).waitFor({timeout:60000});
   await snapshot('dashboard');
   await page.getByRole('textbox',{name:'Buscar clientes ou demandas'}).fill('vanessa');
   await page.locator('.search-results').getByRole('button',{name:'Vanessa Lopes',exact:true}).click();
   await page.getByRole('button',{name:'Gerenciar colaboradores',exact:true}).waitFor();
  });
  await check('Navegador: atribuir na pasta, filtrar pelo nome e persistir',async()=>{
   await page.getByRole('button',{name:'Responsável por Campanha de primavera',exact:true}).click();
   await page.getByPlaceholder('Buscar colaborador...', {exact:true}).fill('marina');
   await page.getByRole('option').filter({hasText:'Marina Costa'}).click();
   await expect(page.getByRole('button',{name:'Responsável por Campanha de primavera',exact:true})).toContainText('Marina Costa');
   assert.equal((await state.owner.workspace()).deliverables.find(t=>t.id===state.task).assigneeId,(await state.owner.workspace()).currentMember.id);
   await snapshot('cliente-kanban');
   await page.getByRole('button',{name:'Gerenciar colaboradores',exact:true}).click();
   await page.getByPlaceholder('Buscar colaborador do cliente...').fill('bruno');
   await expect(page.locator('[cmdk-item]')).toHaveCount(1);await closeDialog();
  });
  await check('Navegador: editar demanda, alternar abas e salvar pauta',async()=>{
   await page.getByRole('button',{name:/Carrossel.*Campanha de primavera/}).click();
   await page.getByRole('button',{name:'Editar detalhes',exact:true}).click();
   const edit=page.getByRole('dialog').last();await edit.getByRole('textbox',{name:'Título',exact:true}).fill('Campanha de primavera — revisão');
   await edit.getByRole('button',{name:'Salvar detalhes'}).click();
   await expect(page.getByRole('heading',{name:'Campanha de primavera — revisão'})).toBeVisible();
   await page.getByRole('tab',{name:'Pauta visual'}).click();
   await page.getByPlaceholder('Texto da fatia 1').fill('Uma campanha feita com intenção.');
   await page.getByRole('button',{name:'Salvar pauta',exact:true}).click();
   await expect(page.getByText('Pauta salva',{exact:true})).toBeVisible();
   await page.getByRole('tab',{name:/Arquivos anexados/}).click();
   await expect(page.getByText('Nenhum arquivo anexado nesta demanda.')).toBeVisible();
   await page.getByRole('tab',{name:'Arquivo final e revisão',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Revisão visual'})).toBeVisible();
   await snapshot('demanda-revisao');await closeDialog();
   const t=(await state.owner.workspace()).deliverables.find(t=>t.id===state.task);assert.equal(t.slides[0].copy,'Uma campanha feita com intenção.');
  });
  await check('Navegador: rascunho preservado ao fechar e em conflito de edição',async()=>{
   await page.getByRole('button',{name:/Carrossel.*Campanha de primavera/}).click();
   await page.getByRole('tab',{name:'Pauta visual'}).click();
   const copy=page.getByPlaceholder('Texto da fatia 1');await copy.fill('Meu rascunho preservado');
   page.once('dialog',dialog=>dialog.dismiss());await closeDialog();
   await expect(copy).toHaveValue('Meu rascunho preservado');
   const task=(await state.owner.workspace()).deliverables.find(t=>t.id===state.task);
   await state.owner.action('saveSlides',{deliverableId:state.task,expectedSlideIds:task.slides.map(s=>s.id),slides:task.slides.map(s=>({...s,copy:s.position===1?'Texto salvo pela outra edição':s.copy}))});
   expectedConflict=true;
   const conflictResponse=page.waitForResponse(r=>r.url().endsWith('/api/actions')&&r.request().postDataJSON()?.action==='saveSlides');
   await page.getByRole('button',{name:'Salvar pauta',exact:true}).click();assert.equal((await conflictResponse).status(),409);
   await expect(page.getByRole('alert').filter({hasText:'Outra edição atualizou esta pauta'})).toBeVisible();
   await expect(copy).toHaveValue('Meu rascunho preservado');
   await expect(page.getByRole('button',{name:'Salvar pauta',exact:true})).toBeDisabled();
   await snapshot('pauta-conflito');expectedConflict=false;
   page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Carregar versão atual'}).click();
   await expect(copy).toHaveValue('Meu rascunho preservado');
   page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Carregar versão atual'}).click();
   await expect(copy).toHaveValue('Texto salvo pela outra edição');
   await copy.fill('Uma campanha feita com intenção.');await page.getByRole('button',{name:'Salvar pauta',exact:true}).click();
   await expect(page.getByText('Pauta salva nesta edição',{exact:true})).toBeVisible();
   await closeDialog();await expect(page.getByRole('dialog')).toHaveCount(0);
  });
  await check('Navegador: nova demanda na pasta escolhida, envio de anexo e arrastar',async()=>{
   await page.getByRole('combobox',{name:'Filtrar pasta'}).click();
   await page.getByRole('option',{name:/OUT • 2026/}).click();
   await page.getByRole('button',{name:'Nova demanda',exact:true}).click();
   const dialog=page.getByRole('dialog');
   await expect(dialog.getByRole('combobox').first()).toContainText('OUT');
   await dialog.getByRole('textbox',{name:'Título da demanda'}).fill('Lançamento da coleção');
   await dialog.getByLabel('Prazo',{exact:true}).fill('2030-10-01T10:00');
   await dialog.locator('input[type=file]').first().setInputFiles({name:'referencia.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4QAAAABJRU5ErkJggg==','base64')});
   await dialog.getByRole('button',{name:'Criar demanda',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Lançamento da coleção',exact:true})).toBeVisible();
   let task=(await state.owner.workspace()).deliverables.find(t=>t.title==='Lançamento da coleção');assert(task);assert.equal(task.attachments.length,1);assert.equal(task.dueAt,'2030-10-01T13:00:00.000Z');
   const card=page.locator('article').filter({has:page.getByRole('heading',{name:'Lançamento da coleção',exact:true})});
   const production=page.locator('section').filter({has:page.getByRole('heading',{name:'Em produção',exact:true})});
   await card.dragTo(production);
   await expect.poll(async()=>(await state.owner.workspace()).deliverables.find(t=>t.id===task.id).status).toBe('production');
   await page.getByRole('combobox',{name:'Filtrar pasta'}).click();await page.getByRole('option',{name:'Todas as pastas',exact:true}).click();
  });
  await check('Navegador: CRM, financeiro, equipe e perfil respondem',async()=>{
   for(const [name,shot] of [['CRM comercial','crm'],['Financeiro','financeiro'],['Gerenciar acessos','equipe']]){await page.getByRole('button',{name,exact:true}).click();await snapshot(shot);}
   await page.getByRole('button',{name:'Editar meu perfil',exact:true}).click();
   await page.getByRole('textbox',{name:'Nome',exact:true}).fill('Marina Costa');
   await page.getByRole('button',{name:'Salvar perfil'}).click();
   await expect(page.getByText('Perfil atualizado',{exact:true})).toBeVisible();
  });
  await check('Navegador: convite por link e edição de acesso',async()=>{
   await page.getByRole('button',{name:'Convidar pessoa',exact:true}).click();
   await page.getByLabel('Permissão',{exact:true}).selectOption('viewer');
   await page.getByLabel('Escopo de clientes',{exact:true}).selectOption('selected');
   await page.getByRole('checkbox',{name:'Vanessa Lopes',exact:true}).check();
   await page.getByRole('button',{name:'Gerar link de convite',exact:true}).click();
   await expect(page.getByLabel('Link do convite',{exact:true})).toHaveValue(/invite=/);
   await closeDialog();
   const row=page.locator('.team-row').filter({hasText:'Bruno Nunes'});await row.getByRole('button',{name:'Editar acesso'}).click();
   await page.getByRole('button',{name:'Salvar permissões',exact:true}).click();
   await expect(page.getByText('Acesso atualizado',{exact:true})).toBeVisible();
  });
  await check('Navegador: editor cria pasta e edita CRM sem campos financeiros',async()=>{
   const member=(await state.editor.workspace()).currentMember;
   const permissions=['clients.view','demands.create','demands.execute','crm.access'];
   await state.owner.action('updateMember',{id:member.id,permissions});
   const editorContext=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR'});
   const [name,...cookieValue]=state.editor.cookie.split('=');
   await editorContext.addCookies([{name,value:cookieValue.join('='),url:base}]);
   const editorPage=await editorContext.newPage();editorPage.on('pageerror',e=>errors.push(e.message));
   try {
    await editorPage.goto(base);
    await editorPage.getByRole('textbox',{name:'Buscar clientes ou demandas'}).fill('vanessa');
    await editorPage.locator('.search-results').getByRole('button',{name:'Vanessa Lopes',exact:true}).click();
    await editorPage.getByRole('button',{name:'Nova Pasta',exact:true}).click();
    await editorPage.getByLabel('Período / Nome da Pasta',{exact:true}).fill('DEZ • 2026');
    await editorPage.getByRole('button',{name:'Criar pasta',exact:true}).click();await expect(editorPage.getByText('Pasta criada',{exact:true})).toBeVisible();
    await editorPage.getByRole('button',{name:'CRM comercial',exact:true}).click();await editorPage.getByRole('tab',{name:'Clientes',exact:true}).click();
    await editorPage.getByRole('button',{name:'Editar Vanessa Lopes',exact:true}).click();
    await expect(editorPage.getByLabel('Mensalidade (R$)',{exact:true})).toHaveCount(0);
    await editorPage.getByLabel('Nome do Contato',{exact:true}).fill('Vanessa, contato comercial');
    const saved=editorPage.waitForResponse(r=>r.url().endsWith('/api/actions')&&r.request().postDataJSON()?.action==='updateClientCrm');
    await editorPage.getByRole('button',{name:'Salvar',exact:true}).click();const response=await saved;assert.equal(response.status(),200);
    const payload=response.request().postDataJSON();assert(!('revenue' in payload));assert(!('dueDay' in payload));
    await expect(editorPage.getByRole('dialog')).toHaveCount(0);await editorPage.screenshot({path:'evidence/crm-editor.png',fullPage:true});
    await state.owner.action('updateMember',{id:member.id,permissions:[...permissions,'clients.manage']});
    await editorPage.reload();await editorPage.getByRole('button',{name:'Clientes e pautas',exact:true}).click();
    await editorPage.getByRole('button',{name:'Novo cliente',exact:true}).click();
    await expect(editorPage.getByRole('dialog').getByLabel('Mensalidade (R$)',{exact:true})).toHaveCount(0);
   } finally {
    await editorContext.close();await state.owner.action('updateMember',{id:member.id,permissions:['clients.view','demands.create','demands.execute']});
   }
  });
  await check('Navegador: layout móvel, menu, foco e movimento reduzido',async()=>{
   await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
   await page.getByRole('textbox',{name:'Buscar clientes ou demandas'}).waitFor();await snapshot('mobile-dashboard');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,'Página transborda horizontalmente no celular');
   const menu=page.getByRole('button',{name:'Abrir menu',exact:true});await menu.click();
   await page.getByRole('button',{name:'Clientes e pautas',exact:true}).click();
   await snapshot('mobile-clientes');
   await page.getByRole('textbox',{name:'Buscar clientes ou demandas'}).fill('vanessa');
   await page.locator('.search-results').getByRole('button',{name:'Vanessa Lopes',exact:true}).click();
   await snapshot('mobile-pasta');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,'Pasta do cliente transborda no celular');

  });
  await check('Navegador: cadastro, código, onboarding e recuperação por e-mail',async()=>{
   const newcomer=await browser.newContext({viewport:{width:390,height:844}}),form=await newcomer.newPage();
   form.on('pageerror',e=>errors.push(e.message));
   await form.goto(base);await form.getByRole('button',{name:'Começar agora'}).click();
   await form.getByLabel('Seu nome').fill('Elisa Prado');await form.getByLabel('E-mail',{exact:true}).fill('elisa@example.invalid');
   await form.getByLabel('Sua profissão').selectOption('copywriter');
   await form.locator('input[name=password]').fill(state.password);await form.getByLabel('Confirmar senha',{exact:true}).fill(state.password);
   await form.getByRole('button',{name:'Criar minha conta',exact:true}).click();await form.getByLabel('Código de confirmação').waitFor();
   const html=await state.emailFor({email:'elisa@example.invalid'},'Confirme');await form.getByLabel('Código de confirmação').fill(html.match(/>(\d{6})<\/p>/)[1]);
   await form.getByRole('button',{name:'Confirmar e continuar'}).click();await form.getByLabel('Nome da agência').fill('Ateliê Prado');
   const agencyResponse=form.waitForResponse(r=>r.url()===base+'/api/actions'&&r.request().method()==='POST');
   await form.getByRole('button',{name:'Criar agência',exact:true}).click();
   const createdAgency=await agencyResponse;
   assert.equal(createdAgency.request().postDataJSON().name,'Ateliê Prado');
   assert.equal(createdAgency.status(),200,'Criar a primeira agência deve aceitar o nome preenchido');
   await form.getByRole('textbox',{name:'Buscar clientes ou demandas'}).waitFor({timeout:60000});
   const out=await newcomer.request.post(base+'/api/auth/logout',{data:{},headers:{Origin:base}});assert.equal(out.status(),200);await form.goto(base);
   await form.getByRole('button',{name:'Esqueci minha senha'}).click();await form.getByLabel('E-mail',{exact:true}).fill('elisa@example.invalid');await form.getByRole('button',{name:'Enviar link'}).click();
   await expect(form.getByRole('status')).toContainText('link para recuperar o acesso');
   const reset=await state.emailFor({email:'elisa@example.invalid'},'Redefina');const link=reset.match(/href="([^"]+)"/)[1].replaceAll('&amp;','&');await form.goto(link);
   await form.locator('input[name=password]').fill('Outra-Senha-2026!');await form.getByLabel('Confirmar senha',{exact:true}).fill('Outra-Senha-2026!');await form.getByRole('button',{name:'Salvar nova senha'}).click();
   await expect(form.getByRole('status')).toContainText('Senha alterada');await newcomer.close();
  });
  await check('Navegador: sem erros de execução no fluxo percorrido',async()=>{assert.deepEqual(errors,[]);});
 }catch(e){await snapshot('failure');await writeFile('evidence/browser-errors.json',JSON.stringify(errors));await writeFile('evidence/browser-failure.txt',(await page.locator('body').innerText()).slice(0,18000));throw e;}
 finally{await browser.close();}
}
