CREATE TABLE "postito"."task_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_id" text NOT NULL,
	"member_id" text NOT NULL,
	"deliverable_id" text NOT NULL,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"created_at" text NOT NULL,
	"read_at" text
);
--> statement-breakpoint
ALTER TABLE "postito"."deliverables" ADD COLUMN "assigned_by_id" text;--> statement-breakpoint
ALTER TABLE "postito"."deliverables" ADD COLUMN "assigned_at" text;--> statement-breakpoint
ALTER TABLE "postito"."task_notifications" ADD CONSTRAINT "task_notifications_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "postito"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."task_notifications" ADD CONSTRAINT "task_notifications_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "postito"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."task_notifications" ADD CONSTRAINT "task_notifications_deliverable_id_deliverables_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "postito"."deliverables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_notifications_inbox_idx" ON "postito"."task_notifications" USING btree ("agency_id","member_id","created_at");--> statement-breakpoint
CREATE INDEX "task_notifications_task_idx" ON "postito"."task_notifications" USING btree ("deliverable_id");--> statement-breakpoint
ALTER TABLE "postito"."deliverables" ADD CONSTRAINT "deliverables_assigned_by_id_members_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "postito"."members"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE postito.task_notifications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE postito.task_notifications FROM PUBLIC;
--> statement-breakpoint
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE postito.task_notifications FROM %I',role_name);
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='postito_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE postito.task_notifications TO postito_runtime;
    CREATE POLICY postito_backend_access ON postito.task_notifications FOR ALL TO postito_runtime USING (true) WITH CHECK (true);
  END IF;
END $$;
