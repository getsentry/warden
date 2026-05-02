import type { GeneratedSkillAuthoringPlan, GeneratedSkillFileMap } from './skill-contract.js';
import type { SkillBuildOutline, SkillBuildSource } from './outline-contract.js';

const GENERIC_SKILL_BUILD_MAX_TURNS = 12;
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
- Use the full authoring skill at \`${args.authoringSkillRoot}\`. Start by reading its SKILL.md and follow its own routing. Do not rely on a hand-picked subset of its references.
- The target skill root is \`${args.targetRootDir}\`.
- The generated SKILL.md frontmatter name must be exactly \`${args.targetName}\`.
- Generated artifacts must be normal Warden skill files. Do not overwrite warden.yaml or build-state.json.
- Let the authoring skill choose the artifact shape. Optimize for a usable runtime approach: clear review tasks, routing cues, evidence requirements, and supporting references/scripts/assets only when they help the skill execute.
- Warden runs skills on changed hunks. Findings must anchor to changed lines and must be concrete enough for Warden's normal report schema.
- SKILL.md should be the runtime router when references exist. Every runtime reference must have a direct "when to read" route in SKILL.md.
- Use Warden voice: brief, dry, direct. Avoid generated-artifact boilerplate such as "Generated Warden skill for outline".
- Keep provenance and authoring decisions in SOURCES.md or SPEC.md, not in runtime references.
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

Use "tell them what you are going to tell them" discipline:
- Read and use the authoring skill.
- Decide the minimum workflow path it requires.
- Decide what research is needed before implementation.
- Decide the intended artifact layout without forcing a Warden template.
- Decide how Warden and the authoring skill should validate the output.

The internal outline is supporting context only. If it conflicts with the source material or authoring skill, say how the implementation should resolve that in the plan.

Return JSON:
{
  "version": 1,
  "summary": "Short authoring plan summary.",
  "workflow": ["Ordered workflow step"],
  "researchPlan": ["Research or inspection step"],
  "artifactPlan": ["Expected artifact or layout decision"],
  "validationPlan": ["Validation step"],
  "risks": ["Known risk"],
  "missingInputs": ["Missing input, if any"]
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
- Follow the plan unless new evidence proves the plan is wrong.
- Return a complete file map for every generated artifact that should exist.
- Include SKILL.md. Include SPEC.md, SOURCES.md, EVAL.md, references/, scripts/, or assets/ only when the authoring skill and this skill's needs justify them.
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

<deterministic_validation_issues>
${JSON.stringify(args.deterministicIssues, null, 2)}
</deterministic_validation_issues>

<instructions>
Validate the generated Warden skill.

${wardenSkillConstraints(args)}

Use "remind them what you told them" discipline:
- Use the authoring skill again as the validation anchor.
- Check whether the generated files followed the plan, the authoring skill, and Warden constraints.
- If fixes are needed, return a complete revised file map in files.
- If no fixes are needed, omit files or return an empty files array.
- Report only issues that remain after any revised files you return.
- Set valid to true only when the generated or revised files are valid.
- Treat deterministic validation issues as actionable unless the generated files were revised to fix them.

Return JSON:
{
  "version": 1,
  "valid": true,
  "summary": "Validation summary.",
  "issues": [
    {"severity": "error", "path": "SKILL.md", "message": "Problem", "suggestedFix": "Fix"}
  ],
  "files": [
    {"path": "SKILL.md", "content": "Full revised file contents"}
  ],
  "missingInputs": ["Missing input, if any"]
}
</instructions>`;
}
