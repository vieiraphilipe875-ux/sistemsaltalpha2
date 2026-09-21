/** Reads a copy of the legacy SQLite database. Never modifies the source. */
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {getTableColumns,getTableName,type InferInsertModel} from 'drizzle-orm';
import type {PgTable} from 'drizzle-orm/pg-core';
import * as schema from '../db/schema';
import {getDb,closeLocalDb} from '../db';
import {permissionKeys,rolePermissionDefaults} from '../lib/permissions';
const args=process.argv.slice(2),value=(flag:string)=>args[args.indexOf(flag)+1];
if(!args.includes('--source'))throw new Error('Use --source caminho.sqlite [--plan plano.json] [--apply]. Sem --apply, somente gera a proposta.');
const source=new DatabaseSync(value('--source'),{readOnly:true});
const tableExists=(name:string)=>!!source.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
type LegacyRow={id:string;name:string;email:string;role:string;status:string;agency_owner_id:string|null;client_access_mode:string;created_at:string;member_id:string;permission:string;client_id:string;board_id:string;created_by:string;assignee_id:string|null;password_hash:string|null;[key:string]:string|number|null};
const read=(name:string):LegacyRow[]=>tableExists(name)?source.prepare(`SELECT * FROM "${name}"`).all() as LegacyRow[]:[];
const legacyMembers=read('members');if(!legacyMembers.length)throw new Error('O arquivo não contém contas do sistema anterior.');
const legacyClients=read('clients'),legacyBoards=read('boards'),legacyTasks=read('deliverables'),legacyGrants=read('client_members'),legacyPerms=read('member_permissions');
const id=(table:string,old:string)=>{
 if(!old)return null;
 if(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(old))return old;
 const h=createHash('sha256').update(`postito:legacy:${table}:${old}`).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
};
const ownerFor=(old:string)=>{const m=legacyMembers.find(m=>m.id===old);if(!m)throw new Error('Conta referenciada não encontrada: '+old);return m.agency_owner_id||m.id;};
const ownerIds=[...new Set(legacyMembers.map(m=>ownerFor(m.id)))];
type Plan={agencies:Record<string,string>;clients:Record<string,string>;financialFallbackOwner?:string;warnings:string[]};
const proposal:Plan={agencies:Object.fromEntries(ownerIds.map(o=>[o,'Agência de '+legacyMembers.find(m=>m.id===o)!.name])),clients:{},warnings:[]};
for(const c of legacyClients){
 const candidates=[...new Set(legacyBoards.filter(b=>b.client_id===c.id).map(b=>ownerFor(b.created_by)))];
 if(candidates.length===1)proposal.clients[c.id]=candidates[0];
 else {proposal.clients[c.id]='';proposal.warnings.push(`Cliente ${c.id}: escolha explicitamente uma agência; ${candidates.length} proprietários possíveis.`);}
}
const plan:Plan=args.includes('--plan')?JSON.parse(await readFile(value('--plan'),'utf8')):proposal;
const report={sourceTables:{members:legacyMembers.length,clients:legacyClients.length,boards:legacyBoards.length,deliverables:legacyTasks.length,transactions:read('transactions').length},proposedAgencies:ownerIds.length,notes:['Contas existentes deverão confirmar o e-mail novamente. Hashes de senha são preservados e atualizados no login.','Contas globais de desenvolvimento não conservarão acesso a agências de outras pessoas.','Acessos explícitos e demandas atribuídas geram associação restrita ao espaço correto.','Arquivos físicos devem ser transferidos separadamente se houver referências no banco.'],warnings:proposal.warnings};
const out=args.includes('--report')?value('--report'):'.data/legacy-import-report.json';await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(report,null,2));
if(!args.includes('--apply')){
 const planOut=args.includes('--plan-out')?value('--plan-out'):'.data/legacy-migration-plan.json';await mkdir(dirname(planOut),{recursive:true});await writeFile(planOut,JSON.stringify(proposal,null,2),{mode:0o600});
 console.log(JSON.stringify({...report,planFile:planOut},null,2));source.close();
}else{
 for(const c of legacyClients)if(!plan.clients[c.id]||!ownerIds.includes(plan.clients[c.id]))throw new Error('Defina a agência do cliente '+c.id+' no plano antes da importação.');
 const db=getDb();if((await db.select({id:schema.members.id}).from(schema.members).limit(1)).length)throw new Error('O destino deve estar vazio. A importação não sobrescreve dados existentes.');
 const now=new Date().toISOString();
 const agencyId=(owner:string)=>id('agencies',owner)!;
 const role=(old:string)=>old==='manager'?'manager':old==='admin'?'admin':old==='client'?'viewer':'editor';
 const permissions=(m:LegacyRow)=>{
  if(['manager','admin'].includes(m.role))return [...permissionKeys];
  const explicit=legacyPerms.filter(p=>p.member_id===m.id).map(p=>p.permission);
  return explicit.length?permissionKeys.filter(p=>explicit.includes(p)) : m.role==='designer'?['clients.view','demands.execute']:rolePermissionDefaults[role(m.role)]||[];
 };
 await db.transaction(async tx=>{
  await tx.insert(schema.members).values(legacyMembers.map(m=>({id:id('members',m.id)!,name:m.name,email:m.email.trim().toLowerCase(),profession:['designer','social','manager'].includes(m.role)?m.role:'other',passwordHash:m.password_hash||null,emailVerifiedAt:null,status:m.status==='inactive'?'inactive' as const:'pending' as const,createdAt:m.created_at||now})));
  await tx.insert(schema.agencies).values(ownerIds.map(o=>({id:agencyId(o),name:plan.agencies[o]||proposal.agencies[o],createdBy:id('members',o)!,createdAt:now})));
  const memberships=new Map<string,typeof schema.agencyMemberships.$inferInsert>();
  function membership(oldMember:string,oldOwner:string,extra=false){const m=legacyMembers.find(m=>m.id===oldMember)!;if(!m)throw new Error('Membro ausente.');const key=oldOwner+':'+oldMember;if(memberships.has(key))return;
   memberships.set(key,{agencyId:agencyId(oldOwner),memberId:id('members',oldMember)!,role:oldMember===oldOwner?'manager':extra?(m.role==='client'?'viewer':'editor'):role(m.role),permissions:extra?permissions(m).filter(p=>["clients.view","demands.create","demands.execute"].includes(p)):permissions(m),clientAccessMode:extra?'selected':oldMember===oldOwner?'all':m.client_access_mode==='all'?'all':'selected',status:m.status==='inactive'?'inactive':'active',createdAt:m.created_at||now});}
  for(const m of legacyMembers)membership(m.id,ownerFor(m.id));
  for(const grant of legacyGrants)membership(grant.member_id,plan.clients[grant.client_id],true);
  for(const task of legacyTasks)if(task.assignee_id){const b=legacyBoards.find(b=>b.id===task.board_id)!;membership(task.assignee_id,plan.clients[b.client_id],true);}
  await tx.insert(schema.agencyMemberships).values([...memberships.values()]);
  const foreign:Record<string,string>={member_id:'members',created_by:'members',uploaded_by:'members',author_id:'members',assignee_id:'members',owner_id:'members',client_id:'clients',board_id:'boards',deliverable_id:'deliverables',asset_id:'assets',worker_id:'finance_workers',transaction_id:'transactions',worker_competency_id:'worker_competencies',lead_id:'crm_leads',deal_id:'crm_deals'};
  const tables=[schema.clients,schema.clientMembers,schema.boards,schema.deliverables,schema.slides,schema.assets,schema.attachments,schema.annotations,schema.deliverableReferences,schema.transactions,schema.financeWorkers,schema.workerCompetencies,schema.financialDocuments,schema.crmLeads,schema.crmDeals,schema.crmActivities];
  async function copyTable<T extends PgTable>(table:T){const name=getTableName(table),columns=getTableColumns(table);const rows=read(name).map(old=>{
   const row:Record<string,string|number|boolean|null>={};
   for(const [key,column] of Object.entries(columns)){
    if(key==='agencyId'){row[key]=agencyId(plan.clients[old.id]);continue;}
    if(column.name==='agency_owner_id'){
      const owner=old.agency_owner_id||(old.client_id&&plan.clients[old.client_id])||(old.created_by&&ownerFor(old.created_by))||plan.financialFallbackOwner;
      if(!owner||!ownerIds.includes(owner))throw new Error('Defina financialFallbackOwner para '+name+':'+old.id);row[key]=agencyId(owner);continue;
    }
    if(!(column.name in old))continue;
    let v:string|number|boolean|null=old[column.name];if(v!==null&&v!==undefined){if(column.name==='id')v=id(name,String(v));else if(foreign[column.name])v=id(foreign[column.name],String(v));else if(column.dataType==='boolean')v=!!v;}
    row[key]=v;
   }
   return row;
  });
  if(rows.length)await tx.insert(table).values(rows as InferInsertModel<T>[]);
  }
  for(const table of tables)await copyTable(table);
 });
 source.close();await closeLocalDb();console.log('Importação concluída em um destino novo. Fonte preservada.');
}
