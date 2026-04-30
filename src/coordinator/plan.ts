import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import type { SkillDefinition } from '../config/schema.js';
import { getVersion } from '../utils/index.js';
import type { Runtime, RuntimeName } from '../sdk/runtimes/index.js';
import { getRuntime } from '../sdk/runtimes/index.js';
import { UsageStatsSchema, type UsageStats } from '../types/index.js';
import { runStructuredSuperwardenAgent, StructuredSuperwardenAgentError } from './agentic.js';

export const COORDINATOR_PLAN_SCHEMA_VERSION = 1;
export const COORDINATOR_PLAN_CACHE_SCHEMA_VERSION = 1;
export const COORDINATOR_PLAN_CACHE_KIND = 'superwarden-plan-cache';
export const COORDINATOR_VERSION = '1';
export const COORDINATOR_METADATA_FILE = 'warden.yaml';
export const SUPERWARDEN_SYNTHESIS_MAX_TOKENS = 64000;
export const SUPERWARDEN_SYNTHESIS_TIMEOUT_MS = 180_000;
export const SUPERWARDEN_SYNTHESIS_MAX_TURNS = 80;

const CoordinatorPhaseStatusSchema = z.enum(['cached', 'generated', 'validated']);

export const CoordinatorExternalSourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().min(1),
  reason: z.string().min(1),
}).strict();

export const CoordinatorPhaseSchema = z.object({
  id: z.string().min(1),
  status: CoordinatorPhaseStatusSchema,
}).strict();

export const CoordinatorTaskSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1),
  scope: z.string().min(1),
  prompt: z.string().min(1),
  evidenceRequirements: z.array(z.string().min(1)).min(1),
  outOfScope: z.array(z.string().min(1)).default([]),
}).strict();

export const CoordinatorPlanSchema = z.object({
  version: z.literal(COORDINATOR_PLAN_SCHEMA_VERSION),
  skill: z.string().min(1),
  sourceHash: z.string().min(1),
  coordinatorVersion: z.string().min(1),
  synthesis: z.object({
    phases: z.array(CoordinatorPhaseSchema).min(1),
    externalSources: z.array(CoordinatorExternalSourceSchema).optional(),
    missingInputs: z.array(z.string().min(1)).optional(),
  }).strict(),
  tasks: z.array(CoordinatorTaskSchema).min(1),
}).strict();

export type CoordinatorPlan = z.infer<typeof CoordinatorPlanSchema>;

export const CoordinatorPlanCacheRecordSchema = z.object({
  version: z.literal(COORDINATOR_PLAN_CACHE_SCHEMA_VERSION),
  kind: z.literal(COORDINATOR_PLAN_CACHE_KIND),
  plan: CoordinatorPlanSchema,
  parent: z.object({
    durationMs: z.number().nonnegative().optional(),
    usage: UsageStatsSchema.optional(),
    responseModel: z.string().optional(),
    numTurns: z.number().int().nonnegative().optional(),
  }).strict().optional(),
  childSkills: z.record(z.string(), z.unknown()).default({}),
  updatedAt: z.string().optional(),
}).passthrough();

export type CoordinatorPlanCacheRecord = z.infer<typeof CoordinatorPlanCacheRecordSchema>;

export const CoordinatorMetadataSchema = z.object({
  version: z.literal(1),
  kind: z.enum(['superwarden-skill', 'parent-skill']).optional(),
  name: z.string().min(1).optional(),
  mode: z.literal('coordinator').optional(),
  initialPrompt: z.string().min(1),
  sourceFiles: z.array(z.string().min(1)).optional(),
  outputFiles: z.array(z.string().min(1)).optional(),
  instructions: z.array(z.string().min(1)).optional(),
  coverage: z.array(z.string().min(1)).optional(),
}).passthrough();
export type CoordinatorMetadata = z.infer<typeof CoordinatorMetadataSchema>;

export interface CoordinatorSourceFile {
  path: string;
  content: string;
}

export interface CoordinatorSource {
  hash: string;
  files: CoordinatorSourceFile[];
}

export type CoordinatorPlanSource = 'cache' | 'generated';

export interface CoordinatorSynthesisResult {
  plan: CoordinatorPlan;
  source: CoordinatorPlanSource;
  cachePath: string;
  usage?: UsageStats;
  durationMs?: number;
  responseModel?: string;
  numTurns?: number;
}

export interface SynthesizeCoordinatorPlanOptions {
  skill: SkillDefinition;
  runtime?: Runtime;
  runtimeName?: RuntimeName;
  apiKey?: string;
  model?: string;
  maxRetries?: number;
  regenerate?: boolean;
  abortController?: AbortController;
  cacheDir?: string;
  repoPath?: string;
  maxTurns?: number;
  repairModel?: string;
  repairMaxRetries?: number;
}

