import type { SkillBuildOutline, SkillBuildSource } from './outline-contract.js';
import {
  SKILL_WRITER_REFERENCE_ROLE_GUIDANCE,
  SKILL_WRITER_ROUTER_GUIDANCE,
} from './skill-writer-guidance.js';
import { GeneratedSkillBuildError } from './skill-contract.js';

const GENERIC_SKILL_BUILD_MAX_TURNS = 8;
const LOCAL_SKILL_BUILD_MAX_TURNS = 16;
const GENERIC_TRACK_MAX_TURNS = 4;
const LOCAL_TRACK_MAX_TURNS = 8;

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

export function defaultTrackMaxTurns(outline: SkillBuildOutline): number {
  return requiresRepoInspection(outline)
    ? LOCAL_TRACK_MAX_TURNS
    : GENERIC_TRACK_MAX_TURNS;
}

export function scaffoldSystemPrompt(outline: SkillBuildOutline): string {
  const repoInspectionGuidance = requiresRepoInspection(outline)
    ? 'Use Read, Grep, and Glob to inspect only the repository context needed to frame the overall runtime skill, reference architecture, and evidence model.'
    : 'Do not inspect repository code just because a repo path is available. This skill is intentionally generic, so frame the runtime skill from the outline, bundled source material, and public prior art unless local repository context is explicitly required.';

  return `You build one generated Warden skill from an internal outline.

${repoInspectionGuidance} Use WebSearch or WebFetch for public prior art and current external documentation when framework, runtime, vulnerability, or ecosystem behavior affects the skill.

Do not send repository code, secrets, private file paths, or proprietary details to web tools. Use public framework, package, API, vulnerability class, and documentation names only.

${SKILL_WRITER_ROUTER_GUIDANCE}

Return only strict JSON. Never return prose, markdown, or a follow-up question. If context is missing, still return the JSON object and put the missing context in missingInputs.`;
}

export function trackSystemPrompt(outline: SkillBuildOutline): string {
  const repoInspectionGuidance = requiresRepoInspection(outline)
    ? 'Use Read, Grep, and Glob only when the current track needs local repository details to sharpen investigation steps, safe counterpatterns, or false-positive controls.'
    : 'Do not inspect repository code just because a repo path is available. This track belongs to an intentionally generic skill, so write it from the outline, bundled source material, and public prior art unless local repository context is explicitly required.';

  return `You build one routed reference bundle for a generated Warden skill.

${repoInspectionGuidance} Use WebSearch or WebFetch for public prior art and current external documentation when framework, runtime, vulnerability, or ecosystem behavior affects the track.

Do not send repository code, secrets, private file paths, or proprietary details to web tools. Use public framework, package, API, vulnerability class, and documentation names only.

${SKILL_WRITER_ROUTER_GUIDANCE}
${SKILL_WRITER_REFERENCE_ROLE_GUIDANCE}

Return only strict JSON. Never return prose, markdown, or a follow-up question. If context is missing, still return the JSON object and put the missing context in missingInputs.`;
}

