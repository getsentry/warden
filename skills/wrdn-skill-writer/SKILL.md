---
name: wrdn-skill-writer
description: Create or update complete Warden skills. Use when asked to create a Warden skill, update a bundled skill under skills/, or write SKILL.md or SPEC.md or SOURCES.md or focused references for a Warden skill.
---

Create or update complete Warden-specific skills.

## References

Read the relevant reference when the task requires deeper detail:

| Document | Read When |
|----------|-----------|
| `references/warden-skill-architecture.md` | Choosing the skill root, bundled files, or Warden-specific authoring conventions |
| `references/full-skill-contract.md` | Deciding what artifacts a complete Warden skill must include |
| `references/transformed-examples.md` | Checking concrete examples, anti-patterns, or expected output shapes |

## Workflow

1. Determine the task shape:
   - full Warden skill creation
   - full Warden skill update
   - review-only guidance on an existing Warden skill
2. Read `references/warden-skill-architecture.md`.
3. Read `references/full-skill-contract.md`.
4. Inspect the target skill root and nearby prior art before editing.
5. Use these file roles consistently:
   - `SKILL.md`: runtime router and task instructions
   - `SPEC.md`: maintenance contract
   - `SOURCES.md`: provenance, coverage, decisions, and gaps
   - `references/`: focused lookup modules only
6. Keep Warden behavior aligned with local source and bundled docs. Do not invent config fields, discovery behavior, or installer behavior.
7. When authoring or materially updating a skill:
   - keep the trigger description concrete and narrow
   - keep `SKILL.md` concise and imperative
   - add or update transformed examples in `references/transformed-examples.md`
8. Validate before finishing:
   - referenced files exist
   - directory name matches `name`
   - Warden-specific claims match local code or bundled references
   - the skill can stand alone as a complete runtime artifact

## Output Rules

- Return:
  1. `Summary`
  2. `Changes Made`
  3. `Validation Results`
  4. `Open Gaps`
- Do not broaden skills to suppress findings. Tighten the instructions honestly or fix the underlying implementation.
