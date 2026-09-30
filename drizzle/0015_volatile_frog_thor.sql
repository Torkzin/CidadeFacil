CREATE TABLE "service_checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"municipality_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"title" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_order_checklist_completions" (
	"work_order_id" uuid NOT NULL,
	"checklist_item_id" uuid NOT NULL,
	"completed_by" uuid,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_order_checklist_completions_work_order_id_checklist_item_id_pk" PRIMARY KEY("work_order_id","checklist_item_id")
);
--> statement-breakpoint
ALTER TABLE "service_checklist_items" ADD CONSTRAINT "service_checklist_items_municipality_id_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."municipalities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_checklist_items" ADD CONSTRAINT "service_checklist_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_checklist_completions" ADD CONSTRAINT "work_order_checklist_completions_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_checklist_completions" ADD CONSTRAINT "work_order_checklist_completions_checklist_item_id_service_checklist_items_id_fk" FOREIGN KEY ("checklist_item_id") REFERENCES "public"."service_checklist_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_checklist_completions" ADD CONSTRAINT "work_order_checklist_completions_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_service_checklist_category_title" ON "service_checklist_items" USING btree ("municipality_id","category_id","title");--> statement-breakpoint
CREATE INDEX "idx_service_checklist_category_active" ON "service_checklist_items" USING btree ("category_id","active");--> statement-breakpoint
CREATE INDEX "idx_work_order_checklist_item" ON "work_order_checklist_completions" USING btree ("checklist_item_id");