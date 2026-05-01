import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
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
import { collectCoordinatorPlanFeedbackFiles } from './feedback.js';

export const COORDINATOR_PLAN_SCHEMA_VERSION = 2;
export const COORDINATOR_PLAN_CACHE_SCHEMA_VERSION = 1;
export const COORDINATOR_PLAN_CACHE_KIND = 'superwarden-plan-cache';
export const COORDINATOR_VERSION = '3';
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

export const CoordinatorScopeProfileSchema = z.object({
  kind: z.enum(['domain', 'ecosystem', 'repository', 'product']),
  subject: z.string().min(1),
  localContextUsed: z.boolean(),
  observedContext: z.array(z.string().min(1)).min(1),
  unresolvedContext: z.array(z.string().min(1)).default([]),
}).strict().superRefine((value, ctx) => {
  if (value.kind === 'repository' && !value.localContextUsed) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'repository scope requires localContextUsed to be true',
      path: ['localContextUsed'],
    });
  }
  if (value.localContextUsed && value.observedContext.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'observedContext is required when localContextUsed is true',
      path: ['observedContext'],
    });
  }
});

export const CoordinatorTaskSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1),
  goal: z.string().min(1),
  rationale: z.string().min(1),
  sourceSignals: z.array(z.string().min(1)).min(1),
  owns: z.array(z.string().min(1)).min(1),
  excludes: z.array(z.string().min(1)).default([]),
  evidenceFocus: z.array(z.string().min(1)).min(1),
  childResearchHints: z.array(z.string().min(1)).default([]),
}).strict();

export const CoordinatorPlanSchema = z.object({
  version: z.literal(COORDINATOR_PLAN_SCHEMA_VERSION),
  skill: z.string().min(1),
  sourceHash: z.string().min(1),
  coordinatorVersion: z.string().min(1),
  scopeProfile: CoordinatorScopeProfileSchema,
  synthesis: z.object({
    phases: z.array(CoordinatorPhaseSchema).min(1),
    externalSources: z.array(CoordinatorExternalSourceSchema).optional(),
  }).strict(),
  tasks: z.array(CoordinatorTaskSchema).min(1),
}).strict();

export type CoordinatorPlan = z.infer<typeof CoordinatorPlanSchema>;

export const CoordinatorPlanCacheRecordSchema = z.object({
  version: z.literal(COORDINATOR_PLAN_CACHE_SCHEMA_VERSION),
  kind: z.literal(COORDINATOR_PLAN_CACHE_KIND),
  identity: z.object({
    requestedModel: z.string().min(1).optional(),
  }).strict().optional(),
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
  previousPlan?: CoordinatorPlan;
  maxRetries?: number;
  regenerate?: boolean;
  abortController?: AbortController;
  artifactRoot?: string;
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
    files.push(...collectCoordinatorPlanFeedbackFiles(skill.rootDir));
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

function legacyCoordinatorCacheKey(args: {
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

function getLegacyCoordinatorPlanCachePath(args: {
  skillName: string;
  sourceHash: string;
  model?: string;
  artifactRoot?: string;
}): string {
  if (args.artifactRoot) {
    return join(args.artifactRoot, 'cache', `${legacyCoordinatorCacheKey(args)}.json`);
  }
  const safeName = args.skillName.replace(/[^a-zA-Z0-9._-]/g, '-');
  return join(getCoordinatorCacheDir(), `${safeName}-${legacyCoordinatorCacheKey(args)}.json`);
}

export function getCoordinatorPlanPath(args: {
  skillName: string;
  artifactRoot?: string;
}): string {
  if (args.artifactRoot) {
    return join(args.artifactRoot, 'plan.json');
  }
  const safeName = args.skillName.replace(/[^a-zA-Z0-9._-]/g, '-');
  return join(getCoordinatorCacheDir(), safeName, 'plan.json');
}

export const getCoordinatorPlanCachePath = getCoordinatorPlanPath;

function validateCacheIdentity(
  record: CoordinatorPlanCacheRecord,
  model: string | undefined,
): void {
  if (record.identity?.requestedModel !== model) {
    throw new CoordinatorPlanError(
      `Superwarden plan model mismatch. Expected ${model ?? 'default'}, got ${record.identity?.requestedModel ?? 'default'}. Regenerate the plan.`,
    );
  }
}

function parseCachedPlan(
  cachePath: string,
  skillName: string,
  sourceHash: string,
  model?: string,
) : CoordinatorPlan | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(cachePath, 'utf-8'));
  } catch {
    return undefined;
  }

  const cacheValidation = CoordinatorPlanCacheRecordSchema.safeParse(parsed);
  if (cacheValidation.success) {
    try {
      validatePlanIdentity(cacheValidation.data.plan, skillName, sourceHash);
      validateCacheIdentity(cacheValidation.data, model);
      return cacheValidation.data.plan;
    } catch {
      return undefined;
    }
  }

  const validation = CoordinatorPlanSchema.safeParse(parsed);
  if (validation.success) {
    try {
      validatePlanIdentity(validation.data, skillName, sourceHash);
      return validation.data;
    } catch {
      return undefined;
    }
  }

  return undefined;
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

function renderPreviousPlanContinuity(previousPlan: CoordinatorPlan | undefined): string {
  if (!previousPlan || previousPlan.tasks.length === 0) {
    return '';
  }

  const previousTasks = previousPlan.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    goal: task.goal,
  }));

  return `

Existing task continuity:
- Reuse an existing task id exactly when the same concern still exists after regeneration.
- Only create a new task id when a concern is genuinely new.
- If one previous task splits into multiple tasks, keep the previous id on the primary surviving concern and mint new ids only for the new sibling concerns.
- If multiple previous tasks merge, keep the id of the task whose concern remains primary.
- Do not rename tasks casually. Stable ids matter because feedback, cached child skills, and committed artifacts are keyed by task id.

Previous task set:
${JSON.stringify(previousTasks, null, 2)}`;
}

