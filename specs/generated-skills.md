# Generated Skills

Warden can build one repo-local skill from a prompt-backed definition. The builder is an authoring harness, not a fixed skill-template generator.

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
4. Runs plan, implementation, and validation passes through that provider
5. Writes the returned generated file map
6. Stores provider/version/hash and validation metadata in build state

The internal outline is Warden context only. It is not a runnable skill and it does not prescribe the final artifact layout.

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

Warden owns writing, cache invalidation, and validation. The provider owns authoring method, layout choice, depth gates, and source synthesis.

## Runtime Contract

Generated skills are normal Warden skills.

- `warden ... --skill <name>` resolves the generated `SKILL.md`
- `SKILL.md` must be a usable runtime router
- `SKILL.md` must define the core review approach: task set, routing cues, and evidence requirements
- every runtime reference must have a direct "when to read" route from `SKILL.md`
- findings still use normal changed-line anchoring and normal Warden reporting behavior

There is no required filename, track split, parent/child runtime orchestration, or fixed reference tree.

## Validation

Warden runs deterministic validation and an authoring-provider validation pass.

Deterministic gates include:

- `SKILL.md` exists
- frontmatter `name` matches the generated skill name
- generated files do not overwrite `warden.yaml` or `build-state.json`
- runtime references are routed from `SKILL.md`
- long references include navigation or are split
- stale provenance language is flagged
- generated-template boilerplate is flagged

The provider validation pass can return a revised file map. Warden writes the revised files only after deterministic errors are resolved.

## Caching

Generated artifact reuse is keyed by:

- `warden.yaml`
- requested build model
- build version
- authoring provider name and content hash
- generated artifact file manifest

`--regenerate` bypasses cached outline and generated artifact reuse.
