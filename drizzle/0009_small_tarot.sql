CREATE TABLE "space_members" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "code" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "space_members_unique_idx" ON "space_members" USING btree ("space_id","user_id");--> statement-breakpoint
CREATE INDEX "space_members_user_idx" ON "space_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spaces_code_idx" ON "spaces" USING btree ("code");