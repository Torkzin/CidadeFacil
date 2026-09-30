import { and, count, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { notifications, requests } from "@/db/schema";
import { db } from "@/lib/db";
import { createSlaNotificationsForUser } from "@/lib/notifications/sla";
import { apiError, requireApiUser } from "@/lib/server/api";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  await createSlaNotificationsForUser(user);
  const condition = and(
    eq(notifications.userId, user.id),
    eq(notifications.municipalityId, user.municipalityId),
  );
  const [items, unread] = await Promise.all([
    db
      .select({
        id: notifications.id,
        title: notifications.title,
        description: notifications.description,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
        requestId: notifications.requestId,
        protocol: requests.protocol,
      })
      .from(notifications)
      .leftJoin(requests, eq(requests.id, notifications.requestId))
      .where(condition)
      .orderBy(desc(notifications.createdAt))
      .limit(10),
    db
      .select({ value: count() })
      .from(notifications)
      .where(and(condition, isNull(notifications.readAt))),
  ]);
  return NextResponse.json({
    items,
    unreadCount: Number(unread[0]?.value ?? 0),
  });
}

export async function PATCH() {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, user.id),
        eq(notifications.municipalityId, user.municipalityId),
        isNull(notifications.readAt),
      ),
    );
  return NextResponse.json({ success: true });
}
