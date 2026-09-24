import { and, eq, inArray } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { z } from "zod";
import * as schema from "../db/schema";
import { AppError } from "./http";
import type { Member } from "./workspace-types";

export const agencyClientIdsInput = z.array(z.string().uuid()).transform(ids => [...new Set(ids)]);

// Validate explicit grants without a per-client round trip or a product limit.
// Batches cap SQL parameters, not the number of clients the person can select.
export async function authorizeAgencyClientIds(
  db: Pick<PgliteDatabase<typeof schema>, "select">,
  member: Pick<Member, "agencyOwnerId" | "role" | "permissions">,
  input: string[],
) {
  const ids = agencyClientIdsInput.parse(input);
  if (!member.agencyOwnerId || !["manager", "admin"].includes(member.role))
    throw new AppError("Acesso administrativo necessário.", 403);
  if (ids.length && !member.permissions.includes("clients.view"))
    throw new AppError("Cliente não disponível nesta agência.", 403);
  for (let offset = 0; offset < ids.length; offset += 1_000) {
    const batch = ids.slice(offset, offset + 1_000);
    const allowed = await db.select({ id: schema.clients.id }).from(schema.clients)
      .where(and(eq(schema.clients.agencyId, member.agencyOwnerId), inArray(schema.clients.id, batch)));
    if (allowed.length !== batch.length)
      throw new AppError("Cliente não disponível nesta agência.", 403);
  }
  return ids;
}
