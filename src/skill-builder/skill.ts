import { dirname, join } from 'node:path';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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
  GeneratedSkillFileMapSchema,
  GeneratedSkillValidationResultSchema,
  type GeneratedSkillArtifact,
  type GeneratedSkillFileMap,
  type GeneratedSkillValidationResult,
  type SkillBuildAuthoringProvider,
} from './skill-contract.js';
export { GeneratedSkillBuildError } from './skill-contract.js';
import {
  authoringSystemPrompt,
  buildAuthoringImplementationPrompt,
  buildAuthoringPlanPrompt,
  buildAuthoringValidationPrompt,
  defaultBuildMaxTurns,
  defaultValidationMaxTurns,
} from './skill-prompts.js';

const GENERATED_SKILL_ARTIFACT_SCHEMA_VERSION = 4;
const LONG_REFERENCE_LINE_LIMIT = 100;
const SKILL_FRONTMATTER_PATTERN = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

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

function normalizeFileContent(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return normalized.endsWith('\n') ? normalized : `${normalized}\n`;
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

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function yamlQuoted(value: string): string {
  return JSON.stringify(value);
}

function fallbackDescription(fileMap: GeneratedSkillFileMap, targetName: string): string {
  const summary = oneLine(fileMap.summary);
  if (summary) {
    return summary;
  }
  return `Use when running the generated ${targetName} Warden skill.`;
}

function ensureSkillFrontmatter(args: {
  content: string;
  fileMap: GeneratedSkillFileMap;
  targetName: string;
}): string {
  if (SKILL_FRONTMATTER_PATTERN.test(args.content)) {
    return args.content;
  }
  return `---
name: ${yamlQuoted(args.targetName)}
description: ${yamlQuoted(fallbackDescription(args.fileMap, args.targetName))}
---

${args.content.trimStart()}`;
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

function deterministicValidation(args: {
  fileMap: GeneratedSkillFileMap;
  targetName: string;
}): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const files = new Map(args.fileMap.files.map((file) => [file.path, file.content]));
  const skillMd = files.get('SKILL.md');

  if (!skillMd) {
    errors.push('Generated artifact file map must include SKILL.md');
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

  if (/Generated Warden skill for outline/i.test(skillMd)) {
    warnings.push('SKILL.md contains generated-template boilerplate');
  }

  const referenceFiles = args.fileMap.files.filter((file) => file.path.startsWith('references/'));
  const routedReferenceFiles = referenceFiles.filter((file) => skillMd.includes(file.path));
  const routeDocuments = [
    skillMd,
    ...routedReferenceFiles.map((file) => file.content),
  ];
  for (const path of [...new Set(routeDocuments.flatMap(referencedSkillPaths))].sort()) {
    if (!files.has(path)) {
      errors.push(`SKILL.md routes ${path} but the generated file map does not include it`);
    }
  }
  for (const reference of referenceFiles) {
    if (!routeDocuments.some((content) => content.includes(reference.path))) {
      warnings.push(`SKILL.md does not route runtime reference ${reference.path}`);
    }
    const lineCount = reference.content.split('\n').length;
    if (lineCount > LONG_REFERENCE_LINE_LIMIT && !/^## Contents$/m.test(reference.content)) {
      warnings.push(
        `${reference.path} is ${lineCount} lines; add ## Contents or split by lookup need`,
      );
    }
  }

  const hasRuntimeReferences = referenceFiles.length > 0;
  const sources = files.get('SOURCES.md');
  if (
    hasRuntimeReferences &&
    sources &&
    /\b(deferred|future passes|next pass|not covered in this pass)\b/i.test(sources)
  ) {
    warnings.push('SOURCES.md appears to contain stale deferred-work language while references exist');
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

function applyValidationResult(args: {
  original: GeneratedSkillFileMap;
  validation: GeneratedSkillValidationResult;
}): GeneratedSkillFileMap {
  if (!args.validation.files || args.validation.files.length === 0) {
    return args.original;
  }
  return {
    ...args.original,
    files: args.validation.files,
    validationNotes: [
      ...args.original.validationNotes,
      args.validation.summary,
      ...args.validation.issues.map((issue) => `${issue.severity}: ${issue.message}`),
    ],
    missingInputs: [
      ...args.original.missingInputs,
      ...args.validation.missingInputs,
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
    fileMap: {
      version: 1,
      name: args.name,
      files: args.files.map((file) => ({ path: file.path, content: file.content })),
      summary: 'Existing generated artifact',
      validationNotes: [],
      missingInputs: [],
      externalSources: [],
    },
    targetName: args.name,
  });
  if (validation.errors.length > 0) {
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
    fileMap: {
      version: 1,
      name: metadata.name,
      files: files.map((file) => ({ path: file.path, content: file.content })),
      summary: 'Cached generated artifact',
      validationNotes: [],
      missingInputs: [],
      externalSources: [],
    },
    targetName: metadata.name,
  });
  if (validation.errors.length > 0) {
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
  fileMap: GeneratedSkillFileMap;
  durationMs: number;
  usage: UsageStats;
  responseModel?: string;
  numTurns?: number;
}): GeneratedSkillArtifact {
  clearGeneratedSkillArtifacts(args.rootDir);

  const files = args.fileMap.files.map((file) => ({
    path: file.path,
    content: normalizeFileContent(file.content),
  }));
  for (const file of files) {
    const path = join(args.rootDir, file.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, file.content, 'utf-8');
  }

  return {
    kind: 'generated-skill',
    source: 'generated',
    name: args.fileMap.name,
    path: args.rootDir,
    bytes: filesByteLength(files),
    durationMs: args.durationMs,
    usage: args.usage,
    externalSources: args.fileMap.externalSources,
    missingInputs: args.fileMap.missingInputs,
    responseModel: args.responseModel,
    numTurns: args.numTurns,
  };
}

function normalizeGeneratedFileMap(
  fileMap: GeneratedSkillFileMap,
  targetName = fileMap.name,
): GeneratedSkillFileMap {
  return {
    ...fileMap,
    files: [...fileMap.files]
      .map((file) => ({
        path: file.path,
        content: normalizeFileContent(file.path === 'SKILL.md'
          ? ensureSkillFrontmatter({
            content: file.content,
            fileMap,
            targetName,
          })
          : file.content),
      }))
      .sort((a, b) => a.path.localeCompare(b.path)),
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

    const maxTurns = args.maxTurns ?? defaultBuildMaxTurns(args.outline);
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

    args.onStatus?.('Writing skill artifacts');
    const implementation = await runStructuredSkillBuilderAgent({
      runtime: args.runtime,
      repoPath: args.repoPath,
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
      schema: GeneratedSkillFileMapSchema,
      model: args.model,
      maxTurns,
      abortController: args.abortController,
      repair,
    });

    if (implementation.data.name !== args.outline.skill) {
      throw new GeneratedSkillBuildError(
        `Generated skill identity mismatch: expected ${args.outline.skill}, got ${implementation.data.name}`,
      );
    }

    const initialFileMap = normalizeGeneratedFileMap(implementation.data, args.outline.skill);
    const initialDeterministic = deterministicValidation({
      fileMap: initialFileMap,
      targetName: args.outline.skill,
    });

    args.onStatus?.('Validating generated skill');
    const validation = await runStructuredSkillBuilderAgent({
      runtime: args.runtime,
      repoPath: args.repoPath,
      skillName: `${args.outline.skill}:authoring-validation`,
      systemPrompt: authoringSystemPrompt(),
      userPrompt: buildAuthoringValidationPrompt({
        outline: args.outline,
        source: args.source,
        authoringSkillRoot: authoringProvider.rootDir,
        targetName: args.outline.skill,
        targetRootDir: args.rootDir,
        plan: plan.data,
        fileMap: initialFileMap,
        deterministicIssues: formatDeterministicIssues(initialDeterministic),
      }),
      schema: GeneratedSkillValidationResultSchema,
      model: args.model,
      maxTurns: Math.min(maxTurns, defaultValidationMaxTurns()),
      abortController: args.abortController,
      repair,
    });

    const fileMap = normalizeGeneratedFileMap(applyValidationResult({
      original: initialFileMap,
      validation: validation.data,
    }), args.outline.skill);
    const finalDeterministic = deterministicValidation({
      fileMap,
      targetName: args.outline.skill,
    });
    if (finalDeterministic.errors.length > 0) {
      throw new GeneratedSkillBuildError(
        `Generated skill failed validation for ${args.outline.skill}:\n` +
        finalDeterministic.errors.map((error) => `- ${error}`).join('\n'),
      );
    }
    const providerErrors = validation.data.issues.filter((issue) => issue.severity === 'error');
    if (!validation.data.valid || providerErrors.length > 0) {
      const issueLines = validation.data.issues.length > 0
        ? validation.data.issues.map((issue) => {
          const path = issue.path ? `${issue.path}: ` : '';
          return `- ${issue.severity}: ${path}${issue.message}`;
        }).join('\n')
        : '- error: Authoring provider marked the generated skill invalid';
      throw new GeneratedSkillBuildError(
        `Generated skill failed provider validation for ${args.outline.skill}:\n${issueLines}`,
      );
    }

    const usage = aggregateUsage([
      plan.usage,
      implementation.usage,
      validation.usage,
    ]);
    const responseModel = summarizeResponseModel([
      plan.responseModel,
      implementation.responseModel,
      validation.responseModel,
    ]);
    const numTurns = summarizeTurns([
      plan.numTurns,
      implementation.numTurns,
      validation.numTurns,
    ]);

    const artifact = writeGeneratedArtifact({
      rootDir: args.rootDir,
      fileMap,
      durationMs: performance.now() - startedAt,
      usage,
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
        deterministicWarnings: finalDeterministic.warnings,
        validationIssues: validation.data.issues,
        bytes: artifact.bytes,
        durationMs: artifact.durationMs,
        usage: artifact.usage,
        externalSources: artifact.externalSources,
        missingInputs: [
          ...plan.data.missingInputs,
          ...artifact.missingInputs,
          ...validation.data.missingInputs,
        ],
        responseModel: artifact.responseModel,
        numTurns: artifact.numTurns,
        generatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });

    return {
      ...artifact,
      missingInputs: [
        ...plan.data.missingInputs,
        ...artifact.missingInputs,
        ...validation.data.missingInputs,
      ],
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
