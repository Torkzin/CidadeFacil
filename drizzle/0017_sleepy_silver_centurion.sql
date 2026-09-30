CREATE TABLE "request_citizen_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"municipality_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"participant_token_hash" text NOT NULL,
	"participant_name" text NOT NULL,
	"outcome" text NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "request_citizen_acceptances" ADD CONSTRAINT "request_citizen_acceptances_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_citizen_acceptances" ADD CONSTRAINT "request_citizen_acceptances_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_request_citizen_acceptance_participant" ON "request_citizen_acceptances" USING btree ("request_id","participant_token_hash");--> statement-breakpoint
CREATE INDEX "idx_request_citizen_acceptance_municipality" ON "request_citizen_acceptances" USING btree ("municipality_id");