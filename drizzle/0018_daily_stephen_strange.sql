CREATE TABLE "request_communications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"municipality_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"user_id" uuid,
	"participant_token_hash" text NOT NULL,
	"author_type" text NOT NULL,
	"author_name" text NOT NULL,
	"kind" text NOT NULL,
	"body" text NOT NULL,
	"reply_to_id" uuid,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "request_communications" ADD CONSTRAINT "request_communications_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_communications" ADD CONSTRAINT "request_communications_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_communications" ADD CONSTRAINT "request_communications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_request_communications_request_created_at" ON "request_communications" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_request_communications_participant" ON "request_communications" USING btree ("request_id","participant_token_hash");--> statement-breakpoint
CREATE INDEX "idx_request_communications_municipality" ON "request_communications" USING btree ("municipality_id");