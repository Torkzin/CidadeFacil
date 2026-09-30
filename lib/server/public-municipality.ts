import { eq } from "drizzle-orm";
import { municipalities, municipalitySettings } from "@/db/schema";
import { db } from "@/lib/db";

export async function getPublicMunicipality() {
  const slug = process.env.PUBLIC_MUNICIPALITY_SLUG ?? "seropedica-rj";
  const [result] = await db.select({
    id: municipalities.id,
    name: municipalities.name,
    slug: municipalities.slug,
    governmentName: municipalitySettings.governmentName,
    phone: municipalitySettings.phone,
    email: municipalitySettings.email,
    address: municipalitySettings.address,
    privacyPolicy: municipalitySettings.privacyPolicy,
    privacyUpdatedAt: municipalitySettings.privacyUpdatedAt,
  }).from(municipalities)
    .leftJoin(municipalitySettings, eq(municipalitySettings.municipalityId, municipalities.id))
    .where(eq(municipalities.slug, slug)).limit(1);
  return result ?? null;
}

