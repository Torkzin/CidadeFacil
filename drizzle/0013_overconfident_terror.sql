CREATE TYPE "public"."work_order_evidence_phase" AS ENUM('Antes', 'Depois');--> statement-breakpoint
CREATE TABLE "work_order_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"phase" "work_order_evidence_phase" NOT NULL,
	"uploaded_by" uuid,
	"original_name" text NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_order_attachments" ADD CONSTRAINT "work_order_attachments_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_attachments" ADD CONSTRAINT "work_order_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_work_order_attachments_storage_key" ON "work_order_attachments" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "idx_work_order_attachments_order_phase" ON "work_order_attachments" USING btree ("work_order_id","phase");