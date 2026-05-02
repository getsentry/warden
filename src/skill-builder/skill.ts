import { dirname, join } from 'node:path';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import { aggregateUsage } from '../sdk/usage.js';
import type { Runtime } from '../sdk/runtimes/index.js';
import type { UsageStats } from '../types/index.js';
import { runStructuredSkillBuilderAgent, StructuredSkillBuilderAgentError } from './agentic.js';
import {
  SKILL_WRITER_REFERENCE_ROLE_GUIDANCE,
  SKILL_WRITER_ROUTER_GUIDANCE,
  SKILL_BUILDER_GENERIC_REFERENCE_BASENAMES,
  SKILL_BUILDER_REFERENCE_ROLES,
  SKILL_BUILDER_REQUIRED_EXAMPLES_HEADINGS,
  SKILL_BUILDER_REQUIRED_PROCEDURE_HEADINGS,
  type SkillBuilderReferenceRole,
} from './skill-writer-guidance.js';
import {
  clearGeneratedSkillArtifacts,
} from './definition.js';
import {
  type SkillBuildOutline,
  type SkillBuildSource,
  outlineHash,
  readSkillBuildState,
  writeSkillBuildState,
} from './outline.js';

const GENERATED_SKILL_ARTIFACT_SCHEMA_VERSION = 3;
const GENERIC_SKILL_BUILD_MAX_TURNS = 8;
const LOCAL_SKILL_BUILD_MAX_TURNS = 16;
const GENERIC_TRACK_MAX_TURNS = 4;
const LOCAL_TRACK_MAX_TURNS = 8;
const MAX_TRACK_REFERENCE_FILES = 6;

interface SkillBuildExternalSource {
  title: string;
  url: string;
  reason: string;
}

const REQUIRED_CHECKLIST_INDEX_HEADINGS = [
  '## How To Use This Checklist',
  '## Track Index',
] as const;

const SkillBuilderReferenceRoleSchema = z.enum(SKILL_BUILDER_REFERENCE_ROLES);

const REFERENCE_ROLE_ORDER: Record<SkillBuilderReferenceRole, number> = {
  procedure: 0,
  'decision-guide': 1,
  'reference-table': 2,
  troubleshooting: 3,
  examples: 4,
};

function hasMarkdownHeading(markdown: string, heading: string): boolean {
  return markdown.includes(`${heading}\n`) || markdown.endsWith(heading);
}

function hasLevelTwoHeading(markdown: string): boolean {
  return /^##\s+\S.+$/m.test(markdown);
}

function isValidChecklistIndexMarkdown(markdown: string): boolean {
  const trimmed = markdown.trim();
  if (!trimmed.startsWith('# ') || !trimmed.includes(' Checklist')) {
    return false;
  }
  return REQUIRED_CHECKLIST_INDEX_HEADINGS.every((heading) => hasMarkdownHeading(trimmed, heading));
}

function isValidReferencePath(path: string): boolean {
  if (!/^references\/[a-z0-9][a-z0-9._/-]*\.md$/.test(path)) {
    return false;
  }
  if (path.includes('..') || path.includes('//')) {
    return false;
  }
  const basename = path.split('/').at(-1)?.toLowerCase();
  if (!basename) {
    return false;
  }
  return !SKILL_BUILDER_GENERIC_REFERENCE_BASENAMES.has(basename);
}

function validateProcedureReference(markdown: string): boolean {
  const trimmed = markdown.trim();
  if (!trimmed.startsWith('# ')) {
    return false;
  }
  return SKILL_BUILDER_REQUIRED_PROCEDURE_HEADINGS.every((heading) => hasMarkdownHeading(trimmed, heading));
}

function validateExamplesReference(markdown: string): boolean {
  const trimmed = markdown.trim();
  if (!trimmed.startsWith('# ')) {
    return false;
  }
  return SKILL_BUILDER_REQUIRED_EXAMPLES_HEADINGS.every((heading) => hasMarkdownHeading(trimmed, heading));
}

