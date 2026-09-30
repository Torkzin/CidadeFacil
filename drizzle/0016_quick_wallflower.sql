CREATE TABLE "request_followers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"municipality_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"citizen_name" text NOT NULL,
	"citizen_phone" text NOT NULL,
	"citizen_email" text,
	"access_token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"municipality_id" uuid NOT NULL,
	"primary_request_id" uuid NOT NULL,
	"related_request_id" uuid NOT NULL,
	"linked_by" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "request_followers" ADD CONSTRAINT "request_followers_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_followers" ADD CONSTRAINT "request_followers_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_relations" ADD CONSTRAINT "request_relations_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_relations" ADD CONSTRAINT "request_relations_primary_request_id_requests_id_fk" FOREIGN KEY ("primary_request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_relations" ADD CONSTRAINT "request_relations_related_request_id_requests_id_fk" FOREIGN KEY ("related_request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_relations" ADD CONSTRAINT "request_relations_linked_by_users_id_fk" FOREIGN KEY ("linked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_request_followers_request" ON "request_followers" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_request_followers_municipality" ON "request_followers" USING btree ("municipality_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_request_relations_related" ON "request_relations" USING btree ("related_request_id");--> statement-breakpoint
CREATE INDEX "idx_request_relations_primary" ON "request_relations" USING btree ("primary_request_id");--> statement-breakpoint
CREATE INDEX "idx_request_relations_municipality" ON "request_relations" USING btree ("municipality_id");