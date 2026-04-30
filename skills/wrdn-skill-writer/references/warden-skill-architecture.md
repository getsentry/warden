# Warden Skill Architecture

Open this file when choosing where a Warden skill should live or what files it must ship.

## Skill Roots

Use the repository's established split:

- `skills/<name>/`
  - versioned bundled skills that ship with Warden itself
  - installed into `.agents/skills/` by `warden init`
- `.agents/skills/<name>/`
  - repo-local skills that are not part of the shipped Warden package

For `wrdn-skill-writer`, default to `skills/<name>/` when the skill is intended to ship with Warden or support Warden-native runtime behavior.

## Required Artifacts For Bundled Skills

Bundled Warden skills should normally include:

- `SKILL.md`
- `SPEC.md`
- `SOURCES.md`
- `references/` only when there is a clear lookup need

Add `scripts/` only when the same deterministic logic would otherwise be re-authored repeatedly.

## File Roles

- `SKILL.md`
  - runtime router
  - trigger language
  - required workflow
  - output contract
- `SPEC.md`
  - maintenance contract
  - scope, evidence model, limitations, evaluation gates
- `SOURCES.md`
  - provenance
  - coverage
  - decisions
  - open gaps
- `references/*.md`
  - focused lookup modules, not a second orchestrator

## Warden-Specific Constraints

- Do not invent config fields. Check local schema and code first.
- Do not hardcode host-specific absolute paths in skill docs.
- Keep bundled references local to the skill root whenever practical.
- Use nearby bundled skills as the style baseline before inventing a new artifact pattern.

## Validation Checklist

- Directory name matches `name` in frontmatter.
- Every referenced bundled file exists.
- The artifact set is justified; no spare docs.
- The skill can be reviewed locally without depending on host-global dotagents state.
