# Warden Service Instructions

## Database Migrations

- Assume migrations run while the previous production version is still serving traffic.
- Keep every schema and data migration backward-compatible with that version's reads and writes.
- Use expand-and-contract rollouts.
- Remove, rename, retype, or tighten schema only after deployed code no longer depends on the old shape.
- Add required columns with a compatible default or as nullable, backfill separately, then tighten in a later rollout.
