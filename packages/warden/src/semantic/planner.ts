import { z } from 'zod';
import type { EventContext, UsageStats } from '../types/index.js';
import type { ChangedLineRange, ReviewChunk } from '../diff/index.js';
import { SkillRunnerError } from '../sdk/errors.js';
import { getRuntime } from '../sdk/runtimes/index.js';
import type { RuntimeName } from '../sdk/runtimes/index.js';
import type { PreparedFile, ReviewChunkGroup } from '../sdk/types.js';
import { createSemanticPlannerToolExecutor, SEMANTIC_PLANNER_TOOLS } from './tools.js';

const SemanticChunkPlanSchema = z.object({
  groups: z.array(z.object({
    title: z.string().min(5),
    summary: z.string().min(20),
    chunkIds: z.array(z.string().min(1)).min(1),
  })),
});

const MAX_EMBEDDED_DIFF_CHARS = 8000;
const MAX_EMBEDDED_DIFF_CHUNKS = 12;
const MAX_EMBEDDED_DIFF_RANGES = 12;
const MAX_CHUNK_CHARS = 20000;
const MAX_HUNKS_PER_CHUNK = 4;
const MAX_CHANGED_RANGES_PER_CHUNK = 4;
const SIMILAR_TINY_RANGE_MULTIPLIER = 3;
const MAX_TINY_CHANGED_LINES = 6;

export interface SemanticChunkPlanningOptions {
  enabled?: boolean;
  apiKey?: string;
  runtime?: RuntimeName;
  model?: string;
  maxChunks?: number;
  maxChunkChars?: number;
  maxHunksPerChunk?: number;
  maxChangedRangesPerChunk?: number;
  maxEmbeddedDiffChars?: number;
  maxEmbeddedDiffChunks?: number;
  maxEmbeddedDiffRanges?: number;
}

interface AtomicHunkSummary {
  id: string;
  path: string;
  language?: string;
  changedRanges: ChangedLineRange[];
  title: string;
  contentMode: ReviewChunk['files'][number]['contentMode'];
  additions: number;
  deletions: number;
  changedLinePreview: string[];
  embeddedDiff?: string;
}

interface SemanticChunkLimits {
  maxChunks: number;
  maxChunkChars: number;
  maxHunksPerChunk: number;
  maxChangedRangesPerChunk: number;
  maxEmbeddedDiffChars: number;
  maxEmbeddedDiffChunks: number;
  maxEmbeddedDiffRanges: number;
}

interface SemanticChunkPlannerInput {
  context: EventContext;
  chunks: AtomicHunkSummary[];
  limits: SemanticChunkLimits;
}

export interface SemanticChunkPlanningResult {
  groups: ReviewChunkGroup[];
  usage?: UsageStats;
}

function countChangedLines(chunk: ReviewChunk, prefix: '+' | '-'): number {
  return chunk.files.reduce((sum, file) => {
    const matches = file.content.match(new RegExp(`^\\${prefix}(?!\\${prefix}|\\+\\+)`, 'gm'));
    return sum + (matches?.length ?? 0);
  }, 0);
}

function compactChangedLinePreview(chunk: ReviewChunk, maxLines = 8): string[] {
  const preview: string[] = [];
  for (const file of chunk.files) {
    for (const line of file.content.split('\n')) {
      if ((!line.startsWith('+') && !line.startsWith('-')) || line.startsWith('+++') || line.startsWith('---')) {
        continue;
      }
      preview.push(line.length > 180 ? `${line.slice(0, 177)}...` : line);
      if (preview.length >= maxLines) return preview;
    }
  }
  return preview;
}

function atomicHunkSummaryFromChunk(chunk: ReviewChunk): AtomicHunkSummary {
  const firstFile = chunk.files[0];
  return {
    id: chunk.id,
    path: firstFile.path,
    language: firstFile.language,
    changedRanges: chunk.changedLineMap,
    title: chunk.title,
    contentMode: firstFile.contentMode,
    additions: countChangedLines(chunk, '+'),
    deletions: countChangedLines(chunk, '-'),
    changedLinePreview: compactChangedLinePreview(chunk),
  };
}

function shouldEmbedDiffs(chunks: ReviewChunk[], limits: SemanticChunkLimits): boolean {
  if (chunks.length > limits.maxEmbeddedDiffChunks) return false;
  const changedRanges = chunks.reduce((sum, chunk) => sum + chunk.changedLineMap.length, 0);
  if (changedRanges > limits.maxEmbeddedDiffRanges) return false;
  const totalChars = chunks.reduce(
    (sum, chunk) => sum + chunk.files.reduce((fileSum, file) => fileSum + file.content.length, 0),
    0,
  );
  return totalChars <= limits.maxEmbeddedDiffChars;
}