function minimumReferenceLength(role: SkillBuilderReferenceRole): number {
  switch (role) {
    case 'procedure':
      return 180;
    case 'examples':
      return 140;
    default:
      return 100;
  }
}

function isValidReferenceMarkdown(markdown: string, role: SkillBuilderReferenceRole): boolean {
  const trimmed = markdown.trim();
  if (!trimmed.startsWith('# ') || !trimmed.includes('\n')) {
    return false;
  }
  if (trimmed.startsWith('references/')) {
    return false;
  }

  switch (role) {
    case 'procedure':
      return validateProcedureReference(trimmed);
    case 'examples':
      return validateExamplesReference(trimmed);
    default:
      return hasLevelTwoHeading(trimmed);
  }
}

function invalidReferenceMarkdownMessage(role: SkillBuilderReferenceRole): string {
  if (role === 'procedure') {
    return (
      'Procedure references must contain the required sections: ' +
      `${SKILL_BUILDER_REQUIRED_PROCEDURE_HEADINGS.join(', ')}`
    );
  }
  if (role === 'examples') {
    return (
      'Examples references must contain the required sections: ' +
      `${SKILL_BUILDER_REQUIRED_EXAMPLES_HEADINGS.join(', ')}`
    );
  }
  return 'Reference markdown must answer one focused lookup need with a real heading structure.';
}

function synthReferenceSort(a: { role: SkillBuilderReferenceRole; path: string }, b: { role: SkillBuilderReferenceRole; path: string }): number {
  const roleOrder = REFERENCE_ROLE_ORDER[a.role] - REFERENCE_ROLE_ORDER[b.role];
  if (roleOrder !== 0) {
    return roleOrder;
  }
  return a.path.localeCompare(b.path);
}

const GeneratedSkillChecklistIndexMarkdownSchema = z.string()
  .min(200, 'Checklist index markdown must contain the full checklist index, not a placeholder or path')
  .refine(
    (value) => isValidChecklistIndexMarkdown(value),
    'Checklist index markdown must contain ## How To Use This Checklist and ## Track Index',
  );

const GeneratedSkillReferenceFileSchema = z.object({
  path: z.string()
    .min(1)
    .refine(
      (value) => isValidReferencePath(value),
      'Reference paths must live under references/, end in .md, and avoid vague names like notes.md or context.md',
    ),
  title: z.string().min(1),
  role: SkillBuilderReferenceRoleSchema,
  openWhen: z.string().min(1),
  markdown: z.string().min(1),
}).strict().superRefine((value, ctx) => {
  if (value.markdown.trim().length < minimumReferenceLength(value.role)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['markdown'],
      message: `${value.role} references must contain the full file contents, not a placeholder or path`,
    });
  }
  if (!isValidReferenceMarkdown(value.markdown, value.role)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['markdown'],
      message: invalidReferenceMarkdownMessage(value.role),
    });
  }
});

const GeneratedSkillScaffoldSchema = z.object({
  version: z.literal(1),
  skill: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  skillBody: z.string().min(1),
  specMd: z.string().min(1),
  sourcesMd: z.string().min(1),
  externalSources: z.array(z.object({
    title: z.string().min(1),
    url: z.string().min(1),
    reason: z.string().min(1),
  }).strict()).default([]),
  missingInputs: z.array(z.string().min(1)).default([]),
}).strict();

const SkillBuildTrackReferenceSchema = z.object({
  version: z.literal(1),
  skill: z.string().min(1),
  trackId: z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1),
  references: z.array(GeneratedSkillReferenceFileSchema).min(1).max(MAX_TRACK_REFERENCE_FILES),
  externalSources: z.array(z.object({
    title: z.string().min(1),
    url: z.string().min(1),
    reason: z.string().min(1),
  }).strict()).default([]),
  missingInputs: z.array(z.string().min(1)).default([]),
}).strict().superRefine((value, ctx) => {
  const paths = new Set<string>();
  for (const [index, reference] of value.references.entries()) {
    if (paths.has(reference.path)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['references', index, 'path'],
        message: `Duplicate reference path within track bundle: ${reference.path}`,
      });
    }
    paths.add(reference.path);
  }

  const hasProcedure = value.references.some((reference) => reference.role === 'procedure');
  if (!hasProcedure) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['references'],
      message: 'Each track bundle must include at least one procedure reference',
    });
  }

  const hasExamples = value.references.some((reference) => reference.role === 'examples');
  if (!hasExamples) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['references'],
      message: 'Each track bundle must include at least one examples reference',
    });
  }
});

