import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { verifySession } from "@/lib/auth";
import { getDb } from "@/db";
import { annotations, assets, attachments, boards, clientMembers, clients, crmActivities, crmDeals, crmLeads, deliverables, deliverableReferences, financeWorkers, financialDocuments, members, slides, transactions, workerCompetencies, agencies, agencyMemberships, agencyInvites, activityLog } from "@/db/schema";
import { effectivePermissions } from "@/lib/permissions";
import type { Member, WorkspaceData } from "./workspace-types";

export async function getAgencyList(userId:string) {
 return getDb().select({id:agencies.id,name:agencies.name,role:agencyMemberships.role}).from(agencyMemberships).innerJoin(agencies,eq(agencies.id,agencyMemberships.agencyId)).where(and(eq(agencyMemberships.memberId,userId),eq(agencyMemberships.status,"active"))).orderBy(asc(agencies.name));
}
export async function getCurrentMember(_options: {seed?:boolean} = {}):Promise<Member|null> {
 const session=await verifySession();
 if(!session?.agencyId)return null;
 const [m]=await getDb().select().from(agencyMemberships).where(and(eq(agencyMemberships.agencyId,session.agencyId),eq(agencyMemberships.memberId,session.userId),eq(agencyMemberships.status,"active"))).limit(1);
 if(!m)return null;
 const u=session.user;
 return {id:u.id,email:u.email,name:u.name,profession:u.profession,role:m.role,agencyOwnerId:m.agencyId,clientAccessMode:m.clientAccessMode,permissions:effectivePermissions(m.role,m.permissions),status:m.status,createdAt:u.createdAt};
}
export async function canAccessClient(member:Member,clientId:string,manage=false) {
 if(!member.permissions.includes("clients.view"))return false;
 const db=getDb();
 const [client]=await db.select({id:clients.id}).from(clients).where(and(eq(clients.id,clientId),eq(clients.agencyId,member.agencyOwnerId!))).limit(1);
 if(!client)return false;
 if(member.clientAccessMode==="all" || ["manager","admin"].includes(member.role))return true;
 const [grant]=await db.select().from(clientMembers).where(and(eq(clientMembers.clientId,clientId),eq(clientMembers.memberId,member.id))).limit(1);
 if(grant)return true;
 if(manage)return false;
 const [assigned]=await db.select({id:deliverables.id}).from(deliverables).innerJoin(boards,eq(boards.id,deliverables.boardId)).where(and(eq(boards.clientId,clientId),eq(deliverables.assigneeId,member.id))).limit(1);
 return !!assigned;
}
export async function canAccessDeliverable(memberId:string,id:string,_role?:string) {
 const member=await getCurrentMember();if(!member || member.id!==memberId)return false;
 const db=getDb();
 const [row]=await db.select({item:deliverables,board:boards}).from(deliverables).innerJoin(boards,eq(boards.id,deliverables.boardId)).where(eq(deliverables.id,id)).limit(1);
 if(!row || !await canAccessClient(member,row.board.clientId))return false;
 return row.item.assigneeId===member.id || await canAccessClient(member,row.board.clientId,true);
}
export async function canManageDeliverable(memberId:string,id:string,_role?:string) {
 const member=await getCurrentMember();
 if(!member || member.id!==memberId || !member.permissions.includes("demands.create"))return false;
 const [row]=await getDb().select({clientId:boards.clientId}).from(deliverables).innerJoin(boards,eq(boards.id,deliverables.boardId)).where(eq(deliverables.id,id)).limit(1);
 return !!row && await canAccessClient(member,row.clientId,true);
}
export async function canAccessAsset(memberId:string,id:string,role?:string) {
 const [row]=await getDb().select().from(assets).where(eq(assets.id,id)).limit(1);
 return !!row && await canAccessDeliverable(memberId,row.deliverableId,role);
}
export async function canAccessAttachment(memberId:string,id:string,role?:string) {
 const [row]=await getDb().select().from(attachments).where(eq(attachments.id,id)).limit(1);
 return !!row && await canAccessDeliverable(memberId,row.deliverableId,role);
}
export async function canAccessFinancialDocument(memberId:string,id:string,_role?:string) {
 const member=await getCurrentMember();if(!member || member.id!==memberId || !member.permissions.includes("finance.access"))return false;
 const [row]=await getDb().select().from(financialDocuments).where(and(eq(financialDocuments.id,id),eq(financialDocuments.agencyOwnerId,member.agencyOwnerId!))).limit(1);
 return !!row;
}
export async function getWorkspaceData():Promise<WorkspaceData|null> {
 const me=await getCurrentMember();if(!me)return null;
 const db=getDb(),agencyId=me.agencyOwnerId!;
 const myAgencies=await getAgencyList(me.id);
 const agency=myAgencies.find(a=>a.id===agencyId)!;
 const rows=await db.select({u:members,m:agencyMemberships}).from(agencyMemberships).innerJoin(members,eq(members.id,agencyMemberships.memberId)).where(eq(agencyMemberships.agencyId,agencyId)).orderBy(asc(members.name));
 const publicMembers:Member[]=rows.map(({u,m})=>({id:u.id,email:u.email,name:u.name,profession:u.profession,role:m.role,agencyOwnerId:agencyId,clientAccessMode:m.clientAccessMode,status:m.status,permissions:effectivePermissions(m.role,m.permissions),createdAt:u.createdAt}));
 const agencyClients=await db.select().from(clients).where(eq(clients.agencyId,agencyId)).orderBy(asc(clients.name));
 const agencyClientIds=agencyClients.map(c=>c.id);
 const grants=agencyClientIds.length?await db.select().from(clientMembers).where(inArray(clientMembers.clientId,agencyClientIds)):[];
 const myClientIds=grants.filter(g=>g.memberId===me.id).map(g=>g.clientId);
 const allBoards=agencyClientIds.length?await db.select().from(boards).where(inArray(boards.clientId,agencyClientIds)).orderBy(asc(boards.createdAt)):[];
 const boardIds=allBoards.map(b=>b.id);
 const allTasks=boardIds.length?await db.select().from(deliverables).where(inArray(deliverables.boardId,boardIds)).orderBy(asc(deliverables.sortOrder)):[];
 const allScope=me.clientAccessMode==="all" || ["manager","admin"].includes(me.role);
 const tasks=me.permissions.includes("clients.view")?allTasks.filter(t=>allScope||t.assigneeId===me.id||myClientIds.includes(allBoards.find(b=>b.id===t.boardId)!.clientId)):[];
 const visibleClientIds=me.permissions.includes("clients.view")?agencyClientIds.filter(id=>allScope||myClientIds.includes(id)||tasks.some(t=>allBoards.find(b=>b.id===t.boardId)?.clientId===id)):[];
 const visibleClients=agencyClients.filter(c=>visibleClientIds.includes(c.id));
 const ids=tasks.map(t=>t.id);
 const [allSlides,allAssets,allAttachments,allReferences]=await Promise.all([
  ids.length?db.select().from(slides).where(inArray(slides.deliverableId,ids)).orderBy(asc(slides.position)):[],
  ids.length?db.select().from(assets).where(inArray(assets.deliverableId,ids)).orderBy(asc(assets.version)):[],
  ids.length?db.select().from(attachments).where(inArray(attachments.deliverableId,ids)).orderBy(asc(attachments.createdAt)):[],
  ids.length?db.select().from(deliverableReferences).where(inArray(deliverableReferences.deliverableId,ids)):[],
 ]);
 const assetIds=allAssets.map(a=>a.id),finance=me.permissions.includes("finance.access"),crm=me.permissions.includes("crm.access"),admin=["manager","admin"].includes(me.role);
 return {
  currentMember:me,agency,agencies:myAgencies,members:publicMembers,
  invites:admin?(await db.select({id:agencyInvites.id,email:agencyInvites.email,role:agencyInvites.role,clientIds:agencyInvites.clientIds,expiresAt:agencyInvites.expiresAt,usedAt:agencyInvites.usedAt,revokedAt:agencyInvites.revokedAt}).from(agencyInvites).where(eq(agencyInvites.agencyId,agencyId)).orderBy(desc(agencyInvites.createdAt))):[],
  activity:admin?await db.select().from(activityLog).where(eq(activityLog.agencyId,agencyId)).orderBy(desc(activityLog.createdAt)).limit(30):[],
  clients:visibleClients.map(c=>{
    const { revenue, dueDay, ...client } = c;
    return {...client,...(finance?{revenue,dueDay}:{}),contactName:crm?c.contactName:"",phone:crm?c.phone:"",email:crm?c.email:"",notes:crm?c.notes:"",avatarUrl:c.avatarKey?`/api/clients/${c.id}/media?kind=avatar&v=${encodeURIComponent(c.avatarKey)}`:null,bannerUrl:c.bannerKey?`/api/clients/${c.id}/media?kind=banner&v=${encodeURIComponent(c.bannerKey)}`:null};
  }),
  clientMembers:grants.filter(g=>visibleClientIds.includes(g.clientId)),memberPermissions:publicMembers.flatMap(m=>m.permissions.map(permission=>({memberId:m.id,permission}))),
  boards:allBoards.filter(b=>visibleClientIds.includes(b.clientId)),
  deliverables:tasks.map(t=>({...t,slides:allSlides.filter(s=>s.deliverableId===t.id),assets:allAssets.filter(a=>a.deliverableId===t.id).map(a=>({...a,url:`/api/assets/${a.id}`})),attachments:allAttachments.filter(a=>a.deliverableId===t.id).map(a=>({...a,url:`/api/attachments/${a.id}`})),references:allReferences.filter(r=>r.deliverableId===t.id)})),
  annotations:assetIds.length?await db.select().from(annotations).where(inArray(annotations.assetId,assetIds)):[],
  transactions:finance?await db.select().from(transactions).where(eq(transactions.agencyOwnerId,agencyId)).orderBy(asc(transactions.dueDate)):[],
  financeWorkers:finance?await db.select().from(financeWorkers).where(eq(financeWorkers.agencyOwnerId,agencyId)):[],
  workerCompetencies:finance?await db.select().from(workerCompetencies).where(eq(workerCompetencies.agencyOwnerId,agencyId)):[],
  financialDocuments:finance?(await db.select().from(financialDocuments).where(eq(financialDocuments.agencyOwnerId,agencyId))).map(d=>({...d,url:`/api/finance/documents/${d.id}`})):[],
  crmLeads:crm?await db.select().from(crmLeads).where(eq(crmLeads.agencyOwnerId,agencyId)):[],
  crmDeals:crm?await db.select().from(crmDeals).where(eq(crmDeals.agencyOwnerId,agencyId)):[],
  crmActivities:crm?await db.select().from(crmActivities).where(eq(crmActivities.agencyOwnerId,agencyId)):[],
 };
}
