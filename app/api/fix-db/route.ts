import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";


export async function GET() {
  const db = getDb();
  const stmts = [
    "ALTER TABLE `members` ADD `agency_owner_id` text",
    "CREATE TABLE `crm_leads` ( `id` text PRIMARY KEY NOT NULL, `agency_owner_id` text NOT NULL, `company` text NOT NULL, `contact_name` text DEFAULT '' NOT NULL, `email` text DEFAULT '' NOT NULL, `phone` text DEFAULT '' NOT NULL, `status` text DEFAULT 'lead' NOT NULL, `source` text DEFAULT '' NOT NULL, `value` integer DEFAULT 0 NOT NULL, `next_action_at` text, `notes` text DEFAULT '' NOT NULL, `created_at` text NOT NULL, `updated_at` text NOT NULL )",
    "CREATE INDEX `idx_crm_leads_agency_status` ON `crm_leads` (`agency_owner_id`,`status`)",
    "CREATE INDEX `idx_crm_leads_next_action` ON `crm_leads` (`agency_owner_id`,`next_action_at`)",
    "CREATE TABLE `crm_deals` ( `id` text PRIMARY KEY NOT NULL, `agency_owner_id` text NOT NULL, `lead_id` text REFERENCES crm_leads(id) ON DELETE set null, `company` text NOT NULL, `title` text NOT NULL, `value` integer DEFAULT 0 NOT NULL, `stage` text DEFAULT 'proposal' NOT NULL, `close_date` text, `notes` text DEFAULT '' NOT NULL, `created_at` text NOT NULL, `updated_at` text NOT NULL )",
    "CREATE INDEX `idx_crm_deals_agency_stage` ON `crm_deals` (`agency_owner_id`,`stage`)",
    "CREATE INDEX `idx_crm_deals_close_date` ON `crm_deals` (`agency_owner_id`,`close_date`)",
    "CREATE TABLE `crm_activities` ( `id` text PRIMARY KEY NOT NULL, `agency_owner_id` text NOT NULL, `lead_id` text REFERENCES crm_leads(id) ON DELETE cascade, `deal_id` text REFERENCES crm_deals(id) ON DELETE cascade, `type` text DEFAULT 'note' NOT NULL, `description` text NOT NULL, `due_at` text, `completed_at` text, `created_by` text NOT NULL, `created_at` text NOT NULL, `updated_at` text NOT NULL )",
    "CREATE INDEX `idx_crm_activities_agency_due` ON `crm_activities` (`agency_owner_id`,`due_at`)",
    "ALTER TABLE `transactions` ADD `agency_owner_id` text",
    "ALTER TABLE `transactions` ADD `paid_amount` integer DEFAULT 0 NOT NULL",
    "ALTER TABLE `transactions` ADD `cost_center` text DEFAULT '' NOT NULL",
    "ALTER TABLE `transactions` ADD `account` text DEFAULT 'Conta principal' NOT NULL",
    "ALTER TABLE `transactions` ADD `competence` text DEFAULT '' NOT NULL",
    "ALTER TABLE `transactions` ADD `payment_date` text",
    "ALTER TABLE `transactions` ADD `counterpart` text DEFAULT '' NOT NULL",
    "ALTER TABLE `transactions` ADD `payment_method` text DEFAULT '' NOT NULL",
    "ALTER TABLE `transactions` ADD `recurring` integer DEFAULT false NOT NULL",
    "ALTER TABLE `transactions` ADD `recurrence` text DEFAULT '' NOT NULL",
    "ALTER TABLE `transactions` ADD `notes` text DEFAULT '' NOT NULL",
    "ALTER TABLE `transactions` ADD `created_by` text REFERENCES members(id)",
    "ALTER TABLE `transactions` ADD `updated_at` text DEFAULT '' NOT NULL",
    "ALTER TABLE `transactions` ADD `archived_at` text",
    "CREATE INDEX `idx_transactions_agency_due` ON `transactions` (`agency_owner_id`,`due_date`)",
    "CREATE INDEX `idx_transactions_agency_status` ON `transactions` (`agency_owner_id`,`status`)",
    "CREATE TABLE `finance_workers` ( `id` text PRIMARY KEY NOT NULL, `agency_owner_id` text NOT NULL, `name` text NOT NULL, `employment_type` text DEFAULT 'pj' NOT NULL, `status` text DEFAULT 'active' NOT NULL, `tax_id` text DEFAULT '' NOT NULL, `company_name` text DEFAULT '' NOT NULL, `role` text DEFAULT '' NOT NULL, `cost_center` text DEFAULT 'Equipe' NOT NULL, `email` text DEFAULT '' NOT NULL, `phone` text DEFAULT '' NOT NULL, `monthly_amount` integer DEFAULT 0 NOT NULL, `payment_day` integer DEFAULT 5 NOT NULL, `payment_method` text DEFAULT 'Pix' NOT NULL, `payment_details` text DEFAULT '' NOT NULL, `invoice_required` integer DEFAULT false NOT NULL, `contract_end` text, `notes` text DEFAULT '' NOT NULL, `created_at` text NOT NULL, `updated_at` text NOT NULL )",
    "CREATE INDEX `idx_finance_workers_agency_status` ON `finance_workers` (`agency_owner_id`,`status`)",
    "CREATE TABLE `worker_competencies` ( `id` text PRIMARY KEY NOT NULL, `agency_owner_id` text NOT NULL, `worker_id` text NOT NULL, `competence` text NOT NULL, `expected_amount` integer DEFAULT 0 NOT NULL, `adjustments` integer DEFAULT 0 NOT NULL, `due_date` text NOT NULL, `status` text DEFAULT 'predicted' NOT NULL, `invoice_status` text DEFAULT 'not_required' NOT NULL, `payment_date` text, `notes` text DEFAULT '' NOT NULL, `created_at` text NOT NULL, `updated_at` text NOT NULL, FOREIGN KEY (`worker_id`) REFERENCES `finance_workers`(`id`) ON UPDATE no action ON DELETE cascade )",
    "CREATE UNIQUE INDEX `worker_competencies_worker_month_unique` ON `worker_competencies` (`worker_id`,`competence`)",
    "CREATE INDEX `idx_worker_competencies_agency_due` ON `worker_competencies` (`agency_owner_id`,`due_date`)",
    "CREATE TABLE `financial_documents` ( `id` text PRIMARY KEY NOT NULL, `agency_owner_id` text NOT NULL, `transaction_id` text, `worker_competency_id` text, `type` text DEFAULT 'other' NOT NULL, `competence` text DEFAULT '' NOT NULL, `storage_key` text NOT NULL, `file_name` text NOT NULL, `mime_type` text NOT NULL, `file_size` integer DEFAULT 0 NOT NULL, `uploaded_by` text NOT NULL, `created_at` text NOT NULL, FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade, FOREIGN KEY (`worker_competency_id`) REFERENCES `worker_competencies`(`id`) ON UPDATE no action ON DELETE cascade, FOREIGN KEY (`uploaded_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action )",
    "CREATE INDEX `idx_financial_documents_transaction` ON `financial_documents` (`transaction_id`)",
    "CREATE INDEX `idx_financial_documents_competency` ON `financial_documents` (`worker_competency_id`)",
    "ALTER TABLE `clients` ADD `due_day` integer DEFAULT 5 NOT NULL",
  ];

  const results = [];
  
  for (const stmt of stmts) {
    try {
      await db.run(sql.raw(stmt));
      results.push({ stmt, ok: true });
    } catch(err: any) {
      results.push({ stmt, error: err.message });
    }
  }
  
  return Response.json({ done: true, results });
}
