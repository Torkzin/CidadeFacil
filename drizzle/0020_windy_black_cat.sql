CREATE TABLE "whatsapp_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"municipality_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"display_name" text,
	"state" text DEFAULT 'MENU' NOT NULL,
	"draft" text DEFAULT '{}' NOT NULL,
	"active_request_id" uuid,
	"human_handoff_requested_at" timestamp with time zone,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"request_id" uuid,
	"provider" text DEFAULT 'SIMULATOR' NOT NULL,
	"provider_message_id" text,
	"direction" text NOT NULL,
	"type" text NOT NULL,
	"body" text,
	"media_storage_key" text,
	"media_content_type" text,
	"media_original_name" text,
	"status" text DEFAULT 'received' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_active_request_id_requests_id_fk" FOREIGN KEY ("active_request_id") REFERENCES "public"."requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversation_id_whatsapp_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."whatsapp_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_whatsapp_conversations_municipality_phone" ON "whatsapp_conversations" USING btree ("municipality_id","phone");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_conversations_last_message" ON "whatsapp_conversations" USING btree ("municipality_id","last_message_at");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_conversations_active_request" ON "whatsapp_conversations" USING btree ("active_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_whatsapp_messages_provider_id" ON "whatsapp_messages" USING btree ("provider","provider_message_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_conversation_created" ON "whatsapp_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_request" ON "whatsapp_messages" USING btree ("request_id");