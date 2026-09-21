import { migrate } from "drizzle-orm/pglite/migrator";
import { migrate as migrateRemote } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDb, closeLocalDb } from "../db";

if (process.env.DATABASE_URL) {
  const client = postgres(process.env.DATABASE_URL, {max:1,prepare:false});
  await migrateRemote(drizzle(client), {migrationsFolder:"drizzle"});
  await client.end();
} else {
  await migrate(getDb(), {migrationsFolder:"drizzle"});
  await closeLocalDb();
}
console.log("Migrações do Postito aplicadas.");
