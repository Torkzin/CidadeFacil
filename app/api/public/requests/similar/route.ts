import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { categories } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";
import { getPublicMunicipality } from "@/lib/server/public-municipality";
import { similarRequests } from "@/lib/server/recurrence";
import { checkRateLimit, clientAddress } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const rate = checkRateLimit(`public-similar:${clientAddress(request)}`, 30, 60 * 60 * 1000);
  if (!rate.allowed)
    return NextResponse.json(
      { error: "Muitas consultas. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  const municipality = await getPublicMunicipality();
  if (!municipality) return apiError("Portal indisponível.", 503);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Dados inválidos.");
  }
  const categoryId = inputText(body.categoryId, 50);
  const address = inputText(body.address, 240);
  if (!categoryId || !address) return NextResponse.json({ items: [], count: 0 });
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.municipalityId, municipality.id),
        eq(categories.publicEnabled, true),
      ),
    )
    .limit(1);
  if (!category) return apiError("Categoria indisponível.", 422);
  const items = await similarRequests({
    municipalityId: municipality.id,
    categoryId: category.id,
    address,
    addressNumber: inputText(body.addressNumber, 30) || null,
    neighborhood: inputText(body.neighborhood, 120),
    latitude: inputText(body.latitude, 32) || null,
    longitude: inputText(body.longitude, 32) || null,
  });
  return NextResponse.json({
    count: items.length,
    items: items.map((item) => ({
      collectiveId: item.id,
      title: item.title,
      category: item.category,
      neighborhood: item.neighborhood,
      status: item.status,
      createdAt: item.createdAt,
      matchReason: item.matchReason,
      distanceMeters: item.distanceMeters,
    })),
  });
}
