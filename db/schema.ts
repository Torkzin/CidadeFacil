import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", [
  "Administrador",
  "Secretário",
  "Gestor",
  "Servidor",
  "Equipe de campo",
]);
export const userStatus = pgEnum("user_status", ["Ativo", "Inativo"]);
export const teamStatus = pgEnum("team_status", [
  "Disponível",
  "Em campo",
  "Pausa",
]);
export const requestPriority = pgEnum("request_priority", [
  "Baixa",
  "Normal",
  "Alta",
  "Urgente",
]);
export const requestStatus = pgEnum("request_status", [
  "Aberta",
  "Triagem",
  "Encaminhada",
  "Em andamento",
  "Aguardando",
  "Concluída",
  "Cancelada",
]);
export const requestSource = pgEnum("request_source", [
  "ADMIN_PORTAL",
  "CITIZEN_PORTAL",
  "WHATSAPP",
  "API",
  "OTHER",
]);
export const workOrderStatus = pgEnum("work_order_status", [
  "Planejada",
  "Em execução",
  "Concluída",
  "Cancelada",
]);
export const workOrderEvidencePhase = pgEnum("work_order_evidence_phase", [
  "Antes",
  "Depois",
]);
export const workOrderSignatureRole = pgEnum("work_order_signature_role", [
  "Execução",
  "Fiscalização",
]);

export const municipalities = pgTable(
  "municipalities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("idx_municipalities_slug").on(table.slug)],
);

export const municipalitySettings = pgTable("municipality_settings", {
  municipalityId: uuid("municipality_id")
    .primaryKey()
    .references(() => municipalities.id, { onDelete: "cascade" }),
  governmentName: text("government_name").notNull(),
  taxId: text("tax_id").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  email: text("email").notNull(),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  privacyPolicy: text("privacy_policy"),
  privacyUpdatedAt: timestamp("privacy_updated_at", { withTimezone: true }),
  citizenResponseHours: integer("citizen_response_hours")
    .notNull()
    .default(72),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id),
    name: text("name").notNull(),
    managerName: text("manager_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_departments_municipality_name").on(
      table.municipalityId,
      table.name,
    ),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull(),
    status: userStatus("status").notNull().default("Ativo"),
    lastAccessAt: timestamp("last_access_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_users_email").on(table.email),
    index("idx_users_municipality_role").on(table.municipalityId, table.role),
    index("idx_users_department_id").on(table.departmentId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_sessions_token_hash").on(table.tokenHash),
    index("idx_sessions_user_id").on(table.userId),
  ],
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id),
    name: text("name").notNull(),
    status: teamStatus("status").notNull().default("Disponível"),
    memberCount: integer("member_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_teams_municipality_name").on(
      table.municipalityId,
      table.name,
    ),
    index("idx_teams_department_id").on(table.departmentId),
  ],
);

export const userTeamMemberships = pgTable(
  "user_team_memberships",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.teamId] })],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id),
    name: text("name").notNull(),
    color: text("color").notNull(),
    publicEnabled: boolean("public_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_categories_municipality_name").on(
      table.municipalityId,
      table.name,
    ),
  ],
);

export const routingRules = pgTable(
  "routing_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    neighborhood: text("neighborhood"),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    priority: requestPriority("priority"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_routing_rules_municipality_active").on(
      table.municipalityId,
      table.active,
    ),
    index("idx_routing_rules_category").on(table.categoryId),
    index("idx_routing_rules_department").on(table.departmentId),
  ],
);

export const protocolSequences = pgTable(
  "protocol_sequences",
  {
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id),
    year: integer("year").notNull(),
    lastValue: integer("last_value").notNull(),
  },
  (table) => [primaryKey({ columns: [table.municipalityId, table.year] })],
);

