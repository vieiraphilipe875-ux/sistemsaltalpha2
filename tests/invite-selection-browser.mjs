import {expect} from '@playwright/test';
import assert from 'node:assert/strict';

export async function runInviteSelectionBrowser({browser,state,check,base}) {
 const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR'});
 const [name,...value]=state.owner.cookie.split('=');
 await context.addCookies([{name,value:value.join('='),url:base}]);
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const sorted=items=>[...items].sort();
 const actionResponse=action=>page.waitForResponse(response=>response.url()===base+'/api/actions'&&response.request().method()==='POST'&&response.request().postDataJSON()?.action===action);
 async function openTeam() {
  await page.goto(base);
  await page.getByRole('button',{name:'Gerenciar acessos',exact:true}).click();
 }
 async function openInvite() {
  await openTeam();
  await page.getByRole('button',{name:'Convidar pessoa',exact:true}).click();
  return page.getByRole('dialog');
 }
 async function assertInviteSaved(response,clients,role,delivery) {
  assert.equal(response.status(),200);
  const payload=response.request().postDataJSON();
  assert.equal(payload.clientAccessMode,'selected');
  assert.equal(payload.role,role);
  assert.equal(payload.delivery,delivery);
  assert.deepEqual(sorted(payload.clientIds),sorted(clients.map(client=>client.id)));
  const result=await response.json();
  assert.equal(result.delivery,delivery);
  assert.equal(result.emailStatus,delivery==='email'?'accepted':'not_requested');
  const saved=(await state.owner.workspace()).invites.find(invite=>invite.email===payload.email&&!invite.revokedAt);
  assert(saved,'O convite precisa estar persistido');
  assert.equal(saved.role,role);
  assert.deepEqual(sorted(saved.clientIds),sorted(payload.clientIds));
  return result;
 }
 try {
  await check('Navegador: convite de leitor seleciona todos, respeita busca e envia e-mail local',async()=>{
   const clients=(await state.owner.workspace()).clients;
   assert(clients.length>=2,'A seleção parcial exige ao menos dois clientes na fixture');
   const dialog=await openInvite();
   await expect(dialog.getByText('Com e-mail, o convite é enviado automaticamente e só essa conta pode aceitá-lo. Para compartilhar somente o link, deixe o campo vazio.',{exact:true})).toBeVisible();
   await expect(dialog.getByRole('button',{name:'Gerar link de convite',exact:true})).toBeEnabled();
   await dialog.getByLabel('Permissão',{exact:true}).selectOption('viewer');
   const all=dialog.getByRole('checkbox',{name:'Selecionar todos os clientes',exact:true});
   await dialog.getByRole('checkbox',{name:clients[0].name,exact:true}).check();
   await expect(all).toHaveJSProperty('indeterminate',true);
   await expect(all).toHaveAttribute('aria-checked','mixed');
   await dialog.getByRole('textbox',{name:'Buscar cliente para liberar',exact:true}).fill('nenhum-cliente-com-este-nome');
   await expect(dialog.getByText('Nenhum cliente encontrado nesta busca.',{exact:true})).toBeVisible();
   await all.focus();await page.keyboard.press('Space');
   await expect(all).toBeChecked();await expect(all).toHaveJSProperty('indeterminate',false);
   await expect(dialog.getByText(`${clients.length} de ${clients.length} clientes selecionados`,{exact:true})).toBeVisible();
   await expect(dialog.getByLabel('Escopo de clientes',{exact:true})).toHaveValue('selected');
   await dialog.getByRole('textbox',{name:'Buscar cliente para liberar',exact:true}).fill('');
   for(const client of clients)await expect(dialog.getByRole('checkbox',{name:client.name,exact:true})).toBeChecked();
   await dialog.getByLabel('E-mail (opcional)',{exact:true}).fill('bulk-reader@example.invalid');
   const response=actionResponse('inviteMember');
   await dialog.getByRole('button',{name:'Enviar convite',exact:true}).click();
   const result=await assertInviteSaved(await response,clients,'viewer','email');
   await expect(dialog.getByRole('status')).toContainText('Convite encaminhado para bulk-reader@example.invalid');
   await expect(dialog.getByLabel('Link do convite',{exact:true})).toHaveValue(result.link);
   assert.match(await state.emailFor({email:'bulk-reader@example.invalid'},'Convite'),/href=/);
   await page.screenshot({path:'evidence/invite-auto-email-confirmed.png',fullPage:true});
   assert.deepEqual(errors,[]);
  });
  await check('Navegador: convite de editor desmarca todos e envia ao preencher e-mail',async()=>{
   const clients=(await state.owner.workspace()).clients;
   const dialog=await openInvite();
   await dialog.getByLabel('Permissão',{exact:true}).selectOption('editor');
   await expect(dialog.getByRole('button',{name:'Gerar link de convite',exact:true})).toBeEnabled();
   const all=dialog.getByRole('checkbox',{name:'Selecionar todos os clientes',exact:true});
   await all.check();await all.uncheck();
   await expect(dialog.getByText(`0 de ${clients.length} clientes selecionados`,{exact:true})).toBeVisible();
   for(const client of clients)await expect(dialog.getByRole('checkbox',{name:client.name,exact:true})).not.toBeChecked();
   await all.check();
   const email=dialog.getByLabel('E-mail (opcional)',{exact:true});
   await email.fill('endereco-incompleto');
   await expect(dialog.getByRole('button',{name:'Enviar convite',exact:true})).toBeDisabled();
   await email.fill('bulk-editor@example.invalid');
   await page.screenshot({path:'evidence/invite-auto-email-form.png',fullPage:true});
   const response=actionResponse('inviteMember');
   await dialog.getByRole('button',{name:'Enviar convite',exact:true}).click();
   const result=await assertInviteSaved(await response,clients,'editor','email');
   await expect(dialog.getByRole('status')).toContainText('Convite encaminhado para bulk-editor@example.invalid');
   assert((await state.emailFor({email:'bulk-editor@example.invalid'},'Convite')).includes(new URL(result.link).searchParams.get('invite')));
   assert.deepEqual(errors,[]);
  });
  await check('Navegador: botão do e-mail abre o quadro após login e aceite, restrito ao destinatário',async()=>{
   const email='invited-reader@example.invalid';
   const invite=await state.owner.action('inviteMember',{email,role:'viewer',clientIds:[state.c1.clientId],clientAccessMode:'selected'});
   const token=new URL(invite.link).searchParams.get('invite');
   await state.owner.action('acceptInvite',{token},403);
   const recipientContext=await browser.newContext({viewport:{width:1000,height:800},locale:'pt-BR'});
   const recipientPage=await recipientContext.newPage();
   recipientPage.on('pageerror',error=>errors.push(error.message));
   try {
    const signup=await recipientContext.request.post(base+'/api/auth/signup',{data:{email,name:'Pessoa Convidada',password:state.password,profession:'designer'},headers:{Origin:base}});
    assert.equal(signup.status(),200);
    const code=(await state.emailFor({email},'Confirme')).match(/>(\d{6})<\/p>/)?.[1];assert(code);
    const verification=await recipientContext.request.post(base+'/api/auth/verify',{data:{email,code},headers:{Origin:base}});
    assert.equal(verification.status(),200);
    await recipientContext.clearCookies();
    await recipientPage.setContent(await state.emailFor({email},'Convite'));
    const button=recipientPage.getByRole('link',{name:'Acessar quadro',exact:true});
    await expect(button).toHaveAttribute('href',invite.link);
    await expect(button).toHaveCSS('background-color','rgb(37, 40, 61)');
    await recipientPage.screenshot({path:'evidence/invite-auto-email-button.png',fullPage:true});
    await button.click();
    await expect(recipientPage.getByText('Você tem um convite. Entre ou crie uma conta para aceitá-lo.',{exact:true})).toBeVisible();
    await recipientPage.getByLabel('E-mail',{exact:true}).fill(email);
    await recipientPage.locator('input[name=password]').fill(state.password);
    await recipientPage.getByRole('button',{name:'Entrar',exact:true}).click();
    await recipientPage.getByRole('button',{name:'Aceitar convite',exact:true}).click();
    await expect(recipientPage).toHaveURL(base+'/?client='+state.c1.clientId);
    await expect(recipientPage.getByRole('heading',{name:'Vanessa Lopes',exact:true})).toBeVisible();
    const workspaceResponse=await recipientContext.request.get(base+'/api/workspace');
    assert.equal(workspaceResponse.status(),200);
    const workspace=await workspaceResponse.json();
    assert.deepEqual(workspace.clients.map(client=>client.id),[state.c1.clientId]);
    assert.equal(workspace.currentMember.role,'viewer');
    assert.equal(workspace.crmLeads.length,0);assert.equal(workspace.transactions.length,0);
    const replay=await recipientContext.request.post(base+'/api/actions',{data:{action:'acceptInvite',token},headers:{Origin:base}});
    assert.equal(replay.status(),400);
    assert.deepEqual(errors,[]);
   } catch(error) {
    await recipientPage.screenshot({path:'evidence/invite-button-failure.png',fullPage:true}).catch(()=>{});
    throw error;
   } finally {await recipientContext.close();}
  });
  await check('Navegador: selecionar clientes atuais persiste e acesso futuro exige escopo próprio',async()=>{
   const workspace=await state.owner.workspace();
   const member=workspace.members.find(person=>person.email===state.editor.email);
   assert(member);
   const originalIds=workspace.clientMembers.filter(grant=>grant.memberId===member.id).map(grant=>grant.clientId);
   let futureClientId;
   async function editMember() {
    await openTeam();
    await page.locator('.team-row').filter({hasText:member.email}).getByRole('button',{name:'Editar acesso',exact:true}).click();
    return page.getByRole('dialog');
   }
   async function save(dialog) {
    const response=actionResponse('updateMember');
    await dialog.getByRole('button',{name:'Salvar permissões',exact:true}).click();
    assert.equal((await response).status(),200);
    await expect(dialog).toHaveCount(0);
   }
   try {
    let dialog=await editMember();
    await dialog.getByLabel('Escopo de clientes',{exact:true}).selectOption('selected');
    await dialog.getByRole('checkbox',{name:'Selecionar todos os clientes',exact:true}).check();
    await save(dialog);
    let saved=await state.owner.workspace();
    assert.equal(saved.members.find(person=>person.id===member.id).clientAccessMode,'selected');
    assert.deepEqual(sorted(saved.clientMembers.filter(grant=>grant.memberId===member.id).map(grant=>grant.clientId)),sorted(workspace.clients.map(client=>client.id)));
    futureClientId=(await state.owner.action('createClient',{name:'Novo cliente após seleção em lote'})).clientId;
    assert(!(await state.editor.workspace()).clients.some(client=>client.id===futureClientId),'Selecionar todos os atuais não libera clientes futuros');
    dialog=await editMember();
    await expect(dialog.getByRole('checkbox',{name:'Selecionar todos os clientes',exact:true})).toHaveJSProperty('indeterminate',true);
    await expect(dialog.getByRole('checkbox',{name:'Novo cliente após seleção em lote',exact:true})).not.toBeChecked();
    await dialog.getByLabel('Escopo de clientes',{exact:true}).selectOption('all');
    await expect(dialog.getByRole('checkbox',{name:'Selecionar todos os clientes',exact:true})).toHaveCount(0);
    await expect(dialog.getByText('O acesso inclui automaticamente os novos clientes cadastrados nesta agência.',{exact:true})).toBeVisible();
    await save(dialog);
    saved=await state.editor.workspace();
    assert.equal(saved.currentMember.clientAccessMode,'all');
    assert(saved.clients.some(client=>client.id===futureClientId));
    assert.deepEqual(errors,[]);
   } finally {
    await state.owner.action('updateMember',{id:member.id,status:member.status,role:member.role,permissions:member.permissions,clientAccessMode:member.clientAccessMode,clientIds:originalIds});
    if(futureClientId){await state.owner.action('updateClientStatus',{id:futureClientId,status:'inactive'});await state.owner.action('deleteClient',{id:futureClientId});}
   }
  });
 } finally {await context.close();}
}
