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

function wardenSkillConstraints(args: {
  targetName: string;
  targetRootDir: string;
  authoringSkillRoot: string;
}): string {
  return `Warden generated-skill constraints:
- Use the full authoring skill at \`${args.authoringSkillRoot}\` as the authoring method. Start by reading its SKILL.md and follow its own routing. Do not rely on a hand-picked subset of its references.
- The target skill root is \`${args.targetRootDir}\`.
- The generated SKILL.md frontmatter name must be exactly \`${args.targetName}\`.
- Generated artifacts must be normal Warden skill files. Do not overwrite warden.yaml or build-state.json.
- Treat existing generated artifacts in the target root as stale unless you intentionally re-emit them in the returned file map.
- Use the source material and internal outline as the source of truth for regeneration.
- Choose the simplest adequate layout using the authoring skill's rules. Do not add files just to satisfy a template.
- Tracks/tasks are planning work lanes, not filesystem taxonomy. Do not create \`references/tracks/\`; use \`references/<lookup-topic>.md\`, shared references, or inline guidance according to the authoring skill.
- Broad or multi-track skills often need SKILL.md as a compact router plus focused routed references. Inline, shared-reference, one-reference-per-track, many-references-per-track, and fewer-references-than-tracks layouts are all valid when they fit the authoring skill.
- References should answer one lookup question each. Avoid topic-bucket references that mix routing, examples, troubleshooting, source notes, and remediation.
- Treat reference quality as evidence quality, not file count. Each routed runtime reference should have a clear "open when" reason plus concrete checks, required evidence, safe lookalikes or false-positive suppressors, and patch-shaped remediation or examples when the domain warrants it.
- Sink/API catalogs are supporting tables only. Do not make a reference that is mostly a broad catalog unless it also teaches how to prove exploitability, suppress false positives, and fix the issue.
- Broad domain or ecosystem skills should use source discovery before writing deep runtime guidance. If no concrete sources or local examples were consulted, record that as a quality risk or missing input rather than filling gaps with generic survey text.
- Use SPEC.md for new or materially scoped generated skills when it records a useful scope, evidence model, or maintenance contract.
- Use SOURCES.md only when concrete external sources were consulted or unresolved source gaps materially affect future maintenance. Do not create SOURCES.md just to restate warden.yaml, the internal outline, build pipeline, authoring decisions, or "no external research".
- Warden runs skills on changed hunks and injects the report schema separately. Do not include Output Format, Output Contract, Response Format, or custom reporting schema sections.
- Findings must anchor to changed lines and be concrete enough for Warden's normal report schema.
- Security-review skills should include exploit-path evidence, safe lookalikes or false-positive controls, remediation examples, and severity/confidence calibration where relevant.
- Use Warden voice: brief, dry, direct. Avoid generated-artifact boilerplate such as "Generated Warden skill for outline".
- Keep authoring decisions, build metadata, internal outline details, validation summaries, and future-work notes out of generated runtime artifacts.
- Do not send repository code, secrets, private paths, or proprietary details to web tools.`;
}

