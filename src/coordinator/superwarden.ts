import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SkillDefinition } from '../config/schema.js';
import { COORDINATOR_METADATA_FILE } from './plan.js';

export const SUPERWARDEN_DIR = '.warden/superwarden';

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function firstSentence(value: string): string {
  const sentence = value.trim().split(/(?<=[.!?])\s+/)[0] ?? value.trim();
  return sentence.length > 160 ? `${sentence.slice(0, 157)}...` : sentence;
}

function frontmatterValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim().replace(/"/g, '\\"');
}

function hasTriggerPhrase(value: string): boolean {
  return /\b(use when|use for|use to|trigger|invoke)\b/i.test(value);
}

function superwardenDescription(name: string, initialPrompt: string): string {
  const base = firstSentence(initialPrompt) || `Superwarden ${name} skill.`;
  const triggerDescription = hasTriggerPhrase(base)
    ? base
    : `${/[.!?]$/.test(base) ? base : `${base}.`} Use when asked to synthesize, run, or review with the ${name} Superwarden skill.`;
  return triggerDescription.length > 1000
    ? `${triggerDescription.slice(0, 997)}...`
    : triggerDescription;
}

function yamlBlock(value: string, indent = '  '): string {
  return value.split('\n').map((line) => `${indent}${line}`).join('\n');
}

export function getSuperwardenRoot(repoRoot: string): string {
  return join(repoRoot, SUPERWARDEN_DIR);
}

export function getSuperwardenSkillRoot(repoRoot: string, skillName: string): string {
  return join(getSuperwardenRoot(repoRoot), safePathSegment(skillName));
}

export function getSuperwardenCacheDir(repoRoot: string, skillName: string): string {
  return join(getSuperwardenSkillRoot(repoRoot, skillName), 'cache');
}

export function superwardenSkillExists(repoRoot: string, skillName: string): boolean {
  return existsSync(join(getSuperwardenSkillRoot(repoRoot, skillName), 'SKILL.md'));
}

