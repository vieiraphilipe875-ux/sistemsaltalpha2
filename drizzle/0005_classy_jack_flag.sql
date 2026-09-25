ALTER TABLE "postito"."crm_leads" ADD COLUMN "priority" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "postito"."crm_leads" ADD COLUMN "labels" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "postito"."deliverables" ADD COLUMN "priority" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "postito"."deliverables" ADD COLUMN "labels" jsonb DEFAULT '[]'::jsonb NOT NULL;