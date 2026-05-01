# Synthesized Skills

Warden can synthesize one repo-local skill from a prompt-backed definition.

## Artifact Layout

Generated skills live under `.warden/skills/<name>/`.

```text
.warden/skills/<name>/
├── warden.yaml
├── SKILL.md
├── SPEC.md
├── SOURCES.md
├── synthesis.json
└── references/
    ├── checklist.md
    └── tracks/
        └── <track-id>.md
```

`warden.yaml` is the stable authored definition.

- `kind: synthesized-skill`
- `name`
- `prompt`

`SKILL.md`, `SPEC.md`, `SOURCES.md`, and `references/` are generated artifacts.

`synthesis.json` is machine-owned continuity state. It stores the internal outline, cache identity, and generated artifact metadata.

## Synthesis Flow

`warden synth <name>`:

1. Reads or creates `.warden/skills/<name>/warden.yaml`
2. Synthesizes an internal outline
3. Synthesizes one runnable skill plus checklist references
4. Writes the generated artifacts back into the same root

The internal outline is planning metadata only. It is not a runnable skill and it is not a separate user-facing artifact.

## Runtime Contract

Generated skills are normal Warden skills.

- `warden ... --skill <name>` resolves the generated `SKILL.md`
- the runtime skill reads `references/checklist.md`
- it opens only the relevant `references/tracks/<track-id>.md` modules for the current file and hunk
- it executes those tracks sequentially
- it still uses normal changed-line anchoring and normal Warden findings

There is no parent/child orchestration at run time.

## Prompt Shape

The generated skill should behave as a router plus deep reference set:

- `SKILL.md` stays short and directive
- `references/checklist.md` is the compact track index
- `references/tracks/<track-id>.md` carries the depth

Depth should come from:

- concrete ordered checks
- relevance signals
- evidence requirements
- safe counterpatterns
- false-positive traps
- remediation patterns
- transformed examples

Avoid broad prose and avoid fake repo specificity when the prompt is intentionally generic.

## Caching

Outline and generated artifact reuse are keyed by:

- `warden.yaml`
- requested synthesis model
- synthesis version
- generated artifact byte identity

`--regenerate` bypasses cached outline and generated artifact reuse.
