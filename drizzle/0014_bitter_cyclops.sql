CREATE TYPE "public"."work_order_signature_role" AS ENUM('Execução', 'Fiscalização');--> statement-breakpoint
CREATE TABLE "work_order_signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"role" "work_order_signature_role" NOT NULL,
	"signer_id" uuid,
	"signer_name" text NOT NULL,
	"signer_role" text NOT NULL,
	"statement" text NOT NULL,
	"signed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_order_signatures" ADD CONSTRAINT "work_order_signatures_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_signatures" ADD CONSTRAINT "work_order_signatures_signer_id_users_id_fk" FOREIGN KEY ("signer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_work_order_signatures_order_role" ON "work_order_signatures" USING btree ("work_order_id","role");--> statement-breakpoint
CREATE INDEX "idx_work_order_signatures_signer_id" ON "work_order_signatures" USING btree ("signer_id");