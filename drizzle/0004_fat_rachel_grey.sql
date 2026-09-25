ALTER TABLE "postito"."deliverables" ADD COLUMN "cover_mode" text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "postito"."deliverables" ADD COLUMN "cover_file_id" text;--> statement-breakpoint
ALTER TABLE "postito"."deliverables" ADD COLUMN "cover_file_kind" text;