export const requests = pgTable(
  "requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id),
    protocol: text("protocol").notNull(),
    source: requestSource("source").notNull().default("ADMIN_PORTAL"),
    publicAccessTokenHash: text("public_access_token_hash"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    priority: requestPriority("priority").notNull(),
    status: requestStatus("status").notNull().default("Aberta"),
    address: text("address").notNull(),
    addressNumber: text("address_number"),
    complement: text("complement"),
    neighborhood: text("neighborhood").notNull(),
    postalCode: text("postal_code"),
    latitude: text("latitude"),
    longitude: text("longitude"),
    departmentId: uuid("department_id").references(() => departments.id),
    teamId: uuid("team_id").references(() => teams.id),
    assignedToId: uuid("assigned_to_id").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    citizenName: text("citizen_name").notNull(),
    citizenPhone: text("citizen_phone"),
    citizenEmail: text("citizen_email"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    responseDueAt: timestamp("response_due_at", { withTimezone: true }),
    resolutionDueAt: timestamp("resolution_due_at", { withTimezone: true }),
    firstRespondedAt: timestamp("first_responded_at", { withTimezone: true }),
    concludedAt: timestamp("concluded_at", { withTimezone: true }),
    waitingReason: text("waiting_reason"),
    cancellationReason: text("cancellation_reason"),
    resolutionNote: text("resolution_note"),
    reopenedAt: timestamp("reopened_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("idx_requests_municipality_protocol").on(
      table.municipalityId,
      table.protocol,
    ),
    index("idx_requests_municipality_created_at").on(
      table.municipalityId,
      table.createdAt,
    ),
    index("idx_requests_municipality_status").on(
      table.municipalityId,
      table.status,
    ),
    index("idx_requests_municipality_neighborhood").on(
      table.municipalityId,
      table.neighborhood,
    ),
    index("idx_requests_department_id").on(table.departmentId),
    index("idx_requests_team_id").on(table.teamId),
    index("idx_requests_assigned_to_id").on(table.assignedToId),
    index("idx_requests_municipality_response_due").on(
      table.municipalityId,
      table.responseDueAt,
    ),
    index("idx_requests_municipality_resolution_due").on(
      table.municipalityId,
      table.resolutionDueAt,
    ),
  ],
);

export const workOrderSequences = pgTable(
  "work_order_sequences",
  {
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    lastValue: integer("last_value").notNull(),
  },
  (table) => [primaryKey({ columns: [table.municipalityId, table.year] })],
);

export const workOrders = pgTable(
  "work_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id, { onDelete: "cascade" }),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    status: workOrderStatus("status").notNull().default("Planejada"),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    assignedToId: uuid("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
    plannedAt: timestamp("planned_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
    completionNote: text("completion_note"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_work_orders_request_id").on(table.requestId),
    uniqueIndex("idx_work_orders_municipality_number").on(table.municipalityId, table.number),
    index("idx_work_orders_municipality_status").on(table.municipalityId, table.status),
    index("idx_work_orders_team_id").on(table.teamId),
    index("idx_work_orders_assigned_to_id").on(table.assignedToId),
  ],
);

export const workOrderMaterials = pgTable(
  "work_order_materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workOrderId: uuid("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: text("quantity").notNull(),
    unit: text("unit").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_work_order_materials_order_id").on(table.workOrderId)],
);

export const workOrderAttachments = pgTable(
  "work_order_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workOrderId: uuid("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    phase: workOrderEvidencePhase("phase").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    originalName: text("original_name").notNull(),
    storageKey: text("storage_key").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_work_order_attachments_storage_key").on(table.storageKey),
    index("idx_work_order_attachments_order_phase").on(table.workOrderId, table.phase),
  ],
);

export const workOrderSignatures = pgTable(
  "work_order_signatures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workOrderId: uuid("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    role: workOrderSignatureRole("role").notNull(),
    signerId: uuid("signer_id").references(() => users.id, { onDelete: "set null" }),
    signerName: text("signer_name").notNull(),
    signerRole: text("signer_role").notNull(),
    statement: text("statement").notNull(),
    signedAt: timestamp("signed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_work_order_signatures_order_role").on(table.workOrderId, table.role),
    index("idx_work_order_signatures_signer_id").on(table.signerId),
  ],
);

