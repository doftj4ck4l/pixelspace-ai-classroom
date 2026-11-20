CREATE TABLE "mindmap_progress" (
	"user_id" text NOT NULL,
	"map_id" text NOT NULL,
	"node_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mindmap_progress" ADD CONSTRAINT "mindmap_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mindmap_progress_user_idx" ON "mindmap_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mindmap_progress_map_idx" ON "mindmap_progress" USING btree ("user_id","map_id");