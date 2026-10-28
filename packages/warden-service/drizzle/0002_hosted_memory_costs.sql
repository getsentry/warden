ALTER TABLE "memories" ADD COLUMN "extraction_provider" text;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "extraction_runtime" text;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "extraction_input_tokens" bigint;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "extraction_output_tokens" bigint;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "extraction_cost_basis" "cost_basis";--> statement-breakpoint
ALTER TABLE "memory_embeddings" ADD COLUMN "input_tokens" bigint;--> statement-breakpoint
ALTER TABLE "memory_embeddings" ADD COLUMN "cost_usd" numeric(20, 10);--> statement-breakpoint
ALTER TABLE "memory_embeddings" ADD COLUMN "cost_basis" "cost_basis";