export function buildScaffoldPrompt(args: {
  outline: SkillBuildOutline;
  source: SkillBuildSource;
}): string {
  const { outline, source } = args;
  return `<outline>
${JSON.stringify(outline, null, 2)}
</outline>

<source_material>
${sourceBlocks(source)}
</source_material>

<instructions>
Create the runtime scaffold for one generated Warden skill.

This scaffold pass should decide the top-level runtime framing only. Do not generate per-track markdown in this step.

The resulting runtime skill will run through Warden's normal hunk-based analysis loop. That means:
- the skill must still perform deep investigation with Read, Grep, and Glob when local context is needed
- the skill may use WebSearch or WebFetch for current public documentation or prior art when external behavior affects correctness
- the skill must report only concrete findings accepted by Warden's normal report schema
- every finding must still anchor to changed lines
- the runtime skill must not blindly execute every checklist track on every hunk
- instead, it must first determine which checklist tracks are relevant to the current file and hunk, then work only those tracks in order
- if the outline is intentionally generic, keep the runtime skill generic without becoming shallow
- depth should come from routed references, concrete procedures, safe counterexamples, false-positive controls, remediation patterns, and transformed examples, not fake repo-specific detail or placeholder advice
- Use minimal prose throughout. Prefer terse bullets, ordered steps, short tables, and compact directive lines over explanatory paragraphs.
- Keep every section dense and scannable. Do not write essays, narrative transitions, or long background paragraphs.
- Treat this as a reference-backed-expert skill. SKILL.md routes. references/ files carry optional depth. SOURCES.md holds provenance and decisions.
${requiresRepoInspection(outline)
    ? '- This outline is locally grounded. Use Read, Grep, and Glob to deepen the checklist around the repository-specific frameworks, patterns, and runtime boundaries that the outline identified.'
    : '- This outline is intentionally generic. Do not inspect repository code, local file paths, or project structure just because repoPath is available. Build the runtime skill from the outline, bundled source material, and public prior art only.'}

You are generating only:
- one concise SKILL.md body
- one SPEC.md
- one SOURCES.md

Return only JSON with this exact shape:
{
  "version": 1,
  "skill": "${outline.skill}",
  "name": "${outline.skill}",
  "description": "Focused one-line description of this generated skill.",
  "skillBody": "Markdown body for SKILL.md. Do not include YAML frontmatter.",
  "specMd": "Complete SPEC.md markdown.",
  "sourcesMd": "Complete SOURCES.md markdown.",
  "externalSources": [
    {"title": "Source title", "url": "https://example.com", "reason": "Why this source informed the runtime skill"}
  ],
  "missingInputs": ["Missing context that would improve this runtime skill, if any"]
}

Required SKILL.md body contents:
- State that this is a generated Warden skill for outline "${outline.skill}".
- Instruct the execution agent to read references/checklist.md before reporting findings.
- Instruct the execution agent to open only the routed references listed for each selected track in references/checklist.md.
- Instruct the execution agent to identify the relevant checklist tracks for the current file and hunk before doing deeper investigation.
- Instruct the execution agent to execute the selected checklist tracks sequentially.
- Instruct the execution agent to perform deep repo-local investigation with Read, Grep, and Glob.
- Instruct the execution agent to use WebSearch or WebFetch for current public documentation or prior art when external behavior affects findings.
- Prohibit sending repository code, secrets, private file paths, or proprietary details to web tools.
- Require changed-line anchoring, explicit verification, and normal Warden findings behavior.
- Keep SKILL.md concise and runtime-focused. Put the bulk of the task list in references/checklist.md and the bulk of the depth in focused routed references under references/.
- Prefer short imperative bullets and compact numbered steps. Avoid prose paragraphs unless one brief sentence is necessary to disambiguate a boundary.

Required SPEC.md structure:
# ${outline.skill} Specification

## Intent
## Scope
## Users And Trigger Context
## Runtime Contract
## Source And Evidence Model
## Reference Architecture
## Evaluation
## Known Limitations
## Maintenance Notes

Required SOURCES.md structure:
# ${outline.skill} Sources

## Source Inventory

Include a table with these columns: Source, Trust tier, Confidence, Contribution, Usage constraints.

## Decisions

Use concise bullets to show how the runtime skill framing and checklist tracks were chosen from the outline, local repo context, and external sources.

## Coverage Matrix

Map each outline track id to the generated reference paths that own it.

## Depth Expansion Passes

Show how this build covered:
- issue prerequisites
- happy-path and failure-mode investigation logic
- false-positive controls and safe counterpatterns
- remediation or corrected patterns
- any meaningful version, runtime, or framework variance
- stopping rationale for why additional retrieval was low-yield

## Open Gaps

Use bullets for missing context and next retrieval or validation steps, or state in one concise bullet why additional retrieval is currently low-yield.

## Changelog

Record this build pass.
</instructions>`;
}

