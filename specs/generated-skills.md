# Generated Skills

Warden can build one repo-local skill from a prompt-backed definition. The builder is an authoring harness, not a fixed skill-template generator.

## Desired Outcome

Generated skills should be rich runtime skills with enough depth for a later Warden run to make good decisions from changed hunks.

Good generated skills usually have:

- clear runtime trigger language and scope
- topic coverage broken into useful semantic areas
- concrete evidence requirements, not only API or issue catalogs
- false-positive controls and safe counterexamples
- remediation guidance that points toward an actual patch
- source provenance or explicit gaps when the skill claims broad expertise
- segmentation that makes the skill usable without loading irrelevant material

Many broad skills will naturally become reference-backed, often with roughly one focused reference per major topic and sometimes multiple references for a large topic. That is an expected outcome, not a required layout. Smaller skills may stay mostly inline. Some topics may share a reference. Some topics may not need a separate file at all. The authoring provider owns that choice.

## Builder Contract

Warden supplies the authoring context and acceptance bar. The authoring provider, normally `skill-writer`, owns the artifact layout and authoring method.

Warden provides:

- the generated skill goal from `warden.yaml`
- the internal outline as planning context
- semantic topics that need coverage
- ordered authoring tasks or work lanes
- runtime constraints for Warden skills
- source-depth expectations and known source gaps
- a qualitative review rubric
- minimal mechanical validation for runnability

Warden does not prescribe:

- reference filenames
- folder conventions
- one topic per file
- one task per file
- route table shape beyond local runtime dependencies being usable
- `skill-writer` internals copied into Warden prompts

The wrapper prompt should say, in effect:

> Use skill-writer as the authoring method. Warden provides the goal, coverage topics, ordered tasks, source expectations, runtime constraints, and qualitative rubric. Choose the simplest artifact layout that satisfies skill-writer and the rubric.

## Topics And Tasks

The planner should separate coverage from execution.

`topics` are semantic coverage areas the final skill must handle. A topic describes what needs to be covered and how deep that coverage must be:

- coverage goal
- required evidence
- false-positive controls
- remediation expectations
- source requirements or gaps

`tasks` are ordered authoring work items. A task tells the writer what to deepen:

- objective
- topic ids covered by the task
- source work to perform
- non-overlap boundaries
- done criteria

A task may cover one topic, part of a topic, or multiple topics. A topic may be handled inline, in one reference, in several references, in a shared reference, or in another valid skill-writer layout. Tracks/tasks are not filesystem taxonomy.

## Artifact Layout

Generated skills live under `.warden/skills/<name>/`.

```text
.warden/skills/<name>/
├── warden.yaml
├── build-state.json
└── <generated files chosen by the authoring provider>
```

`warden.yaml` is the stable authored definition.

- `kind: generated-skill`
- `name`
- `prompt`

All other files are generated artifacts. The authoring provider decides whether the skill is inline, reference-backed, script-backed, or uses another valid Agent Skills layout.

`build-state.json` is machine-owned continuity state. It stores cache identity, the internal outline, the authoring provider identity, generated file manifest, validation results, and usage metadata.

## Build Flow

`warden build <name>`:

1. Reads or creates `.warden/skills/<name>/warden.yaml`
2. Synthesizes internal Warden context for the build
3. Resolves an authoring provider, defaulting to the vendored `src/internal-skills/skill-writer`
4. Plans the authoring run: brief, topics, ordered tasks, source plan, and review rubric
5. Runs implementation through the authoring provider
6. Runs qualitative review against skill-writer and Warden's acceptance bar
7. Runs one bounded revision pass for concrete review failures
8. Writes the returned generated file map only after final review and mechanical validation pass
9. Stores provider/version/hash and validation metadata in build state

The internal outline is Warden context only. It is not a runnable skill and it does not prescribe the final artifact layout. It should help the planner identify topics, work lanes, source expectations, and non-overlap boundaries.

