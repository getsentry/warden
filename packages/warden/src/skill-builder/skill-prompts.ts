import type {
  GeneratedSkillAuthoringPlan,
  GeneratedSkillAuthoringMode,
  GeneratedSkillReviewResult,
  SkillBuildExternalSource,
} from './skill-contract.js';
import type { SkillBuildOutline, SkillBuildSource } from './outline-contract.js';

const GENERATED_SKILL_AUTHORING_MAX_TURNS = 80;
const VALIDATION_MAX_TURNS = 8;

interface GeneratedSkillArtifactSnapshot {
  summary: string;
  files: {
    path: string;
    content: string;
  }[];
  validationNotes: string[];
  missingInputs: string[];
  externalSources: SkillBuildExternalSource[];
}

function sourceBlocks(source: SkillBuildSource): string {
  return source.files
    .map((file) => `<document path="${file.path}">\n${file.content}\n</document>`)
    .join('\n\n');
}

export function defaultBuildMaxTurns(): number {
  return GENERATED_SKILL_AUTHORING_MAX_TURNS;
}

export function defaultValidationMaxTurns(): number {
  return VALIDATION_MAX_TURNS;
}

// Keep this wrapper contract narrow and domain-agnostic. Warden owns the
// generated skill goal, runtime constraints, source-depth expectations,
// ordered coverage work, and qualitative review bar. The authoring skill owns
// layout, routing, reference naming, and other skill-writer doctrine.
function wardenSkillConstraints(args: {
  targetName: string;
  targetRootDir: string;
  authoringSkillRoot: string;
}): string {
  return `Warden generated-skill constraints:
- Use the full authoring skill at \`${args.authoringSkillRoot}\` as the authoring method. Start by reading its SKILL.md and follow its own routing.
- The target skill root is \`${args.targetRootDir}\`.
- The generated SKILL.md frontmatter name must be exactly \`${args.targetName}\`.
- Generated artifacts must be normal Warden skill files. Do not overwrite warden.yaml or build-state.json.
- The writer owns disk changes inside the target skill root. Warden will read the files from disk after each writer pass.
- If a stale generated artifact should not remain, remove it from the target root during the writer pass.
- Use the source material and internal outline as the source of truth for regeneration.
- Let the authoring skill decide the simplest adequate artifact layout and where guidance belongs. Warden supplies the goal, source packet, outline, runtime constraints, and quality bar.
- Treat outline tracks/tasks as work lanes for coverage and sequencing, not as filesystem or artifact taxonomy.
- The writer and reviewer must handle all track/task coverage in this authoring run. Warden will not run automatic per-track artifact edit passes after the implementation pass.
- If using references, keep them usable as lookup leaves: each reference should answer a dominant lookup question, have a direct open-when route from SKILL.md, and either stay short enough to scan or include a "## Contents" section / split into clearer leaves.
- Treat guidance quality as evidence quality, not file count. Runtime guidance should help the later Warden run decide, verify, and fix issues with concrete evidence, false-positive controls, and remediation patterns where the domain warrants it.
- Broad domain or ecosystem skills should use source discovery before claiming complete runtime guidance. If source coverage is too thin for the claimed scope, record the gap instead of filling with generic survey text.
- Warden runs skills on changed hunks and injects the report schema separately. Do not include Output Format, Output Contract, Response Format, or custom reporting schema sections.
- Findings must anchor to changed lines and be concrete enough for Warden's normal report schema.
- Every generated skill is a Warden review skill. It needs a finding proof model: changed-line evidence, boundary or invariant, source or cause, sink or operation, missing guard, impact, and fix.
- Include domain-specific exclusions, safe lookalikes, false-positive controls, remediation examples, and severity/confidence calibration where relevant.
- Broad skills need a balanced source pack for the claimed scope: standards or prior art, failure modes, safe counterexamples, language/framework caveats, and remediation patterns, or an explicit blocking gap.
- Treat externalSources as the consulted-source ledger. If generating SOURCES.md, list only sources that also appear in externalSources as consulted; put useful but unconsulted source classes in missingInputs or an explicitly labeled gap/candidate section.
- Do not claim complete source coverage or "no gaps" unless externalSources and missingInputs support that claim.
- Use Warden voice: brief, dry, direct. Avoid generated-artifact boilerplate such as "Generated Warden skill for outline".
- Keep authoring decisions, build metadata, internal outline details, validation summaries, and future-work notes out of generated runtime artifacts.
- Do not send repository code, secrets, private paths, or proprietary details to web tools.`;
}

