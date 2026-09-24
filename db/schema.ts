import type { KanbanColumn, KanbanKind } from "../lib/kanban";
import { index, integer, bigint, boolean, jsonb, primaryKey, real, pgSchema, text, uniqueIndex } from "drizzle-orm/pg-core";

export const postitoSchema = pgSchema("postito");
const sqliteTable = postitoSchema.table;

export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  profession: text("profession").notNull().default("other"),
  emailVerifiedAt: text("email_verified_at"),
  status: text("status", { enum: ["pending", "active", "inactive"] }).notNull().default("pending"),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("members_email_unique").on(table.email)]);

export const agencies = sqliteTable("agencies", {
  id: text("id").primaryKey(), name: text("name").notNull(),
  createdBy: text("created_by").notNull().references(() => members.id),
  createdAt: text("created_at").notNull(),
});

export const agencyMemberships = sqliteTable("agency_memberships", {
  agencyId: text("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["manager", "admin", "editor", "viewer"] }).notNull().default("editor"),
  clientAccessMode: text("client_access_mode", { enum: ["all", "selected"] }).notNull().default("selected"),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  createdAt: text("created_at").notNull(),
}, t => [primaryKey({columns:[t.agencyId,t.memberId]}), index("memberships_member_idx").on(t.memberId)]);

export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  agencyId: text("agency_id").references(() => agencies.id, { onDelete: "set null" }),
  expiresAt: text("expires_at").notNull(), createdAt: text("created_at").notNull(),
}, t => [index("sessions_member_idx").on(t.memberId)]);

export const authChallenges = sqliteTable("auth_challenges", {
  id: text("id").primaryKey(), memberId: text("member_id").notNull().references(() => members.id, { onDelete:"cascade" }),
  kind: text("kind", {enum:["verify", "reset"]}).notNull(), tokenHash: text("token_hash").notNull(),
  attempts: integer("attempts").notNull().default(0), expiresAt: text("expires_at").notNull(),
  consumedAt: text("consumed_at"), createdAt: text("created_at").notNull(),
}, t => [index("challenges_member_idx").on(t.memberId,t.kind)]);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(), count: integer("count").notNull().default(0), resetAt: text("reset_at").notNull(),
});

export const agencyInvites = sqliteTable("agency_invites", {
  id: text("id").primaryKey(), agencyId: text("agency_id").notNull().references(() => agencies.id,{onDelete:"cascade"}),
  tokenHash: text("token_hash").notNull(), email: text("email"),
  role: text("role",{enum:["admin","editor","viewer"]}).notNull(),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  clientIds: jsonb("client_ids").$type<string[]>().notNull().default([]),
  clientAccessMode: text("client_access_mode",{enum:["all","selected"]}).notNull().default("selected"),
  createdBy: text("created_by").notNull().references(() => members.id),
  expiresAt: text("expires_at").notNull(), usedAt: text("used_at"), revokedAt: text("revoked_at"),
  createdAt: text("created_at").notNull(),
}, t => [uniqueIndex("invite_token_idx").on(t.tokenHash), index("invite_agency_idx").on(t.agencyId)]);

