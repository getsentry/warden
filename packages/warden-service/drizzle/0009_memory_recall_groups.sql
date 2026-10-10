ALTER TABLE "memory_recall_batches" ADD COLUMN "parent_recall_id" text;
--> statement-breakpoint
CREATE INDEX "memory_recall_batches_parent_idx" ON "memory_recall_batches" USING btree ("tenant_id","parent_recall_id");
