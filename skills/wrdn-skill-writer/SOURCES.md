# Wrdn Skill Writer Sources

## Source Inventory

| Source | Trust tier | Confidence | Usage constraints |
|--------|------------|------------|-------------------|
| `skills/wrdn-skill-writer/SKILL.md` | canonical runtime | high | Keep concise; runtime routing only. |
| `skills/wrdn-skill-writer/references/*.md` | bundled runtime references | high | Keep focused by lookup need. |
| `src/skills/loader.ts` and tests | implementation | high | Verify discovery and local-skill conventions here. |
| `src/cli/commands/init.ts` and tests | implementation | high | Verify bundled-skill installation behavior here. |
| `src/config/schema.ts` | implementation | high | Verify Warden skill config claims here. |
| `skills/warden/*` and `skills/warden-sweep/*` | local prior art | high | Use these to mirror Warden's bundled-skill artifact shape. |
| Upstream `getsentry/skills` `skill-writer` skill and references | upstream authoring model | medium | Use as source material, not as an unversioned runtime dependency. |

## Coverage Matrix

| Dimension | Coverage status | Evidence |
|-----------|-----------------|----------|
| Warden bundled skill layout | covered | `references/warden-skill-architecture.md` defines where shipped skills live and how they are packaged. |
| Maintenance artifact roles | covered | `SKILL.md`, `SPEC.md`, and `SOURCES.md` responsibilities are explicit in `SKILL.md` and `SPEC.md`. |
| Full skill artifact contract | covered | `references/full-skill-contract.md` defines the required artifacts and rejection conditions for a complete Warden skill. |
| Transformed examples | covered | `references/transformed-examples.md` includes happy-path, robust, and anti-pattern examples. |
| Upstream technique provenance | covered | This skill explicitly adapts upstream `skill-writer` patterns while staying repo-owned. |
| Repo-owned validation tooling | partial | Validation exists via the upstream validator, but no bundled repo-owned validator ships with this skill yet. |

## Decisions

- Ship a Warden-owned wrapper skill instead of depending on a gitignored dotagents install at runtime.
- Keep the skill in `skills/` so bundled-skill installation picks it up automatically.
- Keep the wrapper narrow and Warden-specific instead of forking the full upstream `skill-writer` behavior.
## Open Gaps

- Add repo-owned full-skill examples that reflect generated-skill reference layouts once those stabilize.
- Add repo-owned validation tooling if upstream validator drift becomes painful.
- Add skill-authoring eval cases once the runtime path exists.

## Changelog

- 2026-04-29: Added `wrdn-skill-writer` as a bundled Warden-owned skill for focused Warden skill authoring.