function buildSynthesisPrompt(
  skill: SkillDefinition,
  source: CoordinatorSource,
  previousPlan?: CoordinatorPlan,
): string {
  const sourceBlocks = source.files
    .map((file) => `## ${file.path}\n\n${file.content}`)
    .join('\n\n---\n\n');

  return `You are Warden's native Superwarden plan synthesizer.

Create a strict JSON Superwarden plan for one broad Superwarden skill. This parent artifact exists only to shape the right child tasks. It is a decomposition record, not a runnable child skill.

Rules:
- Return only a JSON object. No markdown, prose, or code fences.
- Use version ${COORDINATOR_PLAN_SCHEMA_VERSION}.
- Use skill "${skill.name}".
- Use sourceHash "${source.hash}" exactly.
- Use coordinatorVersion "${COORDINATOR_VERSION}" exactly.
- First determine what kind of parent skill this is: domain, ecosystem, repository, or product.
- The plan must preserve the context that justified the decomposition. Do not inspect local source and then throw that context away.
- Split by analysis concern, not file type, severity, or implementation phase.
- Prefer 3 to 8 focused tasks.
- Each task must have an id, title, goal, rationale, sourceSignals, owns, excludes, evidenceFocus, and childResearchHints.
- Task ids must be lowercase kebab-case.
- The parent plan should stay lean. Do not write mini child skills here.
- If the source material contains explicit coverage items, every item must map clearly to at least one task id, title, goal, rationale, or owns entry. Do not silently drop or vaguely merge named coverage areas.
- scopeProfile.subject should describe the parent skill being decomposed, not the repo name alone.
- scopeProfile.observedContext should capture the concrete context that shaped the task split:
  - for repository or product skills, include the stack, runtime, notable trust boundaries, and important repo-local surfaces you actually observed
  - for domain or ecosystem skills, include the supplied source material, intended platform, and any explicit coverage boundaries
- scopeProfile.unresolvedContext is only for context that would materially improve decomposition and was not inferable from the provided sources.
- Do not list obvious context as unresolved when it is already visible in the source material.
- Treat each task as a concise blueprint for child synthesis:
  - goal: the one-line investigation objective
  - rationale: why this task exists for this parent skill
  - sourceSignals: the context signals that justified this task
  - owns: the primary concerns this task is responsible for
  - excludes: the sibling concerns or boundaries this task must not absorb
  - evidenceFocus: what concrete evidence the child skill must require
  - childResearchHints: public docs, runtime topics, or prior-art areas the child skill may need to consult
- Keep task fields short and specific. If a field starts reading like a long prompt, you are adding child-skill bloat to the parent.
- Do not put trigger-language, user-request phrasing, runtime instructions, remediation playbooks, or long false-positive controls into the parent plan.
- Do not include repository-local file paths, line numbers, function names, or brittle examples in the parent plan unless the parent source explicitly requires them.
- When one code path could create chained risks across tasks, assign one primary owning task and make the other tasks exclude that ownership boundary instead of competing for the same finding.
- Boundary rules should be written from this task's perspective: say what this task owns and what it must not report.
- If ${COORDINATOR_METADATA_FILE} is present, treat it as the Superwarden skill's initial prompt and metadata contract.
- If the source material is too thin for a safe decomposition, make that explicit inside scopeProfile.unresolvedContext, rationale, or evidenceFocus. Do not silently invent coverage areas.
- Do not ask follow-up questions or return prose. If context is missing, still return valid JSON and record it in scopeProfile.unresolvedContext or the relevant task fields.
- Keep all generated task instructions executable by Warden's normal hunk analysis model: tasks must be focused, inspectable, and able to return an empty findings array when evidence is insufficient.
- Do not rely on Claude Code Task delegation, hidden subagents, or side-effect tools.
${previousPlan ? '- Preserve prior task ids when the same concerns still exist. Task id continuity matters for feedback, cached child skills, and committed artifacts.' : ''}

JSON shape:
{
  "version": ${COORDINATOR_PLAN_SCHEMA_VERSION},
  "skill": "${skill.name}",
  "sourceHash": "${source.hash}",
  "coordinatorVersion": "${COORDINATOR_VERSION}",
  "scopeProfile": {
    "kind": "repository",
    "subject": "Security review for this repo's CLI and runtime surfaces",
    "localContextUsed": true,
    "observedContext": [
      "Node.js and TypeScript runtime",
      "CLI orchestration and subprocess execution",
      "GitHub workflow and token boundaries"
    ],
    "unresolvedContext": ["Production deployment boundary, if it materially affects decomposition"]
  },
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
    ]
  },
  "tasks": [
    {
      "id": "example-task",
      "title": "Example task",
      "goal": "One-line investigation objective.",
      "rationale": "Why this task exists for this parent skill.",
      "sourceSignals": ["Observed context or source signal that justified this task"],
      "owns": ["Primary concern this task is responsible for"],
      "excludes": ["Sibling concern or boundary this task must not report"],
      "evidenceFocus": ["Concrete evidence the child skill must require"],
      "childResearchHints": ["Public runtime or ecosystem topic the child skill may need to consult"]
    }
  ]
}

Quality bar:
- The plan should read like the parent skill was decomposed by someone who understood the supplied intent and preserved the context that drove task selection.
- The task set should be specific enough that separate child executions produce distinct findings and avoid duplicate reports.
- The plan should make ownership boundaries obvious without turning task entries into long runtime prompts.
- Repository or product plans must reflect the local context actually observed. Domain or ecosystem plans must say they are generic and stay aligned with the supplied scope.
- Child skills should be able to synthesize from these blueprints without needing the parent to carry long instructions or repo-local trivia.

Skill description:
${skill.description}

${renderPreviousPlanContinuity(previousPlan)}

Source material:

${sourceBlocks}`;
}

