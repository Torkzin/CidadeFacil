import { and, count, desc, eq, gt, ilike, isNotNull, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requests, users, whatsappConversations, whatsappMessages } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/server/api";
import { canAccessWhatsAppInbox } from "@/lib/whatsapp/inbox-policy";

const validFilters = new Set(["pending", "mine", "unassigned", "all", "closed"]);

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  if (!canAccessWhatsAppInbox(user.role)) return apiError("Acesso negado.", 403);

  const url = new URL(request.url);
  const rawFilter = url.searchParams.get("filter") ?? "pending";
  const filter = validFilters.has(rawFilter) ? rawFilter : "pending";
  const search = url.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const conditions = [eq(whatsappConversations.municipalityId, user.municipalityId)];
  if (filter === "pending") conditions.push(isNotNull(whatsappConversations.humanHandoffRequestedAt));
  if (filter === "mine") conditions.push(eq(whatsappConversations.assignedToId, user.id));
  if (filter === "unassigned") conditions.push(isNull(whatsappConversations.assignedToId));
  if (filter === "closed") conditions.push(isNotNull(whatsappConversations.humanHandoffResolvedAt));
  if (search) {
    conditions.push(
      or(
        ilike(whatsappConversations.phone, `%${search}%`),
        ilike(whatsappConversations.displayName, `%${search}%`),
        ilike(requests.protocol, `%${search}%`),
      )!,
    );
  }

  const conversations = await db
    .select({
      id: whatsappConversations.id,
      phone: whatsappConversations.phone,
      displayName: whatsappConversations.displayName,
      state: whatsappConversations.state,
      humanHandoffRequestedAt: whatsappConversations.humanHandoffRequestedAt,
      humanHandoffResolvedAt: whatsappConversations.humanHandoffResolvedAt,
      assignedToId: whatsappConversations.assignedToId,
      assignedAt: whatsappConversations.assignedAt,
      lastReadAt: whatsappConversations.lastReadAt,
      lastMessageAt: whatsappConversations.lastMessageAt,
      requestId: whatsappConversations.activeRequestId,
      protocol: requests.protocol,
      requestStatus: requests.status,
    })
    .from(whatsappConversations)
    .leftJoin(requests, eq(requests.id, whatsappConversations.activeRequestId))
    .where(and(...conditions))
    .orderBy(desc(whatsappConversations.humanHandoffRequestedAt), desc(whatsappConversations.lastMessageAt))
    .limit(100);

  const staff = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(and(eq(users.municipalityId, user.municipalityId), eq(users.status, "Ativo")))
    .orderBy(users.name);
  const staffNames = new Map(staff.map((entry) => [entry.id, entry.name]));
  const items = await Promise.all(
    conversations.map(async (conversation) => {
      const [lastMessage] = await db
        .select({ body: whatsappMessages.body, type: whatsappMessages.type, direction: whatsappMessages.direction })
        .from(whatsappMessages)
        .where(eq(whatsappMessages.conversationId, conversation.id))
        .orderBy(desc(whatsappMessages.createdAt))
        .limit(1);
      const unreadConditions = [
        eq(whatsappMessages.conversationId, conversation.id),
        eq(whatsappMessages.direction, "INBOUND"),
      ];
      if (conversation.lastReadAt) unreadConditions.push(gt(whatsappMessages.createdAt, conversation.lastReadAt));
      const [unread] = await db.select({ value: count() }).from(whatsappMessages).where(and(...unreadConditions));
      return {
        ...conversation,
        assigneeName: conversation.assignedToId ? staffNames.get(conversation.assignedToId) ?? null : null,
        unreadCount: unread.value,
        lastMessage: lastMessage ?? null,
      };
    }),
  );
  return NextResponse.json({
    items,
    agents: staff.filter((entry) => canAccessWhatsAppInbox(entry.role)),
    currentUserId: user.id,
    canTransfer: ["Administrador", "Secretário", "Gestor"].includes(user.role),
  });
}
