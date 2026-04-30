# Wrdn Superwarden Skill Writer Specification

## Intent

The `wrdn-parent-skill-writer` skill is the repo-owned authoring skill for broad Superwarden skills in Warden.

It exists to help create the "fat" top-level skill that sets direction, coverage, and boundaries for downstream focused child skills and Superwarden synthesis.

## Scope

In scope:

- Creating or updating broad Superwarden skills under `skills/` or `.warden/superwarden/`.
- Writing Superwarden `SKILL.md`, `SPEC.md`, `SOURCES.md`, `warden.yaml`, and focused references.
- Encoding concern boundaries, coverage dimensions, and evidence expectations for downstream decomposition.
- Applying upstream skill-writer techniques to Warden's Superwarden use case.

Out of scope:

- Writing complete focused child skills end-to-end; use `wrdn-skill-writer`.
- Implementing the Superwarden runtime path in code.
- Designing generic skill-authoring workflows unrelated to Warden.

## Users And Trigger Context

- Primary users: coding agents working on broad Warden review skills and Superwarden design.
- Common user requests: "write the fat parent skill", "make this broad skill decomposable", "create a parent skill", "create a meta skill", "create a Superwarden skill", "add direction and coverage to this top-level Warden skill".
- Should not trigger for: focused child skill creation, normal code changes, or generic prompt writing.

## Runtime Contract

- Required first actions:
  - verify the task is Superwarden skill authoring
  - inspect local prior art and the target skill root
  - load only the references needed for the current decision
- Required outputs:
  - summary, concrete file changes, validation status, open gaps
- Non-negotiable constraints:
  - do not turn the Superwarden skill into a generic catch-all review
  - do not silently author child skills as part of the Superwarden pass
  - do not invent Warden packaging or config behavior
  - make concern boundaries and exclusions explicit
- Expected bundled files loaded at runtime:
  - `references/warden-skill-architecture.md`
  - `references/parent-skill-contract.md`
  - `references/transformed-examples.md`

## Source And Evidence Model

Authoritative sources:

- Issue #274 design intent for Superwarden
- Existing bundled Warden skills in `skills/warden/` and `skills/warden-sweep/`
- Warden skill-loading and packaging code in `src/skills/` and `src/cli/commands/init.ts`
- The upstream `skill-writer` skill and references as authoring methodology

Useful improvement sources:

- positive examples: broad skills that decompose cleanly into focused concern areas
- negative examples: generic broad skills with weak exclusions, vague coverage, or no concern map
- commit logs/changelogs: changes to Superwarden design and bundled-skill packaging
- issue or PR feedback: reports that a broad skill is too vague, too broad, or cannot drive task decomposition
- eval results: future Superwarden authoring and synthesis evals

Data that must not be stored:

- secrets, tokens, or API keys
- sensitive repository content beyond what is required for maintenance
- host-specific absolute paths as durable documentation

## Reference Architecture

- `SKILL.md` contains routing, Superwarden authoring workflow, validation gates, and handoff constraints.
- `SOURCES.md` contains source inventory, coverage, decisions, gaps, and changelog.
- `references/warden-skill-architecture.md` contains Warden-specific skill layout and packaging rules.
- `references/parent-skill-contract.md` contains the contract for a broad Superwarden skill.
- `references/transformed-examples.md` contains good and bad Superwarden patterns.
- `references/evidence/` is unused until repeated failures need durable examples.
- `scripts/` is currently unused.
- `assets/` is currently unused.

## Evaluation

- Lightweight validation:
  - run the skill validator in strict-depth mode
  - verify every referenced bundled file exists
  - verify transformed examples remain concrete and Superwarden-specific
- Deeper evaluation:
  - exercise prompts for creating and refining broad Superwarden skills
  - compare outputs against the anti-patterns and corrected examples
- Holdout examples:
  - preserve only redacted examples when repeated failures justify durable evidence
- Acceptance gates:
  - `SKILL.md` remains concise and router-focused
  - the Superwarden contract is explicit about concern boundaries and exclusions
  - transformed examples remain concrete
  - bundled-skill guidance matches current Warden packaging behavior

## Known Limitations

- The skill helps author Superwarden skills, but the normal Superwarden execution path still needs separate implementation.
- It intentionally stops short of generating full child skills unless explicitly asked.
- There is no repo-owned dedicated validator script yet; maintenance currently relies on the upstream validator or manual review.

## Maintenance Notes

- Update `SKILL.md` when routing, trigger language, or Superwarden workflow changes.
- Update `SOURCES.md` when the source inventory, decisions, or gaps change.
- Update `references/parent-skill-contract.md` whenever Warden's Superwarden expectations change.
- Update `references/transformed-examples.md` when repeated good or bad Superwarden patterns emerge.
- Add `references/evidence/` only when durable redacted examples will materially improve future edits.
