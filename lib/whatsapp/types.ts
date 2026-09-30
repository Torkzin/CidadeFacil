export type IncomingWhatsAppMessage = {
  phone: string;
  displayName?: string | null;
  provider?: string;
  providerMessageId?: string | null;
  type: "text" | "image" | "location";
  text?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  media?: {
    storageKey: string;
    originalName: string;
    contentType: string;
    sizeBytes: number;
  } | null;
};

export type OutgoingWhatsAppMessage = {
  type: "text";
  text: string;
};

export type WhatsAppProcessResult = {
  duplicate?: boolean;
  conversationId: string;
  replies: OutgoingWhatsAppMessage[];
  request?: {
    id: string;
    protocol: string;
  } | null;
};

