CREATE TABLE "auth_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"user_id" text,
	"detail" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"school_name" text NOT NULL,
	"state" text,
	"note" text,
	"requested_by" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" text DEFAULT 'secondary' NOT NULL,
	"state" text,
	"district" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "schools_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "display_username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'student' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "school_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "year_label" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "class_name" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "language" text DEFAULT 'bm' NOT NULL;--> statement-breakpoint
CREATE INDEX "auth_events_user_idx" ON "auth_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_events_created_idx" ON "auth_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "school_requests_status_idx" ON "school_requests" USING btree ("status");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");