function contextPacket(args: {
  outline: SkillBuildOutline;
  source: SkillBuildSource;
}): string {
  // The outline is planning context: topics, tasks, source signals, and
  // non-overlap boundaries. It is not a runnable skill and does not prescribe
  // the final artifact tree.
  return `<source_material>
${sourceBlocks(args.source)}
</source_material>

<internal_outline>
${JSON.stringify(args.outline, null, 2)}
</internal_outline>`;
}

function authoringIntent(args: {
  mode?: GeneratedSkillAuthoringMode;
  improvementPrompt?: string;
}): string {
  const mode = args.mode ?? 'build';
  if (mode === 'improve') {
    return `<authoring_intent>
Mode: improve
Improve the existing generated skill from the improvement brief and current artifacts. Preserve useful existing behavior that the brief and reviewer do not call into question. Use the same planner, writer, reviewer, and revision standards as a build run.

Improvement brief:
${args.improvementPrompt?.trim() || '(No improvement brief supplied.)'}
</authoring_intent>`;
  }

  return `<authoring_intent>
Mode: build
Create or refresh the generated skill from the source material and internal outline.
</authoring_intent>`;
}

export function authoringSystemPrompt(): string {
  return `You are Warden's generated-skill authoring harness.

Use the authoring skill named in the user prompt as the authority for authoring method, source discovery, artifact layout, and quality gates. Warden only supplies product constraints and validates the result.

Return only strict JSON matching the requested schema. Never return prose, markdown fences, or follow-up questions. If context is missing, still return JSON and put gaps in missingInputs.`;
}

export function buildAuthoringPlanPrompt(args: {
  outline: SkillBuildOutline;
  source: SkillBuildSource;
  authoringSkillRoot: string;
  targetName: string;
  targetRootDir: string;
  mode?: GeneratedSkillAuthoringMode;
  improvementPrompt?: string;
}): string {
  return `${contextPacket(args)}

${authoringIntent(args)}

<instructions>
Plan one generated Warden skill authoring run.

${wardenSkillConstraints(args)}

Work like an in-process skill-writer session:
- Read and use the authoring skill.
- Build the authoring brief first: goal, runtime use, depth bar, sources or source gaps, and the kind of evidence the final skill must carry.
- In improve mode, make the improvement brief and current artifacts part of that brief: identify what should change, what should be preserved, and what needs reviewer verification.
- Decide the minimum skill-writer workflow path and artifact layout using the authoring skill's own guidance.
- Do the first research and source-inspection pass yourself. Use that to identify the larger plan, coverage work lanes, and obvious non-overlap boundaries.
- Decide what additional research is needed during implementation and what gaps should be recorded before the skill can be considered complete.
- Decide the ordered track/task coverage plan without turning tracks into layout rules or separate artifact-edit passes.
- Decide how Warden and the authoring skill should roughly validate the output without turning stylistic preferences into hard blockers.
- Include a reference usability bar in qualityBar / validationPlan when the likely shape is reference-backed: references should be focused lookup leaves, not giant mixed catalogs, and long leaves need a "## Contents" section or a clearer split.
- Define the finding proof model the runtime agent must satisfy before reporting, plus exclusions and false-positive controls that suppress weak findings.
- For broad skills, define source coverage needed before completion. Include source classes, not just source names: standards or prior art, failure-mode examples, safe counterexamples, language or framework docs, and remediation examples.
- Carry forward external sources from the internal outline when the plan relies on them. Add new source-discovery targets when the outline sources are too thin for the claimed breadth.

The internal outline is supporting context only. If it conflicts with the source material or authoring skill, say how the implementation should resolve that in the plan.

Return JSON:
{
  "version": 1,
  "summary": "Short authoring plan summary.",
  "workflow": ["Ordered workflow step"],
  "researchPlan": ["Research or inspection step"],
  "sourceDecisions": [
    {"source": "Source or inspected context", "decision": "Decision made from it", "implication": "How it changes the final skill"}
  ],
  "lookupQuestions": [
    {
      "question": "Lookup question the reference or inline section must answer",
      "openWhen": "When the runtime agent should open or use it",
      "requiredEvidence": ["Evidence or example this lookup must include"]
    }
  ],
  "qualityBar": ["Concrete depth requirement for the writer and reviewer"],
  "artifactPlan": ["Expected artifact or layout decision"],
  "validationPlan": ["Validation step"],
  "risks": ["Known risk"],
  "missingInputs": ["Missing input, if any"],
  "externalSources": [
    {"title": "Source title", "url": "https://example.com", "reason": "Why this source informed the plan"}
  ]
}
</instructions>`;
}