export function createSuperwardenSkill(args: {
  repoRoot: string;
  name: string;
  initialPrompt: string;
}): SkillDefinition {
  const { repoRoot, name, initialPrompt } = args;
  const description = superwardenDescription(name, initialPrompt);
  const rootDir = getSuperwardenSkillRoot(repoRoot, name);
  mkdirSync(rootDir, { recursive: true });

  const skillPath = join(rootDir, 'SKILL.md');
  const specPath = join(rootDir, 'SPEC.md');
  const sourcesPath = join(rootDir, 'SOURCES.md');
  const metadataPath = join(rootDir, COORDINATOR_METADATA_FILE);

  writeFileSync(skillPath, `---
name: ${name}
description: "${frontmatterValue(description)}"
allowed-tools: Read Grep Glob WebFetch WebSearch
---

${initialPrompt.trim()}
`, 'utf-8');

  writeFileSync(metadataPath, `version: 1
kind: superwarden-skill
name: ${name}
mode: coordinator
initialPrompt: |-
${yamlBlock(initialPrompt.trim())}
sourceFiles:
  - ${COORDINATOR_METADATA_FILE}
  - SKILL.md
  - SPEC.md
  - SOURCES.md
outputFiles:
  - SKILL.md
  - SPEC.md
  - SOURCES.md
  - cache/<plan-hash>.json
  - cache/<plan-hash>/skills/<task-id>/SKILL.md
  - cache/<plan-hash>/skills/<task-id>/SPEC.md
  - cache/<plan-hash>/skills/<task-id>/SOURCES.md
instructions:
  - Synthesize the parent plan through a deep Superwarden planning pass, not a shallow category split.
  - Preserve every explicit coverage item from this metadata in at least one task.
  - Generate each child skill through its own deep synthesis run.
  - Generate child skills that pass skill-writer structural validation, including matching task-id names, trigger-rich descriptions, and complete SPEC.md sections.
  - Require each child skill to inspect repo-local source and use public prior art when external behavior affects correctness.
  - Do not send repository code, secrets, private file paths, or proprietary details to web tools.
  - Represent missing repository, technology, deployment, or threat-model context inside task instructions until live inquiry tools exist.
`, 'utf-8');

  writeFileSync(specPath, `# ${name} Superwarden Specification

## Intent

This is a Superwarden skill. A Superwarden skill is a broad parent skill stored under \`.warden/superwarden/<name>\` and synthesized into focused child skills before manual or automated review.

The initial prompt in \`${COORDINATOR_METADATA_FILE}\` is the source of intent. It is not a regeneration log. It is the human-authored starting prompt used to synthesize the Superwarden plan.

## Scope

In scope:

- Behavior described by the initial prompt.
- Superwarden plan synthesis from the parent skill.
- Child skill generation for focused task execution.

Out of scope:

- Issues unrelated to the initial prompt.
- Installing generated child skills into global or normal harness skill directories.
- Replacing Warden's normal finding schema with a custom output contract.

## Users And Trigger Context

- Primary users: Warden maintainers creating, synthesizing, or running broad repo-local Superwarden skills.
- Common user requests: synthesize this Superwarden skill, regenerate child skills, inspect the plan, or run the parent skill through focused task skills.
- Should not trigger for: ordinary direct skills, non-Superwarden skills, or requests that only need a single existing runnable skill.

## Runtime Contract

- Required source files: \`${COORDINATOR_METADATA_FILE}\`, \`SKILL.md\`, \`SPEC.md\`, and \`SOURCES.md\`.
- \`mode = "coordinator"\` is the current config value for Superwarden execution.
- Parent synthesis must act as a deep planning pass, not a shallow category split.
- Synthesis must produce focused child skills that preserve this Superwarden intent.
- Each child skill must be generated by its own deep synthesis run, not by templating the parent plan task.
- Synthesis must identify missing repository, technology, deployment, or threat-model context inside generated tasks when live inquiry is not available.
- Child skills are repo-local artifacts under this skill's \`cache/\` directory, not under \`.agents/skills\`.
- Parent cache metadata must preserve child generation duration, token usage, cost, artifact size, source count, response model, turn count, and task/source hashes.
- Child skills must require repo-local source inspection, relevant public prior art, and concrete changed-line evidence.
- Child skills must prohibit sending repository code, secrets, private file paths, or proprietary details to web tools.

## Source And Evidence Model

Authoritative sources:

- \`${COORDINATOR_METADATA_FILE}\` for the initial prompt and structured Superwarden metadata.
- \`SKILL.md\` for the runtime parent prompt.
- \`SPEC.md\` for the maintenance contract.
- \`SOURCES.md\` for source inventory, decisions, coverage, gaps, and changelog.

Useful improvement sources:

- Generated plan cache records and child skill metadata.
- Warden CLI run output and JSON logs from Superwarden synthesis.
- User feedback on missing task coverage, false positives, and duplicate reports.
- Public security guidance used during parent or child synthesis.

Data that must not be stored:

- Secrets, credentials, customer data, private URLs, or proprietary source excerpts that are not needed for reproducible synthesis.

## Reference Architecture

- \`SKILL.md\` contains the concise parent runtime prompt.
- \`${COORDINATOR_METADATA_FILE}\` contains the initial prompt and generated artifact contract.
- \`SPEC.md\` contains the maintenance contract for the parent Superwarden skill.
- \`SOURCES.md\` contains source provenance, decisions, coverage, gaps, and changelog.
- \`cache/<plan-hash>.json\` contains the validated plan and child synthesis metadata.
- \`cache/<plan-hash>/skills/<task-id>/\` contains runnable child skill artifacts.

## Evaluation

- Lightweight validation: run \`warden synth <name> --show-plan\` and inspect task coverage, missing inputs, and source provenance.
- Structural validation: run the skill-writer quick validator against the parent and generated child skill directories with strict depth enabled.
- Behavioral validation: run \`warden <files> --skill <name>\` and confirm Superwarden expands into child task executions with normal Warden findings.
- Acceptance gates: generated artifacts preserve the initial prompt, avoid duplicate task scopes, pass structural validation, and produce findings only with concrete changed-line evidence.

## Known Limitations

- Superwarden synthesis cannot ask live follow-up questions yet; missing context must be recorded in plan or child skill artifacts.
- Cached child skills remain valid only while task hashes, source hashes, coordinator version, and artifact bytes match.
- Public prior-art research must use public names and concepts only, not repository source or secrets.

## Maintenance Notes

- Update \`SKILL.md\` when the parent runtime prompt or trigger behavior changes.
- Update \`${COORDINATOR_METADATA_FILE}\` when the initial prompt or generated artifact contract changes.
- Update \`SOURCES.md\` when source provenance, coverage, decisions, gaps, or synthesis rationale changes.
- Regenerate cached plans and child skills after changing parent intent, runtime contract, or source files.
`, 'utf-8');

  writeFileSync(sourcesPath, `# ${name} Superwarden Sources

## Source Inventory

| Source | Trust tier | Confidence | Contribution | Usage constraints |
| --- | --- | --- | --- | --- |
| \`${COORDINATOR_METADATA_FILE}\` | canonical | high | Initial prompt and structured metadata. | Do not store secrets or private source excerpts. |
| \`SKILL.md\` | canonical | high | Runtime parent prompt. | Keep concise and portable. |
| \`SPEC.md\` | canonical | high | Parent maintenance contract. | Do not duplicate runtime instructions unnecessarily. |
| \`SOURCES.md\` | canonical | high | Source provenance, decisions, coverage, gaps, and changelog. | Keep generated evidence summarized. |

## Decisions

- Store the initial prompt in \`${COORDINATOR_METADATA_FILE}\` so future synthesis is reproducible and reviewable.
- Keep generated child skills in repo-local Superwarden cache artifacts, not in \`.agents/skills\`.
- Use "Superwarden skill" for the parent artifact and "child skill" for each synthesized focused task.
- Require child skills to perform independent repo-local investigation and use public prior art only when it affects correctness.
- Generate each child skill through its own synthesis run so duration, usage, cost, artifact size, and source count describe generation work instead of filesystem writes.
- Store child synthesis metadata in the parent cache JSON so matching cached child skills can be reused without adding extra files to runnable child skill directories.
- Represent missing synthesis inputs in generated task instructions until Superwarden has a dedicated user-inquiry tool.

## Coverage Matrix

| Dimension | Coverage status | Evidence |
| --- | --- | --- |
| Parent intent preservation | complete | \`${COORDINATOR_METADATA_FILE}\`, \`SKILL.md\`, and \`SPEC.md\` are included in the source hash. |
| Task decomposition | complete | Parent synthesis must produce focused child skills instead of direct execution. |
| Child skill depth | complete | Each child skill is generated by an independent synthesis run with local inspection and public prior-art requirements. |
| Runtime isolation | complete | Generated artifacts live under \`.warden/superwarden/<name>/cache/\`, not \`.agents/skills\`. |
| Cache reproducibility | complete | Parent cache metadata stores task/source hashes and child generation telemetry. |
| Missing context handling | partial | Missing inputs are recorded in artifacts until live user inquiry tools exist. |
| API surface | complete | Superwarden exposes synthesis and run behavior through the Warden CLI and library exports. |
| Config/runtime options | complete | \`mode = "coordinator"\`, model settings, regeneration, and cache paths are part of the runtime contract. |
| Common use cases | complete | Users synthesize plans, generate child skills, inspect plans, and run parent skills against changed files. |
| Known issues/workarounds | complete | Missing live inquiry support is represented through artifact missingInputs and open gaps. |
| Version/migration variance | complete | Cache validity includes coordinator version and source hash checks. |

## Open Gaps

- Add live inquiry support when the Superwarden synthesizer can safely ask users for repository, deployment, or threat-model details.

## Changelog

- Initial Superwarden parent skill scaffold.
`, 'utf-8');

  return {
    name,
    description,
    prompt: initialPrompt.trim(),
    rootDir,
  };
}
