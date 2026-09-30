import "server-only";

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  categories,
  departments,
  notifications,
  prioritySettings,
  requestAttachments,
  requestHistory,
  requestCommunications,
  requestRatings,
  requests,
  users,
  whatsappConversations,
  whatsappMessages,
} from "@/db/schema";
import { db } from "@/lib/db";
import { SEROPEDICA_NEIGHBORHOOD_NAMES } from "@/lib/municipality/seropedica";
import { createRequest } from "@/lib/requests/create-request";
import { validateCommunicationBody } from "@/lib/requests/communication";
import { resolveRoutingRule } from "@/lib/requests/routing";
import { DEFAULT_SLA_HOURS } from "@/lib/requests/sla";
import { geocodeSeropedicaAddress } from "@/lib/server/geocode";
import { getPublicMunicipality } from "@/lib/server/public-municipality";
import {
  isConfirmation,
  isExplicitConfirmation,
  isFinishPhotosCommand,
  isMenuCommand,
  normalizeProtocol,
  normalizeWhatsAppPhone,
  parseDraft,
  parseMenuChoice,
  WHATSAPP_MENU,
  type WhatsAppDraft,
  type WhatsAppState,
} from "@/lib/whatsapp/flow";
import type {
  IncomingWhatsAppMessage,
  OutgoingWhatsAppMessage,
  WhatsAppProcessResult,
} from "@/lib/whatsapp/types";
import type { RequestPriority } from "@/types";

type ConversationRecord = typeof whatsappConversations.$inferSelect;

const MAX_TEXT = 5_000;

function textReply(text: string): OutgoingWhatsAppMessage {
  return { type: "text", text };
}

function cleanText(value: string | null | undefined, limit = MAX_TEXT) {
  return value?.trim().replace(/\s+/g, " ").slice(0, limit) ?? "";
}

function neighborhoodFromAnswer(answer: string) {
  const normalized = answer.toLocaleLowerCase("pt-BR");
  const numeric = Number(answer);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= SEROPEDICA_NEIGHBORHOOD_NAMES.length)
    return SEROPEDICA_NEIGHBORHOOD_NAMES[numeric - 1];
  return (
    SEROPEDICA_NEIGHBORHOOD_NAMES.find(
      (item) => item.toLocaleLowerCase("pt-BR") === normalized,
    ) ?? null
  );
}

function formatNeighborhoods() {
  return SEROPEDICA_NEIGHBORHOOD_NAMES.map(
    (name, index) => `${index + 1} — ${name}`,
  ).join("\n");
}

function requestSummary(draft: WhatsAppDraft) {
  return [
    "Confira os dados da solicitação:",
    "",
    `Nome: ${draft.citizenName}`,
    `Categoria: ${draft.categoryName}`,
    `Descrição: ${draft.description}`,
    `Endereço: ${draft.address}`,
    `Bairro: ${draft.neighborhood}`,
    `Fotos: ${draft.photos?.length ?? 0}`,
    "",
    "Digite *CONFIRMAR* para registrar ou *MENU* para cancelar.",
  ].join("\n");
}

