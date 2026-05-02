import { dirname, join } from 'node:path';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { aggregateUsage } from '../sdk/usage.js';
import type { Runtime } from '../sdk/runtimes/index.js';
import { runStructuredSkillBuilderAgent, StructuredSkillBuilderAgentError } from './agentic.js';
import type { SkillBuilderReferenceRole } from './skill-writer-guidance.js';
import type { UsageStats } from '../types/index.js';
import {
  clearGeneratedSkillArtifacts,
} from './definition.js';
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
  byteLength,
  frontmatterValue,
  GeneratedSkillBuildError,
  GeneratedSkillChecklistIndexMarkdownSchema,
  GeneratedSkillScaffoldSchema,
  isValidChecklistIndexMarkdown,
  isValidReferenceMarkdown,
  referenceSort,
  SkillBuildTrackReferenceSchema,
  SkillBuilderReferenceRoleSchema,
} from './skill-contract.js';
export { GeneratedSkillBuildError } from './skill-contract.js';
import type {
  GeneratedSkillArtifact,
  GeneratedSkillOutput,
  GeneratedSkillScaffold,
  SkillBuildTrackBundle,
  SkillBuildTrackReferenceBundle,
} from './skill-contract.js';
import {
  buildScaffoldPrompt,
  buildTrackPrompt,
  defaultBuildMaxTurns,
  defaultTrackMaxTurns,
  scaffoldSystemPrompt,
  trackSystemPrompt,
} from './skill-prompts.js';

const GENERATED_SKILL_ARTIFACT_SCHEMA_VERSION = 3;

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
    for (const reference of [...bundle.references].sort(referenceSort)) {
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
  scaffold: GeneratedSkillScaffold;
  tracks: SkillBuildTrackReferenceBundle[];
}): GeneratedSkillOutput {
  const trackBundles: SkillBuildTrackBundle[] = args.outline.tracks.map((outlineTrack) => {
    const track = args.tracks.find((item) => item.trackId === outlineTrack.id);
    if (!track) {
      throw new GeneratedSkillBuildError(
        `Track "${outlineTrack.id}" was not built for ${args.outline.skill}`,
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

  const state = readSkillBuildState(getBuildStatePath(args.rootDir));
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
    metadata.buildVersion !== args.outline.buildVersion ||
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
  const statePath = getBuildStatePath(args.rootDir);

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
      maxTurns: args.maxTurns ?? defaultBuildMaxTurns(args.outline),
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

    const tracks: SkillBuildTrackReferenceBundle[] = [];
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
          args.maxTurns ?? defaultBuildMaxTurns(args.outline),
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
          `Generated track build identity mismatch for ${args.outline.skill}:${track.id}`,
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
        buildVersion: args.outline.buildVersion,
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
        `Generated skill build failed for ${args.outline.skill}: ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }
}
