import "server-only";

import { and, desc, eq } from "drizzle-orm";
import {
  requests,
  whatsappConversations,
  whatsappMessages,
} from "@/db/schema";
import { db } from "@/lib/db";
import { normalizeWhatsAppPhone, parseDraft, type WhatsAppDraft, type WhatsAppState } from "@/lib/whatsapp/flow";

type QueueOptions = {
  requestId: string;
  body: string;
  nextState?: WhatsAppState;
  draft?: WhatsAppDraft;
  onlyWhenStateIsMenu?: boolean;
};

export async function queueRequestWhatsAppMessage(options: QueueOptions) {
  const [item] = await db
    .select({
      id: requests.id,
      municipalityId: requests.municipalityId,
      phone: requests.citizenPhone,
      source: requests.source,
      protocol: requests.protocol,
    })
    .from(requests)
    .where(eq(requests.id, options.requestId))
    .limit(1);
  if (!item || item.source !== "WHATSAPP" || !item.phone) return false;
  const phone = normalizeWhatsAppPhone(item.phone);
  if (!phone) return false;
  const [conversation] = await db
    .select()
    .from(whatsappConversations)
    .where(
      and(
        eq(whatsappConversations.municipalityId, item.municipalityId),
        eq(whatsappConversations.phone, phone),
      ),
    )
    .limit(1);
  if (!conversation) return false;
  const [lastInbound] = await db
    .select({ provider: whatsappMessages.provider })
    .from(whatsappMessages)
    .where(
      and(
        eq(whatsappMessages.conversationId, conversation.id),
        eq(whatsappMessages.direction, "INBOUND"),
      ),
    )
    .orderBy(desc(whatsappMessages.createdAt))
    .limit(1);
  const provider = lastInbound?.provider ?? "SIMULATOR";
  await db.insert(whatsappMessages).values({
    conversationId: conversation.id,
    requestId: item.id,
    provider,
    direction: "OUTBOUND",
    type: "text",
    body: options.body,
    status: provider === "SIMULATOR" ? "delivered" : "queued",
  });
  const canChangeState =
    options.nextState &&
    (!options.onlyWhenStateIsMenu || conversation.state === "MENU");
  const currentDraft = parseDraft(conversation.draft);
  await db
    .update(whatsappConversations)
    .set({
      activeRequestId: item.id,
      ...(canChangeState
        ? {
            state: options.nextState,
            draft: JSON.stringify({
              ...currentDraft,
              ...options.draft,
              requestId: item.id,
              protocol: item.protocol,
            }),
          }
        : {}),
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(whatsappConversations.id, conversation.id));
  return true;
}
