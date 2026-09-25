CREATE SCHEMA "postito";
--> statement-breakpoint
CREATE TABLE "postito"."activity_log" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_id" text NOT NULL,
	"member_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_id" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."agencies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."agency_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"email" text,
	"role" text NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"client_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"client_access_mode" text DEFAULT 'selected' NOT NULL,
	"created_by" text NOT NULL,
	"expires_at" text NOT NULL,
	"used_at" text,
	"revoked_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."agency_memberships" (
	"agency_id" text NOT NULL,
	"member_id" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"client_access_mode" text DEFAULT 'selected' NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "agency_memberships_agency_id_member_id_pk" PRIMARY KEY("agency_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "postito"."annotations" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"slide_number" integer NOT NULL,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"comment" text NOT NULL,
	"author_id" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" text NOT NULL,
	"resolved_at" text
);
--> statement-breakpoint
CREATE TABLE "postito"."assets" (
	"id" text PRIMARY KEY NOT NULL,
	"deliverable_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"version" integer NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"deliverable_id" text NOT NULL,
	"slide_position" integer,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer DEFAULT 0 NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."auth_challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"kind" text NOT NULL,
	"token_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" text NOT NULL,
	"consumed_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."boards" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"title" text NOT NULL,
	"period" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."client_members" (
	"client_id" text NOT NULL,
	"member_id" text NOT NULL,
	CONSTRAINT "client_members_client_id_member_id_pk" PRIMARY KEY("client_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "postito"."clients" (
	"agency_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"handle" text DEFAULT '' NOT NULL,
	"drive_url" text DEFAULT '' NOT NULL,
	"avatar_key" text,
	"banner_key" text,
	"accent" text DEFAULT '#FFD84D' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"revenue" integer DEFAULT 0 NOT NULL,
	"due_day" integer DEFAULT 5 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."crm_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_owner_id" text NOT NULL,
	"lead_id" text,
	"deal_id" text,
	"type" text DEFAULT 'task' NOT NULL,
	"title" text NOT NULL,
	"due_at" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."crm_deals" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_owner_id" text NOT NULL,
	"lead_id" text,
	"company" text NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"stage" text DEFAULT 'discovery' NOT NULL,
	"probability" integer DEFAULT 10 NOT NULL,
	"next_action" text DEFAULT '' NOT NULL,
	"next_action_at" text,
	"close_date" text,
	"owner_id" text,
	"notes" text DEFAULT '' NOT NULL,
	"loss_reason" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."crm_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_owner_id" text NOT NULL,
	"company" text NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'Manual' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"potential_value" integer DEFAULT 0 NOT NULL,
	"next_action" text DEFAULT '' NOT NULL,
	"next_action_at" text,
	"notes" text DEFAULT '' NOT NULL,
	"owner_id" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."deliverable_references" (
	"id" text PRIMARY KEY NOT NULL,
	"deliverable_id" text NOT NULL,
	"url" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."deliverables" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"slide_count" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'briefing' NOT NULL,
	"has_stories_version" boolean DEFAULT false NOT NULL,
	"assignee_id" text,
	"due_at" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"sort_order" bigint DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."finance_workers" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_owner_id" text NOT NULL,
	"name" text NOT NULL,
	"employment_type" text DEFAULT 'pj' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"tax_id" text DEFAULT '' NOT NULL,
	"company_name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"cost_center" text DEFAULT 'Equipe' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"monthly_amount" integer DEFAULT 0 NOT NULL,
	"payment_day" integer DEFAULT 5 NOT NULL,
	"payment_method" text DEFAULT 'Pix' NOT NULL,
	"payment_details" text DEFAULT '' NOT NULL,
	"invoice_required" boolean DEFAULT false NOT NULL,
	"contract_end" text,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."financial_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_owner_id" text NOT NULL,
	"transaction_id" text,
	"worker_competency_id" text,
	"type" text DEFAULT 'other' NOT NULL,
	"competence" text DEFAULT '' NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer DEFAULT 0 NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."members" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"name" text NOT NULL,
	"profession" text DEFAULT 'other' NOT NULL,
	"email_verified_at" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"agency_id" text,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."slides" (
	"id" text PRIMARY KEY NOT NULL,
	"deliverable_id" text NOT NULL,
	"position" integer NOT NULL,
	"copy" text DEFAULT '' NOT NULL,
	"direction" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postito"."transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_owner_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"category" text NOT NULL,
	"cost_center" text DEFAULT '' NOT NULL,
	"account" text DEFAULT 'Conta principal' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"competence" text DEFAULT '' NOT NULL,
	"due_date" text NOT NULL,
	"payment_date" text,
	"client_id" text,
	"counterpart" text DEFAULT '' NOT NULL,
	"payment_method" text DEFAULT '' NOT NULL,
	"recurring" boolean DEFAULT false NOT NULL,
	"recurrence" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" text NOT NULL,
	"updated_at" text DEFAULT '' NOT NULL,
	"archived_at" text
);
--> statement-breakpoint
CREATE TABLE "postito"."worker_competencies" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_owner_id" text NOT NULL,
	"worker_id" text NOT NULL,
	"competence" text NOT NULL,
	"expected_amount" integer DEFAULT 0 NOT NULL,
	"adjustments" integer DEFAULT 0 NOT NULL,
	"due_date" text NOT NULL,
	"status" text DEFAULT 'predicted' NOT NULL,
	"invoice_status" text DEFAULT 'not_required' NOT NULL,
	"payment_date" text,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "postito"."activity_log" ADD CONSTRAINT "activity_log_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "postito"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."activity_log" ADD CONSTRAINT "activity_log_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "postito"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."agencies" ADD CONSTRAINT "agencies_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "postito"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."agency_invites" ADD CONSTRAINT "agency_invites_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "postito"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."agency_invites" ADD CONSTRAINT "agency_invites_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "postito"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."agency_memberships" ADD CONSTRAINT "agency_memberships_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "postito"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."agency_memberships" ADD CONSTRAINT "agency_memberships_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "postito"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."annotations" ADD CONSTRAINT "annotations_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "postito"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."annotations" ADD CONSTRAINT "annotations_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "postito"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."assets" ADD CONSTRAINT "assets_deliverable_id_deliverables_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "postito"."deliverables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."assets" ADD CONSTRAINT "assets_uploaded_by_members_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "postito"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."attachments" ADD CONSTRAINT "attachments_deliverable_id_deliverables_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "postito"."deliverables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."attachments" ADD CONSTRAINT "attachments_uploaded_by_members_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "postito"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."auth_challenges" ADD CONSTRAINT "auth_challenges_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "postito"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."boards" ADD CONSTRAINT "boards_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "postito"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."boards" ADD CONSTRAINT "boards_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "postito"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."client_members" ADD CONSTRAINT "client_members_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "postito"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."client_members" ADD CONSTRAINT "client_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "postito"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."clients" ADD CONSTRAINT "clients_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "postito"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."crm_activities" ADD CONSTRAINT "crm_activities_agency_owner_id_agencies_id_fk" FOREIGN KEY ("agency_owner_id") REFERENCES "postito"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."crm_activities" ADD CONSTRAINT "crm_activities_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "postito"."crm_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."crm_activities" ADD CONSTRAINT "crm_activities_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "postito"."crm_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."crm_activities" ADD CONSTRAINT "crm_activities_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "postito"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."crm_deals" ADD CONSTRAINT "crm_deals_agency_owner_id_agencies_id_fk" FOREIGN KEY ("agency_owner_id") REFERENCES "postito"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."crm_deals" ADD CONSTRAINT "crm_deals_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "postito"."crm_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."crm_deals" ADD CONSTRAINT "crm_deals_owner_id_members_id_fk" FOREIGN KEY ("owner_id") REFERENCES "postito"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."crm_leads" ADD CONSTRAINT "crm_leads_agency_owner_id_agencies_id_fk" FOREIGN KEY ("agency_owner_id") REFERENCES "postito"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."crm_leads" ADD CONSTRAINT "crm_leads_owner_id_members_id_fk" FOREIGN KEY ("owner_id") REFERENCES "postito"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."deliverable_references" ADD CONSTRAINT "deliverable_references_deliverable_id_deliverables_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "postito"."deliverables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."deliverables" ADD CONSTRAINT "deliverables_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "postito"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."deliverables" ADD CONSTRAINT "deliverables_assignee_id_members_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "postito"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."finance_workers" ADD CONSTRAINT "finance_workers_agency_owner_id_agencies_id_fk" FOREIGN KEY ("agency_owner_id") REFERENCES "postito"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."financial_documents" ADD CONSTRAINT "financial_documents_agency_owner_id_agencies_id_fk" FOREIGN KEY ("agency_owner_id") REFERENCES "postito"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."financial_documents" ADD CONSTRAINT "financial_documents_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "postito"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."financial_documents" ADD CONSTRAINT "financial_documents_worker_competency_id_worker_competencies_id_fk" FOREIGN KEY ("worker_competency_id") REFERENCES "postito"."worker_competencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."financial_documents" ADD CONSTRAINT "financial_documents_uploaded_by_members_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "postito"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."sessions" ADD CONSTRAINT "sessions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "postito"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."sessions" ADD CONSTRAINT "sessions_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "postito"."agencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."slides" ADD CONSTRAINT "slides_deliverable_id_deliverables_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "postito"."deliverables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."transactions" ADD CONSTRAINT "transactions_agency_owner_id_agencies_id_fk" FOREIGN KEY ("agency_owner_id") REFERENCES "postito"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."transactions" ADD CONSTRAINT "transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "postito"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."transactions" ADD CONSTRAINT "transactions_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "postito"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."worker_competencies" ADD CONSTRAINT "worker_competencies_agency_owner_id_agencies_id_fk" FOREIGN KEY ("agency_owner_id") REFERENCES "postito"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."worker_competencies" ADD CONSTRAINT "worker_competencies_worker_id_finance_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "postito"."finance_workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_agency_idx" ON "postito"."activity_log" USING btree ("agency_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invite_token_idx" ON "postito"."agency_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "invite_agency_idx" ON "postito"."agency_invites" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX "memberships_member_idx" ON "postito"."agency_memberships" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_annotations_asset_status" ON "postito"."annotations" USING btree ("asset_id","status");--> statement-breakpoint
CREATE INDEX "idx_assets_deliverable_version" ON "postito"."assets" USING btree ("deliverable_id","version");--> statement-breakpoint
CREATE INDEX "idx_attachments_deliverable_slide" ON "postito"."attachments" USING btree ("deliverable_id","slide_position");--> statement-breakpoint
CREATE INDEX "challenges_member_idx" ON "postito"."auth_challenges" USING btree ("member_id","kind");--> statement-breakpoint
CREATE INDEX "idx_boards_client_id" ON "postito"."boards" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_client_members_member_id" ON "postito"."client_members" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_crm_activities_agency_due" ON "postito"."crm_activities" USING btree ("agency_owner_id","due_at");--> statement-breakpoint
CREATE INDEX "idx_crm_deals_agency_stage" ON "postito"."crm_deals" USING btree ("agency_owner_id","stage");--> statement-breakpoint
CREATE INDEX "idx_crm_deals_close_date" ON "postito"."crm_deals" USING btree ("agency_owner_id","close_date");--> statement-breakpoint
CREATE INDEX "idx_crm_leads_agency_status" ON "postito"."crm_leads" USING btree ("agency_owner_id","status");--> statement-breakpoint
CREATE INDEX "idx_crm_leads_next_action" ON "postito"."crm_leads" USING btree ("agency_owner_id","next_action_at");--> statement-breakpoint
CREATE INDEX "idx_deliverable_references_deliverable_id" ON "postito"."deliverable_references" USING btree ("deliverable_id");--> statement-breakpoint
CREATE INDEX "idx_deliverables_board_id" ON "postito"."deliverables" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "idx_deliverables_assignee_due" ON "postito"."deliverables" USING btree ("assignee_id","due_at");--> statement-breakpoint
CREATE INDEX "idx_deliverables_open_status" ON "postito"."deliverables" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_finance_workers_agency_status" ON "postito"."finance_workers" USING btree ("agency_owner_id","status");--> statement-breakpoint
CREATE INDEX "idx_financial_documents_transaction" ON "postito"."financial_documents" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_financial_documents_competency" ON "postito"."financial_documents" USING btree ("worker_competency_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_email_unique" ON "postito"."members" USING btree ("email");--> statement-breakpoint
CREATE INDEX "sessions_member_idx" ON "postito"."sessions" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slides_deliverable_position_unique" ON "postito"."slides" USING btree ("deliverable_id","position");--> statement-breakpoint
CREATE INDEX "idx_transactions_client_id" ON "postito"."transactions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_agency_due" ON "postito"."transactions" USING btree ("agency_owner_id","due_date");--> statement-breakpoint
CREATE INDEX "idx_transactions_agency_status" ON "postito"."transactions" USING btree ("agency_owner_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "worker_competencies_worker_month_unique" ON "postito"."worker_competencies" USING btree ("worker_id","competence");--> statement-breakpoint
CREATE INDEX "idx_worker_competencies_agency_due" ON "postito"."worker_competencies" USING btree ("agency_owner_id","due_date");