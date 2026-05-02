# Wrdn Skill Writer Specification

## Intent

The `wrdn-skill-writer` skill is the repo-owned full-skill authoring skill for Warden itself.

It exists so Warden can depend on a versioned local skill for bundled skill maintenance, instead of depending on host-global dotagents state.

## Scope

In scope:

- Creating or updating Warden-bundled skills under `skills/`.
- Creating or updating `SKILL.md`, `SPEC.md`, `SOURCES.md`, and focused bundled references for Warden skills.
- Completing a focused Warden skill so it is ready to ship and be installed by Warden.
- Applying skill-writer-style depth gates and transformed examples within Warden's local conventions.

Out of scope:

- Generic prompt optimization unrelated to Warden skills.
- General code review or product documentation work.
- Replacing the upstream `skill-writer` project as a general-purpose skill framework.

## Users And Trigger Context

- Primary users: coding agents working in the Warden repository on focused Warden skills.
- Common user requests: "create a Warden skill", "update this bundled skill", "write SPEC.md for this skill", "adapt skill-writer techniques for Warden".
- Should not trigger for: normal feature work, generic documentation edits, or skill authoring outside Warden-specific conventions.

## Runtime Contract

- Required first actions:
  - classify the request as full-skill authoring or review-only guidance
  - inspect the target skill root and local prior art
  - load only the reference needed for the current decision
- Required outputs:
  - summary, concrete file changes, validation status, open gaps
- Non-negotiable constraints:
  - do not rely on host-global skills as the sole source of truth
  - do not invent Warden config, discovery, or packaging fields
  - do not expand a skill's scope accidentally while editing
  - keep transformed examples available for future maintenance
- Expected bundled files loaded at runtime:
  - `references/warden-skill-architecture.md`
  - `references/full-skill-contract.md`
  - `references/transformed-examples.md`

## Source And Evidence Model

Authoritative sources:

- Warden skill-loading, config, and bundled-skill installation code in `src/skills/`, `src/config/`, and `src/cli/commands/init.ts`
- Existing bundled skills in `skills/warden/` and `skills/warden-sweep/`
- The upstream `skill-writer` skill from `getsentry/skills`, including its `SKILL.md`, `SPEC.md`, `SOURCES.md`, and reference set

Useful improvement sources:

- positive examples: successful bundled skill additions and focused Warden skill refreshes
- negative examples: vague trigger language, stale Warden schema references, or missing maintenance artifacts
- commit logs/changelogs: changes to bundled skills, skill loading, config schema, and generated-skill implementation
- issue or PR feedback: reports that a bundled skill drifted, over-triggered, or missed important local conventions
- eval results: future skill-authoring eval scenarios

Data that must not be stored:

- secrets, tokens, or API keys
- sensitive repository content beyond what is required to maintain the skill
- host-specific absolute paths as durable documentation

## Reference Architecture

- `SKILL.md` contains routing, task-shape selection, validation gates, and output rules.
- `SOURCES.md` contains source inventory, coverage, decisions, gaps, and changelog.
- `references/warden-skill-architecture.md` contains Warden-specific skill layout and packaging rules.
- `references/full-skill-contract.md` contains the artifact and quality contract for a complete Warden skill.
- `references/transformed-examples.md` contains happy-path, robust, and anti-pattern examples.
- `references/evidence/` is unused until repeated skill-authoring failures need durable examples.
- `scripts/` is currently unused.
- `assets/` is currently unused.

## Evaluation

- Lightweight validation:
  - run the skill validator in strict-depth mode
  - verify every referenced bundled file exists
  - verify transformed examples match the documented artifact contract
- Deeper evaluation:
  - exercise authoring prompts against realistic Warden skill requests
  - compare outputs against the documented anti-patterns and corrections
- Holdout examples:
  - preserve only redacted examples when repeated failures justify durable evidence
- Acceptance gates:
  - `SKILL.md` remains concise and router-focused
  - transformed examples remain present and concrete
  - bundled-skill guidance matches current Warden packaging behavior

## Known Limitations

- It intentionally narrows the upstream `skill-writer` scope to Warden-specific needs, so it is not a drop-in replacement for generic skill authoring.
- There is no repo-owned dedicated validator script yet; maintenance currently relies on the upstream validator or manual review.

## Maintenance Notes

- Update `SKILL.md` when routing or trigger language changes.
- Update `SOURCES.md` when the source inventory, decisions, or gaps change.
- Update `references/full-skill-contract.md` whenever Warden's skill artifact expectations change.
- Update `references/transformed-examples.md` when repeated good or bad patterns emerge.
- Add `references/evidence/` only when durable redacted examples will materially improve future edits.
