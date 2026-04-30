# Superwarden Skill Contract

Open this file when creating or updating a broad Superwarden skill.

## Goal

A Superwarden skill is the "fat" higher-level skill that gives the right direction and context to downstream focused child skills or future Superwarden decomposition.

It should be broad enough to define the domain, but structured enough that the concern areas are explicit.

## Required Superwarden Qualities

The Superwarden skill must define:

- what broad domain it owns
- which concern areas must be covered
- what evidence standards apply
- what is explicitly out of scope
- how downstream work should avoid collapsing into generic review

## Artifact Expectations

Repo-local Superwarden skills live under `.warden/superwarden/<name>/`. Bundled authoring helpers may still live under `skills/`, but generated Superwarden artifacts must not be written to `.agents/skills/`.

### `SKILL.md`

Must contain:

- clear broad-skill trigger language
- concise runtime router
- direction on what concerns matter
- references to deeper bundled files by lookup need

### `SPEC.md`

Must contain:

- the intended coverage dimensions
- expected downstream consumers
- evidence and evaluation expectations
- known limitations
- maintenance rules

### `SOURCES.md`

Must contain:

- source inventory
- coverage matrix
- decisions
- open gaps

## Concern Mapping Rules

Good concern mapping:

- splits by review concern, not file or severity
- gives each concern a one-sentence explanation
- makes exclusions explicit
- tells downstream work what verification is expected

Bad concern mapping:

- "security"
- "review everything"
- "bugs"
- many tiny pseudo-concerns that do not describe real boundaries

## Handoff Rules

The Superwarden skill should hand off cleanly to focused skill authoring by making these visible:

- concern name
- scope boundary
- evidence expectations
- out-of-scope exclusions

If those are missing, the Superwarden skill is not ready.
