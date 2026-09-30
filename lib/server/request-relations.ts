import "server-only";
import { eq, inArray } from "drizzle-orm";
import { requestRelations } from "@/db/schema";
import { db } from "@/lib/db";

export async function resolveRequestGroup(requestId: string) {
  const [parent] = await db
    .select({ primaryRequestId: requestRelations.primaryRequestId })
    .from(requestRelations)
    .where(eq(requestRelations.relatedRequestId, requestId))
    .limit(1);
  const primaryRequestId = parent?.primaryRequestId ?? requestId;
  const rows = await db
    .select({ relatedRequestId: requestRelations.relatedRequestId })
    .from(requestRelations)
    .where(eq(requestRelations.primaryRequestId, primaryRequestId));
  return {
    primaryRequestId,
    memberIds: [primaryRequestId, ...rows.map((row) => row.relatedRequestId)],
    isPrimary: primaryRequestId === requestId,
  };
}

export async function relationForAny(requestIds: string[]) {
  if (!requestIds.length) return [];
  return db
    .select()
    .from(requestRelations)
    .where(inArray(requestRelations.relatedRequestId, requestIds));
}
