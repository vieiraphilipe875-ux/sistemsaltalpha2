import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const pg = new PGlite();
const tables = ["members", "agencies", "clients", "boards", "deliverables", "slides", "assets", "annotations", "crm_leads", "crm_deals", "crm_activities", "transactions"];
const beforeRows = new Map<string, Record<string, unknown>[]>();
const mapped = new Map([["clients", "status"], ["deliverables", "status"], ["crm_leads", "status"], ["crm_deals", "stage"]]);

before(async () => {
  await pg.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE postito_runtime;");
  for (const migration of ["0000_pink_the_twelve", "0001_safe_dracula", "0002_private_boundaries"]) {
    await pg.exec(await readFile(new URL(`../drizzle/${migration}.sql`, import.meta.url), "utf8"));
  }
  // Seed the previous schema, including linked/history records and every semantic status.
  await pg.exec(`
    INSERT INTO postito.members (id,email,name,status,created_at) VALUES ('owner','upgrade@example.invalid','Migração QA','active','2026-09-01T10:00:00Z');
    INSERT INTO postito.agencies (id,name,created_by,created_at) VALUES ('agency','Agência legada','owner','2026-09-01T10:00:00Z');
    INSERT INTO postito.clients (id,agency_id,name,status,revenue,due_day,avatar_key,banner_key,created_at)
      SELECT status,'agency','Cliente '||status,status,75000,23,'avatar-'||status,'banner-'||status,'2026-09-01T10:00:00Z'
      FROM unnest(ARRAY['prospecting','active','inactive']) AS status;
    INSERT INTO postito.boards (id,client_id,title,period,created_by,created_at) VALUES ('board','active','Pauta preservada','SET • 2026','owner','2026-09-01T10:00:00Z');
    INSERT INTO postito.deliverables (id,board_id,title,kind,status,due_at,notes,created_at,updated_at)
      SELECT status,'board','Demanda '||status,'static',status,'2026-10-01T10:00:00Z','Briefing preservado','2026-09-01T10:00:00Z','2026-09-23T10:00:00Z'
      FROM unnest(ARRAY['briefing','production','review','changes','approved']) AS status;
    INSERT INTO postito.slides (id,deliverable_id,position,copy,direction) VALUES ('slide','approved',1,'Texto aprovado preservado','Direção de arte preservada');
    INSERT INTO postito.assets (id,deliverable_id,storage_key,file_name,mime_type,version,uploaded_by,created_at) VALUES ('asset','approved','private/approved.png','approved.png','image/png',2,'owner','2026-09-23T10:00:00Z');
    INSERT INTO postito.annotations (id,asset_id,slide_number,x,y,comment,author_id,created_at) VALUES ('annotation','asset',1,0.5,0.25,'Histórico preservado','owner','2026-09-23T10:00:00Z');
    INSERT INTO postito.crm_leads (id,agency_owner_id,company,status,score,potential_value,created_at,updated_at)
      SELECT status,'agency','Lead '||status,status,70,85000,'2026-09-01T10:00:00Z','2026-09-23T10:00:00Z'
      FROM unnest(ARRAY['new','research','contacting','connected','qualifying','sql','nurture','disqualified']) AS status;
    INSERT INTO postito.crm_deals (id,agency_owner_id,lead_id,company,value,stage,probability,loss_reason,created_at,updated_at)
      SELECT stage,'agency',CASE WHEN stage='won' THEN 'sql' ELSE NULL END,'Negócio '||stage,99000,stage,
        CASE WHEN stage='won' THEN 100 WHEN stage='lost' THEN 0 ELSE 50 END,
        CASE WHEN stage='lost' THEN 'Motivo de perda preservado' ELSE NULL END,'2026-09-01T10:00:00Z','2026-09-23T10:00:00Z'
      FROM unnest(ARRAY['discovery','solution','proposal','negotiation','decision','contract','won','lost']) AS stage;
    INSERT INTO postito.crm_activities (id,agency_owner_id,lead_id,deal_id,title,status,created_by,created_at) VALUES ('activity','agency','sql','won','Contato concluído','done','owner','2026-09-23T10:00:00Z');
    INSERT INTO postito.transactions (id,agency_owner_id,type,amount,paid_amount,category,status,due_date,client_id,created_by,created_at)
      VALUES ('transaction','agency','income',75000,20000,'Contrato','partial','2026-09-23','active','owner','2026-09-01T10:00:00Z');
  `);
  for (const table of tables) {
    beforeRows.set(table, (await pg.query<Record<string, unknown>>(`SELECT * FROM postito.${table} ORDER BY id`)).rows);
  }
  await pg.exec(await readFile(new URL("../drizzle/0003_outstanding_toad.sql", import.meta.url), "utf8"));
});

after(async () => { await pg.close(); });

test("Migração Kanban: dados existentes, aprovações, ganhos/perdas, arquivos e financeiro são preservados", async () => {
  for (const table of tables) {
    const rows = (await pg.query<Record<string, unknown>>(`SELECT * FROM postito.${table} ORDER BY id`)).rows;
    const statusKey = mapped.get(table);
    if (statusKey) {
      for (const row of rows) {
        assert.equal(row.column_id, row[statusKey], `${table}/${row.id}: cartão deve continuar na lista correspondente`);
        delete row.column_id;
      }
    }
    assert.deepEqual(rows, beforeRows.get(table), `${table}: nenhum dado anterior pode ser alterado ou removido`);
  }
  assert.deepEqual((await pg.query("SELECT * FROM postito.kanban_boards")).rows, []);
});

test("Migração Kanban: tabela privada com RLS, sem acesso público, anon ou authenticated", async () => {
  const result = await pg.query<{ rls: boolean; anon_select: boolean; authenticated_select: boolean; runtime_select: boolean; runtime_update: boolean }>(`
    SELECT relrowsecurity AS rls,
      has_table_privilege('anon','postito.kanban_boards','SELECT') AS anon_select,
      has_table_privilege('authenticated','postito.kanban_boards','SELECT') AS authenticated_select,
      has_table_privilege('postito_runtime','postito.kanban_boards','SELECT') AS runtime_select,
      has_table_privilege('postito_runtime','postito.kanban_boards','UPDATE') AS runtime_update
    FROM pg_class WHERE oid='postito.kanban_boards'::regclass
  `);
  assert.deepEqual(result.rows, [{ rls: true, anon_select: false, authenticated_select: false, runtime_select: true, runtime_update: true }]);
  const policies = await pg.query<{ policyname: string; roles: string[] }>("SELECT policyname,roles FROM pg_policies WHERE schemaname='postito' AND tablename='kanban_boards'");
  assert.deepEqual(policies.rows, [{ policyname: "postito_backend_access", roles: ["postito_runtime"] }]);
  const publicGrants = await pg.query("SELECT privilege_type FROM information_schema.table_privileges WHERE table_schema='postito' AND table_name='kanban_boards' AND grantee='PUBLIC'");
  assert.deepEqual(publicGrants.rows, []);
});
