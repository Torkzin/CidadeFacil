import { eq, gte, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { categories, requests } from "@/db/schema";
import { recurrenceAnalysis } from "@/lib/server/recurrence";
import { apiError, requireApiUser } from "@/lib/server/api";
import { requestAccessCondition } from "@/lib/server/permissions";

const allowedPeriods = new Set([30, 90, 365]);

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") ?? "90");
  const conditions: SQL[] = [requestAccessCondition(user)];
  if (allowedPeriods.has(days)) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    conditions.push(gte(requests.createdAt, since));
  }
  const categoryId = url.searchParams.get("categoryId")?.trim();
  if (categoryId) conditions.push(eq(categories.id, categoryId));
  const analysis = await recurrenceAnalysis(conditions);
  return NextResponse.json({ ...analysis, generatedAt: new Date().toISOString() });
}
