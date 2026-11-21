CREATE TABLE "spaces" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"school_id" text,
	"name" text NOT NULL,
	"level" text DEFAULT 'Umum' NOT NULL,
	"description" text,
	"accent" text DEFAULT 'teal' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "spaces_user_idx" ON "spaces" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "spaces_school_idx" ON "spaces" USING btree ("school_id");