CREATE TABLE "deck_progress" (
	"user_id" text NOT NULL,
	"deck_id" text NOT NULL,
	"known_indices" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifacts" ADD COLUMN "pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "artifacts" ADD COLUMN "favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "deck_progress" ADD CONSTRAINT "deck_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_progress_user_idx" ON "deck_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deck_progress_deck_idx" ON "deck_progress" USING btree ("user_id","deck_id");