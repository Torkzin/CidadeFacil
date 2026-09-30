ALTER TABLE "notifications" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "response_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "resolution_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "first_responded_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_notifications_user_dedupe" ON "notifications" USING btree ("user_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "idx_requests_municipality_response_due" ON "requests" USING btree ("municipality_id","response_due_at");--> statement-breakpoint
CREATE INDEX "idx_requests_municipality_resolution_due" ON "requests" USING btree ("municipality_id","resolution_due_at");