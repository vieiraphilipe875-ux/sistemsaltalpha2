import {expect} from '@playwright/test';
import assert from 'node:assert/strict';

export async function runFinancialDocumentsBrowser({page,state,check}) {
 await check('Navegador: todos os comprovantes e notas fiscais podem ser abertos',async()=>{
  const workspace=await state.owner.workspace();
  const transaction=workspace.transactions.find(t=>t.description==='Ferramentas da agência');
  assert(transaction,'Lançamento da fixture disponível');
  const documents=workspace.financialDocuments.filter(d=>d.transactionId===transaction.id);
  assert(documents.length>=2,'A fixture precisa de pelo menos dois comprovantes no mesmo lançamento');
  await page.getByRole('button',{name:'Financeiro',exact:true}).click();
  await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();
  await page.getByRole('combobox',{name:'Filtrar ano financeiro',exact:true}).click();
  await page.getByRole('option',{name:'Todos os anos',exact:true}).click();
  await page.getByRole('tab',{name:'Movimentações',exact:true}).click();
  const row=page.getByRole('row').filter({has:page.getByText(transaction.description,{exact:true})});
  await row.getByRole('button',{name:`Ver ${documents.length} anexos de ${transaction.description}`,exact:true}).click({timeout:5000});
  const list=page.getByRole('dialog',{name:`Anexos de ${transaction.description}`,exact:true});
  await expect(list.getByRole('link')).toHaveCount(documents.length);
  await page.screenshot({path:'evidence/documentos-financeiros.png',fullPage:true});
  for(const document of documents) {
   const link=list.locator(`a[href="${document.url}"]`);
   await expect(link).toContainText(document.fileName);
   const opened=page.waitForEvent('popup');
   await link.click();
   const tab=await opened;
   await tab.waitForLoadState('domcontentloaded');
   assert.equal(new URL(tab.url()).pathname,document.url);
   const response=await page.request.get(new URL(document.url,page.url()).href);
   assert.equal(response.status(),200);
   assert((await response.body()).length>0);
   await tab.close();
  }
  await page.keyboard.press('Escape');
  await page.getByRole('tab',{name:'Pessoas',exact:true}).click();
  const invoice=workspace.financialDocuments.find(d=>d.workerCompetencyId);
  assert(invoice,'Nota fiscal da fixture disponível');
  const competency=workspace.workerCompetencies.find(c=>c.id===invoice.workerCompetencyId);
  const worker=workspace.financeWorkers.find(w=>w.id===competency.workerId);
  const label=`${worker.name} · ${competency.competence}`;
  const invoices=workspace.financialDocuments.filter(d=>d.workerCompetencyId===competency.id);
  await page.getByRole('button',{name:`Ver ${invoices.length} ${invoices.length===1?'anexo':'anexos'} de ${label}`,exact:true}).click();
  const invoiceList=page.getByRole('dialog',{name:`Anexos de ${label}`,exact:true});
  await expect(invoiceList.getByRole('link')).toHaveCount(invoices.length);
  await page.screenshot({path:'evidence/notas-fiscais.png',fullPage:true});
  for(const document of invoices) {
   await expect(invoiceList.locator(`a[href="${document.url}"]`)).toContainText(document.fileName);
   assert.equal((await page.request.get(new URL(document.url,page.url()).href)).status(),200);
  }
  await page.keyboard.press('Escape');
 });
}

export async function runAssigneeEligibilityBrowser({page,state,check,base}) {
 await check('Navegador: nova demanda oferece somente responsáveis ativos e com acesso',async()=>{
  const workspace=await state.owner.workspace();
  const editor=workspace.members.find(m=>m.email===state.editor.email);
  assert(editor);
  async function openNewTask() {
   await page.goto(base);
   await page.getByRole('textbox',{name:'Buscar clientes ou demandas'}).fill('vanessa');
   await page.locator('.search-results').getByRole('button',{name:'Vanessa Lopes',exact:true}).click();
   await page.getByRole('button',{name:'Nova demanda',exact:true}).click();
   return page.getByRole('dialog');
  }
  try {
   await state.owner.action('updateMember',{id:editor.id,status:'inactive'});
   let dialog=await openNewTask();
   await expect(dialog.getByRole('button',{name:'Selecionar responsável',exact:true})).not.toContainText(editor.name);
   await dialog.getByRole('button',{name:'Selecionar responsável',exact:true}).click();
   await expect(page.getByRole('option').filter({hasText:editor.name})).toHaveCount(0);
   await page.keyboard.press('Escape');await page.keyboard.press('Escape');
   await state.owner.action('updateMember',{id:editor.id,status:'active',permissions:['demands.execute']});
   dialog=await openNewTask();
   await expect(dialog.getByRole('button',{name:'Selecionar responsável',exact:true})).not.toContainText(editor.name);
   await dialog.getByRole('button',{name:'Selecionar responsável',exact:true}).click();
   await expect(page.getByRole('option').filter({hasText:editor.name})).toHaveCount(0);
   await expect(page.getByRole('option').filter({hasText:workspace.currentMember.name})).toBeVisible();
   await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  } finally {
   await state.owner.action('updateMember',{id:editor.id,status:editor.status,permissions:editor.permissions});
   await page.goto(base);
  }
 });
}
