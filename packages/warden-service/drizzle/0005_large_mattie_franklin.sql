DROP INDEX "finding_observations_tenant_finding_idx";--> statement-breakpoint
CREATE INDEX "finding_observations_tenant_finding_observed_idx" ON "finding_observations" USING btree ("tenant_id","finding_id","observed_at","id");--> statement-breakpoint
CREATE INDEX "findings_tenant_run_idx" ON "findings" USING btree ("tenant_id","run_id");--> statement-breakpoint
CREATE INDEX "findings_tenant_severity_idx" ON "findings" USING btree ("tenant_id","severity");--> statement-breakpoint
CREATE INDEX "skill_executions_tenant_run_idx" ON "skill_executions" USING btree ("tenant_id","run_id");