export const clients = sqliteTable("clients", {
  agencyId: text("agency_id").notNull().references(() => agencies.id, {onDelete:"cascade"}),
  id: text("id").primaryKey(),
  columnId: text("column_id"),
  name: text("name").notNull(),
  handle: text("handle").notNull().default(""),
  driveUrl: text("drive_url").notNull().default(""),
  avatarKey: text("avatar_key"),
  bannerKey: text("banner_key"),
  accent: text("accent").notNull().default("#FFD84D"),
  status: text("status", { enum: ["prospecting", "active", "inactive"] }).notNull().default("active"),
  contactName: text("contact_name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  revenue: integer("revenue").notNull().default(0),
  dueDay: integer("due_day").notNull().default(5),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const kanbanBoards = sqliteTable("kanban_boards", {
  id: text("id").primaryKey(),
  agencyId: text("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  kind: text("kind").$type<KanbanKind>().notNull(),
  clientId: text("client_id").references(() => clients.id, { onDelete: "cascade" }),
  revision: integer("revision").notNull().default(0),
  columns: jsonb("columns").$type<KanbanColumn[]>().notNull(),
  updatedAt: text("updated_at").notNull(),
}, table => [index("kanban_boards_agency_idx").on(table.agencyId)]);

export const clientMembers = sqliteTable("client_members", {
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.clientId, table.memberId] }),
  index("idx_client_members_member_id").on(table.memberId),
]);

export const boards = sqliteTable("boards", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  period: text("period").notNull(),
  status: text("status", { enum: ["draft", "active", "completed"] }).notNull().default("active"),
  createdBy: text("created_by").notNull().references(() => members.id),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_boards_client_id").on(table.clientId)]);

export const deliverables = sqliteTable("deliverables", {
  id: text("id").primaryKey(),
  columnId: text("column_id"),
  priority: text("priority", { enum: ["low", "normal", "high", "urgent"] }).notNull().default("normal"),
  labels: jsonb("labels").$type<{id:string;name:string;color:string}[]>().notNull().default([]),
  boardId: text("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  kind: text("kind", { enum: ["carousel", "reels", "stories", "static"] }).notNull(),
  slideCount: integer("slide_count").notNull().default(1),
  status: text("status", { enum: ["briefing", "production", "review", "changes", "approved"] }).notNull().default("briefing"),
  hasStoriesVersion: boolean("has_stories_version").notNull().default(false),
  coverMode: text("cover_mode", { enum: ["auto", "none", "image", "full"] }).notNull().default("auto"),
  coverFileId: text("cover_file_id"),
  coverFileKind: text("cover_file_kind", { enum: ["attachment", "asset"] }),
  assigneeId: text("assignee_id").references(() => members.id),
  assignedById: text("assigned_by_id").references(() => members.id, { onDelete: "set null" }),
  assignedAt: text("assigned_at"),
  dueAt: text("due_at").notNull(),
  notes: text("notes").notNull().default(""),
  sourceUrl: text("source_url").notNull().default(""),
  sortOrder: bigint("sort_order", { mode: "number" }).notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_deliverables_board_id").on(table.boardId),
  index("idx_deliverables_assignee_due").on(table.assigneeId, table.dueAt),
  index("idx_deliverables_open_status").on(table.status),
]);

export const taskNotifications = sqliteTable("task_notifications", {
  id: text("id").primaryKey(),
  agencyId: text("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  deliverableId: text("deliverable_id").notNull().references(() => deliverables.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["assignment", "urgent", "stage", "deadline"] }).notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
  readAt: text("read_at"),
}, t => [index("task_notifications_inbox_idx").on(t.agencyId, t.memberId, t.createdAt), index("task_notifications_task_idx").on(t.deliverableId)]);

export const slides = sqliteTable("slides", {
  id: text("id").primaryKey(),
  deliverableId: text("deliverable_id").notNull().references(() => deliverables.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  copy: text("copy").notNull().default(""),
  direction: text("direction").notNull().default(""),
}, (table) => [uniqueIndex("slides_deliverable_position_unique").on(table.deliverableId, table.position)]);

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  deliverableId: text("deliverable_id").notNull().references(() => deliverables.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  version: integer("version").notNull(),
  uploadedBy: text("uploaded_by").notNull().references(() => members.id),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_assets_deliverable_version").on(table.deliverableId, table.version)]);

export const attachments = sqliteTable("attachments", {
  id: text("id").primaryKey(),
  deliverableId: text("deliverable_id").notNull().references(() => deliverables.id, { onDelete: "cascade" }),
  slidePosition: integer("slide_position"),
  storageKey: text("storage_key").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  uploadedBy: text("uploaded_by").notNull().references(() => members.id),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_attachments_deliverable_slide").on(table.deliverableId, table.slidePosition),
]);

export const annotations = sqliteTable("annotations", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  slideNumber: integer("slide_number").notNull(),
  x: real("x").notNull(),
  y: real("y").notNull(),
  comment: text("comment").notNull(),
  authorId: text("author_id").notNull().references(() => members.id),
  status: text("status", { enum: ["open", "resolved"] }).notNull().default("open"),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
}, (table) => [index("idx_annotations_asset_status").on(table.assetId, table.status)]);

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  agencyOwnerId: text("agency_owner_id").notNull().references(() => agencies.id, {onDelete:"cascade"}),
  type: text("type", { enum: ["income", "expense", "transfer", "contribution", "withdrawal", "reimbursement", "reversal", "fee", "tax", "adjustment"] }).notNull(),
  amount: integer("amount").notNull(), // stored in cents
  paidAmount: integer("paid_amount").notNull().default(0),
  category: text("category").notNull(),
  costCenter: text("cost_center").notNull().default(""),
  account: text("account").notNull().default("Conta principal"),
  status: text("status", { enum: ["predicted", "open", "partial", "paid", "overdue", "cancelled"] }).notNull().default("open"),
  competence: text("competence").notNull().default(""),
  dueDate: text("due_date").notNull(),
  paymentDate: text("payment_date"),
  clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
  counterpart: text("counterpart").notNull().default(""),
  paymentMethod: text("payment_method").notNull().default(""),
  recurring: boolean("recurring").notNull().default(false),
  recurrence: text("recurrence").notNull().default(""),
  description: text("description").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdBy: text("created_by").references(() => members.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull().default(""),
  archivedAt: text("archived_at"),
}, (table) => [
  index("idx_transactions_client_id").on(table.clientId),
  index("idx_transactions_agency_due").on(table.agencyOwnerId, table.dueDate),
  index("idx_transactions_agency_status").on(table.agencyOwnerId, table.status),
]);

export const financeWorkers = sqliteTable("finance_workers", {
  id: text("id").primaryKey(),
  agencyOwnerId: text("agency_owner_id").notNull().references(() => agencies.id, {onDelete:"cascade"}),
  name: text("name").notNull(),
  employmentType: text("employment_type", { enum: ["clt", "pj", "partner", "intern", "freelancer", "other"] }).notNull().default("pj"),
  status: text("status", { enum: ["active", "away", "inactive"] }).notNull().default("active"),
  taxId: text("tax_id").notNull().default(""),
  companyName: text("company_name").notNull().default(""),
  role: text("role").notNull().default(""),
  costCenter: text("cost_center").notNull().default("Equipe"),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  monthlyAmount: integer("monthly_amount").notNull().default(0),
  paymentDay: integer("payment_day").notNull().default(5),
  paymentMethod: text("payment_method").notNull().default("Pix"),
  paymentDetails: text("payment_details").notNull().default(""),
  invoiceRequired: boolean("invoice_required").notNull().default(false),
  contractEnd: text("contract_end"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_finance_workers_agency_status").on(table.agencyOwnerId, table.status),
]);

export const workerCompetencies = sqliteTable("worker_competencies", {
  id: text("id").primaryKey(),
  agencyOwnerId: text("agency_owner_id").notNull().references(() => agencies.id, {onDelete:"cascade"}),
  workerId: text("worker_id").notNull().references(() => financeWorkers.id, { onDelete: "cascade" }),
  competence: text("competence").notNull(),
  expectedAmount: integer("expected_amount").notNull().default(0),
  adjustments: integer("adjustments").notNull().default(0),
  dueDate: text("due_date").notNull(),
  status: text("status", { enum: ["predicted", "waiting_document", "approved", "paid", "overdue"] }).notNull().default("predicted"),
  invoiceStatus: text("invoice_status", { enum: ["not_required", "waiting", "received", "validated", "divergent"] }).notNull().default("not_required"),
  paymentDate: text("payment_date"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("worker_competencies_worker_month_unique").on(table.workerId, table.competence),
  index("idx_worker_competencies_agency_due").on(table.agencyOwnerId, table.dueDate),
]);

export const financialDocuments = sqliteTable("financial_documents", {
  id: text("id").primaryKey(),
  agencyOwnerId: text("agency_owner_id").notNull().references(() => agencies.id, {onDelete:"cascade"}),
  transactionId: text("transaction_id").references(() => transactions.id, { onDelete: "cascade" }),
  workerCompetencyId: text("worker_competency_id").references(() => workerCompetencies.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["invoice", "receipt", "bill", "contract", "statement", "other"] }).notNull().default("other"),
  competence: text("competence").notNull().default(""),
  storageKey: text("storage_key").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  uploadedBy: text("uploaded_by").notNull().references(() => members.id),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_financial_documents_transaction").on(table.transactionId),
  index("idx_financial_documents_competency").on(table.workerCompetencyId),
]);

export const deliverableReferences = sqliteTable("deliverable_references", {
  id: text("id").primaryKey(),
  deliverableId: text("deliverable_id").notNull().references(() => deliverables.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  description: text("description").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_deliverable_references_deliverable_id").on(table.deliverableId),
]);

export const crmLeads = sqliteTable("crm_leads", {
  id: text("id").primaryKey(),
  columnId: text("column_id"),
  priority: text("priority", { enum: ["low", "normal", "high", "urgent"] }).notNull().default("normal"),
  labels: jsonb("labels").$type<{id:string;name:string;color:string}[]>().notNull().default([]),
  agencyOwnerId: text("agency_owner_id").notNull().references(() => agencies.id, {onDelete:"cascade"}),
  company: text("company").notNull(),
  contactName: text("contact_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  source: text("source").notNull().default("Manual"),
  status: text("status", { enum: ["new", "research", "contacting", "connected", "qualifying", "sql", "nurture", "disqualified"] }).notNull().default("new"),
  score: integer("score").notNull().default(0),
  potentialValue: integer("potential_value").notNull().default(0),
  nextAction: text("next_action").notNull().default(""),
  nextActionAt: text("next_action_at"),
  notes: text("notes").notNull().default(""),
  ownerId: text("owner_id").references(() => members.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_crm_leads_agency_status").on(table.agencyOwnerId, table.status),
  index("idx_crm_leads_next_action").on(table.agencyOwnerId, table.nextActionAt),
]);

export const crmDeals = sqliteTable("crm_deals", {
  id: text("id").primaryKey(),
  columnId: text("column_id"),
  agencyOwnerId: text("agency_owner_id").notNull().references(() => agencies.id, {onDelete:"cascade"}),
  leadId: text("lead_id").references(() => crmLeads.id, { onDelete: "set null" }),
  company: text("company").notNull(),
  contactName: text("contact_name").notNull().default(""),
  value: integer("value").notNull().default(0),
  stage: text("stage", { enum: ["discovery", "solution", "proposal", "negotiation", "decision", "contract", "won", "lost"] }).notNull().default("discovery"),
  probability: integer("probability").notNull().default(10),
  nextAction: text("next_action").notNull().default(""),
  nextActionAt: text("next_action_at"),
  closeDate: text("close_date"),
  ownerId: text("owner_id").references(() => members.id, { onDelete: "set null" }),
  notes: text("notes").notNull().default(""),
  lossReason: text("loss_reason"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_crm_deals_agency_stage").on(table.agencyOwnerId, table.stage),
  index("idx_crm_deals_close_date").on(table.agencyOwnerId, table.closeDate),
]);

export const crmActivities = sqliteTable("crm_activities", {
  id: text("id").primaryKey(),
  agencyOwnerId: text("agency_owner_id").notNull().references(() => agencies.id, {onDelete:"cascade"}),
  leadId: text("lead_id").references(() => crmLeads.id, { onDelete: "cascade" }),
  dealId: text("deal_id").references(() => crmDeals.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["call", "whatsapp", "email", "meeting", "task", "note"] }).notNull().default("task"),
  title: text("title").notNull(),
  dueAt: text("due_at"),
  status: text("status", { enum: ["pending", "done"] }).notNull().default("pending"),
  notes: text("notes").notNull().default(""),
  createdBy: text("created_by").notNull().references(() => members.id),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_crm_activities_agency_due").on(table.agencyOwnerId, table.dueAt)]);

export const activityLog = sqliteTable("activity_log", {
  id: text("id").primaryKey(), agencyId: text("agency_id").notNull().references(() => agencies.id,{onDelete:"cascade"}),
  memberId: text("member_id").notNull().references(() => members.id),
  action: text("action").notNull(), entityId: text("entity_id"),
  createdAt: text("created_at").notNull(),
}, t => [index("activity_agency_idx").on(t.agencyId,t.createdAt)]);

export const uploadTickets = sqliteTable("upload_tickets", {
 id: text("id").primaryKey(), agencyId:text("agency_id").notNull().references(()=>agencies.id,{onDelete:"cascade"}),
 memberId:text("member_id").notNull().references(()=>members.id), storageKey:text("storage_key").notNull(),
 purpose:text("purpose",{enum:["asset","attachment","avatar","banner","transaction","competency"]}).notNull(),
 targetId:text("target_id").notNull(), fileName:text("file_name").notNull(),mimeType:text("mime_type").notNull(),fileSize:integer("file_size").notNull(),
 slidePosition:integer("slide_position"), expiresAt:text("expires_at").notNull(),consumedAt:text("consumed_at"), createdAt:text("created_at").notNull(),
},t=>[index("upload_tickets_member_idx").on(t.memberId,t.createdAt)]);
