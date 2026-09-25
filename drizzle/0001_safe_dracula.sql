CREATE TABLE "postito"."upload_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_id" text NOT NULL,
	"member_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"purpose" text NOT NULL,
	"target_id" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"slide_position" integer,
	"expires_at" text NOT NULL,
	"consumed_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "postito"."upload_tickets" ADD CONSTRAINT "upload_tickets_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "postito"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."upload_tickets" ADD CONSTRAINT "upload_tickets_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "postito"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "upload_tickets_member_idx" ON "postito"."upload_tickets" USING btree ("member_id","created_at");