CREATE TABLE `crm_leads` (
  `id` text PRIMARY KEY NOT NULL,
  `agency_owner_id` text NOT NULL,
  `company` text NOT NULL,
  `contact_name` text DEFAULT '' NOT NULL,
  `email` text DEFAULT '' NOT NULL,
  `phone` text DEFAULT '' NOT NULL,
  `source` text DEFAULT 'Manual' NOT NULL,
  `status` text DEFAULT 'new' NOT NULL,
  `score` integer DEFAULT 0 NOT NULL,
  `potential_value` integer DEFAULT 0 NOT NULL,
  `next_action` text DEFAULT '' NOT NULL,
  `next_action_at` text,
  `notes` text DEFAULT '' NOT NULL,
  `owner_id` text REFERENCES members(id) ON DELETE set null,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_crm_leads_agency_status` ON `crm_leads` (`agency_owner_id`,`status`);
--> statement-breakpoint
CREATE INDEX `idx_crm_leads_next_action` ON `crm_leads` (`agency_owner_id`,`next_action_at`);
--> statement-breakpoint
CREATE TABLE `crm_deals` (
  `id` text PRIMARY KEY NOT NULL,
  `agency_owner_id` text NOT NULL,
  `lead_id` text REFERENCES crm_leads(id) ON DELETE set null,
  `company` text NOT NULL,
  `contact_name` text DEFAULT '' NOT NULL,
  `value` integer DEFAULT 0 NOT NULL,
  `stage` text DEFAULT 'discovery' NOT NULL,
  `probability` integer DEFAULT 10 NOT NULL,
  `next_action` text DEFAULT '' NOT NULL,
  `next_action_at` text,
  `close_date` text,
  `owner_id` text REFERENCES members(id) ON DELETE set null,
  `notes` text DEFAULT '' NOT NULL,
  `loss_reason` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_crm_deals_agency_stage` ON `crm_deals` (`agency_owner_id`,`stage`);
--> statement-breakpoint
CREATE INDEX `idx_crm_deals_close_date` ON `crm_deals` (`agency_owner_id`,`close_date`);
--> statement-breakpoint
CREATE TABLE `crm_activities` (
  `id` text PRIMARY KEY NOT NULL,
  `agency_owner_id` text NOT NULL,
  `lead_id` text REFERENCES crm_leads(id) ON DELETE cascade,
  `deal_id` text REFERENCES crm_deals(id) ON DELETE cascade,
  `type` text DEFAULT 'task' NOT NULL,
  `title` text NOT NULL,
  `due_at` text,
  `status` text DEFAULT 'pending' NOT NULL,
  `notes` text DEFAULT '' NOT NULL,
  `created_by` text NOT NULL REFERENCES members(id),
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_crm_activities_agency_due` ON `crm_activities` (`agency_owner_id`,`due_at`);
