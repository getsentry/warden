CREATE TABLE "hunk_reviews" (
	"tenant_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"review_key" text NOT NULL,
	"skill" text NOT NULL,
	"reviewed_sha" text,
	"evidence" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hunk_reviews_tenant_id_repository_id_review_key_pk" PRIMARY KEY("tenant_id","repository_id","review_key")
);
--> statement-breakpoint
ALTER TABLE "hunk_reviews" ADD CONSTRAINT "hunk_reviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hunk_reviews" ADD CONSTRAINT "hunk_reviews_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hunk_reviews_expiry_idx" ON "hunk_reviews" USING btree ("expires_at");