async function persistConversation(
  conversationId: string,
  values: {
    state: WhatsAppState;
    draft: WhatsAppDraft;
    activeRequestId?: string | null;
    humanHandoffRequestedAt?: Date | null;
    humanHandoffResolvedAt?: Date | null;
  },
) {
  await db
    .update(whatsappConversations)
    .set({
      state: values.state,
      draft: JSON.stringify(values.draft),
      activeRequestId: values.activeRequestId,
      humanHandoffRequestedAt: values.humanHandoffRequestedAt,
      humanHandoffResolvedAt: values.humanHandoffResolvedAt,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(whatsappConversations.id, conversationId));
}

async function recordReplies(
  conversationId: string,
  provider: string,
  replies: OutgoingWhatsAppMessage[],
  requestId?: string | null,
) {
  if (!replies.length) return;
  await db.insert(whatsappMessages).values(
    replies.map((reply) => ({
      conversationId,
      requestId: requestId ?? null,
      provider,
      direction: "OUTBOUND",
      type: reply.type,
      body: reply.text,
      status: provider === "SIMULATOR" ? "delivered" : "queued",
    })),
  );
}

async function categoryOptions(municipalityId: string) {
  return db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(
      and(
        eq(categories.municipalityId, municipalityId),
        eq(categories.publicEnabled, true),
      ),
    )
    .orderBy(asc(categories.name));
}

async function findOwnedRequest(
  municipalityId: string,
  phone: string,
  protocol: string,
) {
  const [record] = await db
    .select({
      id: requests.id,
      protocol: requests.protocol,
      title: requests.title,
      status: requests.status,
      updatedAt: requests.updatedAt,
      department: departments.name,
      tokenHash: requests.publicAccessTokenHash,
      citizenName: requests.citizenName,
    })
    .from(requests)
    .leftJoin(departments, eq(departments.id, requests.departmentId))
    .where(
      and(
        eq(requests.municipalityId, municipalityId),
        eq(requests.protocol, normalizeProtocol(protocol)),
        eq(requests.citizenPhone, phone),
      ),
    )
    .limit(1);
  return record ?? null;
}

async function findPendingInformationRequest(
  requestId: string,
  participantTokenHash: string,
) {
  const [pending] = await db
    .select({
      id: requestCommunications.id,
      userId: requestCommunications.userId,
      body: requestCommunications.body,
    })
    .from(requestCommunications)
    .where(
      and(
        eq(requestCommunications.requestId, requestId),
        eq(requestCommunications.participantTokenHash, participantTokenHash),
        eq(requestCommunications.kind, "INFORMATION_REQUEST"),
        isNull(requestCommunications.answeredAt),
      ),
    )
    .orderBy(desc(requestCommunications.createdAt))
    .limit(1);
  return pending ?? null;
}

async function requestHumanHandoff(
  conversation: ConversationRecord,
  citizenName: string,
) {
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.municipalityId, conversation.municipalityId),
        eq(users.role, "Administrador"),
        eq(users.status, "Ativo"),
      ),
    );
  if (admins.length) {
    await db
      .insert(notifications)
      .values(
        admins.map((admin) => ({
          municipalityId: conversation.municipalityId,
          userId: admin.id,
          requestId: conversation.activeRequestId,
          title: "Atendimento solicitado no WhatsApp",
          description: `${citizenName || conversation.displayName || conversation.phone} aguarda atendimento humano.`,
          dedupeKey: `whatsapp-handoff:${conversation.id}:${Date.now()}`,
        })),
      );
  }
}

async function createRequestFromDraft(
  conversation: ConversationRecord,
  phone: string,
  draft: WhatsAppDraft,
) {
  if (
    !draft.citizenName ||
    !draft.categoryId ||
    !draft.categoryName ||
    !draft.description ||
    !draft.address ||
    !draft.neighborhood
  )
    throw new Error("Os dados da solicitação estão incompletos.");

  const routingRule = await resolveRoutingRule({
    municipalityId: conversation.municipalityId,
    categoryId: draft.categoryId,
    neighborhood: draft.neighborhood,
  });
  const priority: RequestPriority = routingRule?.priority ?? "Normal";
  const [configuredSla] = await db
    .select({
      responseHours: prioritySettings.responseHours,
      resolutionHours: prioritySettings.resolutionHours,
    })
    .from(prioritySettings)
    .where(
      and(
        eq(prioritySettings.municipalityId, conversation.municipalityId),
        eq(prioritySettings.priority, priority),
        eq(prioritySettings.active, true),
      ),
    )
    .limit(1);
  const sla = configuredSla ?? DEFAULT_SLA_HOURS[priority];
  const descriptionTitle = draft.description.slice(0, 90);
  const result = await createRequest({
    municipalityId: conversation.municipalityId,
    source: "WHATSAPP",
    title: `${draft.categoryName}: ${descriptionTitle}`,
    description: draft.description,
    categoryId: draft.categoryId,
    priority,
    address: draft.address,
    neighborhood: draft.neighborhood,
    latitude: draft.latitude ?? null,
    longitude: draft.longitude ?? null,
    departmentId: routingRule?.departmentId ?? null,
    teamId: routingRule?.teamId ?? null,
    citizenName: draft.citizenName,
    citizenPhone: phone,
    responseHours: sla.responseHours,
    resolutionHours: sla.resolutionHours,
    routingRuleName: routingRule?.name ?? null,
  });

  const photos = draft.photos ?? [];
  if (photos.length) {
    await db.insert(requestAttachments).values(
      photos.map((photo) => ({
        requestId: result.id,
        uploadedBy: null,
        originalName: photo.originalName,
        storageKey: photo.storageKey,
        contentType: photo.contentType,
        sizeBytes: photo.sizeBytes,
      })),
    );
    await db.insert(requestHistory).values({
      requestId: result.id,
      userId: null,
      action: "Fotos enviadas pelo cidadão",
      note: `${photos.length} foto(s) recebida(s) pelo WhatsApp.`,
    });
    await db
      .update(whatsappMessages)
      .set({ requestId: result.id })
      .where(
        inArray(
          whatsappMessages.mediaStorageKey,
          photos.map((photo) => photo.storageKey),
        ),
      );
  }
  return result;
}

