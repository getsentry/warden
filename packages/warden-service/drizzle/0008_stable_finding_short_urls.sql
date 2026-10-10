CREATE TABLE "finding_short_id_counters" (
	"tenant_id" uuid NOT NULL,
	"base_id" text NOT NULL,
	"last_value" bigint NOT NULL,
	CONSTRAINT "finding_short_id_counters_tenant_id_base_id_pk" PRIMARY KEY("tenant_id","base_id")
);
--> statement-breakpoint
ALTER TABLE "findings" ADD COLUMN "short_id" text;--> statement-breakpoint
ALTER TABLE "finding_short_id_counters" ADD CONSTRAINT "finding_short_id_counters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "findings_tenant_short_id_unique" ON "findings" USING btree ("tenant_id","short_id");
--> statement-breakpoint

-- Preserve the current short link on the newest finding, then give older occurrences their own URLs.
WITH identified AS (
  SELECT f.id, f.tenant_id, r.completed_at,
    CASE
      WHEN f.reported_id ~ '^[A-Z0-9]{3}-[A-Z0-9]{3}$' THEN f.reported_id
      WHEN f.client_finding_id ~ '^[A-Z0-9]{3}-[A-Z0-9]{3}$' THEN f.client_finding_id
      ELSE upper(substr(f.id::text, 1, 3) || '-' || substr(f.id::text, 4, 3))
    END AS base_id
  FROM findings f JOIN runs r ON r.id = f.run_id AND r.tenant_id = f.tenant_id
), numbered AS (
  SELECT id, base_id,
    row_number() OVER (PARTITION BY tenant_id, base_id ORDER BY completed_at DESC, id DESC) AS occurrence
  FROM identified
)
UPDATE findings f
SET short_id = CASE WHEN n.occurrence = 1 THEN n.base_id ELSE n.base_id || '-' || n.occurrence END
FROM numbered n WHERE f.id = n.id;
--> statement-breakpoint

-- Keep counters after retention deletes a finding so its old URL cannot point to a new record.
INSERT INTO finding_short_id_counters (tenant_id, base_id, last_value)
SELECT tenant_id, split_part(short_id, '-', 1) || '-' || split_part(short_id, '-', 2),
  max(CASE WHEN split_part(short_id, '-', 3) = '' THEN 1 ELSE split_part(short_id, '-', 3)::bigint END)
FROM findings
GROUP BY tenant_id, split_part(short_id, '-', 1), split_part(short_id, '-', 2);
--> statement-breakpoint

-- A database trigger also covers writes from the previous deployment during rollout.
CREATE FUNCTION warden_assign_finding_short_id() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  base_code text;
  occurrence bigint;
BEGIN
  IF NEW.short_id IS NOT NULL THEN RETURN NEW; END IF;

  base_code := CASE
    WHEN NEW.reported_id ~ '^[A-Z0-9]{3}-[A-Z0-9]{3}$' THEN NEW.reported_id
    WHEN NEW.client_finding_id ~ '^[A-Z0-9]{3}-[A-Z0-9]{3}$' THEN NEW.client_finding_id
    ELSE upper(substr(NEW.id::text, 1, 3) || '-' || substr(NEW.id::text, 4, 3))
  END;
  INSERT INTO finding_short_id_counters AS counters (tenant_id, base_id, last_value)
  VALUES (NEW.tenant_id, base_code, 1)
  ON CONFLICT (tenant_id, base_id) DO UPDATE SET last_value = counters.last_value + 1
  RETURNING last_value INTO occurrence;
  NEW.short_id := CASE WHEN occurrence = 1 THEN base_code ELSE base_code || '-' || occurrence END;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER findings_assign_short_id
BEFORE INSERT ON findings
FOR EACH ROW EXECUTE FUNCTION warden_assign_finding_short_id();
