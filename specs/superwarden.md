# Superwarden

Superwarden is Warden's system for broad review skills that synthesize into focused child skills.

## Terms

- Superwarden skill: a broad parent skill stored in `.warden/superwarden/<name>/`.
- Initial prompt: the human-authored prompt in `warden.yaml.initialPrompt`. It is the seed intent, not a regeneration transcript.
- Superwarden plan: the cached JSON plan produced by `warden synth <name>` or `warden synthesize <name>`.
- Task: the user-facing CLI term for one focused unit of Superwarden work.
- Child skill: a focused normal Warden skill generated from one Superwarden plan task and stored as a child of the parent Superwarden skill.
- Coordinator mode: the current config value, `mode = "coordinator"`, used to mark a skill as a Superwarden skill until the public config vocabulary changes.

## Layout

```text
.warden/superwarden/<name>/
├── SKILL.md
├── SPEC.md
├── SOURCES.md
├── warden.yaml
├── plan.json
└── tasks/
    └── <task-id>/
        ├── SKILL.md
        ├── SPEC.md
        └── SOURCES.md
```

Superwarden artifacts are repo-local and intentionally separate from `.agents/skills/` so normal coding harness skill discovery is not disturbed.

## Synthesis

`warden synth [skill]` resolves an existing Superwarden skill or creates one when the skill is missing and an initial prompt is provided interactively or with `--prompt`. `warden synthesize` remains an alias. `--prompt @path/to/file.md` loads the prompt from a file.

Synthesis reads `SKILL.md`, `warden.yaml`, `SPEC.md`, `SOURCES.md`, and markdown files under `references/`. The plan path is stable per Superwarden skill, while the cached contents inside `plan.json` are validated against the current source hash, requested synthesis model, and Superwarden plan version before reuse. The parent plan record stores the Superwarden plan plus synthesis metadata for the parent and child skills.

Superwarden synthesis is a sequence of agent-quality synthesis runs, not a cheap splitter. The parent plan synthesis must:

- preserve the parent skill's intent from the initial prompt, spec, sources, and references
- assess whether the source material is sufficient for safe decomposition
- identify missing repository, technology, deployment, or threat-model context inside the generated task prompts when live inquiry is not available
- produce focused child task definitions with independent deep-analysis instructions
- require repo-local source inspection, data-flow tracing, changed-line anchoring, and concrete evidence
- require online prior art or current public documentation when external framework, runtime, vulnerability, or ecosystem behavior affects the answer
- prohibit sending repository code, secrets, private file paths, or proprietary details to web tools

After the parent plan is generated, each child task gets its own full synthesis run. Child synthesis must inspect relevant local source and public prior art, then write `SKILL.md`, `SPEC.md`, and `SOURCES.md` for that child. The child skill `name` must match the task directory name so normal skill validation works against repo-local task artifacts. The parent plan record stores each child task hash, source hash, generation duration, token usage, cost, response model, turn count, artifact size, and external source count so repeated runs can reuse validated child artifacts without hiding the cost of the original synthesis.

CLI output should show parent synthesis first, then one progress/result row per task synthesis or cache load. Generated tasks should show artifact size, generation duration, token usage, cost, source count, and turn count. Cached tasks should be visually marked as cached without implying a new duration or new token usage.

After a plan is loaded or generated, Warden writes child skills under that parent skill's repo-local `tasks/` directory. The parent Superwarden skill can be run like a normal skill, including when it is only present under `.warden/superwarden/<name>/` and not configured in `warden.toml`:

```bash
warden src/file.ts --skill <name>
```

## Runtime Status

Normal local `warden` runs expand `mode = "coordinator"` Superwarden skills into cached or synthesized child task skills, then execute those child skills through the standard Warden run path. Non-local entry points that do not yet support coordinator execution must fail closed with an entry-point-specific message.

Live user inquiry during synthesis is not part of the current runtime contract. Until the synthesizer has a user-input tool, missing inputs must be represented explicitly in the plan and child skill instructions rather than invented.
