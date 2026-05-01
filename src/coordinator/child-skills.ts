import { createHash } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import { UsageStatsSchema, type UsageStats } from '../types/index.js';
import { aggregateUsage, emptyUsage } from '../sdk/usage.js';
import type { Runtime } from '../sdk/runtimes/index.js';
import {
  COORDINATOR_PLAN_CACHE_KIND,
  COORDINATOR_PLAN_CACHE_SCHEMA_VERSION,
  CoordinatorExternalSourceSchema,
  CoordinatorPlanCacheRecordSchema,
  CoordinatorPlanSchema,
  type CoordinatorPlan,
  type CoordinatorPlanCacheRecord,
  type CoordinatorSource,
  SUPERWARDEN_SYNTHESIS_MAX_TURNS,
} from './plan.js';
import { runStructuredSuperwardenAgent, StructuredSuperwardenAgentError } from './agentic.js';

type CoordinatorTask = CoordinatorPlan['tasks'][number];
type CoordinatorExternalSource = z.infer<typeof CoordinatorExternalSourceSchema>;
const COORDINATOR_CHILD_SYNTHESIS_SCHEMA_VERSION = 2;

const CoordinatorChildSkillCleanupItemSchema = z.object({
  targets: z.array(z.string().min(1)).min(1),
  issue: z.string().min(1),
  cleanup: z.string().min(1),
}).strict();

export const CoordinatorChildSkillCleanupReviewSchema = z.object({
  version: z.literal(1),
  parentSkill: z.string().min(1),
  summary: z.string().min(1),
  cleanupItems: z.array(CoordinatorChildSkillCleanupItemSchema).default([]),
}).strict();
export type CoordinatorChildSkillCleanupReview = z.infer<typeof CoordinatorChildSkillCleanupReviewSchema>;

const CoordinatorChildSkillSynthesisSchema = z.object({
  version: z.literal(1),
  parentSkill: z.string().min(1),
  taskId: z.string().min(1),
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

const CoordinatorChildSkillCacheEntrySchema = z.object({
  version: z.literal(COORDINATOR_CHILD_SYNTHESIS_SCHEMA_VERSION),
  parentSkill: z.string().min(1),
  taskId: z.string().min(1),
  taskHash: z.string().min(1),
  sourceHash: z.string().min(1),
  coordinatorVersion: z.string().min(1),
  name: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  durationMs: z.number().nonnegative(),
  usage: UsageStatsSchema,
  externalSources: z.array(CoordinatorExternalSourceSchema),
  missingInputs: z.array(z.string().min(1)),
  responseModel: z.string().optional(),
  numTurns: z.number().int().nonnegative().optional(),
  generatedAt: z.string().min(1),
}).strict();
type CoordinatorChildSkillCacheEntry = z.infer<typeof CoordinatorChildSkillCacheEntrySchema>;
type CoordinatorChildSkillParentCacheRecord = Omit<CoordinatorPlanCacheRecord, 'childSkills'> & {
  childSkills: Record<string, CoordinatorChildSkillCacheEntry>;
};

export interface CoordinatorChildSkillArtifact {
  source: 'cache' | 'generated';
  taskId: string;
  name: string;
  path: string;
  bytes: number;
  durationMs: number;
  usage: UsageStats;
  externalSources: CoordinatorExternalSource[];
  missingInputs: string[];
  responseModel?: string;
  numTurns?: number;
}

export interface WriteCoordinatorChildSkillsResult {
  rootDir: string;
  artifacts: CoordinatorChildSkillArtifact[];
  bytes: number;
  durationMs: number;
  usage: UsageStats;
}

function formatSiblingTasks(plan: CoordinatorPlan, task: CoordinatorTask): string {
  const siblings = plan.tasks.filter((candidate) => candidate.id !== task.id);
  if (siblings.length === 0) {
    return '- none';
  }
  return siblings
    .map((sibling) => {
      const exclusions = sibling.outOfScope.length > 0
        ? sibling.outOfScope.join('; ')
        : 'none recorded';
      return [
        `- ${sibling.id}: ${sibling.title}`,
        `  Scope: ${sibling.scope}`,
        `  Existing exclusions: ${exclusions}`,
      ].join('\n');
    })
    .join('\n');
}

export class CoordinatorChildSkillError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'CoordinatorChildSkillError';
  }
}

