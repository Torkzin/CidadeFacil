CREATE TABLE "system_jobs" (
	"key" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"last_started_at" timestamp with time zone,
	"last_completed_at" timestamp with time zone,
	"last_error" text,
	"result" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
