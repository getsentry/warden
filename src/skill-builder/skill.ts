import { join } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { parse as parseYaml } from 'yaml';
import { aggregateUsage } from '../sdk/usage.js';
import type { Runtime } from '../sdk/runtimes/index.js';
import { runStructuredSkillBuilderAgent, StructuredSkillBuilderAgentError } from './agentic.js';
import type { UsageStats } from '../types/index.js';
import { clearGeneratedSkillArtifacts } from './definition.js';
import { resolveAuthoringProvider } from './authoring-provider.js';
import {
  type SkillBuildOutline,
  type SkillBuildSource,
  outlineHash,
} from './outline-contract.js';
import {
  getBuildStatePath,
  readSkillBuildState,
  writeSkillBuildState,
} from './outline-state.js';
import {
  GeneratedSkillAuthoringPlanSchema,
  GeneratedSkillBuildError,
  GeneratedSkillWriterResultSchema,
  GeneratedSkillReviewResultSchema,
  type GeneratedSkillArtifact,
  type GeneratedSkillReviewResult,
  type GeneratedSkillWriterResult,
  type SkillBuildAuthoringProvider,
  type SkillBuildExternalSource,
} from './skill-contract.js';
export { GeneratedSkillBuildError } from './skill-contract.js';
import {
  authoringSystemPrompt,
  buildAuthoringImplementationPrompt,
  buildAuthoringPlanPrompt,
  buildAuthoringRevisionPrompt,
  buildAuthoringValidationPrompt,
  defaultBuildMaxTurns,
  defaultValidationMaxTurns,
} from './skill-prompts.js';

const GENERATED_SKILL_ARTIFACT_SCHEMA_VERSION = 5;
const MAX_SKILL_REVISION_ATTEMPTS = 1;
const SKILL_FRONTMATTER_PATTERN = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

interface SkillBuilderStepMetrics {
  usage: UsageStats;
  responseModel?: string;
  numTurns?: number;
}

interface SkillBuilderReviewResult extends SkillBuilderStepMetrics {
  data: GeneratedSkillReviewResult;
}

interface GeneratedSkillArtifactFile {
  path: string;
  content: string;
  bytes?: number;
}

interface GeneratedSkillArtifactSnapshot {
  summary: string;
  files: GeneratedSkillArtifactFile[];
  validationNotes: string[];
  missingInputs: string[];
  externalSources: SkillBuildExternalSource[];
}