function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function frontmatterValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim().replace(/"/g, '\\"');
}

function childSkillName(taskId: string): string {
  return safePathSegment(taskId);
}

function childTaskHash(plan: CoordinatorPlan, task: CoordinatorTask): string {
  return sha256(JSON.stringify({
    parentSkill: plan.skill,
    sourceHash: plan.sourceHash,
    coordinatorVersion: plan.coordinatorVersion,
    task,
  }));
}

function byteLength(...contents: string[]): number {
  return contents.reduce((sum, content) => sum + Buffer.byteLength(content, 'utf-8'), 0);
}

function artifactByteLength(taskDir: string): number | undefined {
  try {
    return byteLength(
      readFileSync(join(taskDir, 'SKILL.md'), 'utf-8'),
      readFileSync(join(taskDir, 'SPEC.md'), 'utf-8'),
      readFileSync(join(taskDir, 'SOURCES.md'), 'utf-8'),
    );
  } catch {
    return undefined;
  }
}

function sourceBlocks(source: CoordinatorSource): string {
  return source.files
    .map((file) => `## ${file.path}\n\n${file.content}`)
    .join('\n\n---\n\n');
}

function childSynthesisSystemPrompt(): string {
  return `You synthesize one focused child skill for Warden's Superwarden system.

Use Read, Grep, and Glob to inspect relevant repository source, existing local patterns, configuration, and runtime contracts before writing the child skill. Use WebSearch or WebFetch for public prior art and current external documentation when framework, runtime, vulnerability, or ecosystem behavior affects the skill.

Do not send repository code, secrets, private file paths, or proprietary details to web tools. Use public framework, package, API, vulnerability class, and documentation names only.

Return only strict JSON. Never return prose, markdown, or a follow-up question. If context is missing, still return the JSON object and put the missing context in missingInputs.`;
}

function buildChildSynthesisPrompt(args: {
  plan: CoordinatorPlan;
  task: CoordinatorTask;
  source: CoordinatorSource;
  cacheFileName: string;
  childName: string;
}): string {
  const { plan, task, source, cacheFileName, childName } = args;
  return `Create a full child skill artifact for this Superwarden task.

This is not a template fill. Perform a complete child skill synthesis pass:
- inspect local repository source and patterns relevant to this task
- use public external sources when they materially affect correctness
- produce a self-contained Warden child skill with precise scope and evidence rules
- include source notes documenting the Superwarden plan, local source evidence, and external sources consulted
- represent missing context explicitly instead of inventing facts
- do not ask follow-up questions; put any missing context in missingInputs and still return valid JSON
- apply the skill-writer security-review quality bar: vulnerability prerequisites, exploitable dataflow examples, false-positive controls, severity/confidence calibration, concrete remediation patterns, and framework/runtime caveats
- keep the parent plan lean; expand nuance inside this child skill instead of assuming the parent task prompt already carried it all
- explicitly state what this child skill must not cover, using sibling tasks and parent out-of-scope items as hard boundaries

Return only JSON with this exact shape:
{
  "version": 1,
  "parentSkill": "${plan.skill}",
  "taskId": "${task.id}",
  "name": "${childName}",
  "description": "Focused one-line description of this child skill.",
  "skillBody": "Markdown body for SKILL.md. Do not include YAML frontmatter.",
  "specMd": "Complete SPEC.md markdown.",
  "sourcesMd": "Complete SOURCES.md markdown.",
  "externalSources": [
    {"title": "Source title", "url": "https://example.com", "reason": "Why this source informed the child skill"}
  ],
  "missingInputs": ["Missing context that would improve this child skill, if any"]
}

Required SKILL.md body contents:
- State that this is a Superwarden child skill for parent "${plan.skill}" and task "${task.id}".
- Instruct the execution agent to perform deep repo-local investigation with Read, Grep, and Glob.
- Instruct the execution agent to use WebSearch or WebFetch for current public documentation or prior art when external behavior affects findings.
- Prohibit sending repository code, secrets, private file paths, or proprietary details to web tools.
- Require changed-line anchoring and concrete evidence.
- Require normal Warden findings behavior: report only concrete findings accepted by Warden's existing report schema, and return no findings when evidence is insufficient. Do not invent a custom output schema.
- Include false-positive controls, exploitability prerequisites, confidence/severity calibration, and remediation expectations.
- Preserve the task scope, evidence requirements, and out-of-scope exclusions.
- Include an explicit "Do not cover" or equivalent out-of-scope subsection that names sibling tasks or their concerns when they are not owned by this child skill.
- Keep SKILL.md concise and runtime-focused. Put source inventory, coverage matrix, maintenance notes, and long rationale in SPEC.md or SOURCES.md instead of repeating it in SKILL.md.

Required SPEC.md structure:
# ${childName} Specification

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
# ${childName} Sources

## Source Inventory

Include a table with these columns: Source, Trust tier, Confidence, Contribution, Usage constraints.

## Decisions

Map important behavior decisions to source evidence.

## Coverage Matrix

Track security-review synthesis dimensions: vulnerability prerequisites, exploitable dataflow examples, false-positive controls, severity/confidence calibration, remediation patterns, and framework/runtime caveats.
If the child skill references SDK, API, integration, library, runtime option, or configuration behavior, also include rows for API surface, config/runtime options, common use cases, known issues/workarounds, and version/migration variance.

## Open Gaps

List missing context and concrete next retrieval or validation steps, or state why additional retrieval is currently low-yield.

## Changelog

Record this Superwarden synthesis pass.

Task:
${JSON.stringify(task, null, 2)}

Sibling tasks that this child skill must not absorb unless needed only to explain a boundary:
${formatSiblingTasks(plan, task)}

Parent plan cache:
${cacheFileName}

Parent Superwarden plan:
${JSON.stringify(plan, null, 2)}

Parent source material:

${sourceBlocks(source)}`;
}