function atomicHunkSummariesFromChunks(chunks: ReviewChunk[], limits: SemanticChunkLimits): AtomicHunkSummary[] {
  const embedDiffs = shouldEmbedDiffs(chunks, limits);
  return chunks.map((chunk) => {
    const summary = atomicHunkSummaryFromChunk(chunk);
    if (!embedDiffs) return summary;

    return {
      ...summary,
      embeddedDiff: chunk.files.map((file) => [
        `File: ${file.path}`,
        file.content,
      ].join('\n')).join('\n\n'),
    };
  });
}

function formatFileInventory(context: EventContext): string {
  return (context.pullRequest?.files ?? []).map((file) => [
    `${file.filename} (${file.status})`,
    `  additions: ${file.additions}`,
    `  deletions: ${file.deletions}`,
    `  hunks: ${file.chunks}`,
  ].join('\n')).join('\n');
}

function semanticChunkLimits(options: SemanticChunkPlanningOptions): SemanticChunkLimits {
  return {
    maxChunks: options.maxChunks ?? 20,
    maxChunkChars: options.maxChunkChars ?? MAX_CHUNK_CHARS,
    maxHunksPerChunk: options.maxHunksPerChunk ?? MAX_HUNKS_PER_CHUNK,
    maxChangedRangesPerChunk: options.maxChangedRangesPerChunk ?? MAX_CHANGED_RANGES_PER_CHUNK,
    maxEmbeddedDiffChars: options.maxEmbeddedDiffChars ?? MAX_EMBEDDED_DIFF_CHARS,
    maxEmbeddedDiffChunks: options.maxEmbeddedDiffChunks ?? MAX_EMBEDDED_DIFF_CHUNKS,
    maxEmbeddedDiffRanges: options.maxEmbeddedDiffRanges ?? MAX_EMBEDDED_DIFF_RANGES,
  };
}

function buildSemanticChunkPlannerInput(
  context: EventContext,
  chunks: ReviewChunk[],
  options: SemanticChunkPlanningOptions,
): SemanticChunkPlannerInput {
  const limits = semanticChunkLimits(options);
  return {
    context,
    chunks: atomicHunkSummariesFromChunks(chunks, limits),
    limits,
  };
}

function formatPlannerInput(input: SemanticChunkPlannerInput): string {
  const pr = input.context.pullRequest;
  const sections = [
    `Repository: ${input.context.repository.fullName}`,
    pr ? `Pull request title: ${pr.title}` : undefined,
    pr?.body ? `Pull request body: ${pr.body}` : undefined,
    formatFileInventory(input.context)
      ? ['Changed files:', formatFileInventory(input.context)].join('\n')
      : undefined,
    [
      'Atomic chunks:',
      input.chunks.map((chunk) => [
        `Chunk ID: ${chunk.id}`,
        `Path: ${chunk.path}`,
        chunk.language ? `Language: ${chunk.language}` : undefined,
        `Title: ${chunk.title}`,
        `Changed ranges: ${chunk.changedRanges.map((range) => `${range.path}:${range.start}-${range.end}`).join(', ')}`,
        `Content mode: ${chunk.contentMode}`,
        `Additions: ${chunk.additions}`,
        `Deletions: ${chunk.deletions}`,
        chunk.changedLinePreview.length > 0
          ? ['Changed-line preview:', ...chunk.changedLinePreview].join('\n')
          : undefined,
        chunk.embeddedDiff
          ? ['Embedded small diff:', chunk.embeddedDiff].join('\n')
          : undefined,
      ].filter((line): line is string => Boolean(line)).join('\n')).join('\n\n---\n\n'),
    ].join('\n'),
  ];

  return sections.filter((section): section is string => Boolean(section)).join('\n\n');
}

