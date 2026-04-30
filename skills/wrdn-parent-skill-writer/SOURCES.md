# Wrdn Parent Skill Writer Sources

## Source Inventory

| Source | Trust tier | Confidence | Usage constraints |
|--------|------------|------------|-------------------|
| `skills/wrdn-parent-skill-writer/SKILL.md` | canonical runtime | high | Keep concise; runtime routing only. |
| `skills/wrdn-parent-skill-writer/references/*.md` | bundled runtime references | high | Keep focused by lookup need. |
| Issue `#274` coordinator-mode design | product intent | high | Primary source for coordinated-skill terminology and goals. |
| `src/skills/loader.ts` and tests | implementation | high | Verify discovery and packaging conventions here. |
| `src/cli/commands/init.ts` and tests | implementation | high | Verify bundled-skill installation behavior here. |
| Existing bundled Warden skills | local prior art | high | Use these to mirror Warden's bundled-skill artifact shape. |
| Upstream `getsentry/skills` `skill-writer` skill and references | upstream authoring model | medium | Use as source material, not as an unversioned runtime dependency. |

## Coverage Matrix

| Dimension | Coverage status | Evidence |
|-----------|-----------------|----------|
| Warden bundled skill layout | covered | `references/warden-skill-architecture.md` defines where shipped skills live and how they are packaged. |
| Parent skill contract | covered | `references/parent-skill-contract.md` defines what a broad coordinated parent skill must contain. |
| Parent-skill examples | covered | `references/transformed-examples.md` includes happy-path, robust, and anti-pattern examples. |
| Upstream technique provenance | covered | This skill explicitly adapts upstream `skill-writer` patterns while staying repo-owned. |
| Repo-owned validation tooling | partial | Validation exists via the upstream validator, but no bundled repo-owned validator ships with this skill yet. |

## Decisions

- Separate parent-skill authoring from full child-skill authoring.
- Ship the parent-skill writer in `skills/` so it installs with Warden's bundled skills.
- Keep the parent-skill writer focused on broad direction, coverage, and boundaries, not runtime coordinator code.

## Open Gaps

- Wire coordinator runtime code to consume parent-skill artifacts cleanly.
- Add evals once coordinator mode exists end-to-end.
- Add repo-owned validation tooling if upstream validator drift becomes painful.

## Changelog

- 2026-04-29: Added `wrdn-parent-skill-writer` as a bundled Warden-owned skill for broad parent-skill authoring.