export function buildTrackPrompt(args: {
  outline: SkillBuildOutline;
  source: SkillBuildSource;
  trackId: string;
}): string {
  const track = args.outline.tracks.find((item) => item.id === args.trackId);
  if (!track) {
    throw new GeneratedSkillBuildError(
      `Unknown track "${args.trackId}" for generated skill ${args.outline.skill}`,
    );
  }

  return `<outline_scope>
${JSON.stringify({
    skill: args.outline.skill,
    scopeProfile: args.outline.scopeProfile,
  }, null, 2)}
</outline_scope>

<track_blueprint>
${JSON.stringify(track, null, 2)}
</track_blueprint>

<source_material>
${sourceBlocks(args.source)}
</source_material>

<instructions>
Create the routed reference bundle for outline track "${track.id}".

This step owns exactly one track:
- track id: "${track.id}"
- title: "${track.title}"

Rules:
- Do not rename the track id.
- Do not cover other outline tracks.
- Preserve the track's ownership boundaries, exclusions, checks, relevanceSignals, safeCounterpatterns, falsePositiveTraps, and researchHints.
- Use minimal prose. Prefer terse bullets, short numbered steps, compact tables, and compact examples.
- Keep each section dense and scannable. Do not write essays or narrative paragraphs.
- Choose as many or as few references as the track needs. One focused reference is fine. Multiple focused references are better when procedures, examples, tables, or troubleshooting would otherwise get mixed together.
- Split by lookup need, not by vague topic bucket. Bad filenames: notes.md, context.md, patterns.md, research.md.
- The track bundle must include at least one procedure reference and at least one examples reference.
- The path layout is flexible. Good examples: references/tracks/injection.md, references/examples/xss/rails.md, references/frameworks/auth/django.md, references/troubleshooting/auth/session-confusion.md.
- Each reference must include a direct openWhen reason that tells the runtime when to load it from checklist.md.
- Keep provenance out of runtime references. That belongs in SOURCES.md.
${requiresRepoInspection(args.outline)
    ? '- This outline is locally grounded. Use Read, Grep, and Glob only when local repository details materially improve this track.'
    : '- This outline is intentionally generic. Do not inspect repository code, local file paths, or project structure just because repoPath is available. Build the track from the blueprint, bundled source material, and public prior art only.'}

Return only JSON with this exact shape:
{
  "version": 1,
  "skill": "${args.outline.skill}",
  "trackId": "${track.id}",
  "title": "${track.title}",
  "references": [
    {
      "path": "references/tracks/${track.id}.md",
      "title": "${track.title} investigation procedure",
      "role": "procedure",
      "openWhen": "the hunk shows one of the track's primary relevance signals",
      "markdown": "# ${track.title} investigation procedure\\n\\n## When To Use\\n..."
    },
    {
      "path": "references/examples/${track.id}/framework.md",
      "title": "${track.title} examples",
      "role": "examples",
      "openWhen": "the hunk needs concrete true-positive, safe-lookalike, or corrected-pattern comparisons",
      "markdown": "# ${track.title} examples\\n\\n## True Positives\\n..."
    }
  ],
  "externalSources": [
    {"title": "Source title", "url": "https://example.com", "reason": "Why this source informed the track"}
  ],
  "missingInputs": ["Missing context that would improve this track, if any"]
}

The references[].markdown fields must contain the full file contents themselves. Never return file paths, filenames, placeholder labels, or "see references/...".

Required role coverage:
- at least one reference with role "procedure"
- at least one reference with role "examples"

Procedure references must contain:

# <title>

## When To Use
- concrete file, hunk, or behavioral cues

## Investigate In Order
1. ordered steps
2. ordered steps

## Evidence To Require
- concrete evidence requirements

## Safe Counterpatterns
- patterns that should suppress or downgrade weak findings

## Do Not Report
- boundaries and sibling exclusions

## Severity And Confidence
- calibration guidance

Examples references must contain:

# <title>

## True Positives
- compact exploit-shaped examples

## Safe Lookalikes
- compact examples that should suppress weak findings

## Corrected Patterns
- compact corrected or remediation-shaped examples

Keep every reference terse. Each file should answer one lookup need. Use extra references only when they sharpen routing or reduce monolithic mixed-content files.
</instructions>`;
}
