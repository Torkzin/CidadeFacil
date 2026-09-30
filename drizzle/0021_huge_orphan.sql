CREATE TABLE "whatsapp_conversation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp_conversations" ADD COLUMN "human_handoff_resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp_conversations" ADD COLUMN "assigned_to_id" uuid;--> statement-breakpoint
ALTER TABLE "whatsapp_conversations" ADD COLUMN "assigned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp_conversations" ADD COLUMN "last_read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp_conversation_events" ADD CONSTRAINT "whatsapp_conversation_events_conversation_id_whatsapp_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."whatsapp_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_conversation_events" ADD CONSTRAINT "whatsapp_conversation_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_whatsapp_conversation_events_conversation_created" ON "whatsapp_conversation_events" USING btree ("conversation_id","created_at");--> statement-breakpoint
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_whatsapp_conversations_assignment" ON "whatsapp_conversations" USING btree ("municipality_id","assigned_to_id");