export function buildAuthoringImplementationPrompt(args: {
  outline: SkillBuildOutline;
  source: SkillBuildSource;
  authoringSkillRoot: string;
  targetName: string;
  targetRootDir: string;
  plan: GeneratedSkillAuthoringPlan;
  mode?: GeneratedSkillAuthoringMode;
  improvementPrompt?: string;
}): string {
  return `${contextPacket(args)}

${authoringIntent(args)}

<authoring_plan>
${JSON.stringify(args.plan, null, 2)}
</authoring_plan>

<instructions>
Create or update the generated Warden skill artifacts.

${wardenSkillConstraints(args)}

Authoring behavior:
- Use the authoring skill again, starting from its SKILL.md.
- Treat the authoring plan as the source/depth brief. Follow it unless new evidence proves the plan is wrong.
- In improve mode, treat the current target directory as the draft to improve. Preserve useful existing behavior outside the improvement brief and reviewer feedback.
- Edit files directly under the target skill root. Do not modify warden.yaml or build-state.json.
- Write SKILL.md and every local artifact that SKILL.md or another runtime artifact requires.
- Satisfy the plan's lookupQuestions and qualityBar using the structure chosen by the authoring skill.
- Treat the outline tracks/tasks as the coverage checklist for this authoring run. Cover each track's goal, evidence focus, safe counterpatterns, and false-positive traps somewhere useful, or record the missing source/context that prevents that coverage.
- Preserve track owns/excludes boundaries so sibling topics do not duplicate findings, but merge, split, inline, or reference guidance according to the authoring skill.
- Do not produce shallow placeholders on the assumption that later per-track passes will deepen them; no automatic track contribution passes will run.
- Do not ship catalog-only runtime guidance. The generated skill should help the runtime agent decide, verify, and fix, not just recognize topic names or APIs.
- Include compact runtime guidance for proving a finding and deciding not to report. Add selective bad/safe examples when concrete code or config patterns are central.
- Before finishing, run a reference usability self-check: every reference has a direct route, one dominant lookup need, and enough navigation or segmentation that the runtime agent can open only the relevant material. Split mixed references or add navigation when a leaf becomes hard to scan.
- The externalSources array is cumulative evidence for the final artifact, but only for external web/upstream sources. Include concrete outline sources, plan sources, and newly consulted sources that the generated skill depends on. Do not count warden.yaml, the authoring skill, outline tracks, the target skill root, local paths, or the authoring plan itself as external sources.
- SOURCES.md is optional. If you create it, keep consulted-source claims aligned with externalSources. Do not list generic documentation buckets as consulted provenance unless you actually consulted and return a concrete source URL for them; record unconsulted but needed source classes as gaps instead.
- For broad skills, do not present complete multi-language or multi-framework coverage from thin source coverage. Either consult enough authoritative sources or mark the gap in missingInputs.
- If validation later needs a correction, the current target directory should be the complete draft to revise.

Return JSON:
{
  "version": 1,
  "summary": "What was generated.",
  "validationNotes": ["Self-check note"],
  "missingInputs": ["Missing input, if any"],
  "externalSources": [
    {"title": "Source title", "url": "https://example.com", "reason": "Why this source informed the skill"}
  ]
}
</instructions>`;
}