function buildSemanticChunkPlanningPrompt(
  context: EventContext,
  chunks: ReviewChunk[],
  options: SemanticChunkPlanningOptions
): string {
  const plannerInput = buildSemanticChunkPlannerInput(context, chunks, options);
  const { maxChunks, maxHunksPerChunk, maxChangedRangesPerChunk, maxChunkChars } = plannerInput.limits;
  const header = [
    'You are planning code review chunks for Warden.',
    '',
    'Group atomic git chunks into semantic changes.',
    'A semantic change should contain chunks that a reviewer should understand together: one behavior change, API contract, data flow, migration, validation rule, or test expectation.',
    'Collapse repeated small similar hunks into one semantic change when they apply the same transformation, update the same contract, or repeat the same expectation across call sites.',
    'For each planned group, write a semantic delta summary: what behavior, contract, data flow, API, or test expectation changed.',
    'Do not restate filenames or line ranges. Do not say "lines 10, 100, 200".',
    'Do not summarize the input shape. Explain the product, security, data-flow, API, or test behavior being changed.',
    'Keep each summary one sentence. Be concrete enough that a scanner knows why the grouped changes belong together.',
    'Inspect the changed code with tools before finalizing the plan, especially when grouping across files or distant hunks.',
    'Use read_review_chunk to inspect exact hunk content for non-embedded chunks; read_changed_file only shows current head content.',
    'If embedded small diffs are present, use them as initial evidence and use tools only for missing relationships or context.',
    `Target at most ${maxChunks} planned groups.`,
    `Warden may split a planned semantic change into bounded scanner chunks after planning.`,
    `Each scanner chunk will use at most ${maxHunksPerChunk} atomic chunks.`,
    `Each scanner chunk will use at most ${maxChangedRangesPerChunk} changed line ranges.`,
    `Each scanner chunk will stay under roughly ${maxChunkChars} characters once materialized.`,
    `Embedded small diffs are only present when the changeset fits these planner limits: ${plannerInput.limits.maxEmbeddedDiffChars} chars, ${plannerInput.limits.maxEmbeddedDiffChunks} chunks, ${plannerInput.limits.maxEmbeddedDiffRanges} changed ranges.`,
    'Every input Chunk ID must appear in exactly one group. Do not invent Chunk IDs.',
  ].filter((line): line is string => Boolean(line));

  return [
    ...header,
    '',
    'Return JSON with this exact shape:',
    '{"groups":[{"title":"semantic title","summary":"semantic delta summary","chunkIds":["chunk id"]}]}',
    '',
    formatPlannerInput(plannerInput),
  ].join('\n');
}

function mergeSourceLines(chunks: ReviewChunk[], path: string) {
  const byLine = new Map<number, string>();
  for (const chunk of chunks) {
    for (const file of chunk.files.filter((file) => file.path === path)) {
      for (const line of file.sourceLines) {
        byLine.set(line.line, line.content);
      }
    }
  }

  return Array.from(byLine, ([line, content]) => ({ line, content }))
    .sort((a, b) => a.line - b.line);
}

function changedDiffLines(content: string): string[] {
  return content.split('\n').filter((line) =>
    (line.startsWith('+') || line.startsWith('-')) && !line.startsWith('+++') && !line.startsWith('---')
  );
}

function countChangedDiffLines(chunk: ReviewChunk): number {
  return chunk.files.reduce((sum, file) => sum + changedDiffLines(file.content).length, 0);
}

function normalizeChangedLine(line: string): string {
  const sign = line[0];
  return `${sign}${line
    .slice(1)
    .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '<string>')
    .replace(/\b\d+(?:\.\d+)?\b/g, '<number>')
    .replace(/\s+/g, ' ')
    .trim()}`;
}

function similarityKey(chunk: ReviewChunk): string | undefined {
  if (countChangedDiffLines(chunk) > MAX_TINY_CHANGED_LINES) return undefined;

  const firstFile = chunk.files[0];
  if (!firstFile) return undefined;

  const normalized = chunk.files
    .flatMap((file) => changedDiffLines(file.content).map(normalizeChangedLine))
    .filter(Boolean);
  if (normalized.length === 0) return undefined;

  return [
    firstFile.language,
    normalized.join('\n'),
  ].join(':');
}

function orderedSimilarityBatches(chunks: ReviewChunk[]): ReviewChunk[][] {
  const batches: ReviewChunk[][] = [];
  const indexByKey = new Map<string, number>();

  for (const chunk of chunks) {
    const key = similarityKey(chunk);
    if (!key) {
      batches.push([chunk]);
      continue;
    }

    const existingIndex = indexByKey.get(key);
    if (existingIndex !== undefined) {
      batches[existingIndex]?.push(chunk);
      continue;
    }

    indexByKey.set(key, batches.length);
    batches.push([chunk]);
  }

  return batches;
}