function childCleanupReviewSystemPrompt(): string {
  return `You review a generated Superwarden child-skill set and identify cleanup work.

Use Read, Grep, and Glob to inspect the generated child skill artifacts, the parent plan, and the parent source material. You are not rewriting files in this pass. You are determining where scope, overlap, exclusions, or detail balance need cleanup.

Do not send repository code, secrets, private file paths, or proprietary details to web tools. Prefer local inspection for this review.

Return only strict JSON. Never return prose, markdown, or a follow-up question.`;
}

function buildChildCleanupReviewPrompt(args: {
  plan: CoordinatorPlan;
  source: CoordinatorSource;
  artifacts: CoordinatorChildSkillArtifact[];
  rootDir: string;
}): string {
  const artifactList = args.artifacts
    .map((artifact) => `- ${artifact.taskId}: ${artifact.path}`)
    .join('\n');

  return `Review the generated Superwarden child skills and determine what needs cleanup.

This is a review pass, not a rewrite pass.

Review goals:
- find overlapping task scopes that are likely to produce duplicate findings
- find child skills that do not explicitly say what they should not cover, especially sibling task concerns
- find places where the parent plan carries too much child-skill detail instead of just core constraints, evidence requirements, and boundaries
- find cleanup work needed to sharpen task ownership, exclusions, or prompt balance

Rules:
- do not rewrite files
- prefer concrete cleanup actions over vague criticism
- if nothing needs cleanup, say so in summary and return an empty cleanupItems array
- use "plan" as a target when the parent plan itself needs cleanup
- use task ids as targets for child-skill cleanup
- when overlap involves multiple tasks, include all affected task ids in targets

Return only JSON with this exact shape:
{
  "version": 1,
  "parentSkill": "${args.plan.skill}",
  "summary": "One-line summary of whether cleanup is needed.",
  "cleanupItems": [
    {
      "targets": ["plan"],
      "issue": "What is wrong or unclear.",
      "cleanup": "Concrete cleanup action."
    }
  ]
}

Parent plan:
${JSON.stringify(args.plan, null, 2)}

Generated child skill root:
${args.rootDir}

Generated child skills:
${artifactList}

Parent source material:

${sourceBlocks(args.source)}`;
}

