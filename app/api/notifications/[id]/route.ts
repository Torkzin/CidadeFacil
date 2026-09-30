import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { notifications } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/server/api";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  const { id } = await params;
  const [updated] = await db.update(notifications).set({ readAt: new Date() }).where(and(
    eq(notifications.id, id),
    eq(notifications.userId, user.id),
    eq(notifications.municipalityId, user.municipalityId),
  )).returning({ id: notifications.id });
  if (!updated) return apiError("Notificação não encontrada.", 404);
  return NextResponse.json({ success: true });
}
