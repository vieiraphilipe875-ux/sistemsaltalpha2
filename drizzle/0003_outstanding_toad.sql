CREATE TABLE "postito"."kanban_boards" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_id" text NOT NULL,
	"kind" text NOT NULL,
	"client_id" text,
	"revision" integer DEFAULT 0 NOT NULL,
	"columns" jsonb NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "postito"."clients" ADD COLUMN "column_id" text;--> statement-breakpoint
ALTER TABLE "postito"."crm_deals" ADD COLUMN "column_id" text;--> statement-breakpoint
ALTER TABLE "postito"."crm_leads" ADD COLUMN "column_id" text;--> statement-breakpoint
ALTER TABLE "postito"."deliverables" ADD COLUMN "column_id" text;--> statement-breakpoint
ALTER TABLE "postito"."kanban_boards" ADD CONSTRAINT "kanban_boards_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "postito"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postito"."kanban_boards" ADD CONSTRAINT "kanban_boards_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "postito"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kanban_boards_agency_idx" ON "postito"."kanban_boards" USING btree ("agency_id");
--> statement-breakpoint
UPDATE postito.deliverables SET column_id = status;
--> statement-breakpoint
UPDATE postito.crm_leads SET column_id = status;
--> statement-breakpoint
UPDATE postito.crm_deals SET column_id = stage;
--> statement-breakpoint
UPDATE postito.clients SET column_id = status;
--> statement-breakpoint
ALTER TABLE postito.kanban_boards ADD CONSTRAINT kanban_boards_shape_check CHECK (
  kind IN ('demands','crmLeads','crmDeals','crmClients') AND revision >= 0
  AND jsonb_typeof(columns) = 'array'
  AND ((kind = 'demands' AND client_id IS NOT NULL) OR (kind <> 'demands' AND client_id IS NULL))
  AND id = agency_id || ':' || kind || ':' || CASE WHEN kind = 'demands' THEN client_id ELSE 'agency' END
);
--> statement-breakpoint
ALTER TABLE postito.kanban_boards ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE postito.kanban_boards FROM PUBLIC;
--> statement-breakpoint
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE postito.kanban_boards FROM %I',role_name);
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='postito_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE postito.kanban_boards TO postito_runtime;
    CREATE POLICY postito_backend_access ON postito.kanban_boards FOR ALL TO postito_runtime USING (true) WITH CHECK (true);
  END IF;
END $$;
