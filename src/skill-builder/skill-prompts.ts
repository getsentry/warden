import type {
  GeneratedSkillAuthoringPlan,
  GeneratedSkillFileMap,
  GeneratedSkillReviewResult,
} from './skill-contract.js';
import type { SkillBuildOutline, SkillBuildSource } from './outline-contract.js';

const GENERIC_SKILL_BUILD_MAX_TURNS = 16;
const LOCAL_SKILL_BUILD_MAX_TURNS = 24;
const VALIDATION_MAX_TURNS = 8;

function sourceBlocks(source: SkillBuildSource): string {
  return source.files
    .map((file) => `<document path="${file.path}">\n${file.content}\n</document>`)
    .join('\n\n');
}

export function requiresRepoInspection(outline: SkillBuildOutline): boolean {
  return outline.scopeProfile.localContextUsed ||
    outline.scopeProfile.kind === 'repository' ||
    outline.scopeProfile.kind === 'product';
}

export function defaultBuildMaxTurns(outline: SkillBuildOutline): number {
  return requiresRepoInspection(outline)
    ? LOCAL_SKILL_BUILD_MAX_TURNS
    : GENERIC_SKILL_BUILD_MAX_TURNS;
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
- Treat existing generated artifacts in the target root as stale unless you intentionally re-emit them in the returned file map.
- Use the source material and internal outline as the source of truth for regeneration.
- Let the authoring skill decide the simplest adequate artifact layout and where guidance belongs. Warden supplies the goal, source packet, outline, runtime constraints, and quality bar.
- Treat outline tracks/tasks as work lanes for coverage and sequencing, not as filesystem or artifact taxonomy.
- The writer and reviewer must handle all track/task coverage in this authoring run. Warden will not run automatic per-track artifact edit passes after the implementation pass.
- Treat guidance quality as evidence quality, not file count. Runtime guidance should help the later Warden run decide, verify, and fix issues with concrete evidence, false-positive controls, and remediation patterns where the domain warrants it.
- Broad domain or ecosystem skills should use source discovery before claiming complete runtime guidance. If source coverage is too thin for the claimed scope, record the gap instead of filling with generic survey text.
- Warden runs skills on changed hunks and injects the report schema separately. Do not include Output Format, Output Contract, Response Format, or custom reporting schema sections.
- Findings must anchor to changed lines and be concrete enough for Warden's normal report schema.
- Code-review style skills should include changed-line evidence, safe lookalikes or false-positive controls, remediation examples, and severity/confidence calibration where relevant to the requested domain.
- Broad domain, ecosystem, or code-review style skills need a balanced source pack for the claimed scope: domain standards or prior art, failure modes, safe counterexamples, language/framework caveats, and remediation patterns, or an explicit blocking gap.
- Preserve source provenance across passes. Keep external web/upstream sources in externalSources and local/provenance notes in whatever artifact the authoring skill chooses for that purpose.
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
}): string {
  return `${contextPacket(args)}

<instructions>
Plan one generated Warden skill authoring run.

${wardenSkillConstraints(args)}

Work like an in-process skill-writer session:
- Read and use the authoring skill.
- Build the authoring brief first: goal, runtime use, depth bar, sources or source gaps, and the kind of evidence the final skill must carry.
- Decide the minimum skill-writer workflow path and artifact layout using the authoring skill's own guidance.
- Do the first research and source-inspection pass yourself. Use that to identify the larger plan, coverage work lanes, and obvious non-overlap boundaries.
- Decide what additional research is needed during implementation and what gaps should be recorded before the skill can be considered complete.
- Decide the ordered track/task coverage plan without turning tracks into layout rules or separate artifact-edit passes.
- Decide how Warden and the authoring skill should roughly validate the output without turning stylistic preferences into hard blockers.
- For broad domain, ecosystem, or code-review style skills, define the source coverage needed before the skill can be considered complete. Include source classes, not just source names: standards or prior art, failure-mode examples, safe counterexamples, language or framework docs, and remediation examples.
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
}): string {
  return `${contextPacket(args)}

<authoring_plan>
${JSON.stringify(args.plan, null, 2)}
</authoring_plan>

<instructions>
Create or update the generated Warden skill artifacts.

${wardenSkillConstraints(args)}

Authoring behavior:
- Use the authoring skill again, starting from its SKILL.md.
- Treat the authoring plan as the source/depth brief. Follow it unless new evidence proves the plan is wrong.
- Return a complete file map for every generated artifact that should exist according to the authoring skill.
- Include SKILL.md. Include every local artifact that SKILL.md or another returned artifact requires at runtime.
- Satisfy the plan's lookupQuestions and qualityBar using the structure chosen by the authoring skill.
- Treat the outline tracks/tasks as the coverage checklist for this single writer pass. Cover each track's goal, evidence focus, safe counterpatterns, and false-positive traps somewhere useful, or record the missing source/context that prevents that coverage.
- Preserve track owns/excludes boundaries so sibling topics do not duplicate findings, but merge, split, inline, or reference guidance according to the authoring skill.
- Do not produce shallow placeholders on the assumption that later per-track passes will deepen them; no automatic track contribution passes will run.
- Do not ship catalog-only runtime guidance. The generated skill should help the runtime agent decide, verify, and fix, not just recognize topic names or APIs.
- The externalSources array is cumulative evidence for the final artifact, but only for external web/upstream sources. Include concrete outline sources, plan sources, and newly consulted sources that the generated skill depends on. Do not count warden.yaml, the authoring skill, outline tracks, the target skill root, local paths, or the authoring plan itself as external sources.
- For broad domain, ecosystem, or code-review style skills, do not present complete multi-language or multi-framework coverage from thin source coverage. Either consult enough authoritative sources to support the breadth or mark the source coverage gap clearly in missingInputs so the reviewer can block completion.
- If validation later needs a correction, it should be possible to rewrite the skill from this file map alone.

Return JSON:
{
  "version": 1,
  "name": "${args.targetName}",
  "files": [
    {"path": "SKILL.md", "content": "Full file contents"}
  ],
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
  fileMap: GeneratedSkillFileMap;
  deterministicIssues: string[];
}): string {
  return `${contextPacket(args)}

<authoring_plan>
${JSON.stringify(args.plan, null, 2)}
</authoring_plan>

<generated_file_map>
${JSON.stringify(args.fileMap, null, 2)}
</generated_file_map>

<rough_validation_issues>
${JSON.stringify(args.deterministicIssues, null, 2)}
</rough_validation_issues>

<instructions>
Review the generated Warden skill and return standards feedback only.

${wardenSkillConstraints(args)}

Review behavior:
- Use the authoring skill again as the validation anchor.
- Check whether the generated files followed the plan, the authoring skill, and Warden constraints.
- Check whether each outline track/task is covered with useful runtime guidance, merged into another section/reference with clear coverage, or explicitly recorded as missing input. Do not require one artifact per track.
- Check for over-broad topic buckets, catalog-only runtime guidance, missing source depth, stale gap/provenance language, generated-skill metadata, missing local artifacts, and custom output/report formats that conflict with Warden's injected report schema.
- Set valid to false for concrete quality failures that need one writer pass: missing task evidence, missing false-positive controls for the requested domain, missing remediation/examples where the plan required them, broad ecosystem output with no sources or recorded gaps, broken local artifact links, or a structure that the authoring skill would reject.
- Set valid to false when a track/task is represented only by a heading, topic name, or route entry without the evidence focus, safe counterpatterns, false-positive controls, and remediation guidance needed for runtime use.
- Set valid to false when the skill claims broad domain coverage but the source base is too thin for that claim. Classification-only sources, a handful of generic sources, or provenance that omits failure-mode, safe-counterexample, and remediation evidence are not enough unless the gap is explicitly recorded as incomplete work.
- Set valid to false for any missing local artifact needed by returned runtime guidance. That is a mechanical runnability failure, not a stylistic layout preference.
- Do not rewrite files in this review pass. Give concrete feedback; the writer revision pass will decide how to apply it.
- Report only issues that need another writer pass. Do not report taste-level layout preferences as issues.
- Set valid to false only when a concrete issue should trigger revision, not when you disagree with a reasonable layout choice.
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
  fileMap: GeneratedSkillFileMap;
  review: GeneratedSkillReviewResult;
  deterministicIssues: string[];
}): string {
  return `${contextPacket(args)}

<authoring_plan>
${JSON.stringify(args.plan, null, 2)}
</authoring_plan>

<current_file_map>
${JSON.stringify(args.fileMap, null, 2)}
</current_file_map>

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
- Treat the current file map as the draft to improve, not as disposable scaffolding.
- Apply concrete review feedback and rough validation signals when they identify broken references, malformed artifacts, authoring metadata, custom output schemas, or missing runtime guidance.
- If feedback is only stylistic or conflicts with the authoring skill, keep the existing structure and explain why in validationNotes.
- Return a complete file map for every generated artifact that should exist after revision.
- If review feedback identifies missing local artifacts, either include them with useful runtime content or remove the dependency and record the lost coverage as a missing input. Do not return knowingly broken local links.
- Keep the simplest adequate layout according to the authoring skill. Do not add artifacts just to mirror tracks/tasks.
- Preserve non-overlapping track/task guidance that is already good, and make any missing track/task coverage complete in this revision pass.
- Fix shallow or catalog-only runtime guidance by adding targeted evidence and examples, restructuring by lookup need, or moving small guidance inline. Do not add bulk just to look deeper.
- Fix source-depth failures by adding or preserving the source evidence the artifact actually depends on. If enough source discovery cannot be completed, keep the artifact incomplete and state the missing coverage instead of claiming a finished broad skill.
- Keep generated runtime artifacts free of authoring metadata, validation summaries, and custom output/report schemas.
- The externalSources array is cumulative evidence for the final artifact, but only for external web/upstream sources. Preserve external sources the revised file map still depends on and add concrete external sources consulted during revision.

Return JSON:
{
  "version": 1,
  "name": "${args.targetName}",
  "files": [
    {"path": "SKILL.md", "content": "Full file contents"}
  ],
  "summary": "What was revised.",
  "validationNotes": ["Self-check note"],
  "missingInputs": ["Missing input, if any"],
  "externalSources": [
    {"title": "Source title", "url": "https://example.com", "reason": "Why this source informed the revision"}
  ]
}
</instructions>`;
}
