import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { categories } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";
import { similarRequests } from "@/lib/server/recurrence";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Dados inválidos.");
  }
  const categoryName = inputText(body.category, 120);
  const address = inputText(body.address, 240);
  if (!categoryName || !address) return NextResponse.json({ items: [], count: 0 });
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.municipalityId, user.municipalityId),
        eq(categories.name, categoryName),
      ),
    )
    .limit(1);
  if (!category) return apiError("Categoria não encontrada.", 422);
  const items = await similarRequests({
    municipalityId: user.municipalityId,
    categoryId: category.id,
    address,
    addressNumber: inputText(body.addressNumber, 30) || null,
    neighborhood: inputText(body.neighborhood, 120),
    latitude: inputText(body.latitude, 32) || null,
    longitude: inputText(body.longitude, 32) || null,
  });
  return NextResponse.json({ items, count: items.length });
}