export function buildAuthoringValidationPrompt(args: {
  outline: SkillBuildOutline;
  source: SkillBuildSource;
  authoringSkillRoot: string;
  targetName: string;
  targetRootDir: string;
  plan: GeneratedSkillAuthoringPlan;
  artifact: GeneratedSkillArtifactSnapshot;
  deterministicIssues: string[];
  mode?: GeneratedSkillAuthoringMode;
  improvementPrompt?: string;
}): string {
  return `${contextPacket(args)}

${authoringIntent(args)}

<authoring_plan>
${JSON.stringify(args.plan, null, 2)}
</authoring_plan>

<generated_artifacts>
${JSON.stringify(args.artifact, null, 2)}
</generated_artifacts>

<rough_validation_issues>
${JSON.stringify(args.deterministicIssues, null, 2)}
</rough_validation_issues>

<instructions>
Review the generated Warden skill and return standards feedback only.

${wardenSkillConstraints(args)}

Review behavior:
- Use the authoring skill again as the validation anchor.
- Check whether the generated artifacts on disk followed the plan, the authoring skill, and Warden constraints.
- In improve mode, check whether the improvement brief was addressed without regressing useful existing behavior outside that brief.
- Check whether each outline track/task is covered with useful runtime guidance, merged into another section/reference with clear coverage, or explicitly recorded as missing input. Do not require one artifact per track.
- Check for over-broad topic buckets, catalog-only runtime guidance, missing source depth, stale gap/provenance language, generated-skill metadata, missing local artifacts, and custom output/report formats that conflict with Warden's injected report schema.
- Set valid to false for concrete quality failures that need a writer revision: missing task evidence, missing false-positive controls for the requested domain, missing remediation/examples where the plan required them, broad ecosystem output with no sources or recorded gaps, broken local artifact links, or a structure that the authoring skill would reject.
- Set valid to false when a track/task is represented only by a heading, topic name, or route entry without the evidence focus, safe counterpatterns, false-positive controls, and remediation guidance needed for runtime use.
- Set valid to false when findings can be reported from category names or pattern hits alone. Require the proof model, exclusions, impact calibration, and fix guidance.
- Set valid to false when reference-backed output uses oversized, mixed-purpose, or unnavigable references. This is runtime usability, not a taste-level layout preference. Accept any layout that stays focused and navigable; do not require one reference per topic. References over roughly 100 lines should have a "## Contents" section or be split when they contain multiple lookup needs.
- Set valid to false when the skill claims broad domain coverage but the source base is too thin for that claim. Classification-only sources, a handful of generic sources, or provenance that omits failure-mode, safe-counterexample, and remediation evidence are not enough unless the gap is explicitly recorded as incomplete work.
- Set valid to false when SOURCES.md claims sources were consulted but those sources do not appear in externalSources, or when it claims no source gaps despite thin or generic provenance.
- Set valid to false for any missing local artifact needed by returned runtime guidance. That is a mechanical runnability failure, not a stylistic layout preference.
- Do not rewrite files in this review pass. Give concrete feedback; a bounded writer revision round will decide how to apply it.
- Report only issues that need another writer pass. Do not report taste-level layout preferences as issues.
- Set valid to false only when a concrete issue should trigger revision, not when you disagree with a reasonable layout choice.
- Do not block on maintenance-document template details such as SPEC.md heading names unless the issue affects runtime usability, source provenance, or future maintenance in a concrete way.
- Treat rough validation issues as advisory signals. Fix concrete broken references or malformed artifacts, but do not hard-block on taste-level layout preferences.

Return JSON:
{
  "version": 1,
  "valid": true,
  "summary": "Review summary.",
  "issues": [
    {"severity": "error", "path": "SKILL.md", "message": "Problem", "suggestedFix": "Fix"}
  ],
  "missingInputs": ["Missing input, if any"]
}
</instructions>`;
}

