import { basename, join } from 'node:path';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import { aggregateUsage } from '../sdk/usage.js';
import type { Runtime } from '../sdk/runtimes/index.js';
import type { UsageStats } from '../types/index.js';
import { runStructuredSynthAgent, StructuredSynthAgentError } from './agentic.js';
import {
  clearSynthesizedSkillArtifacts,
} from './definition.js';
import {
  type SynthOutline,
  type SynthSource,
  outlineHash,
  readSynthState,
  writeSynthState,
} from './outline.js';

const SYNTH_SKILL_SCHEMA_VERSION = 1;
const GENERIC_SYNTH_MAX_TURNS = 8;
const LOCAL_SYNTH_MAX_TURNS = 16;
const GENERIC_TRACK_MAX_TURNS = 4;
const LOCAL_TRACK_MAX_TURNS = 8;

interface SynthExternalSource {
  title: string;
  url: string;
  reason: string;
}

const REQUIRED_CHECKLIST_INDEX_HEADINGS = [
  '## How To Use This Checklist',
  '## Track Index',
] as const;

const REQUIRED_TRACK_HEADINGS = [
  '## Intent',
  '## Relevance Signals',
  '## Investigate In Order',
  '## Evidence To Require',
  '## Safe Counterpatterns',
  '## False Positive Traps',
  '## Do Not Report',
  '## Severity And Confidence',
  '## Remediation Patterns',
  '## Research Anchors',
  '## Transformed Examples',
  '### True Positive',
  '### Safe Lookalike',
  '### Corrected Pattern',
] as const;

function hasMarkdownHeading(markdown: string, heading: string): boolean {
  return markdown.includes(`${heading}\n`) || markdown.endsWith(heading);
}

function isValidChecklistIndexMarkdown(markdown: string): boolean {
  const trimmed = markdown.trim();
  if (!trimmed.startsWith('# ') || !trimmed.includes(' Checklist')) {
    return false;
  }
  return REQUIRED_CHECKLIST_INDEX_HEADINGS.every((heading) => hasMarkdownHeading(trimmed, heading));
}

function isValidTrackMarkdown(markdown: string): boolean {
  const trimmed = markdown.trim();
  if (!trimmed.startsWith('# Track: ')) {
    return false;
  }
  return REQUIRED_TRACK_HEADINGS.every((heading) => hasMarkdownHeading(trimmed, heading));
}

function invalidTrackMarkdownMessage(): string {
  return (
    'Track markdown must contain the full track file contents with the required sections: ' +
    `${REQUIRED_TRACK_HEADINGS.join(', ')}`
  );
}

const SynthChecklistIndexMarkdownSchema = z.string()
  .min(200, 'Checklist index markdown must contain the full checklist index, not a placeholder or path')
  .refine(
    (value) => isValidChecklistIndexMarkdown(value),
    'Checklist index markdown must contain ## How To Use This Checklist and ## Track Index',
  );

const SynthTrackMarkdownSchema = z.string()
  .min(500, 'Track markdown must contain the full track reference, not a placeholder or path')
  .refine(
    (value) => isValidTrackMarkdown(value),
    invalidTrackMarkdownMessage(),
  );

const SynthSkillScaffoldSchema = z.object({
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

const SynthTrackReferenceSchema = z.object({
  version: z.literal(1),
  skill: z.string().min(1),
  trackId: z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1),
  markdown: SynthTrackMarkdownSchema,
  externalSources: z.array(z.object({
    title: z.string().min(1),
    url: z.string().min(1),
    reason: z.string().min(1),
  }).strict()).default([]),
  missingInputs: z.array(z.string().min(1)).default([]),
}).strict();

interface SynthTrackReference {
  id: string;
  title: string;
  markdown: string;
}

interface SynthSkillOutput {
  version: 1;
  skill: string;
  name: string;
  description: string;
  skillBody: string;
  specMd: string;
  sourcesMd: string;
  checklistMd: string;
  trackReferences: SynthTrackReference[];
  externalSources: SynthExternalSource[];
  missingInputs: string[];
}

export interface SynthesizedSkillArtifact {
  kind: 'synthesized-skill';
  source: 'cache' | 'generated';
  name: string;
  path: string;
  bytes: number;
  durationMs: number;
  usage: UsageStats;
  externalSources: SynthExternalSource[];
  missingInputs: string[];
  responseModel?: string;
  numTurns?: number;
}

export class SynthesizedSkillError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SynthesizedSkillError';
  }
}

function frontmatterValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim().replace(/"/g, '\\"');
}

function byteLength(...contents: string[]): number {
  return contents.reduce((sum, content) => sum + Buffer.byteLength(content, 'utf-8'), 0);
}

function trackReferencePath(rootDir: string, trackId: string): string {
  return join(rootDir, 'references', 'tracks', `${trackId}.md`);
}

function readTrackReferenceFiles(rootDir: string): { id: string; content: string }[] {
  const tracksDir = join(rootDir, 'references', 'tracks');
  if (!existsSync(tracksDir)) {
    return [];
  }

  return readdirSync(tracksDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => ({
      id: basename(entry.name, '.md'),
      content: readFileSync(join(tracksDir, entry.name), 'utf-8'),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function artifactTrackIds(rootDir: string): string[] {
  return readTrackReferenceFiles(rootDir).map((file) => file.id);
}

function artifactByteLength(rootDir: string): number | undefined {
  try {
    const trackContents = readTrackReferenceFiles(rootDir).map((file) => file.content);
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

function artifactsLookValid(rootDir: string): boolean {
  try {
    const checklistContent = readFileSync(join(rootDir, 'references', 'checklist.md'), 'utf-8');
    if (!isValidChecklistIndexMarkdown(checklistContent)) {
      return false;
    }

    const trackFiles = readTrackReferenceFiles(rootDir);
    if (trackFiles.length === 0) {
      return false;
    }

    return trackFiles.every((file) => isValidTrackMarkdown(file.content));
  } catch {
    return false;
  }
}

function sourceBlocks(source: SynthSource): string {
  return source.files
    .map((file) => `<document path="${file.path}">\n${file.content}\n</document>`)
    .join('\n\n');
}

function requiresRepoInspection(outline: SynthOutline): boolean {
  return outline.scopeProfile.localContextUsed ||
    outline.scopeProfile.kind === 'repository' ||
    outline.scopeProfile.kind === 'product';
}

function defaultSynthesisMaxTurns(outline: SynthOutline): number {
  return requiresRepoInspection(outline)
    ? LOCAL_SYNTH_MAX_TURNS
    : GENERIC_SYNTH_MAX_TURNS;
}

function defaultTrackMaxTurns(outline: SynthOutline): number {
  return requiresRepoInspection(outline)
    ? LOCAL_TRACK_MAX_TURNS
    : GENERIC_TRACK_MAX_TURNS;
}

function scaffoldSystemPrompt(outline: SynthOutline): string {
  const repoInspectionGuidance = requiresRepoInspection(outline)
    ? 'Use Read, Grep, and Glob to inspect only the repository context needed to frame the overall runtime skill, reference architecture, and evidence model.'
    : 'Do not inspect repository code just because a repo path is available. This skill is intentionally generic, so frame the runtime skill from the outline, bundled source material, and public prior art unless local repository context is explicitly required.';

  return `You synthesize one generated Warden skill from an internal outline.

${repoInspectionGuidance} Use WebSearch or WebFetch for public prior art and current external documentation when framework, runtime, vulnerability, or ecosystem behavior affects the skill.

Do not send repository code, secrets, private file paths, or proprietary details to web tools. Use public framework, package, API, vulnerability class, and documentation names only.

Return only strict JSON. Never return prose, markdown, or a follow-up question. If context is missing, still return the JSON object and put the missing context in missingInputs.`;
}

function trackSystemPrompt(outline: SynthOutline): string {
  const repoInspectionGuidance = requiresRepoInspection(outline)
    ? 'Use Read, Grep, and Glob only when the current track needs local repository details to sharpen investigation steps, safe counterpatterns, or false-positive controls.'
    : 'Do not inspect repository code just because a repo path is available. This track belongs to an intentionally generic skill, so write it from the outline, bundled source material, and public prior art unless local repository context is explicitly required.';

  return `You synthesize one deep reference track for a generated Warden skill.

${repoInspectionGuidance} Use WebSearch or WebFetch for public prior art and current external documentation when framework, runtime, vulnerability, or ecosystem behavior affects the track.

Do not send repository code, secrets, private file paths, or proprietary details to web tools. Use public framework, package, API, vulnerability class, and documentation names only.

Return only strict JSON. Never return prose, markdown, or a follow-up question. If context is missing, still return the JSON object and put the missing context in missingInputs.`;
}

function buildScaffoldPrompt(args: {
  outline: SynthOutline;
  source: SynthSource;
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
- depth should come from concrete track procedures, safe counterexamples, false-positive controls, remediation patterns, and transformed examples, not fake repo-specific detail or placeholder advice
- Use minimal prose throughout. Prefer terse bullets, ordered steps, short tables, and compact directive lines over explanatory paragraphs.
- Keep every section dense and scannable. Do not write essays, narrative transitions, or long background paragraphs.
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
- Instruct the execution agent to open only the relevant references/tracks/<track-id>.md modules for the current file and hunk.
- Instruct the execution agent to identify the relevant checklist tracks for the current file and hunk before doing deeper investigation.
- Instruct the execution agent to execute the selected checklist tracks sequentially.
- Instruct the execution agent to perform deep repo-local investigation with Read, Grep, and Glob.
- Instruct the execution agent to use WebSearch or WebFetch for current public documentation or prior art when external behavior affects findings.
- Prohibit sending repository code, secrets, private file paths, or proprietary details to web tools.
- Require changed-line anchoring, explicit verification, and normal Warden findings behavior.
- Keep SKILL.md concise and runtime-focused. Put the bulk of the task list in references/checklist.md and the bulk of the depth in references/tracks/<track-id>.md.
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

Map each outline track id to the generated checklist track that owns it.

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
  outline: SynthOutline;
  source: SynthSource;
  trackId: string;
}): string {
  const track = args.outline.tracks.find((item) => item.id === args.trackId);
  if (!track) {
    throw new SynthesizedSkillError(
      `Unknown track "${args.trackId}" for synthesized skill ${args.outline.skill}`,
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
Create one deep checklist track for outline track "${track.id}".

This step owns exactly one track:
- track id: "${track.id}"
- title: "${track.title}"

Rules:
- Do not rename the track id.
- Do not cover other outline tracks.
- Preserve the track's ownership boundaries, exclusions, checks, relevanceSignals, safeCounterpatterns, falsePositiveTraps, and researchHints.
- Use minimal prose. Prefer terse bullets, short numbered steps, and compact examples.
- Keep each section dense and scannable. Do not write essays or narrative paragraphs.
${requiresRepoInspection(args.outline)
    ? '- This outline is locally grounded. Use Read, Grep, and Glob only when local repository details materially improve this track.'
    : '- This outline is intentionally generic. Do not inspect repository code, local file paths, or project structure just because repoPath is available. Build the track from the blueprint, bundled source material, and public prior art only.'}

Return only JSON with this exact shape:
{
  "version": 1,
  "skill": "${args.outline.skill}",
  "trackId": "${track.id}",
  "title": "${track.title}",
  "markdown": "# Track: ${track.title}\\n\\n## Intent\\n...",
  "externalSources": [
    {"title": "Source title", "url": "https://example.com", "reason": "Why this source informed the track"}
  ],
  "missingInputs": ["Missing context that would improve this track, if any"]
}

The markdown field must contain the full track file contents itself. Never return a file path, filename, placeholder label, or "see references/tracks/...".

Required markdown structure:

# Track: ${track.title}

## Intent

## Relevance Signals
- concrete file, hunk, or behavioral cues

## Investigate In Order
1. ordered steps
2. ordered steps

## Evidence To Require
- concrete evidence requirements

## Safe Counterpatterns
- patterns that should suppress or downgrade weak findings

## False Positive Traps
- shallow misreads, sibling overlap traps, or pattern-only claims to avoid

## Do Not Report
- boundaries and sibling exclusions

## Severity And Confidence
- calibration guidance

## Remediation Patterns
- concrete safe or corrected approaches

## Research Anchors
- public docs, runtime topics, or prior-art areas to consult when needed

## Transformed Examples

### True Positive

### Safe Lookalike

### Corrected Pattern

Keep each section terse. Prefer short bullets, short numbered steps, and compact examples over prose paragraphs.
</instructions>`;
}

function compileChecklistIndex(outline: SynthOutline): string {
  const lines = [
    `# ${outline.skill} Checklist`,
    '',
    '## How To Use This Checklist',
    '',
    '1. Classify which checklist tracks are relevant to the current file and hunk.',
    '2. Ignore unrelated tracks instead of running every track on every hunk.',
    '3. Open only the matching `references/tracks/<track-id>.md` files.',
    '4. Execute the relevant tracks in order.',
    '5. Read local source and public prior art only when the selected track needs it.',
    '6. Report only findings with concrete changed-line evidence.',
    '',
    '## Track Index',
    '',
  ];

  for (const track of outline.tracks) {
    lines.push(`### ${track.title} (\`${track.id}\`)`);
    for (const signal of track.relevanceSignals.slice(0, 3)) {
      lines.push(`- ${signal}`);
    }
    lines.push(`- Open \`references/tracks/${track.id}.md\`.`);
    lines.push('');
  }

  const compiled = lines.join('\n');
  const validation = SynthChecklistIndexMarkdownSchema.safeParse(compiled);
  if (!validation.success) {
    throw new SynthesizedSkillError(
      `Compiled checklist index was invalid for ${outline.skill}: ${validation.error.message}`,
    );
  }
  return compiled;
}

function combineOutputs(args: {
  outline: SynthOutline;
  scaffold: z.infer<typeof SynthSkillScaffoldSchema>;
  tracks: z.infer<typeof SynthTrackReferenceSchema>[];
}): SynthSkillOutput {
  const trackReferences: SynthTrackReference[] = args.outline.tracks.map((outlineTrack) => {
    const track = args.tracks.find((item) => item.trackId === outlineTrack.id);
    if (!track) {
      throw new SynthesizedSkillError(
        `Track "${outlineTrack.id}" was not synthesized for ${args.outline.skill}`,
      );
    }
    if (track.title !== outlineTrack.title) {
      throw new SynthesizedSkillError(
        `Track "${track.trackId}" title "${track.title}" must match outline title "${outlineTrack.title}" for ${args.outline.skill}`,
      );
    }
    return {
      id: outlineTrack.id,
      title: outlineTrack.title,
      markdown: track.markdown,
    };
  });

  return {
    version: 1,
    skill: args.outline.skill,
    name: args.scaffold.name,
    description: args.scaffold.description,
    skillBody: args.scaffold.skillBody,
    specMd: args.scaffold.specMd,
    sourcesMd: args.scaffold.sourcesMd,
    checklistMd: compileChecklistIndex(args.outline),
    trackReferences,
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

function loadCachedArtifact(args: {
  rootDir: string;
  outline: SynthOutline;
  source: SynthSource;
}): SynthesizedSkillArtifact | undefined {
  if (
    !existsSync(join(args.rootDir, 'SKILL.md')) ||
    !existsSync(join(args.rootDir, 'SPEC.md')) ||
    !existsSync(join(args.rootDir, 'SOURCES.md')) ||
    !existsSync(join(args.rootDir, 'references', 'checklist.md')) ||
    readTrackReferenceFiles(args.rootDir).length === 0
  ) {
    return undefined;
  }
  if (!artifactsLookValid(args.rootDir)) {
    return undefined;
  }

  const state = readSynthState(join(args.rootDir, 'synthesis.json'));
  const metadata = state?.artifact;
  const bytes = artifactByteLength(args.rootDir);
  const trackIds = artifactTrackIds(args.rootDir);
  if (!metadata || bytes === undefined) {
    return undefined;
  }

  if (
    metadata.sourceHash !== args.source.hash ||
    metadata.outlineHash !== outlineHash(args.outline) ||
    metadata.synthesisVersion !== args.outline.synthesisVersion ||
    JSON.stringify(metadata.trackIds) !== JSON.stringify(trackIds) ||
    metadata.bytes !== bytes
  ) {
    return undefined;
  }

  return {
    kind: 'synthesized-skill',
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
  output: SynthSkillOutput;
  durationMs: number;
  usage: UsageStats;
  responseModel?: string;
  numTurns?: number;
}): SynthesizedSkillArtifact {
  clearSynthesizedSkillArtifacts(args.rootDir);
  mkdirSync(join(args.rootDir, 'references', 'tracks'), { recursive: true });

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
  const trackContents = args.output.trackReferences.map((track) => `${track.markdown.trim()}\n`);
  const bytes = byteLength(skillContent, specContent, sourcesContent, checklistContent, ...trackContents);

  writeFileSync(join(args.rootDir, 'SKILL.md'), skillContent, 'utf-8');
  writeFileSync(join(args.rootDir, 'SPEC.md'), specContent, 'utf-8');
  writeFileSync(join(args.rootDir, 'SOURCES.md'), sourcesContent, 'utf-8');
  writeFileSync(join(args.rootDir, 'references', 'checklist.md'), checklistContent, 'utf-8');
  for (const track of args.output.trackReferences) {
    writeFileSync(trackReferencePath(args.rootDir, track.id), `${track.markdown.trim()}\n`, 'utf-8');
  }

  return {
    kind: 'synthesized-skill',
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

export async function synthesizeGeneratedSkill(args: {
  outline: SynthOutline;
  source: SynthSource;
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
}): Promise<SynthesizedSkillArtifact> {
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

    const previousState = readSynthState(statePath);
    if (!previousState) {
      throw new SynthesizedSkillError(
        `Missing synthesized skill outline state for ${args.outline.skill}`,
      );
    }

    args.onStatus?.('Writing router scaffold');
    const scaffold = await runStructuredSynthAgent({
      runtime: args.runtime,
      repoPath: args.repoPath,
      skillName: `${args.outline.skill}:generated-skill`,
      systemPrompt: scaffoldSystemPrompt(args.outline),
      userPrompt: buildScaffoldPrompt({
        outline: args.outline,
        source: args.source,
      }),
      schema: SynthSkillScaffoldSchema,
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
      throw new SynthesizedSkillError(
        `Generated skill scaffold identity mismatch for ${args.outline.skill}`,
      );
    }

    const tracks: z.infer<typeof SynthTrackReferenceSchema>[] = [];
    const trackResponses: {
      usage: UsageStats;
      responseModel?: string;
      numTurns?: number;
    }[] = [];
    for (const [index, track] of args.outline.tracks.entries()) {
      args.onStatus?.(
        `Track ${index + 1}/${args.outline.tracks.length}: ${track.title}`,
      );
      const result = await runStructuredSynthAgent({
        runtime: args.runtime,
        repoPath: args.repoPath,
        skillName: `${args.outline.skill}:track:${track.id}`,
        systemPrompt: trackSystemPrompt(args.outline),
        userPrompt: buildTrackPrompt({
          outline: args.outline,
          source: args.source,
          trackId: track.id,
        }),
        schema: SynthTrackReferenceSchema,
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
        throw new SynthesizedSkillError(
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

    writeSynthState(statePath, {
      ...previousState,
      artifact: {
        version: SYNTH_SKILL_SCHEMA_VERSION,
        sourceHash: args.source.hash,
        outlineHash: outlineHash(args.outline),
        synthesisVersion: args.outline.synthesisVersion,
        name: artifact.name,
        trackIds: artifactTrackIds(artifact.path),
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
    if (error instanceof SynthesizedSkillError) {
      throw error;
    }
    if (error instanceof StructuredSynthAgentError) {
      throw new SynthesizedSkillError(
        `Generated skill synthesis failed for ${args.outline.skill}: ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }
}