function writeChildSkillArtifact(args: {
  taskDir: string;
  taskId: string;
  synthesis: z.infer<typeof CoordinatorChildSkillSynthesisSchema>;
  durationMs: number;
  usage: UsageStats;
  responseModel?: string;
  numTurns?: number;
}): CoordinatorChildSkillArtifact {
  const { taskDir, taskId, synthesis, durationMs, usage, responseModel, numTurns } = args;
  rmSync(taskDir, { recursive: true, force: true });
  mkdirSync(taskDir, { recursive: true });

  const skillContent = `---
name: ${synthesis.name}
description: "${frontmatterValue(synthesis.description)}"
allowed-tools: Read Grep Glob WebFetch WebSearch
---

${synthesis.skillBody.trim()}
`;
  const specContent = `${synthesis.specMd.trim()}\n`;
  const sourcesContent = `${synthesis.sourcesMd.trim()}\n`;
  const bytes = byteLength(skillContent, specContent, sourcesContent);

  writeFileSync(join(taskDir, 'SKILL.md'), skillContent, 'utf-8');
  writeFileSync(join(taskDir, 'SPEC.md'), specContent, 'utf-8');
  writeFileSync(join(taskDir, 'SOURCES.md'), sourcesContent, 'utf-8');

  const artifact: CoordinatorChildSkillArtifact = {
    source: 'generated',
    taskId,
    name: synthesis.name,
    path: taskDir,
    bytes,
    durationMs,
    usage,
    externalSources: synthesis.externalSources,
    missingInputs: synthesis.missingInputs,
    responseModel,
    numTurns,
  };
  return artifact;
}

function readParentCacheRecord(args: {
  cachePath: string;
  plan: CoordinatorPlan;
}): CoordinatorChildSkillParentCacheRecord {
  const { cachePath, plan } = args;
  const fallback: CoordinatorChildSkillParentCacheRecord = {
    version: COORDINATOR_PLAN_CACHE_SCHEMA_VERSION,
    kind: COORDINATOR_PLAN_CACHE_KIND,
    plan,
    childSkills: {},
  };

  if (!existsSync(cachePath)) {
    return fallback;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(cachePath, 'utf-8'));
  } catch {
    return fallback;
  }

  const cacheValidation = CoordinatorPlanCacheRecordSchema.safeParse(parsed);
  if (cacheValidation.success) {
    const childSkills: Record<string, CoordinatorChildSkillCacheEntry> = {};
    for (const [taskId, value] of Object.entries(cacheValidation.data.childSkills ?? {})) {
      const validation = CoordinatorChildSkillCacheEntrySchema.safeParse(value);
      if (validation.success) {
        childSkills[taskId] = validation.data;
      }
    }
    return {
      ...cacheValidation.data,
      childSkills,
    };
  }

  const planValidation = CoordinatorPlanSchema.safeParse(parsed);
  if (planValidation.success) {
    return {
      ...fallback,
      plan: planValidation.data,
    };
  }

  return fallback;
}

function writeCachedChildSkill(args: {
  cachePath: string;
  plan: CoordinatorPlan;
  task: CoordinatorTask;
  artifact: CoordinatorChildSkillArtifact;
}): void {
  const { cachePath, plan, task, artifact } = args;
  const record = readParentCacheRecord({ cachePath, plan });
  const childSkills = {
    ...record.childSkills,
    [task.id]: {
      version: COORDINATOR_CHILD_SYNTHESIS_SCHEMA_VERSION,
      parentSkill: plan.skill,
      taskId: task.id,
      taskHash: childTaskHash(plan, task),
      sourceHash: plan.sourceHash,
      coordinatorVersion: plan.coordinatorVersion,
      name: artifact.name,
      bytes: artifact.bytes,
      durationMs: artifact.durationMs,
      usage: artifact.usage,
      externalSources: artifact.externalSources,
      missingInputs: artifact.missingInputs,
      responseModel: artifact.responseModel,
      numTurns: artifact.numTurns,
      generatedAt: new Date().toISOString(),
    },
  };

  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(
    cachePath,
    `${JSON.stringify({
      version: COORDINATOR_PLAN_CACHE_SCHEMA_VERSION,
      kind: COORDINATOR_PLAN_CACHE_KIND,
      plan,
      parent: record['parent'],
      childSkills,
      updatedAt: new Date().toISOString(),
    }, null, 2)}\n`,
    'utf-8',
  );
}

