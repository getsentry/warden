CREATE TABLE "finding_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"verdict" text NOT NULL,
	"comment" text NOT NULL,
	"skill" text NOT NULL,
	"client_finding_id" text NOT NULL,
	"occurrence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finding_reviews_verdict_valid" CHECK ("finding_reviews"."verdict" IN ('false_positive', 'true_positive', 'mitigated')),
	CONSTRAINT "finding_reviews_comment_length" CHECK (char_length("finding_reviews"."comment") <= 4000),
	CONSTRAINT "finding_reviews_occurrence_positive" CHECK ("finding_reviews"."occurrence" >= 1)
);
--> statement-breakpoint
ALTER TABLE "memory_evidence" ADD COLUMN "review_id" uuid;--> statement-breakpoint
ALTER TABLE "finding_reviews" ADD CONSTRAINT "finding_reviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_reviews" ADD CONSTRAINT "finding_reviews_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_reviews" ADD CONSTRAINT "finding_reviews_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "finding_reviews_finding_unique" ON "finding_reviews" USING btree ("finding_id");--> statement-breakpoint
CREATE INDEX "finding_reviews_tenant_run_idx" ON "finding_reviews" USING btree ("tenant_id","run_id");--> statement-breakpoint
ALTER TABLE "memory_evidence" ADD CONSTRAINT "memory_evidence_review_id_finding_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."finding_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "memory_evidence_memory_review_unique" ON "memory_evidence" USING btree ("memory_id","review_id") WHERE "memory_evidence"."review_id" IS NOT NULL;