import { migrate } from "drizzle-orm/pglite/migrator";
import { migrate as migrateRemote } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDb, closeLocalDb } from "../db";
import { postgresTlsOptions } from "../db/tls";

async function main() {
if (process.env.DATABASE_URL) {
  const client = postgres(process.env.DATABASE_URL, {max:1,prepare:false,...postgresTlsOptions(process.env.DATABASE_URL)});
  await migrateRemote(drizzle(client), {migrationsFolder:"drizzle"});
  await client.end();
} else {
  await migrate(getDb(), {migrationsFolder:"drizzle"});
  await closeLocalDb();
}
console.log("Migrações do Postito aplicadas.");
}

main().catch(error => {
  console.error("Falha na migração:", error instanceof Error ? error.message : "Erro desconhecido");
  process.exitCode = 1;
});
