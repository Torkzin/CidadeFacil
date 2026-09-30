ALTER TABLE "requests" ADD COLUMN "waiting_reason" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "resolution_note" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "reopened_at" timestamp with time zone;