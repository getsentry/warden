ALTER TABLE "service_tokens" ADD COLUMN "credential_kind" text DEFAULT 'service' NOT NULL;--> statement-breakpoint
ALTER TABLE "service_tokens" ADD COLUMN "owner_subject" text;--> statement-breakpoint
ALTER TABLE "service_tokens" ADD COLUMN "token_suffix" text;--> statement-breakpoint
CREATE INDEX "service_tokens_owner_idx" ON "service_tokens" USING btree ("tenant_id","owner_subject");--> statement-breakpoint
ALTER TABLE "service_tokens" ADD CONSTRAINT "service_tokens_kind_valid" CHECK ("service_tokens"."credential_kind" IN ('service', 'personal'));--> statement-breakpoint
ALTER TABLE "service_tokens" ADD CONSTRAINT "service_tokens_personal_owner" CHECK ("service_tokens"."credential_kind" = 'service' OR ("service_tokens"."owner_subject" IS NOT NULL AND "service_tokens"."token_suffix" IS NOT NULL));