CREATE INDEX IF NOT EXISTS clients_agency_status_idx ON postito.clients(agency_id,status);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS assets_deliverable_version_unique ON postito.assets(deliverable_id,version);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS deals_lead_unique ON postito.crm_deals(lead_id) WHERE lead_id IS NOT NULL;
--> statement-breakpoint
ALTER TABLE postito.deliverables ADD CONSTRAINT deliverables_slide_count_check CHECK (slide_count BETWEEN 1 AND 30);
--> statement-breakpoint
ALTER TABLE postito.transactions ADD CONSTRAINT transaction_amounts_check CHECK (amount >= 0 AND paid_amount >= 0 AND paid_amount <= amount);
--> statement-breakpoint
ALTER TABLE postito.worker_competencies ADD CONSTRAINT competency_amounts_check CHECK (expected_amount >= 0 AND expected_amount + adjustments >= 0);
--> statement-breakpoint
REVOKE ALL ON SCHEMA postito FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA postito FROM PUBLIC;
--> statement-breakpoint
DO $$
DECLARE item record; role_name text;
BEGIN
 FOR item IN SELECT tablename FROM pg_tables WHERE schemaname='postito' LOOP
  EXECUTE format('ALTER TABLE postito.%I ENABLE ROW LEVEL SECURITY',item.tablename);
 END LOOP;
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
   EXECUTE format('REVOKE ALL ON SCHEMA postito FROM %I',role_name);
   EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA postito FROM %I',role_name);
  END IF;
 END LOOP;
END $$;
