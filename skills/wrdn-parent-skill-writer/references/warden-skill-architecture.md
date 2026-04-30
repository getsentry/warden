# Warden Skill Architecture

Open this file when choosing where a coordinated parent skill should live or what files it must ship.

## Skill Roots

Use the repository's established split:

- `skills/<name>/`
  - versioned bundled skills that ship with Warden itself
  - installed into `.agents/skills/` by `warden init`
- `.agents/skills/<name>/`
  - repo-local skills that are not part of the shipped Warden package

For coordinated parent skills that Warden itself will ship or depend on, default to `skills/<name>/`.

## Required Artifacts For Bundled Parent Skills

Bundled coordinated parent skills should normally include:

- `SKILL.md`
- `SPEC.md`
- `SOURCES.md`
- `references/` files for concern maps, examples, or lookup rules

Add `scripts/` only when there is a deterministic parent-skill maintenance workflow that cannot be expressed cleanly in prose.

## Parent-Skill Role

The parent skill should provide:

- broad problem framing
- concern boundaries
- coverage dimensions
- evidence expectations
- exclusions
- enough direction that downstream focused skills or coordinator synthesis can stay honest

The parent skill should not provide:

- a generic "review everything" prompt
- a full implementation of every child skill
- runtime caching or orchestration rules that belong in code

## Validation Checklist

- Directory name matches `name` in frontmatter.
- Every referenced bundled file exists.
- The parent skill is broad but still structured.
- Concern boundaries are explicit and reviewable.