function contextPacket(args: {
  outline: SkillBuildOutline;
  source: SkillBuildSource;
}): string {
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
- Decide the minimum workflow path and simplest adequate artifact layout.
- Do the first research and source-inspection pass yourself. Use that to identify the work lanes, larger plan, and obvious non-overlap boundaries.
- Decide what additional research is needed during implementation and what gaps should be recorded.
- Decide where runtime guidance, references, provenance, and maintenance contract belong by lookup question, not by track name.
- Decide the sequential task order for track/task additions without prescribing one reference file per track.
- Decide how Warden and the authoring skill should roughly validate the output without turning stylistic preferences into hard blockers.
- For every planned routed reference, define the lookup question, when to open it, and the evidence it must contain before it is useful.

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
      "requiredEvidence": ["Evidence or example this lookup must include"],
      "candidatePaths": ["references/example.md"]
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

Use "tell them" discipline:
- Use the authoring skill again, starting from its SKILL.md.
- Treat the authoring plan as the source/depth brief. Follow it unless new evidence proves the plan is wrong.
- Return a complete file map for every generated artifact that should exist.
- Include SKILL.md. Add references/ only for routed runtime lookup leaves. Add SPEC.md, EVAL.md, scripts/, assets/, or SOURCES.md only when they add concrete runtime, maintenance, validation, reusable-example, or external-source value.
- If the outline has many tracks, build the baseline router/shared structure first; later track/task passes may add or refine focused runtime guidance without forcing a track directory.
- Keep SKILL.md compact; put optional depth in routed references. Do not include authoring/provenance notes unless they describe real external sources or unresolved source gaps that future maintainers need.
- Satisfy the plan's lookupQuestions and qualityBar. If a lookup question is too broad for one reference, split by lookup need. If it is too small for a reference, keep it inline.
- Do not ship catalog-only references. A routed reference should help the runtime agent decide, do, or verify: exploit path or task path, false-positive controls, and remediation/example material where useful.
- Prefer no SOURCES.md over a SOURCES.md that says the skill came from the internal outline, build pipeline, or no external research.
- The externalSources array is only for concrete external sources you actually consulted. Do not count warden.yaml, the internal outline, generated tracks, or the authoring plan as external sources.
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

export function buildAuthoringTrackContributionPrompt(args: {
  outline: SkillBuildOutline;
  source: SkillBuildSource;
  authoringSkillRoot: string;
  targetName: string;
  targetRootDir: string;
  plan: GeneratedSkillAuthoringPlan;
  fileMap: GeneratedSkillFileMap;
  track: SkillBuildOutline['tracks'][number];
}): string {
  return `${contextPacket(args)}

<authoring_plan>
${JSON.stringify(args.plan, null, 2)}
</authoring_plan>

<assigned_track>
${JSON.stringify(args.track, null, 2)}
</assigned_track>

<current_file_map>
${JSON.stringify(args.fileMap, null, 2)}
</current_file_map>

<instructions>
Add this track/task's contribution to the generated Warden skill.

${wardenSkillConstraints(args)}

Use "now tell them this part" discipline:
- Use the authoring skill again, starting from its SKILL.md.
- Treat the assigned track as a work lane. It may map to one reference, multiple references, a shared reference, or no new file.
- Respect the track's owns/excludes boundaries. Do not duplicate sibling-track material already covered in the current file map.
- Add or revise the smallest set of files needed for this track. Return only changed or new files, with full file contents.
- If the current file map already covers this track well, return an empty files array and explain exactly where the current files satisfy the track's required evidence. Topic names or sink catalogs alone do not count as coverage.
- Do not create \`references/tracks/\`. If adding references, use lookup-topic paths like \`references/authentication.md\` or \`references/injection.md\`.
- Deepen weak shared references instead of adding a sibling file when the problem is missing exploit evidence, safe lookalikes, or remediation detail.
- Keep generated runtime artifacts free of authoring metadata, validation summaries, and custom output/report schemas.
- The externalSources array is only for concrete external sources you actually consulted during this task.

Return JSON:
{
  "version": 1,
  "files": [
    {"path": "references/example.md", "content": "Full changed or new file contents"}
  ],
  "summary": "What this task contributed.",
  "validationNotes": ["Self-check note"],
  "missingInputs": ["Missing input, if any"],
  "externalSources": [
    {"title": "Source title", "url": "https://example.com", "reason": "Why this source informed this contribution"}
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

Use "remind them what you told them" discipline:
- Use the authoring skill again as the validation anchor.
- Check whether the generated files followed the plan, the authoring skill, and Warden constraints.
- Check for over-broad topic-bucket references, catalog-only references, missing source depth, stale gap/provenance language, generated-skill metadata, missing routes, and custom output/report formats that conflict with Warden's injected report schema.
- Set valid to false for concrete quality failures that need one writer pass: a routed reference that lacks a lookup question, missing exploit/task evidence, missing false-positive controls for a risky domain, missing remediation/examples where the plan required them, broad ecosystem output with no sources or recorded gaps, or a long reference that needs navigation or splitting by lookup need.
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

Use "tell them again, but cleaner" discipline:
- Use the authoring skill again, starting from its SKILL.md.
- Treat the current file map as the draft to improve, not as disposable scaffolding.
- Apply concrete review feedback and rough validation signals when they identify broken references, malformed artifacts, authoring metadata, custom output schemas, or missing runtime guidance.
- If feedback is only stylistic or conflicts with the authoring skill, keep the existing structure and explain why in validationNotes.
- Return a complete file map for every generated artifact that should exist after revision.
- Keep the simplest adequate layout. Do not add references just to mirror tracks/tasks.
- Preserve non-overlapping track/task guidance that is already good.
- Fix shallow or catalog-only references by adding targeted evidence and examples, splitting by lookup need, or moving small guidance inline. Do not add bulk just to look deeper.
- Keep generated runtime artifacts free of authoring metadata, validation summaries, and custom output/report schemas.
- The externalSources array is only for concrete external sources you actually consulted during revision.

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
