CREATE TYPE "public"."cost_basis" AS ENUM('reported', 'estimated', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."data_profile" AS ENUM('metrics', 'findings', 'code');--> statement-breakpoint
CREATE TYPE "public"."execution_status" AS ENUM('success', 'failure', 'cancelled', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."job_state" AS ENUM('pending', 'running', 'retry', 'complete', 'dead');--> statement-breakpoint
CREATE TYPE "public"."memory_kind" AS ENUM('convention', 'confirmed_pattern', 'false_positive', 'review_guidance');--> statement-breakpoint
CREATE TYPE "public"."memory_lifecycle" AS ENUM('candidate', 'active', 'superseded', 'archived', 'expired');--> statement-breakpoint
CREATE TYPE "public"."run_outcome" AS ENUM('success', 'failure', 'cancelled', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."run_source" AS ENUM('cli', 'action', 'sdk', 'replay');--> statement-breakpoint
CREATE TYPE "public"."service_role" AS ENUM('ingest', 'read', 'admin');--> statement-breakpoint
CREATE TABLE "finding_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"path" text NOT NULL,
	"start_line" integer NOT NULL,
	"end_line" integer,
	"ordinal" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finding_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"skill_execution_id" uuid,
	"outcome" text NOT NULL,
	"reason" text,
	"observed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"skill_execution_id" uuid NOT NULL,
	"client_finding_id" text NOT NULL,
	"reported_id" text,
	"severity" text NOT NULL,
	"confidence" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"verification" text,
	"provenance" jsonb,
	"source_evidence" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"safe_error_code" text
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"repository_id" uuid,
	"type" text NOT NULL,
	"entity_id" uuid,
	"input_version" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload_ref" jsonb NOT NULL,
	"state" "job_state" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"max_age_seconds" integer DEFAULT 86400 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_owner" text,
	"lease_expires_at" timestamp with time zone,
	"continuation" jsonb,
	"safe_error_code" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_limits_positive" CHECK ("jobs"."max_attempts" > 0 AND "jobs"."max_age_seconds" > 0 AND "jobs"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"idempotency_key" text NOT NULL,
	"kind" "memory_kind" NOT NULL,
	"lifecycle" "memory_lifecycle" DEFAULT 'candidate' NOT NULL,
	"origin" text NOT NULL,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"search_document" text NOT NULL,
	"skill" text,
	"language" text,
	"path_family" text,
	"confidence" numeric(6, 5),
	"support_count" integer DEFAULT 0 NOT NULL,
	"contradiction_count" integer DEFAULT 0 NOT NULL,
	"policy_version" text,
	"model_version" text,
	"extraction_cost_usd" numeric(20, 10),
	"observed_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"superseded_by_id" uuid,
	"archive_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memories_counts_nonnegative" CHECK ("memories"."support_count" >= 0 AND "memories"."contradiction_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "memory_embeddings" (
	"tenant_id" uuid NOT NULL,
	"memory_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"dimensions" integer NOT NULL,
	"content_hash" text NOT NULL,
	"embedding" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_embeddings_memory_id_provider_model_pk" PRIMARY KEY("memory_id","provider","model")
);
--> statement-breakpoint
CREATE TABLE "memory_evidence" (
	"tenant_id" uuid NOT NULL,
	"memory_id" uuid NOT NULL,
	"finding_id" uuid,
	"observation_id" uuid,
	"evidence_kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_evidence_memory_id_evidence_kind_created_at_pk" PRIMARY KEY("memory_id","evidence_kind","created_at")
);
--> statement-breakpoint
CREATE TABLE "memory_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"memory_id" uuid NOT NULL,
	"actor_token_id" uuid,
	"outcome" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_lifecycle_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"memory_id" uuid NOT NULL,
	"from_state" "memory_lifecycle",
	"to_state" "memory_lifecycle" NOT NULL,
	"actor_token_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_recall_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"run_id" uuid,
	"client_recall_id" text NOT NULL,
	"memory_count" integer NOT NULL,
	"duration_ms" numeric(18, 3) NOT NULL,
	"provider" text,
	"model" text,
	"runtime" text,
	"input_tokens" bigint,
	"output_tokens" bigint,
	"cost_usd" numeric(20, 10),
	"cost_basis" "cost_basis",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_recall_batches_count_nonnegative" CHECK ("memory_recall_batches"."memory_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "memory_recalls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"batch_id" uuid,
	"run_id" uuid,
	"memory_id" uuid NOT NULL,
	"lifecycle_version" integer NOT NULL,
	"rank" integer NOT NULL,
	"duration_ms" numeric(18, 3),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"memory_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"client_run_id" text NOT NULL,
	"envelope_version" integer NOT NULL,
	"envelope_checksum" text NOT NULL,
	"source" "run_source" NOT NULL,
	"data_profile" "data_profile" NOT NULL,
	"warden_version" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"outcome" "run_outcome" NOT NULL,
	"trace_id" text,
	"head_sha" text,
	"event" text,
	"pull_request" jsonb,
	"memory_enabled" boolean NOT NULL,
	"finding_count" integer NOT NULL,
	"high_count" integer NOT NULL,
	"medium_count" integer NOT NULL,
	"low_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "runs_finding_counts_nonnegative" CHECK ("runs"."finding_count" >= 0 AND "runs"."high_count" >= 0 AND "runs"."medium_count" >= 0 AND "runs"."low_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "service_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"token_hash" text NOT NULL,
	"roles" "service_role"[] NOT NULL,
	"repository_allowlist" text[],
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"client_execution_id" text NOT NULL,
	"skill" text NOT NULL,
	"skill_digest" text,
	"trigger_id" text,
	"trigger_name" text,
	"model" text,
	"runtime" text,
	"status" "execution_status" NOT NULL,
	"error_code" text,
	"duration_ms" numeric(18, 3),
	"finding_count" integer NOT NULL,
	"high_count" integer NOT NULL,
	"medium_count" integer NOT NULL,
	"low_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"metrics_retention_days" integer DEFAULT 365 NOT NULL,
	"findings_retention_days" integer DEFAULT 90 NOT NULL,
	"code_retention_days" integer DEFAULT 30 NOT NULL,
	"lifecycle_retention_days" integer DEFAULT 365 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_retention_positive" CHECK ("tenants"."metrics_retention_days" > 0 AND "tenants"."findings_retention_days" > 0 AND "tenants"."code_retention_days" > 0 AND "tenants"."lifecycle_retention_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "usage_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"skill_execution_id" uuid,
	"lane" text NOT NULL,
	"operation" text,
	"provider" text,
	"model" text,
	"runtime" text,
	"input_tokens" bigint,
	"output_tokens" bigint,
	"cache_read_input_tokens" bigint,
	"cache_creation_input_tokens" bigint,
	"cache_creation_5m_input_tokens" bigint,
	"cache_creation_1h_input_tokens" bigint,
	"web_search_requests" integer,
	"cost_usd" numeric(20, 10),
	"cost_basis" "cost_basis" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "finding_locations" ADD CONSTRAINT "finding_locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_locations" ADD CONSTRAINT "finding_locations_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_observations" ADD CONSTRAINT "finding_observations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_observations" ADD CONSTRAINT "finding_observations_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_observations" ADD CONSTRAINT "finding_observations_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_observations" ADD CONSTRAINT "finding_observations_skill_execution_id_skill_executions_id_fk" FOREIGN KEY ("skill_execution_id") REFERENCES "public"."skill_executions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_skill_execution_id_skill_executions_id_fk" FOREIGN KEY ("skill_execution_id") REFERENCES "public"."skill_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_attempts" ADD CONSTRAINT "job_attempts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_attempts" ADD CONSTRAINT "job_attempts_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_embeddings" ADD CONSTRAINT "memory_embeddings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_embeddings" ADD CONSTRAINT "memory_embeddings_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_evidence" ADD CONSTRAINT "memory_evidence_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_evidence" ADD CONSTRAINT "memory_evidence_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_evidence" ADD CONSTRAINT "memory_evidence_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_evidence" ADD CONSTRAINT "memory_evidence_observation_id_finding_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."finding_observations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_feedback" ADD CONSTRAINT "memory_feedback_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_feedback" ADD CONSTRAINT "memory_feedback_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_feedback" ADD CONSTRAINT "memory_feedback_actor_token_id_service_tokens_id_fk" FOREIGN KEY ("actor_token_id") REFERENCES "public"."service_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_lifecycle_events" ADD CONSTRAINT "memory_lifecycle_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_lifecycle_events" ADD CONSTRAINT "memory_lifecycle_events_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_lifecycle_events" ADD CONSTRAINT "memory_lifecycle_events_actor_token_id_service_tokens_id_fk" FOREIGN KEY ("actor_token_id") REFERENCES "public"."service_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_recall_batches" ADD CONSTRAINT "memory_recall_batches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_recall_batches" ADD CONSTRAINT "memory_recall_batches_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_recall_batches" ADD CONSTRAINT "memory_recall_batches_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_recalls" ADD CONSTRAINT "memory_recalls_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_recalls" ADD CONSTRAINT "memory_recalls_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_recalls" ADD CONSTRAINT "memory_recalls_batch_id_memory_recall_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."memory_recall_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_recalls" ADD CONSTRAINT "memory_recalls_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_recalls" ADD CONSTRAINT "memory_recalls_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tokens" ADD CONSTRAINT "service_tokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_executions" ADD CONSTRAINT "skill_executions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_executions" ADD CONSTRAINT "skill_executions_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_line_items" ADD CONSTRAINT "usage_line_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_line_items" ADD CONSTRAINT "usage_line_items_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_line_items" ADD CONSTRAINT "usage_line_items_skill_execution_id_skill_executions_id_fk" FOREIGN KEY ("skill_execution_id") REFERENCES "public"."skill_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "finding_locations_finding_ordinal_unique" ON "finding_locations" USING btree ("finding_id","ordinal");--> statement-breakpoint
CREATE INDEX "finding_locations_tenant_finding_idx" ON "finding_locations" USING btree ("tenant_id","finding_id");--> statement-breakpoint
CREATE INDEX "finding_observations_tenant_finding_idx" ON "finding_observations" USING btree ("tenant_id","finding_id");--> statement-breakpoint
CREATE UNIQUE INDEX "findings_run_client_unique" ON "findings" USING btree ("run_id","client_finding_id");--> statement-breakpoint
CREATE INDEX "findings_tenant_skill_idx" ON "findings" USING btree ("tenant_id","skill_execution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_attempts_job_attempt_unique" ON "job_attempts" USING btree ("job_id","attempt");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_tenant_idempotency_unique" ON "jobs" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "jobs_claim_idx" ON "jobs" USING btree ("state","next_attempt_at","lease_expires_at");--> statement-breakpoint
CREATE INDEX "jobs_tenant_repository_idx" ON "jobs" USING btree ("tenant_id","repository_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memories_tenant_idempotency_unique" ON "memories" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "memories_recall_idx" ON "memories" USING btree ("tenant_id","repository_id","lifecycle","expires_at");--> statement-breakpoint
CREATE INDEX "memories_search_idx" ON "memories" USING gin (to_tsvector('simple', "search_document"));--> statement-breakpoint
CREATE INDEX "memory_embeddings_tenant_idx" ON "memory_embeddings" USING btree ("tenant_id","memory_id");--> statement-breakpoint
CREATE INDEX "memory_evidence_tenant_idx" ON "memory_evidence" USING btree ("tenant_id","memory_id");--> statement-breakpoint
CREATE INDEX "memory_feedback_tenant_memory_idx" ON "memory_feedback" USING btree ("tenant_id","memory_id","created_at");--> statement-breakpoint
CREATE INDEX "memory_lifecycle_events_tenant_idx" ON "memory_lifecycle_events" USING btree ("tenant_id","memory_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memory_recall_batches_tenant_client_unique" ON "memory_recall_batches" USING btree ("tenant_id","client_recall_id");--> statement-breakpoint
CREATE INDEX "memory_recall_batches_tenant_repository_idx" ON "memory_recall_batches" USING btree ("tenant_id","repository_id","created_at");--> statement-breakpoint
CREATE INDEX "memory_recalls_tenant_repository_idx" ON "memory_recalls" USING btree ("tenant_id","repository_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "memory_recalls_batch_memory_unique" ON "memory_recalls" USING btree ("batch_id","memory_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repositories_tenant_identity_unique" ON "repositories" USING btree ("tenant_id","provider","owner","name");--> statement-breakpoint
CREATE INDEX "repositories_tenant_full_name_idx" ON "repositories" USING btree ("tenant_id","full_name");--> statement-breakpoint
CREATE UNIQUE INDEX "runs_tenant_client_run_unique" ON "runs" USING btree ("tenant_id","client_run_id");--> statement-breakpoint
CREATE INDEX "runs_tenant_completed_idx" ON "runs" USING btree ("tenant_id","completed_at");--> statement-breakpoint
CREATE INDEX "runs_tenant_repository_completed_idx" ON "runs" USING btree ("tenant_id","repository_id","completed_at");--> statement-breakpoint
CREATE INDEX "runs_tenant_outcome_completed_idx" ON "runs" USING btree ("tenant_id","outcome","completed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "service_tokens_prefix_unique" ON "service_tokens" USING btree ("prefix");--> statement-breakpoint
CREATE UNIQUE INDEX "service_tokens_hash_unique" ON "service_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "service_tokens_tenant_idx" ON "service_tokens" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_executions_run_client_unique" ON "skill_executions" USING btree ("run_id","client_execution_id");--> statement-breakpoint
CREATE INDEX "skill_executions_tenant_skill_idx" ON "skill_executions" USING btree ("tenant_id","skill");--> statement-breakpoint
CREATE INDEX "skill_executions_tenant_error_idx" ON "skill_executions" USING btree ("tenant_id","error_code");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_unique" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "usage_tenant_run_idx" ON "usage_line_items" USING btree ("tenant_id","run_id");--> statement-breakpoint
CREATE INDEX "usage_tenant_dimensions_idx" ON "usage_line_items" USING btree ("tenant_id","lane","model","runtime","provider");