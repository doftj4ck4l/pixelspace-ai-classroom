CREATE TABLE "quiz_progress" (
	"user_id" text NOT NULL,
	"quiz_id" text NOT NULL,
	"results" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifacts" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_progress" ADD CONSTRAINT "quiz_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_progress_user_idx" ON "quiz_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quiz_progress_quiz_idx" ON "quiz_progress" USING btree ("user_id","quiz_id");