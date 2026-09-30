import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { municipalities, municipalitySettings, notificationPreferences, prioritySettings } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireAdminUser } from "@/lib/server/api";
import { inputText } from "@/lib/server/input";
import type { RequestPriority } from "@/types";
import { audit } from "@/lib/server/audit";

const priorities = new Set<RequestPriority>(["Baixa", "Normal", "Alta", "Urgente"]);

export async function GET() {
  const user = await requireAdminUser();
  if (!user) return apiError("Acesso restrito a administradores.", 403);
  const [municipality, settings, preferences, deadlines] = await Promise.all([
    db.select({ name: municipalities.name, slug: municipalities.slug }).from(municipalities).where(eq(municipalities.id, user.municipalityId)).limit(1),
    db.select().from(municipalitySettings).where(eq(municipalitySettings.municipalityId, user.municipalityId)).limit(1),
    db.select().from(notificationPreferences).where(and(eq(notificationPreferences.userId, user.id), eq(notificationPreferences.municipalityId, user.municipalityId))).limit(1),
    db.select().from(prioritySettings).where(eq(prioritySettings.municipalityId, user.municipalityId)).orderBy(prioritySettings.responseHours),
  ]);
  return NextResponse.json({
    municipality: { ...municipality[0], ...settings[0] },
    notifications: preferences[0] ?? { urgentRequests: true, deadlineAlerts: true, dailyDigest: false, teamConclusions: true },
    priorities: deadlines,
  });
}

export async function PATCH(request: Request) {
  const user = await requireAdminUser();
  if (!user) return apiError("Acesso restrito a administradores.", 403);
  const body = await request.json() as Record<string, unknown>;
  const section = inputText(body.section, 40);
  if (section === "municipality") {
    const name = inputText(body.name, 160);
    const governmentName = inputText(body.governmentName, 180);
    const taxId = inputText(body.taxId, 24);
    const phone = inputText(body.phone, 40);
    const address = inputText(body.address, 300);
    const email = inputText(body.email, 200);
    const timezone = inputText(body.timezone, 80);
    const citizenResponseHours = Number(body.citizenResponseHours);
    const privacyPolicy = inputText(body.privacyPolicy, 12000) || null;
    if (!name || !governmentName || !taxId || !phone || !address || !email || !timezone) return apiError("Preencha todos os dados institucionais.", 422);
    if (!/^\S+@\S+\.\S+$/.test(email)) return apiError("Informe um e-mail institucional válido.", 422);
    if (!Number.isInteger(citizenResponseHours) || citizenResponseHours < 1 || citizenResponseHours > 720) return apiError("O prazo de resposta do cidadão deve ficar entre 1 e 720 horas.", 422);
    await db.transaction(async (tx) => {
      await tx.update(municipalities).set({ name, updatedAt: new Date() }).where(eq(municipalities.id, user.municipalityId));
      await tx.insert(municipalitySettings).values({ municipalityId: user.municipalityId, governmentName, taxId, phone, address, email, timezone, citizenResponseHours, privacyPolicy, privacyUpdatedAt: privacyPolicy ? new Date() : null })
        .onConflictDoUpdate({ target: municipalitySettings.municipalityId, set: { governmentName, taxId, phone, address, email, timezone, citizenResponseHours, privacyPolicy, privacyUpdatedAt: privacyPolicy ? new Date() : null, updatedAt: new Date() } });
    });
    await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "MUNICIPALITY_SETTINGS_UPDATED", entityType: "municipality", entityId: user.municipalityId, metadata: { privacyPolicyUpdated: Boolean(privacyPolicy), citizenResponseHours } });
    return NextResponse.json({ success: true });
  }
  if (section === "notifications") {
    const values = {
      urgentRequests: body.urgentRequests === true,
      deadlineAlerts: body.deadlineAlerts === true,
      dailyDigest: body.dailyDigest === true,
      teamConclusions: body.teamConclusions === true,
    };
    await db.insert(notificationPreferences).values({ userId: user.id, municipalityId: user.municipalityId, ...values })
      .onConflictDoUpdate({ target: notificationPreferences.userId, set: { ...values, updatedAt: new Date() } });
    await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "NOTIFICATION_SETTINGS_UPDATED", entityType: "municipality", entityId: user.municipalityId });
    return NextResponse.json({ success: true });
  }
  if (section === "priorities" && Array.isArray(body.items)) {
    const items = body.items.map((item) => item as Record<string, unknown>);
    if (items.length !== 4) return apiError("Informe as quatro prioridades.", 422);
    for (const item of items) {
      const priority = inputText(item.priority, 20) as RequestPriority;
      const responseHours = Number(item.responseHours);
      const resolutionHours = Number(item.resolutionHours);
      if (!priorities.has(priority) || !Number.isInteger(responseHours) || responseHours < 1 || !Number.isInteger(resolutionHours) || resolutionHours < responseHours) return apiError("Prazos de prioridade inválidos.", 422);
      await db.insert(prioritySettings).values({ municipalityId: user.municipalityId, priority, responseHours, resolutionHours, active: item.active !== false })
        .onConflictDoUpdate({ target: [prioritySettings.municipalityId, prioritySettings.priority], set: { responseHours, resolutionHours, active: item.active !== false, updatedAt: new Date() } });
    }
    await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "SLA_SETTINGS_UPDATED", entityType: "municipality", entityId: user.municipalityId });
    return NextResponse.json({ success: true });
  }
  return apiError("Seção de configuração inválida.", 422);
}