function artifactFiles(rootDir: string): {
  path: string;
  content: string;
  bytes: number;
}[] {
  if (!existsSync(rootDir)) {
    return [];
  }

  const files: {
    path: string;
    content: string;
    bytes: number;
  }[] = [];

  function visit(relativeDir: string): void {
    for (const entry of readdirSync(join(rootDir, relativeDir), { withFileTypes: true })) {
      const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      if (entry.name === 'warden.yaml' || entry.name === 'build-state.json') {
        continue;
      }
      if (entry.isDirectory()) {
        visit(relativePath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const content = readFileSync(join(rootDir, relativePath), 'utf-8');
      files.push({
        path: relativePath,
        content,
        bytes: Buffer.byteLength(content, 'utf-8'),
      });
    }
  }

  visit('');
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function filesByteLength(files: { content: string }[]): number {
  return files.reduce((sum, file) => sum + Buffer.byteLength(file.content, 'utf-8'), 0);
}

function fileManifest(files: { path: string; content: string }[]): {
  path: string;
  bytes: number;
}[] {
  return files.map((file) => ({
    path: file.path,
    bytes: Buffer.byteLength(file.content, 'utf-8'),
  })).sort((a, b) => a.path.localeCompare(b.path));
}

function skillFrontmatter(content: string): Record<string, unknown> | undefined {
  const match = content.match(SKILL_FRONTMATTER_PATTERN);
  const frontmatter = match?.[1];
  if (!frontmatter) {
    return undefined;
  }
  try {
    const parsed = parseYaml(frontmatter);
    return parsed && typeof parsed === 'object'
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

function referencedSkillPaths(content: string): string[] {
  const paths = new Set<string>();
  for (const match of content.matchAll(/references\/[a-zA-Z0-9][a-zA-Z0-9._/-]*/g)) {
    const path = match[0].replace(/[.,;:!?]+$/g, '');
    if (/[a-zA-Z0-9]$/.test(path)) {
      paths.add(path);
    }
  }
  return [...paths].sort();
}

function referencedArtifactPaths(content: string): string[] {
  const paths = new Set<string>();
  for (const match of content.matchAll(/\b(?:SPEC|SOURCES|EVAL)\.md\b/g)) {
    paths.add(match[0]);
  }
  return [...paths].sort();
}

function deterministicValidation(args: {
  files: {
    path: string;
    content: string;
  }[];
  targetName: string;
}): {
  errors: string[];
  warnings: string[];
} {
  // Deterministic validation is intentionally mechanical. It protects the
  // filesystem and catches non-runnable local references; depth, segmentation,
  // source adequacy, and skill-writer compliance belong to the qualitative
  // reviewer.
  const errors: string[] = [];
  const warnings: string[] = [];
  const files = new Map(args.files.map((file) => [file.path, file.content]));
  const skillMd = files.get('SKILL.md');

  if (!skillMd) {
    errors.push('Generated skill artifacts must include SKILL.md');
    return { errors, warnings };
  }

  const frontmatter = skillFrontmatter(skillMd);
  if (!frontmatter) {
    errors.push('SKILL.md must start with YAML frontmatter');
  } else {
    if (frontmatter['name'] !== args.targetName) {
      errors.push(`SKILL.md frontmatter name must be "${args.targetName}"`);
    }
    if (typeof frontmatter['description'] !== 'string' || !frontmatter['description'].trim()) {
      errors.push('SKILL.md frontmatter description is required');
    }
  }

  const referenceFiles = args.files.filter((file) => file.path.startsWith('references/'));
  const routedReferenceFiles = referenceFiles.filter((file) => skillMd.includes(file.path));
  const routeDocuments = [
    skillMd,
    ...routedReferenceFiles.map((file) => file.content),
  ];
  for (const path of [...new Set(routeDocuments.flatMap(referencedSkillPaths))].sort()) {
    if (!files.has(path)) {
      warnings.push(`SKILL.md routes ${path} but the generated artifacts do not include it`);
    }
  }
  for (const path of referencedArtifactPaths(skillMd)) {
    if (!files.has(path)) {
      warnings.push(`SKILL.md references ${path} but the generated artifacts do not include it`);
    }
  }
  for (const reference of referenceFiles) {
    if (!routeDocuments.some((content) => content.includes(reference.path))) {
      warnings.push(`SKILL.md does not route runtime reference ${reference.path}`);
    }
  }

  return { errors, warnings };
}

function formatDeterministicIssues(validation: {
  errors: string[];
  warnings: string[];
}): string[] {
  return [
    ...validation.errors.map((message) => `error: ${message}`),
    ...validation.warnings.map((message) => `warning: ${message}`),
  ];
}

function hasMissingGeneratedFileWarning(validation: {
  warnings: string[];
}): boolean {
  return validation.warnings.some((warning) =>
    warning.includes('generated artifacts do not include it'),
  );
}

function reviewNeedsRevision(review: GeneratedSkillReviewResult): boolean {
  return !review.valid || review.issues.length > 0;
}

function formatReviewIssue(issue: GeneratedSkillReviewResult['issues'][number]): string {
  const location = issue.path ? `${issue.path}: ` : '';
  const fix = issue.suggestedFix ? ` Suggested fix: ${issue.suggestedFix}` : '';
  return `${location}${issue.message}${fix}`;
}

function finalBlockingIssues(args: {
  deterministic: {
    errors: string[];
    warnings: string[];
  };
  review?: GeneratedSkillReviewResult;
}): string[] {
  // Final blocking combines mechanical runnability with the reviewer verdict.
  // Do not add deterministic taste checks here; make the authoring reviewer own
  // qualitative depth and layout feedback.
  const issues: string[] = [];
  issues.push(...args.deterministic.errors);
  if (hasMissingGeneratedFileWarning(args.deterministic)) {
    issues.push(...args.deterministic.warnings.filter((warning) =>
      warning.includes('generated artifacts do not include it')
    ));
  }
  if (args.review && reviewNeedsRevision(args.review)) {
    if (args.review.issues.length === 0) {
      issues.push('Authoring reviewer marked the generated skill invalid without issue details');
    } else {
      issues.push(...args.review.issues.map(formatReviewIssue));
    }
  }
  return uniqueStrings(issues);
}

function throwIfFinalReviewFailed(args: {
  targetName: string;
  deterministic: {
    errors: string[];
    warnings: string[];
  };
  review?: GeneratedSkillReviewResult;
}): void {
  const issues = finalBlockingIssues({
    deterministic: args.deterministic,
    review: args.review,
  });
  if (issues.length === 0) {
    return;
  }
  throw new GeneratedSkillBuildError(
    `Generated skill failed final review for ${args.targetName}:\n` +
    issues.map((issue) => `- ${issue}`).join('\n'),
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].filter((value) => value.trim().length > 0);
}

function isExternalSourceUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function mergeExternalSources(
  ...sourceSets: SkillBuildExternalSource[][]
): SkillBuildExternalSource[] {
  const sources = new Map<string, SkillBuildExternalSource>();
  for (const sourceSet of sourceSets) {
    for (const source of sourceSet) {
      if (!isExternalSourceUrl(source.url)) {
        continue;
      }
      sources.set(`${source.title}\n${source.url}`, source);
    }
  }
  return [...sources.values()];
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

function zeroUsage(): UsageStats {
  return { inputTokens: 0, outputTokens: 0, costUSD: 0 };
}

function loadExistingArtifact(args: {
  rootDir: string;
  files: {
    path: string;
    content: string;
  }[];
  name: string;
}): GeneratedSkillArtifact | undefined {
  const validation = deterministicValidation({
    files: args.files,
    targetName: args.name,
  });
  if (
    validation.errors.length > 0 ||
    hasMissingGeneratedFileWarning(validation)
  ) {
    return undefined;
  }

  return {
    kind: 'generated-skill',
    source: 'cache',
    name: args.name,
    path: args.rootDir,
    bytes: filesByteLength(args.files),
    durationMs: 0,
    usage: zeroUsage(),
    externalSources: [],
    missingInputs: [],
  };
}

function loadCachedArtifact(args: {
  rootDir: string;
  outline: SkillBuildOutline;
  source: SkillBuildSource;
  authoringProvider: SkillBuildAuthoringProvider;
}): GeneratedSkillArtifact | undefined {
  if (!existsSync(join(args.rootDir, 'SKILL.md'))) {
    return undefined;
  }

  const files = artifactFiles(args.rootDir);
  const state = readSkillBuildState(getBuildStatePath(args.rootDir));
  const metadata = state?.artifact;
  if (!metadata) {
    return loadExistingArtifact({
      rootDir: args.rootDir,
      files,
      name: args.outline.skill,
    });
  }

  const manifest = fileManifest(files);
  const bytes = filesByteLength(files);
  if (
    metadata.sourceHash !== args.source.hash ||
    metadata.outlineHash !== outlineHash(args.outline) ||
    metadata.buildVersion !== args.outline.buildVersion ||
    metadata.authoringProvider.name !== args.authoringProvider.name ||
    metadata.authoringProvider.contentHash !== args.authoringProvider.contentHash ||
    JSON.stringify(metadata.fileManifest) !== JSON.stringify(manifest) ||
    metadata.bytes !== bytes
  ) {
    return undefined;
  }

  const validation = deterministicValidation({
    files,
    targetName: metadata.name,
  });
  if (
    validation.errors.length > 0 ||
    hasMissingGeneratedFileWarning(validation)
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

function readArtifactSnapshot(args: {
  rootDir: string;
  writer: GeneratedSkillWriterResult;
}): GeneratedSkillArtifactSnapshot {
  return {
    summary: args.writer.summary,
    files: artifactFiles(args.rootDir),
    validationNotes: args.writer.validationNotes,
    missingInputs: args.writer.missingInputs,
    externalSources: args.writer.externalSources,
  };
}

function artifactFromDisk(args: {
  rootDir: string;
  name: string;
  durationMs: number;
  usage: UsageStats;
  externalSources: SkillBuildExternalSource[];
  missingInputs: string[];
  responseModel?: string;
  numTurns?: number;
}): GeneratedSkillArtifact {
  const files = artifactFiles(args.rootDir);
  return {
    kind: 'generated-skill',
    source: 'generated',
    name: args.name,
    path: args.rootDir,
    bytes: filesByteLength(files),
    durationMs: args.durationMs,
    usage: args.usage,
    externalSources: args.externalSources,
    missingInputs: args.missingInputs,
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
  authoringSkillRoot?: string;
  onStatus?: (message: string) => void;
}): Promise<GeneratedSkillArtifact> {
  const startedAt = performance.now();
  const statePath = getBuildStatePath(args.rootDir);
  const authoringProvider = resolveAuthoringProvider({
    authoringSkillRoot: args.authoringSkillRoot,
  });

  try {
    if (!args.regenerate) {
      const cached = loadCachedArtifact({
        rootDir: args.rootDir,
        outline: args.outline,
        source: args.source,
        authoringProvider,
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

    const maxTurns = args.maxTurns ?? defaultBuildMaxTurns();
    const repair = {
      apiKey: args.apiKey,
      model: args.repairModel,
      maxRetries: args.repairMaxRetries,
    };

    args.onStatus?.('Planning authoring run');
    const plan = await runStructuredSkillBuilderAgent({
      runtime: args.runtime,
      repoPath: args.repoPath,
      skillName: `${args.outline.skill}:authoring-plan`,
      systemPrompt: authoringSystemPrompt(),
      userPrompt: buildAuthoringPlanPrompt({
        outline: args.outline,
        source: args.source,
        authoringSkillRoot: authoringProvider.rootDir,
        targetName: args.outline.skill,
        targetRootDir: args.rootDir,
      }),
      schema: GeneratedSkillAuthoringPlanSchema,
      model: args.model,
      maxTurns,
      abortController: args.abortController,
      repair,
    });

    clearGeneratedSkillArtifacts(args.rootDir);

    args.onStatus?.('Writing skill artifacts');
    const implementation = await runStructuredSkillBuilderAgent({
      runtime: args.runtime,
      repoPath: args.rootDir,
      skillName: `${args.outline.skill}:authoring-implementation`,
      systemPrompt: authoringSystemPrompt(),
      userPrompt: buildAuthoringImplementationPrompt({
        outline: args.outline,
        source: args.source,
        authoringSkillRoot: authoringProvider.rootDir,
        targetName: args.outline.skill,
        targetRootDir: args.rootDir,
        plan: plan.data,
      }),
      schema: GeneratedSkillWriterResultSchema,
      model: args.model,
      maxTurns,
      writeAccess: true,
      abortController: args.abortController,
      repair,
    });

    let workingArtifact = readArtifactSnapshot({
      rootDir: args.rootDir,
      writer: implementation.data,
    });

    const reviewResults: SkillBuilderReviewResult[] = [];
    const revisionResults: SkillBuilderStepMetrics[] = [];

    let latestReview: GeneratedSkillReviewResult | undefined;
    for (let reviewRound = 0; reviewRound <= MAX_SKILL_REVISION_ATTEMPTS; reviewRound += 1) {
      const deterministic = deterministicValidation({
        files: workingArtifact.files,
        targetName: args.outline.skill,
      });

      // The reviewer is the quality gate: it judges whether the generated skill
      // satisfies skill-writer, the source-depth plan, and Warden's runtime bar.
      // The deterministic notes below are only rough mechanical signals.
      args.onStatus?.(reviewRound === 0
        ? 'Reviewing generated skill'
        : 'Reviewing revised skill');
      const review = await runStructuredSkillBuilderAgent({
        runtime: args.runtime,
        repoPath: args.rootDir,
        skillName: `${args.outline.skill}:authoring-validation`,
        systemPrompt: authoringSystemPrompt(),
        userPrompt: buildAuthoringValidationPrompt({
          outline: args.outline,
          source: args.source,
          authoringSkillRoot: authoringProvider.rootDir,
          targetName: args.outline.skill,
          targetRootDir: args.rootDir,
          plan: plan.data,
          artifact: workingArtifact,
          deterministicIssues: formatDeterministicIssues(deterministic),
        }),
        schema: GeneratedSkillReviewResultSchema,
        model: args.model,
        maxTurns: Math.min(maxTurns, defaultValidationMaxTurns()),
        abortController: args.abortController,
        repair,
      });
      reviewResults.push(review);
      latestReview = review.data;

      if (
        !reviewNeedsRevision(review.data) ||
        revisionResults.length >= MAX_SKILL_REVISION_ATTEMPTS
      ) {
        break;
      }

      args.onStatus?.('Revising generated skill');
      const revision = await runStructuredSkillBuilderAgent({
        runtime: args.runtime,
        repoPath: args.rootDir,
        skillName: `${args.outline.skill}:authoring-revision`,
        systemPrompt: authoringSystemPrompt(),
        userPrompt: buildAuthoringRevisionPrompt({
          outline: args.outline,
          source: args.source,
          authoringSkillRoot: authoringProvider.rootDir,
          targetName: args.outline.skill,
          targetRootDir: args.rootDir,
          plan: plan.data,
          artifact: workingArtifact,
          review: review.data,
          deterministicIssues: formatDeterministicIssues(deterministic),
        }),
        schema: GeneratedSkillWriterResultSchema,
        model: args.model,
        maxTurns,
        writeAccess: true,
        abortController: args.abortController,
        repair,
      });
      revisionResults.push(revision);
      workingArtifact = readArtifactSnapshot({
        rootDir: args.rootDir,
        writer: revision.data,
      });
    }

    const finalExternalSources = mergeExternalSources(
      args.outline.build.externalSources ?? [],
      plan.data.externalSources,
      workingArtifact.externalSources,
    );
    const finalMissingInputs = uniqueStrings([
      ...plan.data.missingInputs,
      ...workingArtifact.missingInputs,
      ...reviewResults.flatMap((result) => result.data.missingInputs),
    ]);
    workingArtifact = {
      ...workingArtifact,
      externalSources: finalExternalSources,
      missingInputs: finalMissingInputs,
    };
    const finalDeterministic = deterministicValidation({
      files: workingArtifact.files,
      targetName: args.outline.skill,
    });
    if (!workingArtifact.files.some((file) => file.path === 'SKILL.md')) {
      throw new GeneratedSkillBuildError(
        `Generated skill build did not produce SKILL.md for ${args.outline.skill}`,
      );
    }
    throwIfFinalReviewFailed({
      targetName: args.outline.skill,
      deterministic: finalDeterministic,
      review: latestReview,
    });

    const usage = aggregateUsage([
      plan.usage,
      implementation.usage,
      ...reviewResults.map((result) => result.usage),
      ...revisionResults.map((result) => result.usage),
    ]);
    const responseModel = summarizeResponseModel([
      plan.responseModel,
      implementation.responseModel,
      ...reviewResults.map((result) => result.responseModel),
      ...revisionResults.map((result) => result.responseModel),
    ]);
    const numTurns = summarizeTurns([
      plan.numTurns,
      implementation.numTurns,
      ...reviewResults.map((result) => result.numTurns),
      ...revisionResults.map((result) => result.numTurns),
    ]);

    const artifact = artifactFromDisk({
      rootDir: args.rootDir,
      name: args.outline.skill,
      durationMs: performance.now() - startedAt,
      usage,
      externalSources: finalExternalSources,
      missingInputs: finalMissingInputs,
      responseModel,
      numTurns,
    });
    const writtenFiles = artifactFiles(args.rootDir);
    writeSkillBuildState(statePath, {
      ...previousState,
      artifact: {
        version: GENERATED_SKILL_ARTIFACT_SCHEMA_VERSION,
        sourceHash: args.source.hash,
        outlineHash: outlineHash(args.outline),
        buildVersion: args.outline.buildVersion,
        authoringProvider,
        name: artifact.name,
        fileManifest: fileManifest(writtenFiles),
        deterministicWarnings: formatDeterministicIssues(finalDeterministic),
        bytes: artifact.bytes,
        durationMs: artifact.durationMs,
        usage: artifact.usage,
        externalSources: artifact.externalSources,
        missingInputs: finalMissingInputs,
        responseModel: artifact.responseModel,
        numTurns: artifact.numTurns,
        generatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });

    return {
      ...artifact,
      missingInputs: finalMissingInputs,
    };
  } catch (error) {
    if (error instanceof GeneratedSkillBuildError) {
      throw error;
    }
    if (error instanceof StructuredSkillBuilderAgentError) {
      throw new GeneratedSkillBuildError(
        `Generated skill build failed for ${args.outline.skill}: ${error.message}`,
        { cause: error },
      );
    }
    if (error instanceof Error) {
      throw new GeneratedSkillBuildError(
        `Generated skill build failed for ${args.outline.skill}: ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }
}
