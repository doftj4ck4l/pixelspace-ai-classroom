CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"ext" text NOT NULL,
	"mime" text DEFAULT 'application/octet-stream' NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"path" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sources_user_idx" ON "sources" USING btree ("user_id");