## Authoring Provider

The builder passes the full authoring skill directory to the agent and tells it to start from that skill's `SKILL.md`. Warden does not select individual authoring references by hand. By default, the provider is Warden's packaged internal skill. Set `WARDEN_SKILL_AUTHORING_ROOT` only when deliberately testing or swapping the internal provider.

The vendored provider is internal runtime data, not an installable bundled skill, and Warden does not discover `skill-writer` from user skill directories. User-facing bundled skills stay under `skills/`.

The provider returns a file map:

```json
{
  "version": 1,
  "name": "wrdn-example",
  "files": [
    {"path": "SKILL.md", "content": "..."}
  ],
  "summary": "...",
  "validationNotes": [],
  "missingInputs": [],
  "externalSources": []
}
```

Warden owns writing, cache invalidation, runtime constraints, and minimal mechanical validation. The provider owns authoring method, layout choice, source synthesis, and how to package depth into skill artifacts.

## Planner Output

The planner should produce an artifact-agnostic authoring plan. It should avoid file paths unless it is referring to an existing input file that was actually inspected.

Expected planner concepts:

- `authoringBrief`: goal, runtime use, audience, non-goals, and depth bar
- `sourcePlan`: known sources, required source classes, and gaps
- `topics`: semantic coverage requirements
- `tasks`: ordered work items that deepen topics
- `reviewRubric`: concrete qualitative checks for completion

The planner should not propose reference filenames or imply that a topic maps to a file. Layout belongs to skill-writer.

## Task Coverage

Tasks are how the builder communicates depth expectations without turning Warden into the artifact editor.

The implementation writer should:

- use skill-writer as the authoring authority
- treat tasks as a coverage checklist inside the single implementation pass
- cover each task's required evidence, false-positive controls, and remediation expectations somewhere useful
- preserve non-overlap boundaries between sibling topics
- record missing source/context when a task cannot be covered honestly
- return one complete file map for the chosen skill-writer layout

Completion is not "this topic name appears." Completion means the generated runtime guidance gives the later Warden run enough evidence, false-positive controls, and remediation direction to make useful findings.

Warden should not run automatic per-task artifact edit passes. The reviewer enforces task coverage qualitatively and gives one bounded revision pass when the generated skill is shallow, incomplete, or inconsistent with skill-writer.

## Runtime Contract

Generated skills are normal Warden skills.

- `warden ... --skill <name>` resolves the generated `SKILL.md`
- `SKILL.md` must provide enough runtime entry guidance for the chosen layout
- local runtime dependencies referenced by generated artifacts must exist
- findings still use normal changed-line anchoring and normal Warden reporting behavior

There is no required filename, track split, parent/child runtime orchestration, or fixed reference tree.

## Validation

Warden runs minimal deterministic validation and an authoring-provider review pass.

Deterministic checks should stay mechanical:

- `SKILL.md` exists
- frontmatter `name` matches the generated skill name
- frontmatter has a non-empty description
- generated files do not overwrite `warden.yaml` or `build-state.json`
- local runtime files referenced by generated artifacts exist

Deterministic validation should not judge taste, depth, segmentation quality, source adequacy, or preferred layout.

The authoring-provider review should judge quality:

- did the artifact follow skill-writer?
- does the skill meet the authoring brief?
- are topics covered in enough depth?
- are broad claims backed by enough source coverage?
- are source gaps recorded instead of hidden?
- is guidance over-broad, catalog-only, or shallow?
- are false-positive controls and remediation patterns concrete?
- is segmentation useful without being forced?

The reviewer should return concrete feedback for one bounded revision pass. If final review still reports unresolved issues, Warden should fail the build and keep the previous artifact on disk.

## Caching

Generated artifact reuse is keyed by:

- `warden.yaml`
- requested build model
- build version
- authoring provider name and content hash
- generated artifact file manifest

`--regenerate` bypasses cached outline and generated artifact reuse.