export class CoordinatorPlanError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'CoordinatorPlanError';
  }
}

export function coordinatorExecutionUnavailableMessage(skillName: string): string {
  return (
    `Skill ${skillName} is configured as a Superwarden skill (mode = "coordinator"), ` +
    'but this entry point does not execute Superwarden skills yet. ' +
    `Use "warden <target> --skill ${skillName}" locally, or "warden synth ${skillName} --show-plan" to inspect the plan.`
  );
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function readIfExists(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  return readFileSync(path, 'utf-8');
}

function readCoordinatorMetadata(rootDir: string, skillName: string): CoordinatorSourceFile | undefined {
  const path = join(rootDir, COORDINATOR_METADATA_FILE);
  const content = readIfExists(path);
  if (content === undefined) return undefined;

  let parsed: unknown;
  try {
    parsed = parseYaml(content);
  } catch (error) {
    throw new CoordinatorPlanError(
      `Superwarden metadata is not valid YAML: ${COORDINATOR_METADATA_FILE}`,
      { cause: error },
    );
  }

  const validation = CoordinatorMetadataSchema.safeParse(parsed);
  if (!validation.success) {
    throw new CoordinatorPlanError(
      `Superwarden metadata is invalid: ${validation.error.message}`,
      { cause: validation.error },
    );
  }

  if (validation.data.name && validation.data.name !== skillName) {
    throw new CoordinatorPlanError(
      `Superwarden metadata skill mismatch: expected ${skillName}, got ${validation.data.name}`,
    );
  }

  return { path: COORDINATOR_METADATA_FILE, content };
}

function collectReferenceFiles(rootDir: string): CoordinatorSourceFile[] {
  const referencesDir = join(rootDir, 'references');
  if (!existsSync(referencesDir)) return [];

  return readdirSync(referencesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => {
      const path = join(referencesDir, entry.name);
      return {
        path: `references/${entry.name}`,
        content: readFileSync(path, 'utf-8'),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function collectCoordinatorSource(skill: SkillDefinition): CoordinatorSource {
  const files: CoordinatorSourceFile[] = [
    {
      path: 'SKILL.md',
      content: skill.prompt,
    },
  ];

  if (skill.rootDir) {
    const metadata = readCoordinatorMetadata(skill.rootDir, skill.name);
    if (metadata) {
      files.push(metadata);
    }
    for (const fileName of ['SPEC.md', 'SOURCES.md']) {
      const content = readIfExists(join(skill.rootDir, fileName));
      if (content !== undefined) {
        files.push({ path: fileName, content });
      }
    }
    files.push(...collectReferenceFiles(skill.rootDir));
  }

  const hashInput = JSON.stringify({
    skill: skill.name,
    description: skill.description,
    files,
  });

  return {
    hash: sha256(hashInput),
    files,
  };
}

export function getCoordinatorCacheDir(): string {
  const stateDir = process.env['WARDEN_STATE_DIR'];
  const root = stateDir ?? join(homedir(), '.local', 'warden');
  return join(root, 'superwarden-plans');
}

function coordinatorCacheKey(args: {
  skillName: string;
  sourceHash: string;
  model?: string;
}): string {
  return sha256(JSON.stringify({
    skillName: args.skillName,
    sourceHash: args.sourceHash,
    coordinatorVersion: COORDINATOR_VERSION,
    schemaVersion: COORDINATOR_PLAN_SCHEMA_VERSION,
    wardenVersion: getVersion(),
    model: args.model ?? 'default',
  }));
}

export function getCoordinatorPlanCachePath(args: {
  skillName: string;
  sourceHash: string;
  model?: string;
  cacheDir?: string;
}): string {
  if (args.cacheDir) {
    return join(args.cacheDir, `${coordinatorCacheKey(args)}.json`);
  }
  const safeName = args.skillName.replace(/[^a-zA-Z0-9._-]/g, '-');
  return join(getCoordinatorCacheDir(), `${safeName}-${coordinatorCacheKey(args)}.json`);
}

function parseCachedPlan(cachePath: string, skillName: string, sourceHash: string): CoordinatorPlan {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(cachePath, 'utf-8'));
  } catch (error) {
    throw new CoordinatorPlanError(
      `Cached Superwarden plan is unreadable: ${cachePath}. Regenerate the plan.`,
      { cause: error },
    );
  }

  const cacheValidation = CoordinatorPlanCacheRecordSchema.safeParse(parsed);
  if (cacheValidation.success) {
    validatePlanIdentity(cacheValidation.data.plan, skillName, sourceHash);
    return cacheValidation.data.plan;
  }

  const validation = CoordinatorPlanSchema.safeParse(parsed);
  if (!validation.success) {
    throw new CoordinatorPlanError(
      `Cached Superwarden plan is invalid: ${validation.error.message}. Regenerate the plan.`,
      { cause: validation.error },
    );
  }

  validatePlanIdentity(validation.data, skillName, sourceHash);
  return validation.data;
}

function validatePlanIdentity(plan: CoordinatorPlan, skillName: string, sourceHash: string): void {
  if (plan.skill !== skillName) {
    throw new CoordinatorPlanError(
      `Superwarden plan skill mismatch: expected ${skillName}, got ${plan.skill}`,
    );
  }
  if (plan.sourceHash !== sourceHash) {
    throw new CoordinatorPlanError(
      `Superwarden plan source hash mismatch for ${skillName}. Regenerate the plan.`,
    );
  }
  if (plan.coordinatorVersion !== COORDINATOR_VERSION) {
    throw new CoordinatorPlanError(
      `Superwarden plan version mismatch for ${skillName}. Regenerate the plan.`,
    );
  }
}

function buildSynthesisPrompt(skill: SkillDefinition, source: CoordinatorSource): string {
  const sourceBlocks = source.files
    .map((file) => `## ${file.path}\n\n${file.content}`)
    .join('\n\n---\n\n');

  return `You are Warden's native Superwarden plan synthesizer.

Create a strict JSON Superwarden plan for one broad Superwarden skill. Treat this like an agent-quality planning pass and skill-writer quality synthesis pass, not a shallow topic split.

Rules:
- Return only a JSON object. No markdown, prose, or code fences.
- Use version ${COORDINATOR_PLAN_SCHEMA_VERSION}.
- Use skill "${skill.name}".
- Use sourceHash "${source.hash}" exactly.
- Use coordinatorVersion "${COORDINATOR_VERSION}" exactly.
- Split by analysis concern, not file type, severity, or implementation phase.
- Prefer 3 to 8 focused tasks.
- Each task must have an id, title, scope, prompt, evidenceRequirements, and outOfScope.
- Task ids must be lowercase kebab-case.
- If the source material contains explicit coverage items, every item must map clearly to at least one task id, title, scope, or prompt. Do not silently drop or vaguely merge named coverage areas.
- Prompts must be self-contained, focused, and preserve the Superwarden skill's intent.
- Each prompt must describe an independent agent-quality investigation for that concern, including repo-local source inspection, data-flow tracing, relevant prior-art research, and current public documentation when those would affect correctness.
- Each prompt must state how to handle missing repository, technology, deployment, or threat-model context without inventing facts.
- Evidence requirements must force concrete verification, changed-line anchoring, source material, and public prior-art references when used.
- Out-of-scope exclusions must prevent generic style or unrelated-review findings.
- If ${COORDINATOR_METADATA_FILE} is present, treat it as the Superwarden skill's initial prompt and metadata contract.
- If the source material is too thin for a safe decomposition, make that explicit inside task prompts and evidence requirements. Do not silently invent coverage areas.
- Do not ask follow-up questions or return prose. If context is missing, still return valid JSON and put that context in synthesis.missingInputs.
- Keep all generated task instructions executable by Warden's normal hunk analysis model: tasks must be focused, inspectable, and able to return an empty findings array when evidence is insufficient.
- Do not rely on Claude Code Task delegation, hidden subagents, or side-effect tools.

JSON shape:
{
  "version": ${COORDINATOR_PLAN_SCHEMA_VERSION},
  "skill": "${skill.name}",
  "sourceHash": "${source.hash}",
  "coordinatorVersion": "${COORDINATOR_VERSION}",
  "synthesis": {
    "phases": [
      {"id": "collect-inputs", "status": "generated"},
      {"id": "assess-source-depth", "status": "generated"},
      {"id": "identify-research-needs", "status": "generated"},
      {"id": "synthesize-tasks", "status": "generated"},
      {"id": "validate-coverage", "status": "validated"}
    ],
    "externalSources": [
      {"title": "Public source title", "url": "https://example.com/source", "reason": "Why this source informed the decomposition"}
    ],
    "missingInputs": ["Context that would improve synthesis, if any"]
  },
  "tasks": [
    {
      "id": "example-task",
      "title": "Example task",
      "scope": "One-sentence scope.",
      "prompt": "Focused task instructions for an independent deep investigation.",
      "evidenceRequirements": ["concrete evidence requirement with source or prior-art expectations"],
      "outOfScope": ["explicit exclusion"]
    }
  ]
}

Quality bar:
- The Superwarden plan should read like the parent skill was decomposed by an expert who understood the supplied SPEC, SOURCES, references, and initial prompt.
- Child tasks should be specific enough that separate executions produce distinct findings and avoid duplicate reports.
- Child tasks should require relevant source material, such as changed code, nearby callers, configuration, runtime contracts, and references bundled with the skill.
- Child tasks should instruct agents to find online prior art when current external behavior matters, such as framework security guidance, runtime tool permission behavior, vulnerability classes, or ecosystem conventions.
- Child tasks should prohibit sending repository code, secrets, private file paths, or proprietary details to web tools.
- Child tasks should withhold findings when evidence is incomplete; missing information is not itself a finding unless the parent skill explicitly asks for missing controls.

Skill description:
${skill.description}

Source material:

${sourceBlocks}`;
}

function buildSynthesisSystemPrompt(): string {
  return `You are Warden's native Superwarden plan synthesizer.

Use Read, Grep, and Glob to inspect relevant repository source before deciding how to decompose the parent Superwarden skill. Use WebSearch or WebFetch for public prior art and current external documentation when framework, runtime, vulnerability, or ecosystem behavior affects the plan.

Do not send repository code, secrets, private file paths, or proprietary details to web tools. Use public framework, package, API, vulnerability class, and documentation names only.

Return only the strict JSON object requested by the user prompt. Never return prose or follow-up questions.`;
}

function writePlan(cachePath: string, plan: CoordinatorPlan, parent?: CoordinatorPlanCacheRecord['parent']): void {
  mkdirSync(dirname(cachePath), { recursive: true });
  const record: CoordinatorPlanCacheRecord = {
    version: COORDINATOR_PLAN_CACHE_SCHEMA_VERSION,
    kind: COORDINATOR_PLAN_CACHE_KIND,
    plan,
    parent,
    childSkills: {},
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(cachePath, `${JSON.stringify(record, null, 2)}\n`, 'utf-8');
}

export async function synthesizeCoordinatorPlan(
  options: SynthesizeCoordinatorPlanOptions,
): Promise<CoordinatorSynthesisResult> {
  const { skill, apiKey, model, maxRetries, regenerate = false } = options;
  const runtime = options.runtime ?? getRuntime(options.runtimeName ?? 'claude');
  const source = collectCoordinatorSource(skill);
  const cachePath = getCoordinatorPlanCachePath({
    skillName: skill.name,
    sourceHash: source.hash,
    model,
    cacheDir: options.cacheDir,
  });

  if (existsSync(cachePath) && !regenerate) {
    const plan = parseCachedPlan(cachePath, skill.name, source.hash);
    return { plan, source: 'cache', cachePath };
  }

  if (options.repoPath) {
    try {
      const result = await runStructuredSuperwardenAgent({
        runtime,
        repoPath: options.repoPath,
        skillName: `${skill.name}:superwarden-plan`,
        systemPrompt: buildSynthesisSystemPrompt(),
        userPrompt: buildSynthesisPrompt(skill, source),
        schema: CoordinatorPlanSchema,
        model,
        maxTurns: options.maxTurns ?? SUPERWARDEN_SYNTHESIS_MAX_TURNS,
        abortController: options.abortController,
        repair: {
          apiKey,
          model: options.repairModel,
          maxRetries: options.repairMaxRetries ?? maxRetries,
        },
      });

      validatePlanIdentity(result.data, skill.name, source.hash);
      writePlan(cachePath, result.data, {
        usage: result.usage,
        durationMs: result.durationMs,
        responseModel: result.responseModel,
        numTurns: result.numTurns,
      });

      return {
        plan: result.data,
        source: 'generated',
        cachePath,
        usage: result.usage,
        durationMs: result.durationMs,
        responseModel: result.responseModel,
        numTurns: result.numTurns,
      };
    } catch (error) {
      if (error instanceof StructuredSuperwardenAgentError) {
        throw new CoordinatorPlanError(`Superwarden synthesis failed: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  const result = await runtime.runAuxiliary({
    task: 'superwarden_synthesis',
    apiKey,
    prompt: buildSynthesisPrompt(skill, source),
    schema: CoordinatorPlanSchema,
    model,
    maxTokens: SUPERWARDEN_SYNTHESIS_MAX_TOKENS,
    timeout: SUPERWARDEN_SYNTHESIS_TIMEOUT_MS,
    maxRetries,
  });

  if (!result.success) {
    throw new CoordinatorPlanError(`Superwarden synthesis failed: ${result.error}`);
  }

  validatePlanIdentity(result.data, skill.name, source.hash);
  writePlan(cachePath, result.data, {
    usage: result.usage,
  });

  return {
    plan: result.data,
    source: 'generated',
    cachePath,
    usage: result.usage,
  };
}

export function describeCoordinatorPlan(plan: CoordinatorPlan): string {
  const taskList = plan.tasks
    .map((task) => `  - ${task.id}: ${task.title}`)
    .join('\n');
  return `${plan.skill}: ${plan.tasks.length} tasks\n${taskList}`;
}

export function defaultCoordinatorExportPath(skillName: string): string {
  return `${basename(skillName)}-superwarden-plan.json`;
}