interface GeneratedSkillReferenceFile {
  path: string;
  title: string;
  role: SkillBuilderReferenceRole;
  openWhen: string;
  markdown: string;
}

interface SkillBuildTrackBundle {
  id: string;
  title: string;
  references: GeneratedSkillReferenceFile[];
}

interface GeneratedSkillOutput {
  version: 1;
  skill: string;
  name: string;
  description: string;
  skillBody: string;
  specMd: string;
  sourcesMd: string;
  checklistMd: string;
  trackBundles: SkillBuildTrackBundle[];
  externalSources: SkillBuildExternalSource[];
  missingInputs: string[];
}

export interface GeneratedSkillArtifact {
  kind: 'generated-skill';
  source: 'cache' | 'generated';
  name: string;
  path: string;
  bytes: number;
  durationMs: number;
  usage: UsageStats;
  externalSources: SkillBuildExternalSource[];
  missingInputs: string[];
  responseModel?: string;
  numTurns?: number;
}

export class GeneratedSkillBuildError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'GeneratedSkillBuildError';
  }
}

function frontmatterValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim().replace(/"/g, '\\"');
}

function byteLength(...contents: string[]): number {
  return contents.reduce((sum, content) => sum + Buffer.byteLength(content, 'utf-8'), 0);
}

function referenceFilePath(rootDir: string, referencePath: string): string {
  return join(rootDir, referencePath);
}