function loadCachedChildSkill(args: {
  cachePath: string;
  taskDir: string;
  plan: CoordinatorPlan;
  task: CoordinatorTask;
}): CoordinatorChildSkillArtifact | undefined {
  const { cachePath, taskDir, plan, task } = args;
  if (!existsSync(join(taskDir, 'SKILL.md')) || !existsSync(join(taskDir, 'SPEC.md')) || !existsSync(join(taskDir, 'SOURCES.md'))) {
    return undefined;
  }

  const metadata = readParentCacheRecord({ cachePath, plan }).childSkills[task.id];
  if (!metadata) return undefined;
  const bytes = artifactByteLength(taskDir);
  if (
    metadata.parentSkill !== plan.skill ||
    metadata.taskId !== task.id ||
    metadata.taskHash !== childTaskHash(plan, task) ||
    metadata.sourceHash !== plan.sourceHash ||
    metadata.coordinatorVersion !== plan.coordinatorVersion ||
    bytes === undefined ||
    bytes !== metadata.bytes
  ) {
    return undefined;
  }

  return {
    source: 'cache',
    taskId: metadata.taskId,
    name: metadata.name,
    path: taskDir,
    bytes,
    durationMs: metadata.durationMs,
    usage: metadata.usage,
    externalSources: metadata.externalSources,
    missingInputs: metadata.missingInputs,
    responseModel: metadata.responseModel,
    numTurns: metadata.numTurns,
  };
}

/** Recreate the child-skill output directory when cached artifacts must be discarded. */
export function resetCoordinatorChildSkillsRoot(cachePath: string): string {
  const rootDir = getCoordinatorChildSkillsRoot(cachePath);
  rmSync(rootDir, { recursive: true, force: true });
  mkdirSync(rootDir, { recursive: true });
  return rootDir;
}

/** Ensure the child-skill output directory exists before reading or writing artifacts. */
export function ensureCoordinatorChildSkillsRoot(cachePath: string): string {
  const rootDir = getCoordinatorChildSkillsRoot(cachePath);
  mkdirSync(rootDir, { recursive: true });
  return rootDir;
}

