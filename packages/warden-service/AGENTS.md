# Warden Service Instructions

## Database Queries

- Use the Drizzle schema and typed query builder for new or changed runtime queries.
- Use raw SQL only when PostgreSQL behavior cannot be expressed clearly in Drizzle; keep it parameterized and tenant-scoped.
- Keep tracing at the database boundary. Never record query parameter values.

## Database Migrations

- Assume migrations run while the previous production version is still serving traffic.
- Keep every schema and data migration backward-compatible with that version's reads and writes.
- Use expand-and-contract rollouts.
- Remove, rename, retype, or tighten schema only after deployed code no longer depends on the old shape.
- Add required columns with a compatible default or as nullable, backfill separately, then tighten in a later rollout.
