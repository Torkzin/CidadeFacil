import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { categories } from "@/db/schema";
import { db } from "@/lib/db";
import { getPublicMunicipality } from "@/lib/server/public-municipality";

export const dynamic = "force-dynamic";

export async function GET() {
  const municipality = await getPublicMunicipality();
  if (!municipality) return NextResponse.json({ error: "Portal indisponível." }, { status: 503 });
  const items = await db.select({ id: categories.id, name: categories.name, color: categories.color }).from(categories)
    .where(and(eq(categories.municipalityId, municipality.id), eq(categories.publicEnabled, true))).orderBy(categories.name);
  return NextResponse.json({ municipality, categories: items });
}