export const serviceChecklistItems = pgTable(
  "service_checklist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    municipalityId: uuid("municipality_id").notNull().references(() => municipalities.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    required: boolean("required").notNull().default(true),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_service_checklist_category_title").on(table.municipalityId, table.categoryId, table.title),
    index("idx_service_checklist_category_active").on(table.categoryId, table.active),
  ],
);

export const workOrderChecklistCompletions = pgTable(
  "work_order_checklist_completions",
  {
    workOrderId: uuid("work_order_id").notNull().references(() => workOrders.id, { onDelete: "cascade" }),
    checklistItemId: uuid("checklist_item_id").notNull().references(() => serviceChecklistItems.id, { onDelete: "cascade" }),
    completedBy: uuid("completed_by").references(() => users.id, { onDelete: "set null" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.workOrderId, table.checklistItemId] }),
    index("idx_work_order_checklist_item").on(table.checklistItemId),
  ],
);

export const requestHistory = pgTable(
  "request_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_request_history_request_created_at").on(
      table.requestId,
      table.createdAt,
    ),
  ],
);

export const requestRelations = pgTable(
  "request_relations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id, { onDelete: "cascade" }),
    primaryRequestId: uuid("primary_request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    relatedRequestId: uuid("related_request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    linkedBy: uuid("linked_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_request_relations_related").on(table.relatedRequestId),
    index("idx_request_relations_primary").on(table.primaryRequestId),
    index("idx_request_relations_municipality").on(table.municipalityId),
  ],
);

export const requestFollowers = pgTable(
  "request_followers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id, { onDelete: "cascade" }),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    citizenName: text("citizen_name").notNull(),
    citizenPhone: text("citizen_phone").notNull(),
    citizenEmail: text("citizen_email"),
    accessTokenHash: text("access_token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_request_followers_request").on(table.requestId),
    index("idx_request_followers_municipality").on(table.municipalityId),
  ],
);

export const requestCitizenAcceptances = pgTable(
  "request_citizen_acceptances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id, { onDelete: "cascade" }),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    participantTokenHash: text("participant_token_hash").notNull(),
    participantName: text("participant_name").notNull(),
    outcome: text("outcome").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_request_citizen_acceptance_participant").on(
      table.requestId,
      table.participantTokenHash,
    ),
    index("idx_request_citizen_acceptance_municipality").on(
      table.municipalityId,
    ),
  ],
);

export const requestCommunications = pgTable(
  "request_communications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id, { onDelete: "cascade" }),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    participantTokenHash: text("participant_token_hash").notNull(),
    authorType: text("author_type").notNull(),
    authorName: text("author_name").notNull(),
    kind: text("kind").notNull(),
    body: text("body").notNull(),
    replyToId: uuid("reply_to_id"),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    responseDueAt: timestamp("response_due_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_request_communications_request_created_at").on(
      table.requestId,
      table.createdAt,
    ),
    index("idx_request_communications_participant").on(
      table.requestId,
      table.participantTokenHash,
    ),
    index("idx_request_communications_municipality").on(
      table.municipalityId,
    ),
  ],
);

export const whatsappConversations = pgTable(
  "whatsapp_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id, { onDelete: "cascade" }),
    phone: text("phone").notNull(),
    displayName: text("display_name"),
    state: text("state").notNull().default("MENU"),
    draft: text("draft").notNull().default("{}"),
    activeRequestId: uuid("active_request_id").references(() => requests.id, {
      onDelete: "set null",
    }),
    humanHandoffRequestedAt: timestamp("human_handoff_requested_at", {
      withTimezone: true,
    }),
    humanHandoffResolvedAt: timestamp("human_handoff_resolved_at", {
      withTimezone: true,
    }),
    assignedToId: uuid("assigned_to_id").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_whatsapp_conversations_municipality_phone").on(
      table.municipalityId,
      table.phone,
    ),
    index("idx_whatsapp_conversations_last_message").on(
      table.municipalityId,
      table.lastMessageAt,
    ),
    index("idx_whatsapp_conversations_active_request").on(
      table.activeRequestId,
    ),
    index("idx_whatsapp_conversations_assignment").on(
      table.municipalityId,
      table.assignedToId,
    ),
  ],
);

