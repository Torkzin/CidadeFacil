ALTER TABLE "requests" ADD COLUMN "assigned_to_id" uuid;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "assigned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_requests_assigned_to_id" ON "requests" USING btree ("assigned_to_id");