function readGeneratedReferenceFiles(rootDir: string): {
  path: string;
  content: string;
}[] {
  const referencesDir = join(rootDir, 'references');
  if (!existsSync(referencesDir)) {
    return [];
  }

  const files: { path: string; content: string }[] = [];

  function visit(relativeDir: string): void {
    for (const entry of readdirSync(join(rootDir, relativeDir), { withFileTypes: true })) {
      const nextRelativePath = `${relativeDir}/${entry.name}`;
      if (entry.isDirectory()) {
        visit(nextRelativePath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.md') || nextRelativePath === 'references/checklist.md') {
        continue;
      }
      files.push({
        path: nextRelativePath,
        content: readFileSync(join(rootDir, nextRelativePath), 'utf-8'),
      });
    }
  }

  visit('references');
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function artifactReferencePaths(rootDir: string): string[] {
  return readGeneratedReferenceFiles(rootDir).map((file) => file.path);
}

function artifactByteLength(rootDir: string): number | undefined {
  try {
    const trackContents = readGeneratedReferenceFiles(rootDir).map((file) => file.content);
    return byteLength(
      readFileSync(join(rootDir, 'SKILL.md'), 'utf-8'),
      readFileSync(join(rootDir, 'SPEC.md'), 'utf-8'),
      readFileSync(join(rootDir, 'SOURCES.md'), 'utf-8'),
      readFileSync(join(rootDir, 'references', 'checklist.md'), 'utf-8'),
      ...trackContents,
    );
  } catch {
    return undefined;
  }
}

function artifactsLookValid(args: {
  rootDir: string;
  referenceManifest: {
    path: string;
    role: SkillBuilderReferenceRole;
  }[];
}): boolean {
  try {
    const checklistContent = readFileSync(join(args.rootDir, 'references', 'checklist.md'), 'utf-8');
    if (!isValidChecklistIndexMarkdown(checklistContent)) {
      return false;
    }

    const referenceFiles = readGeneratedReferenceFiles(args.rootDir);
    if (referenceFiles.length === 0 || args.referenceManifest.length === 0) {
      return false;
    }

    const fileMap = new Map(referenceFiles.map((file) => [file.path, file.content]));
    if (fileMap.size !== args.referenceManifest.length) {
      return false;
    }

    return args.referenceManifest.every((reference) => {
      const content = fileMap.get(reference.path);
      return typeof content === 'string' && isValidReferenceMarkdown(content, reference.role);
    });
  } catch {
    return false;
  }
}

function sourceBlocks(source: SkillBuildSource): string {
  return source.files
    .map((file) => `<document path="${file.path}">\n${file.content}\n</document>`)
    .join('\n\n');
}

function requiresRepoInspection(outline: SkillBuildOutline): boolean {
  return outline.scopeProfile.localContextUsed ||
    outline.scopeProfile.kind === 'repository' ||
    outline.scopeProfile.kind === 'product';
}

function defaultSynthesisMaxTurns(outline: SkillBuildOutline): number {
  return requiresRepoInspection(outline)
    ? LOCAL_SKILL_BUILD_MAX_TURNS
    : GENERIC_SKILL_BUILD_MAX_TURNS;
}

function defaultTrackMaxTurns(outline: SkillBuildOutline): number {
  return requiresRepoInspection(outline)
    ? LOCAL_TRACK_MAX_TURNS
    : GENERIC_TRACK_MAX_TURNS;
}

function scaffoldSystemPrompt(outline: SkillBuildOutline): string {
  const repoInspectionGuidance = requiresRepoInspection(outline)
    ? 'Use Read, Grep, and Glob to inspect only the repository context needed to frame the overall runtime skill, reference architecture, and evidence model.'
    : 'Do not inspect repository code just because a repo path is available. This skill is intentionally generic, so frame the runtime skill from the outline, bundled source material, and public prior art unless local repository context is explicitly required.';

  return `You synthesize one generated Warden skill from an internal outline.

${repoInspectionGuidance} Use WebSearch or WebFetch for public prior art and current external documentation when framework, runtime, vulnerability, or ecosystem behavior affects the skill.

Do not send repository code, secrets, private file paths, or proprietary details to web tools. Use public framework, package, API, vulnerability class, and documentation names only.

${SKILL_WRITER_ROUTER_GUIDANCE}

Return only strict JSON. Never return prose, markdown, or a follow-up question. If context is missing, still return the JSON object and put the missing context in missingInputs.`;
}

function trackSystemPrompt(outline: SkillBuildOutline): string {
  const repoInspectionGuidance = requiresRepoInspection(outline)
    ? 'Use Read, Grep, and Glob only when the current track needs local repository details to sharpen investigation steps, safe counterpatterns, or false-positive controls.'
    : 'Do not inspect repository code just because a repo path is available. This track belongs to an intentionally generic skill, so write it from the outline, bundled source material, and public prior art unless local repository context is explicitly required.';

  return `You synthesize one routed reference bundle for a generated Warden skill.

${repoInspectionGuidance} Use WebSearch or WebFetch for public prior art and current external documentation when framework, runtime, vulnerability, or ecosystem behavior affects the track.

Do not send repository code, secrets, private file paths, or proprietary details to web tools. Use public framework, package, API, vulnerability class, and documentation names only.

${SKILL_WRITER_ROUTER_GUIDANCE}
${SKILL_WRITER_REFERENCE_ROLE_GUIDANCE}

Return only strict JSON. Never return prose, markdown, or a follow-up question. If context is missing, still return the JSON object and put the missing context in missingInputs.`;
}

function buildScaffoldPrompt(args: {
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
- State that this is a synthesized Warden skill for outline "${outline.skill}".
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

Show how this synthesis covered:
- issue prerequisites
- happy-path and failure-mode investigation logic
- false-positive controls and safe counterpatterns
- remediation or corrected patterns
- any meaningful version, runtime, or framework variance
- stopping rationale for why additional retrieval was low-yield

## Open Gaps

Use bullets for missing context and next retrieval or validation steps, or state in one concise bullet why additional retrieval is currently low-yield.

## Changelog

Record this synthesis pass.
</instructions>`;
}

function buildTrackPrompt(args: {
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

function compileChecklistIndex(args: {
  outline: SkillBuildOutline;
  trackBundles: SkillBuildTrackBundle[];
}): string {
  const lines = [
    `# ${args.outline.skill} Checklist`,
    '',
    '## How To Use This Checklist',
    '',
    '1. Classify which checklist tracks are relevant to the current file and hunk.',
    '2. Ignore unrelated tracks instead of running every track on every hunk.',
    '3. Open only the routed references listed under the selected track.',
    '4. Start with the procedure reference for that track, then load additional references only when their open-when rules match.',
    '5. Execute the relevant track procedures in order.',
    '6. Read local source and public prior art only when the selected track needs it.',
    '7. Report only findings with concrete changed-line evidence.',
    '',
    '## Track Index',
    '',
  ];

  for (const track of args.outline.tracks) {
    const bundle = args.trackBundles.find((item) => item.id === track.id);
    if (!bundle) {
      throw new GeneratedSkillBuildError(
        `Checklist compilation missing track bundle "${track.id}" for ${args.outline.skill}`,
      );
    }

    lines.push(`### ${track.title} (\`${track.id}\`)`);
    for (const signal of track.relevanceSignals.slice(0, 3)) {
      lines.push(`- ${signal}`);
    }
    for (const reference of [...bundle.references].sort(synthReferenceSort)) {
      lines.push(`- Open \`${reference.path}\` when ${reference.openWhen}.`);
    }
    lines.push('');
  }

  const compiled = lines.join('\n');
  const validation = GeneratedSkillChecklistIndexMarkdownSchema.safeParse(compiled);
  if (!validation.success) {
    throw new GeneratedSkillBuildError(
      `Compiled checklist index was invalid for ${args.outline.skill}: ${validation.error.message}`,
    );
  }
  return compiled;
}

function combineOutputs(args: {
  outline: SkillBuildOutline;
  scaffold: z.infer<typeof GeneratedSkillScaffoldSchema>;
  tracks: z.infer<typeof SkillBuildTrackReferenceSchema>[];
}): GeneratedSkillOutput {
  const trackBundles: SkillBuildTrackBundle[] = args.outline.tracks.map((outlineTrack) => {
    const track = args.tracks.find((item) => item.trackId === outlineTrack.id);
    if (!track) {
      throw new GeneratedSkillBuildError(
        `Track "${outlineTrack.id}" was not synthesized for ${args.outline.skill}`,
      );
    }
    if (track.title !== outlineTrack.title) {
      throw new GeneratedSkillBuildError(
        `Track "${track.trackId}" title "${track.title}" must match outline title "${outlineTrack.title}" for ${args.outline.skill}`,
      );
    }
    return {
      id: outlineTrack.id,
      title: outlineTrack.title,
      references: track.references.map((reference) => ({
        path: reference.path,
        title: reference.title,
        role: reference.role,
        openWhen: reference.openWhen,
        markdown: reference.markdown,
      })),
    };
  });

  const seenPaths = new Set<string>();
  for (const trackBundle of trackBundles) {
    for (const reference of trackBundle.references) {
      if (seenPaths.has(reference.path)) {
        throw new GeneratedSkillBuildError(
          `Generated reference path collision for ${args.outline.skill}: ${reference.path}`,
        );
      }
      seenPaths.add(reference.path);
    }
  }

  return {
    version: 1,
    skill: args.outline.skill,
    name: args.scaffold.name,
    description: args.scaffold.description,
    skillBody: args.scaffold.skillBody,
    specMd: args.scaffold.specMd,
    sourcesMd: args.scaffold.sourcesMd,
    checklistMd: compileChecklistIndex({
      outline: args.outline,
      trackBundles,
    }),
    trackBundles,
    externalSources: [
      ...args.scaffold.externalSources,
      ...args.tracks.flatMap((track) => track.externalSources),
    ],
    missingInputs: [
      ...args.scaffold.missingInputs,
      ...args.tracks.flatMap((track) => track.missingInputs),
    ],
  };
}

function summarizeResponseModel(models: (string | undefined)[]): string | undefined {
  const distinct = [...new Set(models.filter((model): model is string => Boolean(model)))];
  if (distinct.length === 0) {
    return undefined;
  }
  if (distinct.length === 1) {
    return distinct[0];
  }
  return 'multiple';
}

function summarizeTurns(turns: (number | undefined)[]): number | undefined {
  const values = turns.filter((turn): turn is number => Number.isFinite(turn));
  if (values.length === 0) {
    return undefined;
  }
  return values.reduce((sum, value) => sum + value, 0);
}

function flattenTrackReferences(trackBundles: SkillBuildTrackBundle[]): {
  trackId: string;
  path: string;
  role: SkillBuilderReferenceRole;
  openWhen: string;
  markdown: string;
}[] {
  return trackBundles.flatMap((trackBundle) =>
    trackBundle.references.map((reference) => ({
      trackId: trackBundle.id,
      path: reference.path,
      role: reference.role,
      openWhen: reference.openWhen,
      markdown: reference.markdown,
    })),
  );
}

function hasRequiredTrackReferenceCoverage(args: {
  trackIds: string[];
  referenceManifest: {
    trackId: string;
    role: string;
  }[];
}): boolean {
  return args.trackIds.every((trackId) => {
    const references = args.referenceManifest.filter((reference) => reference.trackId === trackId);
    return references.some((reference) => reference.role === 'procedure')
      && references.some((reference) => reference.role === 'examples');
  });
}

function parseReferenceManifest(referenceManifest: {
  trackId: string;
  path: string;
  role: string;
  openWhen: string;
}[]): {
  trackId: string;
  path: string;
  role: SkillBuilderReferenceRole;
  openWhen: string;
}[] | undefined {
  const parsed: {
    trackId: string;
    path: string;
    role: SkillBuilderReferenceRole;
    openWhen: string;
  }[] = [];

  for (const reference of referenceManifest) {
    const role = SkillBuilderReferenceRoleSchema.safeParse(reference.role);
    if (!role.success) {
      return undefined;
    }
    parsed.push({
      trackId: reference.trackId,
      path: reference.path,
      role: role.data,
      openWhen: reference.openWhen,
    });
  }

  return parsed;
}

function loadCachedArtifact(args: {
  rootDir: string;
  outline: SkillBuildOutline;
  source: SkillBuildSource;
}): GeneratedSkillArtifact | undefined {
  if (
    !existsSync(join(args.rootDir, 'SKILL.md')) ||
    !existsSync(join(args.rootDir, 'SPEC.md')) ||
    !existsSync(join(args.rootDir, 'SOURCES.md')) ||
    !existsSync(join(args.rootDir, 'references', 'checklist.md')) ||
    readGeneratedReferenceFiles(args.rootDir).length === 0
  ) {
    return undefined;
  }

  const state = readSkillBuildState(join(args.rootDir, 'synthesis.json'));
  const metadata = state?.artifact;
  const bytes = artifactByteLength(args.rootDir);
  const expectedTrackIds = args.outline.tracks.map((track) => track.id);
  const referencePaths = artifactReferencePaths(args.rootDir);
  if (!metadata || bytes === undefined) {
    return undefined;
  }
  if (!metadata.referenceManifest || metadata.referenceManifest.length === 0) {
    return undefined;
  }
  const parsedManifest = parseReferenceManifest(metadata.referenceManifest);
  if (!parsedManifest) {
    return undefined;
  }
  if (!hasRequiredTrackReferenceCoverage({
    trackIds: expectedTrackIds,
    referenceManifest: parsedManifest,
  })) {
    return undefined;
  }
  if (!artifactsLookValid({
    rootDir: args.rootDir,
    referenceManifest: parsedManifest.map((reference) => ({
      path: reference.path,
      role: reference.role,
    })),
  })) {
    return undefined;
  }

  if (
    metadata.sourceHash !== args.source.hash ||
    metadata.outlineHash !== outlineHash(args.outline) ||
    metadata.synthesisVersion !== args.outline.synthesisVersion ||
    JSON.stringify(metadata.trackIds) !== JSON.stringify(expectedTrackIds) ||
    JSON.stringify(parsedManifest.map((reference) => reference.path).sort()) !== JSON.stringify(referencePaths) ||
    metadata.bytes !== bytes
  ) {
    return undefined;
  }

  return {
    kind: 'generated-skill',
    source: 'cache',
    name: metadata.name,
    path: args.rootDir,
    bytes,
    durationMs: metadata.durationMs,
    usage: metadata.usage,
    externalSources: metadata.externalSources,
    missingInputs: metadata.missingInputs,
    responseModel: metadata.responseModel,
    numTurns: metadata.numTurns,
  };
}

function writeGeneratedArtifact(args: {
  rootDir: string;
  output: GeneratedSkillOutput;
  durationMs: number;
  usage: UsageStats;
  responseModel?: string;
  numTurns?: number;
}): GeneratedSkillArtifact {
  clearGeneratedSkillArtifacts(args.rootDir);
  mkdirSync(join(args.rootDir, 'references'), { recursive: true });

  const skillContent = `---
name: ${args.output.name}
description: "${frontmatterValue(args.output.description)}"
allowed-tools: Read Grep Glob WebFetch WebSearch
---

${args.output.skillBody.trim()}
`;
  const specContent = `${args.output.specMd.trim()}\n`;
  const sourcesContent = `${args.output.sourcesMd.trim()}\n`;
  const checklistContent = `${args.output.checklistMd.trim()}\n`;
  const referenceFiles = flattenTrackReferences(args.output.trackBundles);
  const referenceContents = referenceFiles.map((reference) => `${reference.markdown.trim()}\n`);
  const bytes = byteLength(skillContent, specContent, sourcesContent, checklistContent, ...referenceContents);

  writeFileSync(join(args.rootDir, 'SKILL.md'), skillContent, 'utf-8');
  writeFileSync(join(args.rootDir, 'SPEC.md'), specContent, 'utf-8');
  writeFileSync(join(args.rootDir, 'SOURCES.md'), sourcesContent, 'utf-8');
  writeFileSync(join(args.rootDir, 'references', 'checklist.md'), checklistContent, 'utf-8');
  for (const reference of referenceFiles) {
    mkdirSync(dirname(referenceFilePath(args.rootDir, reference.path)), { recursive: true });
    writeFileSync(referenceFilePath(args.rootDir, reference.path), `${reference.markdown.trim()}\n`, 'utf-8');
  }

  return {
    kind: 'generated-skill',
    source: 'generated',
    name: args.output.name,
    path: args.rootDir,
    bytes,
    durationMs: args.durationMs,
    usage: args.usage,
    externalSources: args.output.externalSources,
    missingInputs: args.output.missingInputs,
    responseModel: args.responseModel,
    numTurns: args.numTurns,
  };
}

export async function buildGeneratedSkill(args: {
  outline: SkillBuildOutline;
  source: SkillBuildSource;
  rootDir: string;
  runtime: Runtime;
  repoPath: string;
  model?: string;
  maxTurns?: number;
  abortController?: AbortController;
  regenerate?: boolean;
  apiKey?: string;
  repairModel?: string;
  repairMaxRetries?: number;
  onStatus?: (message: string) => void;
}): Promise<GeneratedSkillArtifact> {
  const startedAt = performance.now();
  const statePath = join(args.rootDir, 'synthesis.json');

  try {
    if (!args.regenerate) {
      const cached = loadCachedArtifact({
        rootDir: args.rootDir,
        outline: args.outline,
        source: args.source,
      });
      if (cached) {
        return cached;
      }
    }

    const previousState = readSkillBuildState(statePath);
    if (!previousState) {
      throw new GeneratedSkillBuildError(
        `Missing generated skill outline state for ${args.outline.skill}`,
      );
    }

    args.onStatus?.('Writing router scaffold');
    const scaffold = await runStructuredSkillBuilderAgent({
      runtime: args.runtime,
      repoPath: args.repoPath,
      skillName: `${args.outline.skill}:generated-skill`,
      systemPrompt: scaffoldSystemPrompt(args.outline),
      userPrompt: buildScaffoldPrompt({
        outline: args.outline,
        source: args.source,
      }),
      schema: GeneratedSkillScaffoldSchema,
      model: args.model,
      maxTurns: args.maxTurns ?? defaultSynthesisMaxTurns(args.outline),
      abortController: args.abortController,
      repair: {
        apiKey: args.apiKey,
        model: args.repairModel,
        maxRetries: args.repairMaxRetries,
      },
    });

    if (scaffold.data.skill !== args.outline.skill) {
      throw new GeneratedSkillBuildError(
        `Generated skill scaffold identity mismatch for ${args.outline.skill}`,
      );
    }

    const tracks: z.infer<typeof SkillBuildTrackReferenceSchema>[] = [];
    const trackResponses: {
      usage: UsageStats;
      responseModel?: string;
      numTurns?: number;
    }[] = [];
    for (const [index, track] of args.outline.tracks.entries()) {
      args.onStatus?.(
        `Track ${index + 1}/${args.outline.tracks.length}: ${track.title}`,
      );
      const result = await runStructuredSkillBuilderAgent({
        runtime: args.runtime,
        repoPath: args.repoPath,
        skillName: `${args.outline.skill}:track:${track.id}`,
        systemPrompt: trackSystemPrompt(args.outline),
        userPrompt: buildTrackPrompt({
          outline: args.outline,
          source: args.source,
          trackId: track.id,
        }),
        schema: SkillBuildTrackReferenceSchema,
        model: args.model,
        maxTurns: Math.min(
          args.maxTurns ?? defaultSynthesisMaxTurns(args.outline),
          defaultTrackMaxTurns(args.outline),
        ),
        abortController: args.abortController,
        repair: {
          apiKey: args.apiKey,
          model: args.repairModel,
          maxRetries: args.repairMaxRetries,
        },
      });
      if (
        result.data.skill !== args.outline.skill ||
        result.data.trackId !== track.id
      ) {
        throw new GeneratedSkillBuildError(
          `Generated track synthesis identity mismatch for ${args.outline.skill}:${track.id}`,
        );
      }
      tracks.push(result.data);
      trackResponses.push(result);
    }

    const output = combineOutputs({
      outline: args.outline,
      scaffold: scaffold.data,
      tracks,
    });
    const referenceManifest = flattenTrackReferences(output.trackBundles).map((reference) => ({
      trackId: reference.trackId,
      path: reference.path,
      role: reference.role,
      openWhen: reference.openWhen,
    }));

    const artifact = writeGeneratedArtifact({
      rootDir: args.rootDir,
      output,
      durationMs: performance.now() - startedAt,
      usage: aggregateUsage([
        scaffold.usage,
        ...trackResponses.map((track) => track.usage),
      ]),
      responseModel: summarizeResponseModel([
        scaffold.responseModel,
        ...trackResponses.map((track) => track.responseModel),
      ]),
      numTurns: summarizeTurns([
        scaffold.numTurns,
        ...trackResponses.map((track) => track.numTurns),
      ]),
    });

    writeSkillBuildState(statePath, {
      ...previousState,
      artifact: {
        version: GENERATED_SKILL_ARTIFACT_SCHEMA_VERSION,
        sourceHash: args.source.hash,
        outlineHash: outlineHash(args.outline),
        synthesisVersion: args.outline.synthesisVersion,
        name: artifact.name,
        trackIds: args.outline.tracks.map((track) => track.id),
        referenceManifest,
        bytes: artifact.bytes,
        durationMs: artifact.durationMs,
        usage: artifact.usage,
        externalSources: artifact.externalSources,
        missingInputs: artifact.missingInputs,
        responseModel: artifact.responseModel,
        numTurns: artifact.numTurns,
        generatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });

    return artifact;
  } catch (error) {
    if (error instanceof GeneratedSkillBuildError) {
      throw error;
    }
    if (error instanceof StructuredSkillBuilderAgentError) {
      throw new GeneratedSkillBuildError(
        `Generated skill synthesis failed for ${args.outline.skill}: ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }
}