export async function processWhatsAppMessage(
  incoming: IncomingWhatsAppMessage,
): Promise<WhatsAppProcessResult> {
  const phone = normalizeWhatsAppPhone(incoming.phone);
  if (!phone) throw new Error("Número de WhatsApp inválido.");
  const municipality = await getPublicMunicipality();
  if (!municipality) throw new Error("Município indisponível.");
  const provider = cleanText(incoming.provider, 40) || "SIMULATOR";

  if (incoming.providerMessageId) {
    const [duplicate] = await db
      .select({ id: whatsappMessages.id, conversationId: whatsappMessages.conversationId })
      .from(whatsappMessages)
      .where(
        and(
          eq(whatsappMessages.provider, provider),
          eq(whatsappMessages.providerMessageId, incoming.providerMessageId),
        ),
      )
      .limit(1);
    if (duplicate)
      return { duplicate: true, conversationId: duplicate.conversationId, replies: [] };
  }

  const now = new Date();
  const [conversation] = await db
    .insert(whatsappConversations)
    .values({
      municipalityId: municipality.id,
      phone,
      displayName: cleanText(incoming.displayName, 160) || null,
      lastMessageAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [whatsappConversations.municipalityId, whatsappConversations.phone],
      set: {
        ...(incoming.displayName
          ? { displayName: cleanText(incoming.displayName, 160) }
          : {}),
        lastMessageAt: now,
        updatedAt: now,
      },
    })
    .returning();

  await db.insert(whatsappMessages).values({
    conversationId: conversation.id,
    requestId: conversation.activeRequestId,
    provider,
    providerMessageId: incoming.providerMessageId ?? null,
    direction: "INBOUND",
    type: incoming.type,
    body: cleanText(incoming.text) || null,
    mediaStorageKey: incoming.media?.storageKey ?? null,
    mediaContentType: incoming.media?.contentType ?? null,
    mediaOriginalName: incoming.media?.originalName ?? null,
    status: "received",
  });

  let state = conversation.state as WhatsAppState;
  let draft = parseDraft(conversation.draft);
  const answer = cleanText(incoming.text);
  const replies: OutgoingWhatsAppMessage[] = [];
  let createdRequest: { id: string; protocol: string } | null = null;
  const explicitConfirmation = isExplicitConfirmation(answer);

  if (
    state === "MENU" &&
    incoming.type === "text" &&
    explicitConfirmation &&
    conversation.activeRequestId
  ) {
    const [existing] = await db
      .select({ protocol: requests.protocol })
      .from(requests)
      .where(
        and(
          eq(requests.id, conversation.activeRequestId),
          eq(requests.municipalityId, municipality.id),
          eq(requests.citizenPhone, phone),
        ),
      )
      .limit(1);
    replies.push(
      textReply(
        existing
          ? `Sua solicitação já foi aberta com sucesso.\n\nProtocolo: *${existing.protocol}*\n\nVocê pode acompanhar por aqui escolhendo a opção 2. Digite *MENU* para ver as opções.`
          : WHATSAPP_MENU,
      ),
    );
  } else if (incoming.type === "text" && isMenuCommand(answer)) {
    state = "MENU";
    draft = {};
    replies.push(textReply(WHATSAPP_MENU));
  } else if (state === "MENU") {
    const choice = incoming.type === "text" ? parseMenuChoice(answer) : null;
    if (choice === "OPEN") {
      state = "OPEN_NAME";
      draft = {};
      replies.push(textReply("Para começar, qual é o seu nome completo?"));
    } else if (choice === "TRACK") {
      state = "TRACK_PROTOCOL";
      draft = {};
      replies.push(textReply("Digite o protocolo que deseja acompanhar. Exemplo: 2026-0000001"));
    } else if (choice === "PHOTO") {
      state = "PHOTO_PROTOCOL";
      draft = {};
      replies.push(textReply("Digite o protocolo ao qual deseja adicionar uma foto."));
    } else if (choice === "REPLY") {
      state = "REPLY_PROTOCOL";
      draft = {};
      replies.push(textReply("Digite o protocolo que possui uma pendência de complementação."));
    } else if (choice === "RATING") {
      state = "RATING_PROTOCOL";
      draft = {};
      replies.push(textReply("Digite o protocolo concluído que deseja avaliar."));
    } else if (choice === "HUMAN") {
      state = "HUMAN_HANDOFF";
      await requestHumanHandoff(conversation, conversation.displayName ?? "");
      replies.push(
        textReply(
          "Seu pedido de atendimento humano foi registrado. Um atendente continuará esta conversa assim que possível. Digite *MENU* para voltar às opções automáticas.",
        ),
      );
    } else {
      replies.push(textReply(WHATSAPP_MENU));
    }
  } else if (state === "OPEN_NAME") {
    if (incoming.type !== "text" || answer.length < 3) {
      replies.push(textReply("Informe seu nome completo, por favor."));
    } else {
      draft.citizenName = answer.slice(0, 160);
      const options = await categoryOptions(municipality.id);
      state = "OPEN_CATEGORY";
      replies.push(
        textReply(
          [
            `Obrigado, ${draft.citizenName}. Escolha a categoria:`,
            "",
            ...options.map((item, index) => `${index + 1} — ${item.name}`),
          ].join("\n"),
        ),
      );
    }
  } else if (state === "OPEN_CATEGORY") {
    const options = await categoryOptions(municipality.id);
    const numeric = Number(answer);
    const selected = Number.isInteger(numeric)
      ? options[numeric - 1]
      : options.find(
          (item) =>
            item.name.toLocaleLowerCase("pt-BR") ===
            answer.toLocaleLowerCase("pt-BR"),
        );
    if (!selected) {
      replies.push(textReply("Categoria inválida. Digite o número de uma das opções apresentadas."));
    } else {
      draft.categoryId = selected.id;
      draft.categoryName = selected.name;
      state = "OPEN_DESCRIPTION";
      replies.push(textReply("Descreva o problema com o máximo de detalhes possível."));
    }
  } else if (state === "OPEN_DESCRIPTION") {
    if (incoming.type !== "text" || answer.length < 10) {
      replies.push(textReply("A descrição precisa ter pelo menos 10 caracteres."));
    } else {
      draft.description = answer;
      state = "OPEN_ADDRESS";
      replies.push(textReply("Informe a rua e o número onde está o problema."));
    }
  } else if (state === "OPEN_ADDRESS") {
    if (incoming.type !== "text" || answer.length < 5) {
      replies.push(textReply("Informe um endereço válido, incluindo rua e número."));
    } else {
      draft.address = answer.slice(0, 240);
      state = "OPEN_NEIGHBORHOOD";
      replies.push(
        textReply(`Agora escolha o bairro:\n\n${formatNeighborhoods()}`),
      );
    }
  } else if (state === "OPEN_NEIGHBORHOOD") {
    const neighborhood = neighborhoodFromAnswer(answer);
    if (!neighborhood) {
      replies.push(textReply("Bairro inválido. Digite o nome ou o número correspondente na lista."));
    } else {
      draft.neighborhood = neighborhood;
      state = "OPEN_LOCATION";
      replies.push(
        textReply(
          "Compartilhe a localização pelo WhatsApp para marcar o ponto exato. Se não puder, digite *USAR ENDEREÇO* e tentarei localizar automaticamente.",
        ),
      );
    }
  } else if (state === "OPEN_LOCATION") {
    if (incoming.type === "location" && incoming.latitude && incoming.longitude) {
      const latitude = Number(incoming.latitude);
      const longitude = Number(incoming.longitude);
      if (latitude < -22.9 || latitude > -22.6 || longitude < -43.9 || longitude > -43.5) {
        replies.push(textReply("A localização precisa estar dentro de Seropédica. Envie outro ponto."));
      } else {
        draft.latitude = String(latitude);
        draft.longitude = String(longitude);
        state = "OPEN_PHOTOS";
        replies.push(textReply("Agora envie uma ou mais fotos. Quando terminar, digite *FINALIZAR*. Se não tiver foto, digite *SEM FOTO*."));
      }
    } else if (incoming.type === "text" && answer.toLocaleLowerCase("pt-BR").includes("endereço")) {
      const result = await geocodeSeropedicaAddress({
        address: draft.address ?? "",
        neighborhood: draft.neighborhood ?? "",
      });
      if (!result) {
        replies.push(textReply("Não consegui localizar esse endereço com segurança. Compartilhe a localização pelo WhatsApp."));
      } else {
        draft.latitude = result.latitude;
        draft.longitude = result.longitude;
        state = "OPEN_PHOTOS";
        replies.push(textReply("Localização encontrada. Envie uma ou mais fotos e, ao terminar, digite *FINALIZAR*. Também é possível digitar *SEM FOTO*."));
      }
    } else {
      replies.push(textReply("Use o recurso de compartilhar localização ou digite *USAR ENDEREÇO*."));
    }
  } else if (state === "OPEN_PHOTOS") {
    if (incoming.type === "image" && incoming.media) {
      draft.photos = [...(draft.photos ?? []), incoming.media].slice(0, 5);
      replies.push(
        textReply(
          `Foto recebida (${draft.photos.length}/5). Envie outra ou digite *FINALIZAR*.`,
        ),
      );
    } else if (incoming.type === "text" && isFinishPhotosCommand(answer)) {
      state = "OPEN_CONFIRM";
      replies.push(textReply(requestSummary(draft)));
    } else {
      replies.push(textReply("Envie uma imagem ou digite *FINALIZAR*."));
    }
  } else if (state === "OPEN_CONFIRM") {
    if (!isConfirmation(answer)) {
      replies.push(textReply("Digite *CONFIRMAR* para registrar ou *MENU* para cancelar."));
    } else {
      const result = await createRequestFromDraft(conversation, phone, draft);
      createdRequest = { id: result.id, protocol: result.protocol };
      state = "MENU";
      draft = {};
      replies.push(
        textReply(
          [
            "Solicitação registrada com sucesso!",
            "",
            `Protocolo: *${result.protocol}*`,
            "Guarde este número. Você pode acompanhar tudo por aqui, escolhendo a opção 2 no menu.",
            result.publicToken
              ? `Código de acompanhamento: *${result.publicToken}*`
              : "",
            "",
            "Digite *MENU* quando quiser acessar outras opções.",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      );
    }
  } else if (state === "TRACK_PROTOCOL") {
    const record = await findOwnedRequest(municipality.id, phone, answer);
    if (!record) {
      replies.push(textReply("Não encontrei esse protocolo vinculado a este número. Confira e tente novamente ou digite *MENU*."));
    } else {
      state = "MENU";
      draft = {};
      replies.push(
        textReply(
          [
            `Protocolo: *${record.protocol}*`,
            `Solicitação: ${record.title}`,
            `Status: *${record.status}*`,
            `Secretaria: ${record.department ?? "Em triagem"}`,
            `Atualizado em: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(record.updatedAt)}`,
            "",
            "Digite *MENU* para voltar.",
          ].join("\n"),
        ),
      );
    }
  } else if (state === "PHOTO_PROTOCOL") {
    const record = await findOwnedRequest(municipality.id, phone, answer);
    if (!record) {
      replies.push(textReply("Não encontrei esse protocolo vinculado a este número. Confira e tente novamente."));
    } else if (record.status === "Concluída" || record.status === "Cancelada") {
      replies.push(textReply("Essa solicitação já está encerrada e não aceita novas fotos. Digite *MENU* para voltar."));
    } else {
      draft = { protocol: record.protocol, requestId: record.id };
      state = "PHOTO_UPLOAD";
      replies.push(textReply(`Envie agora a foto para o protocolo *${record.protocol}*.`));
    }
  } else if (state === "PHOTO_UPLOAD") {
    if (incoming.type !== "image" || !incoming.media || !draft.requestId || !draft.protocol) {
      replies.push(textReply("Envie uma imagem ou digite *MENU* para cancelar."));
    } else {
      await db.insert(requestAttachments).values({
        requestId: draft.requestId,
        uploadedBy: null,
        originalName: incoming.media.originalName,
        storageKey: incoming.media.storageKey,
        contentType: incoming.media.contentType,
        sizeBytes: incoming.media.sizeBytes,
      });
      await db.insert(requestHistory).values({
        requestId: draft.requestId,
        userId: null,
        action: "Foto complementar enviada pelo cidadão",
        note: "Imagem recebida pelo WhatsApp.",
      });
      await db
        .update(whatsappMessages)
        .set({ requestId: draft.requestId })
        .where(eq(whatsappMessages.mediaStorageKey, incoming.media.storageKey));
      state = "MENU";
      replies.push(textReply(`Foto adicionada ao protocolo *${draft.protocol}*. Ela já está disponível no painel da prefeitura. Digite *MENU* para voltar.`));
      draft = {};
    }
  } else if (state === "REPLY_PROTOCOL") {
    const record = await findOwnedRequest(municipality.id, phone, answer);
    const pending =
      record?.tokenHash
        ? await findPendingInformationRequest(record.id, record.tokenHash)
        : null;
    if (!record || !pending) {
      replies.push(
        textReply(
          "Não encontrei uma pendência aberta para esse protocolo e número. Confira os dados ou digite *MENU*.",
        ),
      );
    } else {
      draft = { protocol: record.protocol, requestId: record.id };
      state = "REPLY_TEXT";
      replies.push(
        textReply(
          [`Pendência do protocolo *${record.protocol}*:`, "", pending.body, "", "Envie sua resposta. Você também pode enviar uma foto antes do texto."].join("\n"),
        ),
      );
    }
  } else if (state === "REPLY_TEXT") {
    if (!draft.requestId || !draft.protocol) {
      state = "REPLY_PROTOCOL";
      replies.push(textReply("Digite o protocolo que possui a pendência."));
    } else {
      const [record] = await db
        .select({
          id: requests.id,
          tokenHash: requests.publicAccessTokenHash,
          citizenName: requests.citizenName,
          status: requests.status,
        })
        .from(requests)
        .where(
          and(
            eq(requests.id, draft.requestId),
            eq(requests.municipalityId, municipality.id),
            eq(requests.citizenPhone, phone),
          ),
        )
        .limit(1);
      const pending =
        record?.tokenHash
          ? await findPendingInformationRequest(record.id, record.tokenHash)
          : null;
      if (!record || !pending || ["Concluída", "Cancelada"].includes(record.status)) {
        state = "MENU";
        draft = {};
        replies.push(textReply("Essa pendência não está mais disponível. Digite *MENU* para continuar."));
      } else if (incoming.type === "image" && incoming.media) {
        await db.insert(requestAttachments).values({
          requestId: record.id,
          uploadedBy: null,
          originalName: incoming.media.originalName,
          storageKey: incoming.media.storageKey,
          contentType: incoming.media.contentType,
          sizeBytes: incoming.media.sizeBytes,
        });
        await db
          .update(whatsappMessages)
          .set({ requestId: record.id })
          .where(eq(whatsappMessages.mediaStorageKey, incoming.media.storageKey));
        await db.insert(requestHistory).values({
          requestId: record.id,
          action: "Foto enviada em resposta à complementação",
          note: "Imagem recebida pelo WhatsApp.",
        });
        replies.push(textReply("Foto recebida. Agora envie uma mensagem explicando a complementação."));
      } else {
        const validated = validateCommunicationBody(answer);
        if (incoming.type !== "text" || validated.error) {
          replies.push(textReply(validated.error ?? "Envie uma resposta em texto."));
        } else {
          const repliedProtocol = draft.protocol;
          const responseAt = new Date();
          await db.transaction(async (tx) => {
            await tx.insert(requestCommunications).values({
              municipalityId: municipality.id,
              requestId: record.id,
              participantTokenHash: record.tokenHash!,
              authorType: "CITIZEN",
              authorName: record.citizenName,
              kind: "CITIZEN_REPLY",
              body: validated.body,
              replyToId: pending.id,
            });
            await tx
              .update(requestCommunications)
              .set({ answeredAt: responseAt })
              .where(eq(requestCommunications.id, pending.id));
            await tx
              .update(requests)
              .set({ status: "Triagem", waitingReason: null, updatedAt: responseAt })
              .where(eq(requests.id, record.id));
            await tx.insert(requestHistory).values({
              requestId: record.id,
              action: "Complementação enviada pelo cidadão",
              note: "O cidadão respondeu pelo WhatsApp.",
            });
            if (pending.userId) {
              await tx.insert(notifications).values({
                municipalityId: municipality.id,
                userId: pending.userId,
                requestId: record.id,
                title: "Complementação recebida",
                description: `${draft.protocol}: o cidadão respondeu pelo WhatsApp.`,
              });
            }
          });
          state = "MENU";
          draft = {};
          replies.push(
            textReply(
              `Complementação recebida para o protocolo *${repliedProtocol}*. A solicitação voltou para análise. Digite *MENU* para continuar.`,
            ),
          );
        }
      }
    }
  } else if (state === "RATING_PROTOCOL") {
    const record = await findOwnedRequest(municipality.id, phone, answer);
    const [existingRating] = record
      ? await db
          .select({ id: requestRatings.id })
          .from(requestRatings)
          .where(eq(requestRatings.requestId, record.id))
          .limit(1)
      : [];
    if (!record || record.status !== "Concluída") {
      replies.push(textReply("Esse protocolo não está concluído ou não pertence a este número."));
    } else if (existingRating) {
      state = "MENU";
      draft = {};
      replies.push(textReply("Esse atendimento já foi avaliado. Obrigado! Digite *MENU* para continuar."));
    } else {
      draft = { requestId: record.id, protocol: record.protocol };
      state = "RATING_SCORE";
      replies.push(textReply(`Qual nota você dá ao atendimento do protocolo *${record.protocol}*? Responda de 1 a 5.`));
    }
  } else if (state === "RATING_SCORE") {
    const rating = Number(answer);
    if (!draft.requestId || !draft.protocol) {
      state = "RATING_PROTOCOL";
      replies.push(textReply("Digite primeiro o protocolo concluído que deseja avaliar."));
    } else if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      replies.push(textReply("Informe uma nota inteira de 1 a 5."));
    } else {
      draft.rating = rating;
      state = "RATING_COMMENT";
      replies.push(textReply("Se desejar, escreva um comentário sobre o atendimento. Para finalizar sem comentário, digite *PULAR*."));
    }
  } else if (state === "RATING_COMMENT") {
    if (!draft.requestId || !draft.protocol || !draft.rating) {
      state = "RATING_PROTOCOL";
      replies.push(textReply("Digite o protocolo concluído que deseja avaliar."));
    } else {
      const comment = answer.toLocaleLowerCase("pt-BR") === "pular" ? "" : answer.slice(0, 1000);
      await db
        .insert(requestRatings)
        .values({
          municipalityId: municipality.id,
          requestId: draft.requestId,
          rating: draft.rating,
          comment: comment || null,
        })
        .onConflictDoNothing();
      await db.insert(requestHistory).values({
        requestId: draft.requestId,
        action: "Atendimento avaliado pelo cidadão",
        note: `Nota ${draft.rating} de 5 recebida pelo WhatsApp.`,
      });
      state = "MENU";
      draft = {};
      replies.push(textReply("Obrigado pela avaliação! Sua resposta foi registrada. Digite *MENU* para continuar."));
    }
  } else {
    replies.push(
      textReply(
        "Esta conversa está aguardando um atendente. Digite *MENU* para voltar ao atendimento automático.",
      ),
    );
  }

  await persistConversation(conversation.id, {
    state,
    draft,
    activeRequestId: createdRequest?.id ?? conversation.activeRequestId,
    humanHandoffRequestedAt:
      state === "HUMAN_HANDOFF"
        ? now
        : state === "MENU"
          ? null
          : conversation.humanHandoffRequestedAt,
    humanHandoffResolvedAt:
      state === "HUMAN_HANDOFF" ? null : conversation.humanHandoffResolvedAt,
  });
  try {
    await recordReplies(
      conversation.id,
      provider,
      replies,
      createdRequest?.id ?? conversation.activeRequestId,
    );
  } catch (error) {
    // A falha do histórico não pode repetir uma solicitação já criada no provedor.
    console.error("Falha ao registrar resposta do WhatsApp", error);
  }

  return {
    conversationId: conversation.id,
    replies,
    request: createdRequest,
  };
}