/** Synthesize one runnable child skill for a single Superwarden task. */
export async function synthesizeCoordinatorChildSkill(args: {
  plan: CoordinatorPlan;
  task: CoordinatorTask;
  source: CoordinatorSource;
  cachePath: string;
  rootDir?: string;
  runtime: Runtime;
  repoPath: string;
  model?: string;
  maxTurns?: number;
  abortController?: AbortController;
  regenerate?: boolean;
  apiKey?: string;
  repairModel?: string;
  repairMaxRetries?: number;
}): Promise<CoordinatorChildSkillArtifact> {
  const { plan, task, source, cachePath, runtime, repoPath, model } = args;
  const startedAt = performance.now();
  const name = childSkillName(task.id);
  const cacheFileName = basename(cachePath);
  const rootDir = args.rootDir ?? getCoordinatorChildSkillsRoot(cachePath);
  const taskDir = join(rootDir, safePathSegment(task.id));

  try {
    if (!args.regenerate) {
      const cached = loadCachedChildSkill({ cachePath, taskDir, plan, task });
      if (cached) {
        return cached;
      }
    }

    const result = await runStructuredSuperwardenAgent({
      runtime,
      repoPath,
      skillName: `${name}:superwarden-child-synthesis`,
      systemPrompt: childSynthesisSystemPrompt(),
      userPrompt: buildChildSynthesisPrompt({
        plan,
        task,
        source,
        cacheFileName,
        childName: name,
      }),
      schema: CoordinatorChildSkillSynthesisSchema,
      model,
      maxTurns: args.maxTurns ?? SUPERWARDEN_SYNTHESIS_MAX_TURNS,
      abortController: args.abortController,
      repair: {
        apiKey: args.apiKey,
        model: args.repairModel,
        maxRetries: args.repairMaxRetries,
      },
    });

    if (result.data.parentSkill !== plan.skill || result.data.taskId !== task.id || result.data.name !== name) {
      throw new CoordinatorChildSkillError(
        `Child skill synthesis identity mismatch for ${task.id}`,
      );
    }

    const artifact = writeChildSkillArtifact({
      taskDir,
      taskId: task.id,
      synthesis: result.data,
      durationMs: result.durationMs || performance.now() - startedAt,
      usage: result.usage,
      responseModel: result.responseModel,
      numTurns: result.numTurns,
    });
    writeCachedChildSkill({
      cachePath,
      plan,
      task,
      artifact,
    });
    return artifact;
  } catch (error) {
    if (error instanceof CoordinatorChildSkillError) {
      throw error;
    }
    if (error instanceof StructuredSuperwardenAgentError) {
      throw new CoordinatorChildSkillError(
        `Child skill synthesis failed for ${task.id}: ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }
}

/** Review a generated child-skill set for overlap, exclusions, and cleanup work. */
export async function reviewCoordinatorChildSkills(args: {
  plan: CoordinatorPlan;
  source: CoordinatorSource;
  artifacts: CoordinatorChildSkillArtifact[];
  rootDir: string;
  runtime: Runtime;
  repoPath: string;
  model?: string;
  maxTurns?: number;
  abortController?: AbortController;
  apiKey?: string;
  repairModel?: string;
  repairMaxRetries?: number;
}): Promise<CoordinatorChildSkillCleanupReview> {
  try {
    const result = await runStructuredSuperwardenAgent({
      runtime: args.runtime,
      repoPath: args.repoPath,
      skillName: `${args.plan.skill}:superwarden-child-cleanup`,
      systemPrompt: childCleanupReviewSystemPrompt(),
      userPrompt: buildChildCleanupReviewPrompt({
        plan: args.plan,
        source: args.source,
        artifacts: args.artifacts,
        rootDir: args.rootDir,
      }),
      schema: CoordinatorChildSkillCleanupReviewSchema,
      model: args.model,
      maxTurns: args.maxTurns ?? SUPERWARDEN_SYNTHESIS_MAX_TURNS,
      abortController: args.abortController,
      repair: {
        apiKey: args.apiKey,
        model: args.repairModel,
        maxRetries: args.repairMaxRetries,
      },
    });

    if (result.data.parentSkill !== args.plan.skill) {
      throw new CoordinatorChildSkillError(
        `Child skill cleanup review identity mismatch for ${args.plan.skill}`,
      );
    }
    return result.data;
  } catch (error) {
    if (error instanceof CoordinatorChildSkillError) {
      throw error;
    }
    if (error instanceof StructuredSuperwardenAgentError) {
      throw new CoordinatorChildSkillError(
        `Child skill cleanup review failed for ${args.plan.skill}: ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }
}

/** Return the directory that stores runnable child skills for one cached plan. */
export function getCoordinatorChildSkillsRoot(cachePath: string): string {
  return join(dirname(cachePath), basename(cachePath, '.json'), 'skills');
}

/** Preserve the old API shape while forcing callers onto per-task synthesis. */
export function writeCoordinatorChildSkills(args: {
  plan: CoordinatorPlan;
  cachePath: string;
}): WriteCoordinatorChildSkillsResult {
  void args;
  throw new CoordinatorChildSkillError(
    'Superwarden child skills must be synthesized with synthesizeCoordinatorChildSkill',
  );
}

/** Aggregate generated child artifacts into one summary object for CLI reporting. */
export function buildCoordinatorChildSkillsResult(
  rootDir: string,
  artifacts: CoordinatorChildSkillArtifact[],
  durationMs: number,
): WriteCoordinatorChildSkillsResult {
  return {
    rootDir,
    artifacts,
    bytes: artifacts.reduce((sum, artifact) => sum + artifact.bytes, 0),
    durationMs: artifacts.length > 0
      ? artifacts.reduce((sum, artifact) => sum + artifact.durationMs, 0)
      : durationMs,
    usage: artifacts.length > 0
      ? aggregateUsage(artifacts.map((artifact) => artifact.usage))
      : emptyUsage(),
  };
}
