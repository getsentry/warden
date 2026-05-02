# Generated Skills

Warden can build one repo-local skill from a prompt-backed definition.

## Artifact Layout

Generated skills live under `.warden/skills/<name>/`.

```text
.warden/skills/<name>/
├── warden.yaml
├── SKILL.md
├── SPEC.md
├── SOURCES.md
├── build-state.json
└── references/
    ├── checklist.md
    ├── tracks/
    │   └── injection.md
    └── examples/
        └── xss/
            └── rails.md
```

`warden.yaml` is the stable authored definition.

- `kind: generated-skill`
- `name`
- `prompt`

`SKILL.md`, `SPEC.md`, `SOURCES.md`, and `references/` are generated artifacts.

`build-state.json` is machine-owned continuity state. It stores the internal outline, cache identity, and generated artifact metadata.

## Build Flow

`warden build <name>`:

1. Reads or creates `.warden/skills/<name>/warden.yaml`
2. Synthesizes an internal outline
3. Synthesizes one runnable skill plus routed reference files
4. Writes the generated artifacts back into the same root

The internal outline is planning metadata only. It is not a runnable skill and it is not a separate user-facing artifact.

## Runtime Contract

Generated skills are normal Warden skills.

- `warden ... --skill <name>` resolves the generated `SKILL.md`
- the runtime skill reads `references/checklist.md`
- it opens only the routed reference files listed for the selected checklist tracks
- it executes those tracks sequentially
- it still uses normal changed-line anchoring and normal Warden findings

There is no parent/child orchestration at run time.

## Prompt Shape

The generated skill should behave as a router plus deep reference set:

- `SKILL.md` stays short and directive
- `references/checklist.md` is the compact track index
- focused files under `references/` carry the depth
- paths and subfolders should follow lookup need, not a rigid fixed tree
- `SOURCES.md` stores provenance and build decisions, not runtime guidance

Depth should come from:

- concrete ordered checks
- relevance signals
- evidence requirements
- safe counterpatterns
- false-positive traps
- remediation patterns
- transformed examples

Reference layout rules:

- treat `SKILL.md` as the router
- every routed reference needs a direct open-when reason
- split by lookup need rather than vague buckets
- examples, framework notes, troubleshooting, and procedures may live in separate files when that improves lookup clarity
- long references need `## Contents` or should be split further

Avoid broad prose and avoid fake repo specificity when the prompt is intentionally generic.

## Caching

Outline and generated artifact reuse are keyed by:

- `warden.yaml`
- requested build model
- build version
- generated artifact byte identity

`--regenerate` bypasses cached outline and generated artifact reuse.
