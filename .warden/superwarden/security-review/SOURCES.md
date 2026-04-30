# security-review Superwarden Sources

## Source Inventory

| Source | Trust tier | Confidence | Contribution | Usage constraints |
| --- | --- | --- | --- | --- |
| `warden.yaml` | canonical | high | Initial prompt, source files, outputs, and coverage metadata. | Do not store secrets or private source excerpts. |
| `SKILL.md` | canonical | high | Human-readable Superwarden parent prompt. | Keep concise and runtime-focused. |
| `SPEC.md` | canonical | high | Scope, terminology, runtime contract, and reporting contract. | Keep maintenance-focused. |
| `specs/superwarden.md` | canonical | medium | Repository-level definition of Superwarden concepts and layout. | Keep aligned with implementation as the feature evolves. |
| `skill-writer` guidance | canonical | high | Skill structure, strict depth checks, source coverage, and security-review synthesis expectations. | Use as generator guidance, not as runtime dependency for generated child skills. |

## Decisions

- Use "Superwarden skill" for the broad parent artifact.
- Use "Superwarden plan" for the cached JSON decomposition.
- Use "task" in CLI output for each focused child skill execution.
- Keep all generated artifacts under `.warden/superwarden/security-review/cache/`.
- Keep `.agents/skills/` untouched so normal coding harness flows are not affected.
- Require child skills to perform independent repo-local investigation and use public prior art only when it affects correctness.
- Generate each child skill through its own synthesis run so duration, usage, cost, artifact size, and source count describe generation work instead of filesystem writes.
- Store child synthesis metadata in the parent cache JSON so matching cached child skills can be reused without adding extra files to runnable child skill directories.
- Represent missing synthesis inputs in generated task instructions until Superwarden has a dedicated user-inquiry tool.
- Keep child `SKILL.md` files concise and move source inventory, coverage, and maintenance detail to `SPEC.md` and `SOURCES.md`.
- Preserve normal Warden findings behavior instead of asking child skills to invent a custom JSON schema.

## Coverage Matrix

| Dimension | Coverage status | Evidence |
| --- | --- | --- |
| Parent intent preservation | complete | `warden.yaml`, `SKILL.md`, `SPEC.md`, and `SOURCES.md` are included in the source hash. |
| Warden security surfaces | complete | Parent prompt covers runtime, CLI, GitHub Action, config loading, skill loading, SDK execution, output rendering, filesystem behavior, and prompt injection. |
| Task decomposition | partial | Current cached plan splits authorization, secrets, filesystem/cache, command/process, remote skill/repository input, and prompt injection/LLM behavior, but should preserve GitHub event/workflow handling explicitly on regeneration. |
| Child skill depth | complete | Generator requires each child skill to run an independent synthesis pass with local inspection and public prior-art research. |
| False-positive control | complete | Child prompts require changed-line anchoring, exploitability prerequisites, concrete evidence, and no findings when evidence is insufficient. |
| Runtime isolation | complete | Generated artifacts live under `.warden/superwarden/security-review/cache/`, not `.agents/skills/`. |
| Cache reproducibility | complete | Parent cache metadata stores task/source hashes and child generation telemetry. |
| Missing context handling | partial | Missing inputs are recorded in artifacts until live user inquiry tools exist. |
| API surface | complete | Superwarden exposes synthesis and run behavior through the Warden CLI and library exports. |
| Config/runtime options | complete | `mode = "coordinator"`, model settings, regeneration, and cache paths are part of the runtime contract. |
| Common use cases | complete | Users synthesize plans, generate child skills, inspect plans, and run parent skills against changed files. |
| Known issues/workarounds | complete | Missing live inquiry support is represented through artifact missingInputs and open gaps. |
| Version/migration variance | complete | Cache validity includes coordinator version and source hash checks. |

## Open Gaps

- Add live inquiry support when the Superwarden synthesizer can safely ask users for repository, deployment, or threat-model details.
- Regenerate cached child skills after generator changes so child `SKILL.md`, `SPEC.md`, and `SOURCES.md` artifacts pass current skill-writer validation.

## Changelog

- Added skill-writer validation coverage for the parent Superwarden artifact.
- Tightened generator expectations for child skill names, SPEC structure, source provenance, and normal Warden findings behavior.