function compactRepeatedHunkContent(files: ReviewChunk['files'][number][]): string {
  return files.map((file) => {
    const lines = file.content.split('\n');
    const compactLines = lines.filter((line) =>
      line.startsWith('## Hunk:') ||
      line.startsWith('## Scope:') ||
      line.startsWith('@@') ||
      ((line.startsWith('+') || line.startsWith('-')) && !line.startsWith('+++') && !line.startsWith('---'))
    );
    return compactLines.join('\n');
  }).join('\n\n---\n\n');
}

function materializePlannedChunk(
  index: number,
  title: string,
  summary: string,
  chunks: ReviewChunk[],
  options: { compact?: boolean } = {}
): ReviewChunk {
  const changedLineMap = chunks.flatMap((chunk) => chunk.changedLineMap);
  const paths = [...new Set(chunks.flatMap((chunk) => chunk.files.map((file) => file.path)))];
  const files = paths.map((path) => {
    const chunkFiles = chunks.flatMap((chunk) => chunk.files.filter((file) => file.path === path));
    const first = chunkFiles[0];
    if (!first) {
      throw new Error(`Cannot materialize planned chunk without file content for ${path}`);
    }

    return {
      path,
      language: first.language,
      changedRanges: changedLineMap.filter((range) => range.path === path),
      content: options.compact
        ? compactRepeatedHunkContent(chunkFiles)
        : chunkFiles.map((file) => file.content).join('\n\n---\n\n'),
      contentMode: 'raw-hunks' as const,
      sourceLines: mergeSourceLines(chunks, path),
    };
  });
  const firstFile = files[0];
  if (!firstFile) {
    throw new Error('Cannot materialize planned chunk without files');
  }

  return {
    id: `semantic:${index + 1}`,
    title,
    summary,
    files: [firstFile, ...files.slice(1)],
    changedLineMap,
  };
}

function reviewChunkContentChars(chunk: ReviewChunk): number {
  return chunk.files.reduce((sum, file) => sum + file.content.length, 0);
}

function plannedChunkTitle(title: string, partIndex: number, totalParts: number): string {
  return totalParts <= 1 ? title : `${title} (${partIndex}/${totalParts})`;
}

function splitPlannedChunks(
  startIndex: number,
  title: string,
  summary: string,
  chunks: ReviewChunk[],
  limits: { maxChunkChars: number; maxHunksPerChunk: number; maxChangedRangesPerChunk: number }
): ReviewChunk[] {
  const batches: ReviewChunk[][] = [];
  let current: ReviewChunk[] = [];
  const plannedBatches = orderedSimilarityBatches(chunks);

  const pushCurrent = () => {
    if (current.length > 0) {
      batches.push(current);
      current = [];
    }
  };

  const addChunk = (chunk: ReviewChunk, maxHunks: number, maxChangedRanges: number) => {
    const singleChunk = materializePlannedChunk(startIndex + batches.length, title, summary, [chunk]);
    if (reviewChunkContentChars(singleChunk) > limits.maxChunkChars) {
      throw new SkillRunnerError(
        `Semantic chunk planning cannot split atomic chunk ${chunk.id} under maxChunkChars ${limits.maxChunkChars}`,
        { code: 'sdk_error' },
      );
    }

    if (current.length === 0) {
      current = [chunk];
      return;
    }

    const candidate = [...current, chunk];
    const candidateChunk = materializePlannedChunk(startIndex + batches.length, title, summary, candidate);
    const exceedsHunks = candidate.length > maxHunks;
    const exceedsChangedRanges = candidateChunk.changedLineMap.length > maxChangedRanges;
    const exceedsChars = reviewChunkContentChars(candidateChunk) > limits.maxChunkChars;

    if (exceedsHunks || exceedsChangedRanges || exceedsChars) {
      pushCurrent();
      current = [chunk];
    } else {
      current = candidate;
    }
  };

  for (const plannedBatch of plannedBatches) {
    const compactSimilar = plannedBatch.length > 1;
    if (compactSimilar) pushCurrent();

    const maxHunks = compactSimilar
      ? limits.maxHunksPerChunk * SIMILAR_TINY_RANGE_MULTIPLIER
      : limits.maxHunksPerChunk;
    const maxChangedRanges = compactSimilar
      ? limits.maxChangedRangesPerChunk * SIMILAR_TINY_RANGE_MULTIPLIER
      : limits.maxChangedRangesPerChunk;

    for (const chunk of plannedBatch) {
      addChunk(chunk, maxHunks, maxChangedRanges);
    }

    if (compactSimilar) pushCurrent();
  }

  pushCurrent();

  return batches.map((batch, batchIndex) => {
    const compact = batch.length > 1 && new Set(batch.map(similarityKey)).size === 1;
    return materializePlannedChunk(
      startIndex + batchIndex,
      plannedChunkTitle(title, batchIndex + 1, batches.length),
      summary,
      batch,
      { compact },
    );
  });
}

