CREATE TABLE "notes_progress" (
	"user_id" text NOT NULL,
	"notes_id" text NOT NULL,
	"done" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notes_progress" ADD CONSTRAINT "notes_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notes_progress_user_idx" ON "notes_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notes_progress_notes_idx" ON "notes_progress" USING btree ("user_id","notes_id");