function buildSynthesisSystemPrompt(): string {
  return `You are Warden's native Superwarden plan synthesizer.

Use Read, Grep, and Glob to inspect relevant repository source before deciding how to decompose the parent Superwarden skill. Use WebSearch or WebFetch for public prior art and current external documentation when framework, runtime, vulnerability, or ecosystem behavior affects the plan.

Do not send repository code, secrets, private file paths, or proprietary details to web tools. Use public framework, package, API, vulnerability class, and documentation names only.

Return only the strict JSON object requested by the user prompt. Never return prose or follow-up questions.`;
}

function writePlan(
  cachePath: string,
  plan: CoordinatorPlan,
  parent?: CoordinatorPlanCacheRecord['parent'],
  model?: string,
): void {
  mkdirSync(dirname(cachePath), { recursive: true });
  const record: CoordinatorPlanCacheRecord = {
    version: COORDINATOR_PLAN_CACHE_SCHEMA_VERSION,
    kind: COORDINATOR_PLAN_CACHE_KIND,
    identity: model ? { requestedModel: model } : undefined,
    plan,
    parent,
    childSkills: {},
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(cachePath, `${JSON.stringify(record, null, 2)}\n`, 'utf-8');
}

function getLegacyCoordinatorChildSkillsRoot(cachePath: string): string {
  return join(dirname(cachePath), basename(cachePath, '.json'), 'skills');
}

function getStableCoordinatorChildSkillsRoot(cachePath: string): string {
  return join(dirname(cachePath), 'tasks');
}

function moveIfMissing(sourcePath: string, destinationPath: string): void {
  if (existsSync(destinationPath) || !existsSync(sourcePath)) {
    return;
  }

  mkdirSync(dirname(destinationPath), { recursive: true });
  renameSync(sourcePath, destinationPath);
}

function migrateCoordinatorArtifacts(args: {
  cachePath: string;
  legacyCachePath: string;
  artifactRoot?: string;
}): void {
  const stableChildRoot = getStableCoordinatorChildSkillsRoot(args.cachePath);

  if (args.artifactRoot) {
    moveIfMissing(
      join(args.artifactRoot, 'cache', 'plan.json'),
      args.cachePath,
    );
    moveIfMissing(
      join(args.artifactRoot, 'cache', 'skills'),
      stableChildRoot,
    );
  }

  moveIfMissing(args.legacyCachePath, args.cachePath);
  moveIfMissing(join(dirname(args.cachePath), 'skills'), stableChildRoot);

  const legacyChildRoot = getLegacyCoordinatorChildSkillsRoot(args.legacyCachePath);
  if (existsSync(legacyChildRoot) && !existsSync(stableChildRoot)) {
    mkdirSync(dirname(stableChildRoot), { recursive: true });
    renameSync(legacyChildRoot, stableChildRoot);
    rmSync(dirname(legacyChildRoot), { recursive: true, force: true });
  }
}

function pruneLegacyCoordinatorCacheLayout(rootDir: string): void {
  if (!existsSync(rootDir)) {
    return;
  }

  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    if (entry.isFile() && /^[a-z0-9._-]+-[a-f0-9]{64}\.json$/.test(entry.name)) {
      rmSync(join(rootDir, entry.name), { force: true });
      continue;
    }

    if (entry.isDirectory() && /^[a-z0-9._-]+-[a-f0-9]{64}$/.test(entry.name)) {
      rmSync(join(rootDir, entry.name), { recursive: true, force: true });
    }
  }
}

