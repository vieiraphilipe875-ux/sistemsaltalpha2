import { drizzle as localDrizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as remoteDrizzle } from "drizzle-orm/postgres-js";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";
import { postgresTlsOptions } from "./tls";

type Database = PgliteDatabase<typeof schema>;
const globalDb = globalThis as unknown as { postitoDb?: Database; postitoLocal?: PGlite };
export function getDb(): Database {
  if (globalDb.postitoDb) return globalDb.postitoDb;
  if (process.env.DATABASE_URL) {
    const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10, ...postgresTlsOptions(process.env.DATABASE_URL) });
    globalDb.postitoDb = remoteDrizzle(client, { schema }) as unknown as Database;
  } else {
    if (process.env.VERCEL || process.env.NODE_ENV === "production") throw new Error("DATABASE_URL não configurada.");
    const directory = process.env.POSTITO_LOCAL_DB || ".data/postgres";
    if (directory !== "memory://") mkdirSync(dirname(directory), {recursive:true});
    globalDb.postitoLocal = new PGlite(directory);
    globalDb.postitoDb = localDrizzle(globalDb.postitoLocal, { schema });
  }
  return globalDb.postitoDb;
}
export async function closeLocalDb() {
  await globalDb.postitoLocal?.close();
  delete globalDb.postitoDb;
  delete globalDb.postitoLocal;
}