export function buildAuthoringRevisionPrompt(args: {
  outline: SkillBuildOutline;
  source: SkillBuildSource;
  authoringSkillRoot: string;
  targetName: string;
  targetRootDir: string;
  plan: GeneratedSkillAuthoringPlan;
  artifact: GeneratedSkillArtifactSnapshot;
  review: GeneratedSkillReviewResult;
  deterministicIssues: string[];
  mode?: GeneratedSkillAuthoringMode;
  improvementPrompt?: string;
}): string {
  return `${contextPacket(args)}

${authoringIntent(args)}

<authoring_plan>
${JSON.stringify(args.plan, null, 2)}
</authoring_plan>

<current_artifacts>
${JSON.stringify(args.artifact, null, 2)}
</current_artifacts>

<standards_review>
${JSON.stringify(args.review, null, 2)}
</standards_review>

<rough_validation_issues>
${JSON.stringify(args.deterministicIssues, null, 2)}
</rough_validation_issues>

<instructions>
Revise the generated Warden skill artifacts from standards-review feedback.

${wardenSkillConstraints(args)}

Revision behavior:
- Use the authoring skill again, starting from its SKILL.md.
- Treat the current target directory as the draft to improve, not as disposable scaffolding.
- In improve mode, apply the improvement brief and reviewer feedback while preserving useful existing behavior outside the requested change.
- Apply concrete review feedback and rough validation signals when they identify broken references, malformed artifacts, authoring metadata, custom output schemas, or missing runtime guidance.
- If feedback is only stylistic or conflicts with the authoring skill, keep the existing structure and explain why in validationNotes.
- Edit files directly under the target skill root. Do not modify warden.yaml or build-state.json.
- If review feedback identifies missing local artifacts, either include them with useful runtime content or remove the dependency and record the lost coverage as a missing input. Do not return knowingly broken local links.
- Keep the simplest adequate layout according to the authoring skill. Do not add artifacts just to mirror tracks/tasks.
- Preserve non-overlapping track/task guidance that is already good, and make any missing track/task coverage complete in this revision pass.
- Fix shallow or catalog-only runtime guidance by adding targeted evidence and examples, restructuring by lookup need, or moving small guidance inline. Do not add bulk just to look deeper.
- Fix proof-model gaps by adding the smallest adequate evidence chain, exclusions, false-positive controls, impact calibration, and fix guidance.
- Fix oversized, mixed-purpose, or unnavigable references by adding concise navigation, splitting by lookup need, or moving short universal guidance back inline. Preserve layout freedom; the goal is runtime usability, not a required file count.
- Fix source-depth failures by adding or preserving the source evidence the artifact actually depends on. If enough source discovery cannot be completed, keep the artifact incomplete and state the missing coverage instead of claiming a finished broad skill.
- Fix source-provenance overclaims by removing unsupported consulted-source claims, moving unconsulted sources to missingInputs or an explicit candidate/gap section, or returning concrete externalSources for sources actually consulted.
- Keep generated runtime artifacts free of authoring metadata, validation summaries, and custom output/report schemas.
- The externalSources array is cumulative evidence for the final artifact, but only for external web/upstream sources. Preserve external sources the revised artifacts still depend on and add concrete external sources consulted during revision.

Return JSON:
{
  "version": 1,
  "summary": "What was revised.",
  "validationNotes": ["Self-check note"],
  "missingInputs": ["Missing input, if any"],
  "externalSources": [
    {"title": "Source title", "url": "https://example.com", "reason": "Why this source informed the revision"}
  ]
}
</instructions>`;
}