export const whatsappMessages = pgTable(
  "whatsapp_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => whatsappConversations.id, { onDelete: "cascade" }),
    requestId: uuid("request_id").references(() => requests.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull().default("SIMULATOR"),
    providerMessageId: text("provider_message_id"),
    direction: text("direction").notNull(),
    type: text("type").notNull(),
    body: text("body"),
    mediaStorageKey: text("media_storage_key"),
    mediaContentType: text("media_content_type"),
    mediaOriginalName: text("media_original_name"),
    status: text("status").notNull().default("received"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_whatsapp_messages_provider_id").on(
      table.provider,
      table.providerMessageId,
    ),
    index("idx_whatsapp_messages_conversation_created").on(
      table.conversationId,
      table.createdAt,
    ),
    index("idx_whatsapp_messages_request").on(table.requestId),
  ],
);

export const whatsappConversationEvents = pgTable(
  "whatsapp_conversation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => whatsappConversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_whatsapp_conversation_events_conversation_created").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

export const requestComments = pgTable(
  "request_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_request_comments_request_created_at").on(
      table.requestId,
      table.createdAt,
    ),
  ],
);

export const requestAttachments = pgTable(
  "request_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    originalName: text("original_name").notNull(),
    storageKey: text("storage_key").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_request_attachments_storage_key").on(table.storageKey),
    index("idx_request_attachments_request_id").on(table.requestId),
  ],
);

export const requestRatings = pgTable(
  "request_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id, { onDelete: "cascade" }),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_request_ratings_request").on(table.requestId),
    index("idx_request_ratings_municipality").on(table.municipalityId),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: text("metadata"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_audit_logs_municipality_created_at").on(
      table.municipalityId,
      table.createdAt,
    ),
    index("idx_audit_logs_user_id").on(table.userId),
    index("idx_audit_logs_action").on(table.action),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requestId: uuid("request_id").references(() => requests.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    dedupeKey: text("dedupe_key"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_notifications_user_created_at").on(
      table.userId,
      table.createdAt,
    ),
    index("idx_notifications_user_read_at").on(table.userId, table.readAt),
    index("idx_notifications_request_id").on(table.requestId),
    uniqueIndex("idx_notifications_user_dedupe").on(
      table.userId,
      table.dedupeKey,
    ),
  ],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id, { onDelete: "cascade" }),
    urgentRequests: boolean("urgent_requests").notNull().default(true),
    deadlineAlerts: boolean("deadline_alerts").notNull().default(true),
    dailyDigest: boolean("daily_digest").notNull().default(false),
    teamConclusions: boolean("team_conclusions").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_notification_preferences_municipality").on(table.municipalityId),
  ],
);

export const prioritySettings = pgTable(
  "priority_settings",
  {
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalities.id, { onDelete: "cascade" }),
    priority: requestPriority("priority").notNull(),
    responseHours: integer("response_hours").notNull(),
    resolutionHours: integer("resolution_hours").notNull(),
    active: boolean("active").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.municipalityId, table.priority] })],
);

export const systemJobs = pgTable("system_jobs", {
  key: text("key").primaryKey(),
  status: text("status").notNull(),
  lastStartedAt: timestamp("last_started_at", { withTimezone: true }),
  lastCompletedAt: timestamp("last_completed_at", { withTimezone: true }),
  lastError: text("last_error"),
  result: text("result"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
