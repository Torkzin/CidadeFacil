import { and, asc, eq } from "drizzle-orm";
import { routingRules } from "@/db/schema";
import { db } from "@/lib/db/runtime";
import { selectRoutingRule } from "@/lib/requests/routing-policy";

export async function resolveRoutingRule(input: {
  municipalityId: string;
  categoryId: string;
  neighborhood: string;
}) {
  const candidates = await db
    .select({
      id: routingRules.id,
      name: routingRules.name,
      neighborhood: routingRules.neighborhood,
      departmentId: routingRules.departmentId,
      teamId: routingRules.teamId,
      priority: routingRules.priority,
    })
    .from(routingRules)
    .where(
      and(
        eq(routingRules.municipalityId, input.municipalityId),
        eq(routingRules.categoryId, input.categoryId),
        eq(routingRules.active, true),
      ),
    )
    .orderBy(asc(routingRules.createdAt));
  return selectRoutingRule(candidates, input.neighborhood) ?? null;
}
