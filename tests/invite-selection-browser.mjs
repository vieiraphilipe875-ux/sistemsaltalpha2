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
   await expect(dialog.getByRole('button',{name:'Enviar por e-mail',exact:true})).toHaveAttribute('aria-pressed','true');
   await expect(dialog.getByRole('button',{name:'Enviar convite',exact:true})).toBeDisabled();
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
   await dialog.getByLabel('E-mail',{exact:true}).fill('bulk-reader@example.invalid');
   const response=actionResponse('inviteMember');
   await dialog.getByRole('button',{name:'Enviar convite',exact:true}).click();
   const result=await assertInviteSaved(await response,clients,'viewer','email');
   await expect(dialog.getByRole('status')).toContainText('Convite encaminhado para bulk-reader@example.invalid');
   await expect(dialog.getByLabel('Link do convite',{exact:true})).toHaveValue(result.link);
   assert.match(await state.emailFor({email:'bulk-reader@example.invalid'},'Convite'),/href=/);
   await page.screenshot({path:'evidence/convite-email-confirmado.png',fullPage:true});
   assert.deepEqual(errors,[]);
  });
  await check('Navegador: convite de editor desmarca todos e distingue link sem envio',async()=>{
   const clients=(await state.owner.workspace()).clients;
   const dialog=await openInvite();
   await dialog.getByLabel('Permissão',{exact:true}).selectOption('editor');
   await dialog.getByRole('button',{name:'Gerar link',exact:true}).click();
   await expect(dialog.getByText(/Gerar um link não envia e-mail/)).toBeVisible();
   const all=dialog.getByRole('checkbox',{name:'Selecionar todos os clientes',exact:true});
   await all.check();await all.uncheck();
   await expect(dialog.getByText(`0 de ${clients.length} clientes selecionados`,{exact:true})).toBeVisible();
   for(const client of clients)await expect(dialog.getByRole('checkbox',{name:client.name,exact:true})).not.toBeChecked();
   await all.check();
   await dialog.getByLabel('E-mail (opcional, restringe quem pode aceitar)',{exact:true}).fill('bulk-editor@example.invalid');
   await page.screenshot({path:'evidence/convite-selecionar-todos.png',fullPage:true});
   const response=actionResponse('inviteMember');
   await dialog.getByRole('button',{name:'Gerar link de convite',exact:true}).click();
   await assertInviteSaved(await response,clients,'editor','link');
   await expect(dialog.getByRole('status')).toContainText('Nenhum e-mail foi enviado');
   await assert.rejects(state.emailFor({email:'bulk-editor@example.invalid'},'Convite'),/Mensagem de teste não encontrada/);
   assert.deepEqual(errors,[]);
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
