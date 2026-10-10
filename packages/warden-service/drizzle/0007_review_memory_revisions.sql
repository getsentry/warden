CREATE TABLE "review_memory_revisions" (
	"tenant_id" uuid NOT NULL,
	"memory_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_memory_revisions_memory_id_version_pk" PRIMARY KEY("memory_id","version")
);
--> statement-breakpoint
ALTER TABLE "review_memory_revisions" ADD CONSTRAINT "review_memory_revisions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_memory_revisions" ADD CONSTRAINT "review_memory_revisions_memory_id_memories_id_fk" FOREIGN KEY ("memory_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;