function pruneLegacyRepoLocalCoordinatorLayout(artifactRoot: string): void {
  const legacyRoot = join(artifactRoot, 'cache');
  if (!existsSync(legacyRoot)) {
    return;
  }

  rmSync(join(legacyRoot, 'plan.json'), { force: true });
  rmSync(join(legacyRoot, 'skills'), { recursive: true, force: true });

  for (const entry of readdirSync(legacyRoot, { withFileTypes: true })) {
    if (entry.isFile() && /^[a-f0-9]{64}\.json$/.test(entry.name)) {
      rmSync(join(legacyRoot, entry.name), { force: true });
      continue;
    }

    if (entry.isDirectory() && /^[a-f0-9]{64}$/.test(entry.name)) {
      rmSync(join(legacyRoot, entry.name), { recursive: true, force: true });
    }
  }

  if (readdirSync(legacyRoot).length === 0) {
    rmSync(legacyRoot, { recursive: true, force: true });
  }
}

function pruneLegacyCoordinatorArtifacts(args: {
  cachePath: string;
  artifactRoot?: string;
}): void {
  pruneLegacyCoordinatorCacheLayout(dirname(args.cachePath));
  if (args.artifactRoot) {
    pruneLegacyRepoLocalCoordinatorLayout(args.artifactRoot);
  }
}

function resolveLegacyCoordinatorCachePath(args: {
  skillName: string;
  sourceHash: string;
  model?: string;
  artifactRoot?: string;
}): string {
  return getLegacyCoordinatorPlanCachePath({
    skillName: args.skillName,
    sourceHash: args.sourceHash,
    model: args.model,
    artifactRoot: args.artifactRoot,
  });
}

export async function synthesizeCoordinatorPlan(
  options: SynthesizeCoordinatorPlanOptions,
): Promise<CoordinatorSynthesisResult> {
  const { skill, apiKey, model, maxRetries, regenerate = false } = options;
  const runtime = options.runtime ?? getRuntime(options.runtimeName ?? 'claude');
  const source = collectCoordinatorSource(skill);
  const cachePath = getCoordinatorPlanPath({
    skillName: skill.name,
    artifactRoot: options.artifactRoot,
  });
  migrateCoordinatorArtifacts({
    cachePath,
    legacyCachePath: resolveLegacyCoordinatorCachePath({
      skillName: skill.name,
      sourceHash: source.hash,
      model,
      artifactRoot: options.artifactRoot,
    }),
    artifactRoot: options.artifactRoot,
  });
  pruneLegacyCoordinatorArtifacts({
    cachePath,
    artifactRoot: options.artifactRoot,
  });

  if (existsSync(cachePath) && !regenerate) {
    const plan = parseCachedPlan(cachePath, skill.name, source.hash, model);
    if (plan) {
      return { plan, source: 'cache', cachePath };
    }
  }

  if (options.repoPath) {
    try {
      const result = await runStructuredSuperwardenAgent({
        runtime,
        repoPath: options.repoPath,
        skillName: `${skill.name}:superwarden-plan`,
        systemPrompt: buildSynthesisSystemPrompt(),
        userPrompt: buildSynthesisPrompt(skill, source, options.previousPlan),
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
      }, model);

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

  const result = await runtime.runSynthesis({
    task: 'superwarden_synthesis',
    apiKey,
    prompt: buildSynthesisPrompt(skill, source, options.previousPlan),
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
  }, model);

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
