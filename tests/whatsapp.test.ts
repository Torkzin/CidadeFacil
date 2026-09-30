import assert from "node:assert/strict";
import test from "node:test";
import {
  isConfirmation,
  isFinishPhotosCommand,
  isExplicitConfirmation,
  isMenuCommand,
  normalizeProtocol,
  normalizeWhatsAppPhone,
  parseDraft,
  parseMenuChoice,
} from "../lib/whatsapp/flow.ts";
import {
  canAccessWhatsAppInbox,
  canActOnWhatsAppConversation,
  canTransferWhatsAppConversation,
} from "../lib/whatsapp/inbox-policy.ts";
import { twilioMessagingResponse, twilioWhatsAppPhone } from "../lib/whatsapp/twilio-format.ts";

test("normaliza número brasileiro do WhatsApp", () => {
  assert.equal(normalizeWhatsAppPhone("(21) 99999-0000"), "5521999990000");
  assert.equal(normalizeWhatsAppPhone("+55 21 99999-0000"), "5521999990000");
  assert.equal(normalizeWhatsAppPhone("123"), null);
});

test("interpreta as opções e comandos principais do atendimento", () => {
  assert.equal(parseMenuChoice("1"), "OPEN");
  assert.equal(parseMenuChoice("Quero acompanhar meu pedido"), "TRACK");
  assert.equal(parseMenuChoice("mandar foto"), "PHOTO");
  assert.equal(parseMenuChoice("atendente humano"), "HUMAN");
  assert.equal(parseMenuChoice("responder pendência"), "REPLY");
  assert.equal(parseMenuChoice("6"), "RATING");
  assert.equal(parseMenuChoice("qualquer coisa"), null);
  assert.equal(isMenuCommand("Início"), true);
  assert.equal(isFinishPhotosCommand("sem foto"), true);
  assert.equal(isConfirmation("CONFIRMAR"), true);
  assert.equal(isExplicitConfirmation("CONFIRMAR"), true);
  assert.equal(isExplicitConfirmation("1"), false);
});

test("normaliza protocolo e recupera rascunho com segurança", () => {
  assert.equal(normalizeProtocol(" 2026-000123 "), "2026-000123");
  assert.deepEqual(parseDraft("dados inválidos"), {});
  assert.deepEqual(parseDraft('{"citizenName":"Maria"}'), {
    citizenName: "Maria",
  });
});

test("aplica permissões da caixa de atendimento WhatsApp", () => {
  assert.equal(canAccessWhatsAppInbox("Servidor"), true);
  assert.equal(canAccessWhatsAppInbox("Equipe de campo"), false);
  assert.equal(canTransferWhatsAppConversation("Secretário"), true);
  assert.equal(canTransferWhatsAppConversation("Servidor"), false);
  assert.equal(
    canActOnWhatsAppConversation({ role: "Servidor", userId: "a", assignedToId: null }),
    true,
  );
  assert.equal(
    canActOnWhatsAppConversation({ role: "Servidor", userId: "a", assignedToId: "b" }),
    false,
  );
  assert.equal(
    canActOnWhatsAppConversation({ role: "Gestor", userId: "a", assignedToId: "b" }),
    true,
  );
});

test("normaliza remetente e gera resposta XML segura para a Twilio", () => {
  assert.equal(twilioWhatsAppPhone("whatsapp:+5521999990000"), "5521999990000");
  assert.equal(
    twilioMessagingResponse(["Protocolo <2026-1> & confirmado"]),
    '<?xml version="1.0" encoding="UTF-8"?><Response><Message><Body>Protocolo &lt;2026-1&gt; &amp; confirmado</Body></Message></Response>',
  );
});
