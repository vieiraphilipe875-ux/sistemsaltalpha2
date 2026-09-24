import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("Migrações de cartões: notificações privadas e atribuidor legado sem informação inventada", async()=>{
 const pg=new PGlite();
 try{
  await pg.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE postito_runtime;");
  const journal=JSON.parse(await readFile(new URL("../drizzle/meta/_journal.json",import.meta.url),"utf8"));
  for(const row of journal.entries)await pg.exec(await readFile(new URL(`../drizzle/${row.tag}.sql`,import.meta.url),"utf8"));
  const permissions=await pg.query(`SELECT relrowsecurity AS rls,
   has_table_privilege('anon','postito.task_notifications','SELECT') AS anon,
   has_table_privilege('authenticated','postito.task_notifications','SELECT') AS authenticated,
   has_table_privilege('postito_runtime','postito.task_notifications','INSERT,SELECT,UPDATE') AS runtime
   FROM pg_class WHERE oid='postito.task_notifications'::regclass`);
  assert.deepEqual(permissions.rows,[{rls:true,anon:false,authenticated:false,runtime:true}]);
  const publicGrants=await pg.query("SELECT privilege_type FROM information_schema.table_privileges WHERE table_schema='postito' AND table_name='task_notifications' AND grantee='PUBLIC'");assert.deepEqual(publicGrants.rows,[]);
  await pg.exec(`INSERT INTO postito.members(id,email,name,created_at) VALUES('fixture','migration@example.invalid','Fixture','2026-09-24');
   INSERT INTO postito.agencies(id,name,created_by,created_at) VALUES('agency','Fixture','fixture','2026-09-24');
   INSERT INTO postito.clients(id,agency_id,name,created_at) VALUES('client','agency','Fixture','2026-09-24');
   INSERT INTO postito.boards(id,client_id,title,period,created_by,created_at) VALUES('board','client','Fixture','Setembro','fixture','2026-09-24');
   INSERT INTO postito.deliverables(id,board_id,title,kind,due_at,created_at,updated_at) VALUES('task','board','Legado','static','2026-09-27','2026-09-24','2026-09-24');`);
  assert.deepEqual((await pg.query("SELECT priority,labels,cover_mode,assigned_by_id,assigned_at FROM postito.deliverables WHERE id='task'")).rows,[{priority:'normal',labels:[],cover_mode:'auto',assigned_by_id:null,assigned_at:null}]);
  assert.deepEqual((await pg.query("SELECT * FROM postito.task_notifications")).rows,[]);
 }finally{await pg.close();}
});
