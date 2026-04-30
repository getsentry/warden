# Warden Skill Architecture

Open this file when choosing where a Superwarden skill should live or what files it must ship.

## Skill Roots

Use the repository's established split:

- `skills/<name>/`
  - versioned bundled skills that ship with Warden itself
  - installed into `.agents/skills/` by `warden init`
- `.agents/skills/<name>/`
  - repo-local skills that are not part of the shipped Warden package
- `.warden/superwarden/<name>/`
  - repo-local Superwarden skills
  - synthesized plans and child skills stay under this tree
  - do not install generated Superwarden child skills into `.agents/skills/`

For repo-local Superwarden skills, default to `.warden/superwarden/<name>/`.

For bundled authoring helpers that Warden itself will ship, default to `skills/<name>/`.

## Required Artifacts For Superwarden Skills

Superwarden skills should normally include:

- `SKILL.md`
- `SPEC.md`
- `SOURCES.md`
- `warden.yaml`
- `references/` files for concern maps, examples, or lookup rules

Add `scripts/` only when there is a deterministic Superwarden maintenance workflow that cannot be expressed cleanly in prose.

## Superwarden Skill Role

The Superwarden skill should provide:

- broad problem framing
- concern boundaries
- coverage dimensions
- evidence expectations
- exclusions
- enough direction that downstream focused child skills or Superwarden synthesis can stay honest

The Superwarden skill should not provide:

- a generic "review everything" prompt
- a full implementation of every child skill
- runtime caching or orchestration rules that belong in code or `specs/superwarden.md`

## Validation Checklist

- Directory name matches `name` in frontmatter.
- Every referenced bundled file exists.
- The Superwarden skill is broad but still structured.
- Concern boundaries are explicit and reviewable.