function groupFromPreparedFile(file: PreparedFile): ReviewChunkGroup {
  const filenames = [...new Set(file.chunks.flatMap((chunk) => chunk.files.map((chunkFile) => chunkFile.path)))];
  return {
    displayName: file.filename,
    filenames: filenames.length > 0 ? filenames : [file.filename],
    chunks: file.chunks,
  };
}

function groupFromPlannedChunks(title: string, chunks: ReviewChunk[]): ReviewChunkGroup {
  const filenames = [...new Set(chunks.flatMap((chunk) => chunk.files.map((file) => file.path)))];
  return {
    displayName: title,
    filenames,
    chunks,
  };
}

/** Plan and materialize semantic review chunk groups with a model-backed planning pass. */
export async function planSemanticReviewChunks(
  files: PreparedFile[],
  context: EventContext,
  options: SemanticChunkPlanningOptions = {}
): Promise<SemanticChunkPlanningResult> {
  const chunks = files.flatMap((file) => file.chunks);
  if (!options.enabled || chunks.length === 0) {
    return { groups: files.map(groupFromPreparedFile) };
  }

  const runtimeName = options.runtime ?? 'pi';
  const result = await getRuntime(runtimeName).runAuxiliary({
    task: 'semantic_chunking',
    agentName: 'semantic-chunk-planner',
    apiKey: options.apiKey,
    prompt: buildSemanticChunkPlanningPrompt(context, chunks, options),
    schema: SemanticChunkPlanSchema,
    tools: SEMANTIC_PLANNER_TOOLS,
    executeTool: createSemanticPlannerToolExecutor(context, chunks),
    maxIterations: 5,
    model: options.model,
  });

  if (!result.success) {
    throw new SkillRunnerError(`Semantic chunk planning failed: ${result.error}`, {
      code: 'sdk_error',
    });
  }

  const chunksById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const seen = new Set<string>();
  const plannedGroups: ReviewChunkGroup[] = [];
  let plannedChunkCount = 0;
  const maxChunks = options.maxChunks ?? 20;
  const maxHunksPerChunk = options.maxHunksPerChunk ?? MAX_HUNKS_PER_CHUNK;
  const maxChangedRangesPerChunk = options.maxChangedRangesPerChunk ?? MAX_CHANGED_RANGES_PER_CHUNK;
  const maxChunkChars = options.maxChunkChars ?? MAX_CHUNK_CHARS;

  if (result.data.groups.length > maxChunks) {
    throw new SkillRunnerError(
      `Semantic chunk planning returned ${result.data.groups.length} groups, exceeding maxChunks ${maxChunks}`,
      { code: 'sdk_error' },
    );
  }

  for (const group of result.data.groups) {
    const groupChunks: ReviewChunk[] = [];
    for (const chunkId of group.chunkIds) {
      if (seen.has(chunkId)) {
        throw new SkillRunnerError(`Semantic chunk planning assigned chunk ${chunkId} more than once`, {
          code: 'sdk_error',
        });
      }
      const chunk = chunksById.get(chunkId);
      if (!chunk) {
        throw new SkillRunnerError(`Semantic chunk planning returned unknown chunk ${chunkId}`, {
          code: 'sdk_error',
        });
      }
      seen.add(chunkId);
      groupChunks.push(chunk);
    }
    const chunksForGroup = splitPlannedChunks(plannedChunkCount, group.title, group.summary, groupChunks, {
      maxChunkChars,
      maxHunksPerChunk,
      maxChangedRangesPerChunk,
    });
    plannedChunkCount += chunksForGroup.length;
    plannedGroups.push(groupFromPlannedChunks(group.title, chunksForGroup));

    if (plannedChunkCount > maxChunks) {
      throw new SkillRunnerError(
        `Semantic chunk planning materialized ${plannedChunkCount} chunks, exceeding maxChunks ${maxChunks}`,
        { code: 'sdk_error' },
      );
    }
  }

  const missing = chunks.filter((chunk) => !seen.has(chunk.id));
  if (missing.length > 0) {
    throw new SkillRunnerError(
      `Semantic chunk planning omitted ${missing.length} chunk${missing.length === 1 ? '' : 's'}`,
      { code: 'sdk_error' },
    );
  }

  return {
    groups: plannedGroups,
    usage: result.usage,
  };
}
