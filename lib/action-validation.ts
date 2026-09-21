import {validDateInput} from "./dates";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { boards, deliverables, agencyMemberships, crmLeads, crmDeals, annotations, assets } from "@/db/schema";
import { canAccessClient, canAccessDeliverable, canManageDeliverable, canAccessAsset } from "./server-workspace";
import type { Member } from "./workspace-types";
import type { PermissionKey } from "./permissions";
import { AppError } from "./http";
const id=z.string().uuid(),text=z.string().trim().max(20000),title=z.string().trim().min(1).max(200),money=z.number().int().min(0).max(2147483647),date=z.string().refine(validDateInput,"Data inválida"),month=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const status=z.enum(["briefing","production","review","changes","approved"]);
const txStatus=z.enum(["predicted","open","partial","paid","overdue","cancelled"]);
const url=z.string().max(2048).refine(v=>{try{return ["http:","https:"].includes(new URL(v).protocol);}catch{return false;}},"Link inválido");
const stringDefault=text.default("");
const schemas={
 createClient:z.object({name:title,handle:stringDefault,driveUrl:z.union([z.literal(""),url]).default(""),period:stringDefault,revenue:money.default(0),dueDay:z.number().int().min(1).max(31).default(5)}),
 updateClient:z.object({id,driveUrl:z.union([z.literal(""),url])}),
 updateClientStatus:z.object({id,status:z.enum(["active","inactive"])}),deleteClient:z.object({id}),
 createBoard:z.object({clientId:id,period:title}),
 createDeliverable:z.object({boardId:id,title,kind:z.enum(["carousel","reels","stories","static"]),slideCount:z.number().int().min(1).max(30),assigneeId:id.nullable(),dueAt:date,notes:stringDefault,hasStoriesVersion:z.boolean().default(false),slides:z.array(z.object({position:z.number().int().min(1).max(30),copy:text,direction:text})).max(30).optional()}),
 updateDeliverable:z.object({id,status:status.optional(),assigneeId:id.nullable().optional(),dueAt:date.optional(),title:title.optional(),notes:text.optional(),sortOrder:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional()}),deleteDeliverable:z.object({id}),
 saveSlides:z.object({deliverableId:id,slides:z.array(z.object({position:z.number().int().min(1).max(30),copy:text,direction:text})).min(1).max(30)}),
 addAnnotation:z.object({assetId:id,slideNumber:z.number().int().min(1).max(30),x:z.number().min(0).max(100),y:z.number().min(0).max(100),comment:title}),
 resolveAnnotation:z.object({id,status:z.enum(["open","resolved"])}),
 updateClientCrm:z.object({id,status:z.enum(["prospecting","active","inactive"]),contactName:stringDefault,phone:stringDefault,email:z.union([z.literal(""),z.string().email()]),revenue:money,dueDay:z.number().int().min(1).max(31).default(5),notes:stringDefault}),
 createTransaction:z.object({type:z.enum(["income","expense","transfer","contribution","withdrawal","reimbursement","reversal","fee","tax","adjustment"]),amount:money.refine(v=>v>0),paidAmount:money.optional(),category:title,costCenter:stringDefault,account:stringDefault,status:txStatus,competence:month,dueDate:date,paymentDate:date.nullable().optional(),clientId:id.nullable(),counterpart:stringDefault,paymentMethod:stringDefault,recurring:z.boolean(),recurrence:stringDefault,description:title,notes:stringDefault}),
 updateTransaction:z.object({id,status:txStatus.optional(),paidAmount:money.optional(),paymentDate:date.nullable().optional(),description:title.optional(),category:title.optional(),costCenter:text.optional(),account:title.optional(),dueDate:date.optional(),notes:text.optional()}),
 duplicateTransaction:z.object({id}),archiveTransaction:z.object({id}),
 createFinanceWorker:z.object({name:title,employmentType:z.enum(["clt","pj","partner","intern","freelancer","other"]),taxId:stringDefault,companyName:stringDefault,role:stringDefault,costCenter:stringDefault,email:stringDefault,phone:stringDefault,monthlyAmount:money,paymentDay:z.number().int().min(1).max(31),paymentMethod:stringDefault,paymentDetails:stringDefault,invoiceRequired:z.boolean(),contractEnd:date.nullable().optional(),notes:stringDefault}),
 updateFinanceWorker:z.object({id,status:z.enum(["active","away","inactive"]).optional(),monthlyAmount:money.optional(),paymentDay:z.number().int().min(1).max(31).optional(),paymentMethod:text.optional(),paymentDetails:text.optional(),invoiceRequired:z.boolean().optional(),notes:text.optional()}),
 createWorkerCompetency:z.object({workerId:id,competence:month,dueDate:date.optional(),expectedAmount:money.optional()}),
 updateWorkerCompetency:z.object({id,status:z.enum(["predicted","waiting_document","approved","paid","overdue"]).optional(),invoiceStatus:z.enum(["not_required","waiting","received","validated","divergent"]).optional(),adjustments:z.number().int().min(-2147483647).max(2147483647).optional(),notes:text.optional()}),
 createDeliverableReference:z.object({deliverableId:id,url,description:stringDefault}),
 createCrmLead:z.object({company:title,contactName:stringDefault,email:stringDefault,phone:stringDefault,source:stringDefault,potentialValue:money,nextAction:stringDefault,nextActionAt:date.optional(),notes:stringDefault,ownerId:id.nullable().optional()}),
 updateCrmLead:z.object({id,status:z.enum(["new","research","contacting","connected","qualifying","sql","nurture","disqualified"]).optional(),score:z.number().int().min(0).max(100).optional(),nextAction:text.optional(),nextActionAt:date.nullable().optional(),notes:text.optional()}),
 convertCrmLead:z.object({id,value:money,closeDate:date.optional()}),
 createCrmDeal:z.object({company:title,contactName:stringDefault,value:money,nextAction:stringDefault,nextActionAt:date.optional(),closeDate:date.optional(),notes:stringDefault,ownerId:id.nullable().optional()}),
 updateCrmDeal:z.object({id,stage:z.enum(["discovery","solution","proposal","negotiation","decision","contract","won","lost"]).optional(),probability:z.number().int().min(0).max(100).optional(),nextAction:text.optional(),nextActionAt:date.nullable().optional(),lossReason:text.nullable().optional()}),
 createCrmActivity:z.object({leadId:id.nullable().optional(),dealId:id.nullable().optional(),type:z.enum(["call","whatsapp","email","meeting","task","note"]),title,dueAt:date.optional(),notes:text.optional()}),completeCrmActivity:z.object({id}),
};
// Parsed payloads are discriminated at the legacy action boundary after runtime validation.
export type ActionPayload = {[K in keyof typeof schemas]: {action:K}&z.infer<typeof schemas[K]>}[keyof typeof schemas];
export function parseAction(raw:unknown):ActionPayload {
 const {action}=z.object({action:z.string()}).parse(raw);
 if(!(action in schemas))throw new AppError("Ação inválida.");
 return {action,...schemas[action as keyof typeof schemas].parse(raw)} as ActionPayload;
}
type AuthorizationPayload={action:string;id?:string;clientId?:string|null;boardId?:string;deliverableId?:string;assigneeId?:string|null;ownerId?:string|null;status?:string;leadId?:string|null;dealId?:string|null;assetId?:string;revenue?:number};
export async function authorizeAction(me:Member,p:AuthorizationPayload) {
 const db=getDb(),a=p.action as string;
 let required:PermissionKey;
 if(a.includes("Crm"))required="crm.access";
 else if(/Transaction|FinanceWorker|WorkerCompetency/.test(a))required="finance.access";
 else if(/Client|Board/.test(a))required="clients.manage";
 else if(a==="updateDeliverable" || a==="resolveAnnotation")required=me.permissions.includes("demands.create")?"demands.create":"demands.execute";
 else required="demands.create";
 if(!me.permissions.includes(required))throw new AppError("Você não tem permissão para esta ação.",403);
 const clientId=p.clientId || (/^updateClient|deleteClient/.test(a)?p.id:null);
 if(clientId && !await canAccessClient(me,clientId,true))throw new AppError("Cliente não disponível.",403);
 if((a==="createClient" && (p.revenue??0)>0 || a==="updateClientCrm") && !me.permissions.includes("finance.access"))throw new AppError("Permissão financeira necessária para alterar cobranças.",403);
 if(p.boardId){const [board]=await db.select().from(boards).where(eq(boards.id,p.boardId)).limit(1);if(!board||!await canAccessClient(me,board.clientId,true))throw new AppError("Pauta não disponível.",403);}
 const taskId=p.deliverableId || (/^(update|delete)Deliverable$/.test(a)?p.id:null);
 if(taskId){
  if(!await canAccessDeliverable(me.id,taskId,me.role))throw new AppError("Demanda não disponível.",403);
  if(a!=="updateDeliverable" && !await canManageDeliverable(me.id,taskId,me.role))throw new AppError("Você não pode editar esta demanda.",403);
  if(a==="updateDeliverable" && !await canManageDeliverable(me.id,taskId,me.role)) {
    const [task]=await db.select().from(deliverables).where(eq(deliverables.id,taskId)).limit(1);
    if(!me.permissions.includes("demands.execute") || task?.assigneeId!==me.id || !["production","review"].includes(p.status??"") || Object.keys(p).some(k=>!["action","id","status"].includes(k)))throw new AppError("Você pode iniciar ou enviar para revisão apenas suas demandas.",403);
  }
 }
 if(p.assetId && !await canAccessAsset(me.id,p.assetId)) throw new AppError("Arquivo não disponível.",403);
 if(a==="addAnnotation" && p.assetId){
   const [asset]=await db.select().from(assets).where(eq(assets.id,p.assetId)).limit(1);
   if(!asset||!await canManageDeliverable(me.id,asset.deliverableId))throw new AppError("Você não pode revisar esta demanda.",403);
 }
 if(a==="resolveAnnotation") {
   if(!p.id)throw new AppError("Apontamento inválido.");
   const [annotation]=await db.select().from(annotations).where(eq(annotations.id,p.id)).limit(1);
   if(!annotation || !await canAccessAsset(me.id,annotation.assetId)) throw new AppError("Apontamento não disponível.",403);
   const [asset]=await db.select({taskId:deliverables.id,assigneeId:deliverables.assigneeId}).from(assets).innerJoin(deliverables,eq(deliverables.id,assets.deliverableId)).where(eq(assets.id,annotation.assetId)).limit(1);
   if(!asset||(!await canManageDeliverable(me.id,asset.taskId)&&asset.assigneeId!==me.id))throw new AppError("Você não pode resolver apontamentos desta demanda.",403);
 }
 for(const memberId of [p.assigneeId,p.ownerId].filter((id):id is string=>typeof id==="string" && !!id)) {
   const [m]=await db.select().from(agencyMemberships).where(and(eq(agencyMemberships.agencyId,me.agencyOwnerId!),eq(agencyMemberships.memberId,memberId),eq(agencyMemberships.status,"active"))).limit(1);
   if(!m || m.role==="viewer" || (p.assigneeId && !["manager","admin"].includes(m.role) && (!m.permissions.includes("demands.execute")||!m.permissions.includes("clients.view"))))throw new AppError("Responsável não disponível para esta função.");
 }
 for(const [key,table] of [["leadId",crmLeads],["dealId",crmDeals]] as const)if(p[key]){
  const [r]=await db.select({id:table.id}).from(table).where(and(eq(table.id,p[key]),eq(table.agencyOwnerId,me.agencyOwnerId!))).limit(1);
  if(!r)throw new AppError("Registro comercial não disponível.",403);
 }
}
