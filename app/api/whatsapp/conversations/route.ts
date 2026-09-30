import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { whatsappConversations, whatsappMessages } from "@/db/schema";
import { db } from "@/lib/db";
import { apiError, requireApiUser } from "@/lib/server/api";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/flow";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return apiError("Não autenticado.", 401);
  if (user.role !== "Administrador")
    return apiError("Acesso restrito a administradores.", 403);
  const phone = normalizeWhatsAppPhone(new URL(request.url).searchParams.get("phone") ?? "");
  if (!phone) return apiError("Informe um telefone válido.", 422);
  const [conversation] = await db
    .select({
      id: whatsappConversations.id,
      phone: whatsappConversations.phone,
      displayName: whatsappConversations.displayName,
      state: whatsappConversations.state,
      activeRequestId: whatsappConversations.activeRequestId,
      updatedAt: whatsappConversations.updatedAt,
    })
    .from(whatsappConversations)
    .where(
      and(
        eq(whatsappConversations.municipalityId, user.municipalityId),
        eq(whatsappConversations.phone, phone),
      ),
    )
    .limit(1);
  if (!conversation) return NextResponse.json({ conversation: null, messages: [] });
  const messages = await db
    .select({
      id: whatsappMessages.id,
      direction: whatsappMessages.direction,
      type: whatsappMessages.type,
      body: whatsappMessages.body,
      mediaOriginalName: whatsappMessages.mediaOriginalName,
      createdAt: whatsappMessages.createdAt,
    })
    .from(whatsappMessages)
    .where(eq(whatsappMessages.conversationId, conversation.id))
    .orderBy(asc(whatsappMessages.createdAt));
  return NextResponse.json({ conversation, messages });
}

