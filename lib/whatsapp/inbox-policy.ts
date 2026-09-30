export type InboxRole =
  | "Administrador"
  | "Secretário"
  | "Gestor"
  | "Servidor"
  | "Equipe de campo";

const INBOX_ROLES: InboxRole[] = [
  "Administrador",
  "Secretário",
  "Gestor",
  "Servidor",
];

export function canAccessWhatsAppInbox(role: InboxRole) {
  return INBOX_ROLES.includes(role);
}

export function canTransferWhatsAppConversation(role: InboxRole) {
  return ["Administrador", "Secretário", "Gestor"].includes(role);
}

export function canActOnWhatsAppConversation(input: {
  role: InboxRole;
  userId: string;
  assignedToId: string | null;
}) {
  return (
    input.assignedToId === null ||
    input.assignedToId === input.userId ||
    input.role === "Administrador" ||
    input.role === "Gestor"
  );
}
