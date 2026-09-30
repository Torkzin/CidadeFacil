import { and, asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  requests,
  users,
  whatsappConversationEvents,
  whatsappConversations,
  whatsappMessages,
} from "@/db/schema";
import { db } from "@/lib/db";
import { audit } from "@/lib/server/audit";
import { apiError, requireApiUser } from "@/lib/server/api";
import {
  canAccessWhatsAppInbox,
  canActOnWhatsAppConversation,
  canTransferWhatsAppConversation,
} from "@/lib/whatsapp/inbox-policy";

async function accessibleConversation(id: string, municipalityId: string) {
  const [conversation] = await db
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
      activeRequestId: whatsappConversations.activeRequestId,
      protocol: requests.protocol,
      requestStatus: requests.status,
    })
    .from(whatsappConversations)
    .leftJoin(requests, eq(requests.id, whatsappConversations.activeRequestId))
    .where(and(eq(whatsappConversations.id, id), eq(whatsappConversations.municipalityId, municipalityId)))
    .limit(1);
  return conversation ?? null;
}

async function conversationProvider(conversationId: string) {
  const [lastInbound] = await db
    .select({ provider: whatsappMessages.provider })
    .from(whatsappMessages)
    .where(and(eq(whatsappMessages.conversationId, conversationId), eq(whatsappMessages.direction, "INBOUND")))
    .orderBy(desc(whatsappMessages.createdAt))
    .limit(1);
  return lastInbound?.provider ?? "SIMULATOR";
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  if (!canAccessWhatsAppInbox(user.role)) return apiError("Acesso negado.", 403);
  const { id } = await params;
  const conversation = await accessibleConversation(id, user.municipalityId);
  if (!conversation) return apiError("Conversa não encontrada.", 404);
  const [messages, events, staff] = await Promise.all([
    db
      .select({
        id: whatsappMessages.id,
        direction: whatsappMessages.direction,
        type: whatsappMessages.type,
        body: whatsappMessages.body,
        mediaOriginalName: whatsappMessages.mediaOriginalName,
        status: whatsappMessages.status,
        createdAt: whatsappMessages.createdAt,
      })
      .from(whatsappMessages)
      .where(eq(whatsappMessages.conversationId, conversation.id))
      .orderBy(asc(whatsappMessages.createdAt)),
    db
      .select({
        id: whatsappConversationEvents.id,
        userId: whatsappConversationEvents.userId,
        action: whatsappConversationEvents.action,
        note: whatsappConversationEvents.note,
        createdAt: whatsappConversationEvents.createdAt,
      })
      .from(whatsappConversationEvents)
      .where(eq(whatsappConversationEvents.conversationId, conversation.id))
      .orderBy(desc(whatsappConversationEvents.createdAt)),
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.municipalityId, user.municipalityId)),
  ]);
  const names = new Map(staff.map((entry) => [entry.id, entry.name]));
  return NextResponse.json({
    conversation: {
      ...conversation,
      assigneeName: conversation.assignedToId ? names.get(conversation.assignedToId) ?? null : null,
    },
    messages,
    events: events.map((event) => ({ ...event, userName: event.userId ? names.get(event.userId) ?? null : null })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  if (!canAccessWhatsAppInbox(user.role)) return apiError("Acesso negado.", 403);
  const { id } = await params;
  const conversation = await accessibleConversation(id, user.municipalityId);
  if (!conversation) return apiError("Conversa não encontrada.", 404);
  if (!canActOnWhatsAppConversation({ role: user.role, userId: user.id, assignedToId: conversation.assignedToId })) {
    return apiError("A conversa está atribuída a outro atendente.", 409);
  }
  const data = (await request.json()) as { body?: unknown };
  const body = typeof data.body === "string" ? data.body.trim().replace(/\s+/g, " ").slice(0, 4_000) : "";
  if (!body) return apiError("Digite uma mensagem.", 422);
  const provider = await conversationProvider(conversation.id);
  const now = new Date();
  await db.transaction(async (tx) => {
    if (!conversation.assignedToId) {
      await tx.insert(whatsappConversationEvents).values({
        conversationId: conversation.id,
        userId: user.id,
        action: "ASSIGNED",
        note: `Atendimento assumido por ${user.name}.`,
      });
    }
    await tx.insert(whatsappMessages).values({
      conversationId: conversation.id,
      requestId: conversation.activeRequestId,
      provider,
      direction: "OUTBOUND",
      type: "text",
      body: `${user.name}: ${body}`,
      status: provider === "SIMULATOR" ? "delivered" : "queued",
    });
    await tx.insert(whatsappConversationEvents).values({
      conversationId: conversation.id,
      userId: user.id,
      action: "MESSAGE_SENT",
      note: "Resposta enviada pelo atendimento humano.",
    });
    await tx.update(whatsappConversations).set({
      assignedToId: conversation.assignedToId ?? user.id,
      assignedAt: conversation.assignedAt ?? now,
      state: "HUMAN_HANDOFF",
      humanHandoffRequestedAt: conversation.humanHandoffRequestedAt ?? now,
      humanHandoffResolvedAt: null,
      lastReadAt: now,
      lastMessageAt: now,
      updatedAt: now,
    }).where(eq(whatsappConversations.id, conversation.id));
  });
  await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "WHATSAPP_AGENT_MESSAGE_SENT", entityType: "whatsapp_conversation", entityId: conversation.id });
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  if (!canAccessWhatsAppInbox(user.role)) return apiError("Acesso negado.", 403);
  const { id } = await params;
  const conversation = await accessibleConversation(id, user.municipalityId);
  if (!conversation) return apiError("Conversa não encontrada.", 404);
  const data = (await request.json()) as { action?: unknown; assigneeId?: unknown };
  const action = typeof data.action === "string" ? data.action : "";
  const now = new Date();

  if (action === "read") {
    await db.update(whatsappConversations).set({ lastReadAt: now }).where(eq(whatsappConversations.id, conversation.id));
    return NextResponse.json({ success: true });
  }

  if (action === "transfer") {
    if (!canTransferWhatsAppConversation(user.role)) return apiError("Seu perfil não pode transferir atendimentos.", 403);
    const assigneeId = typeof data.assigneeId === "string" ? data.assigneeId : "";
    const [assignee] = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(and(eq(users.id, assigneeId), eq(users.municipalityId, user.municipalityId), eq(users.status, "Ativo"))).limit(1);
    if (!assignee || !canAccessWhatsAppInbox(assignee.role)) return apiError("Atendente inválido.", 422);
    await db.transaction(async (tx) => {
      await tx.update(whatsappConversations).set({ assignedToId: assignee.id, assignedAt: now, updatedAt: now }).where(eq(whatsappConversations.id, conversation.id));
      await tx.insert(whatsappConversationEvents).values({ conversationId: conversation.id, userId: user.id, action: "TRANSFERRED", note: `Atendimento transferido para ${assignee.name}.` });
    });
    await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: "WHATSAPP_CONVERSATION_TRANSFERRED", entityType: "whatsapp_conversation", entityId: conversation.id, metadata: { assigneeId: assignee.id } });
    return NextResponse.json({ success: true });
  }

  if (!["claim", "resolve", "reopen"].includes(action)) return apiError("Ação inválida.", 422);
  if (!canActOnWhatsAppConversation({ role: user.role, userId: user.id, assignedToId: conversation.assignedToId })) {
    return apiError("A conversa está atribuída a outro atendente.", 409);
  }
  const provider = await conversationProvider(conversation.id);
  const isResolve = action === "resolve";
  const body = isResolve
    ? "Atendimento humano encerrado. Digite MENU para voltar ao atendimento automático."
    : "Um atendente assumiu esta conversa. Envie sua mensagem.";
  await db.transaction(async (tx) => {
    await tx.update(whatsappConversations).set({
      assignedToId: action === "claim" ? user.id : conversation.assignedToId ?? user.id,
      assignedAt: action === "claim" ? now : conversation.assignedAt ?? now,
      state: isResolve ? "MENU" : "HUMAN_HANDOFF",
      humanHandoffRequestedAt: isResolve ? null : now,
      humanHandoffResolvedAt: isResolve ? now : null,
      lastReadAt: now,
      lastMessageAt: now,
      updatedAt: now,
    }).where(eq(whatsappConversations.id, conversation.id));
    await tx.insert(whatsappMessages).values({
      conversationId: conversation.id,
      requestId: conversation.activeRequestId,
      provider,
      direction: "OUTBOUND",
      type: "text",
      body,
      status: provider === "SIMULATOR" ? "delivered" : "queued",
    });
    await tx.insert(whatsappConversationEvents).values({
      conversationId: conversation.id,
      userId: user.id,
      action: isResolve ? "RESOLVED" : action === "claim" ? "ASSIGNED" : "REOPENED",
      note: isResolve ? `Atendimento encerrado por ${user.name}.` : `Atendimento assumido por ${user.name}.`,
    });
  });
  await audit({ request, municipalityId: user.municipalityId, userId: user.id, action: `WHATSAPP_CONVERSATION_${action.toUpperCase()}`, entityType: "whatsapp_conversation", entityId: conversation.id });
  return NextResponse.json({ success: true });
}
