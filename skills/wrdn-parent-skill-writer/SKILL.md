---
name: wrdn-parent-skill-writer
description: Create or update broad parent Warden skills. Use when asked to write a fat top-level skill, parent skill, meta skill, or a broad Warden skill that should guide decomposition into focused child review skills.
---

Create or update broad Warden parent skills.

## References

Read the relevant reference when the task requires deeper detail:

| Document | Read When |
|----------|-----------|
| `references/warden-skill-architecture.md` | Choosing the skill root, bundled files, or Warden-specific packaging conventions |
| `references/parent-skill-contract.md` | Deciding what a broad parent skill must contain |
| `references/transformed-examples.md` | Checking concrete parent-skill patterns, anti-patterns, or handoff shape |

## Workflow

1. Confirm this is a broad parent-skill task, not a focused full-skill task.
2. Read `references/warden-skill-architecture.md`.
3. Read `references/parent-skill-contract.md`.
4. Inspect the target skill root and nearby Warden prior art before editing.
5. Use these file roles consistently:
   - `SKILL.md`: top-level router and high-level runtime direction
   - `SPEC.md`: maintenance contract and coverage dimensions
   - `SOURCES.md`: provenance, decisions, coverage, and gaps
   - `references/`: focused lookup modules only
6. Encode the parent skill so it gives downstream child skills and coordinator synthesis the right direction:
   - broad intent
   - concern boundaries
   - required coverage dimensions
   - evidence expectations
   - out-of-scope exclusions
   - aggregation and failure posture when relevant
7. Do not write full focused child skills unless explicitly asked. Hand off that work to `wrdn-skill-writer`.
8. Validate before finishing:
   - referenced files exist
   - directory name matches `name`
   - the parent skill is broad but still reviewable
   - the concern map is explicit enough to drive downstream decomposition

## Output Rules

- Return:
  1. `Summary`
  2. `Changes Made`
  3. `Validation Results`
  4. `Open Gaps`
- Do not collapse the parent skill into generic "review everything" language.
- Do not expand into fully authored child skills unless the request explicitly asks for that second step.
