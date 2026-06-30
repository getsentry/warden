import { z } from 'zod';
import type { EventContext, UsageStats } from '../types/index.js';
import type { ReviewChunk } from '../diff/index.js';
import { SkillRunnerError } from './errors.js';
import { getRuntime } from './runtimes/index.js';
import type { RuntimeName } from './runtimes/index.js';
import type { PreparedFile, ReviewChunkGroup } from './types.js';

const SemanticChunkPlanSchema = z.object({
  groups: z.array(z.object({
    title: z.string().min(5),
    summary: z.string().min(20),
    chunkIds: z.array(z.string().min(1)).min(1),
  })),
});

export interface SemanticChunkPlanningOptions {
  enabled?: boolean;
  apiKey?: string;
  runtime?: RuntimeName;
  model?: string;
  maxRetries?: number;
  maxChunks?: number;
  maxChunkChars?: number;
  maxHunksPerChunk?: number;
}

export interface SemanticChunkPlanningResult {
  groups: ReviewChunkGroup[];
  usage?: UsageStats;
}

function formatChangedRanges(chunk: ReviewChunk): string {
  return chunk.changedLineMap
    .map((range) => `${range.path}:${range.start}-${range.end}`)
    .join(', ');
}

function formatChunkForPlanning(chunk: ReviewChunk): string {
  const fileSummaries = chunk.files.map((file) => [
    `File: ${file.path}`,
    `Language: ${file.language}`,
    `Content mode: ${file.contentMode}`,
    'Content:',
    file.content,
  ].join('\n')).join('\n\n');

  return [
    `Chunk ID: ${chunk.id}`,
    `Title: ${chunk.title}`,
    `Changed ranges: ${formatChangedRanges(chunk)}`,
    fileSummaries,
  ].join('\n');
}

function buildSemanticChunkPlanningPrompt(
  context: EventContext,
  chunks: ReviewChunk[],
  options: SemanticChunkPlanningOptions
): string {
  const pr = context.pullRequest;
  const maxChunks = options.maxChunks ?? 20;
  const maxHunksPerChunk = options.maxHunksPerChunk ?? 50;
  const maxChunkChars = options.maxChunkChars ?? 30000;
  const header = [
    'You are planning code review chunks for Warden.',
    '',
    'Group atomic git chunks into semantic review chunks.',
    'A semantic chunk should contain changes that a reviewer should understand together: one behavior change, API contract, data flow, migration, validation rule, or test expectation.',
    'For each planned group, write a semantic delta summary: what behavior, contract, data flow, API, or test expectation changed.',
    'Do not restate filenames or line ranges. Do not say "lines 10, 100, 200".',
    'Keep each summary one sentence. Be concrete enough that a scanner knows why the grouped changes belong together.',
    `Target at most ${maxChunks} planned groups.`,
    `Use at most ${maxHunksPerChunk} atomic chunks per group.`,
    `Keep each planned group under roughly ${maxChunkChars} characters of provided content.`,
    'Every input Chunk ID must appear in exactly one group. Do not invent Chunk IDs.',
    '',
    `Repository: ${context.repository.fullName}`,
    pr ? `Pull request title: ${pr.title}` : undefined,
    pr?.body ? `Pull request body: ${pr.body}` : undefined,
  ].filter((line): line is string => Boolean(line));

  return [
    ...header,
    '',
    'Return JSON with this exact shape:',
    '{"groups":[{"title":"semantic title","summary":"semantic delta summary","chunkIds":["chunk id"]}]}',
    '',
    'Atomic chunks:',
    chunks.map(formatChunkForPlanning).join('\n\n---\n\n'),
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

function materializePlannedChunk(
  index: number,
  title: string,
  summary: string,
  chunks: ReviewChunk[]
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
      content: chunkFiles.map((file) => file.content).join('\n\n---\n\n'),
      contentMode: 'raw-hunks' as const,
      sourceLines: mergeSourceLines(chunks, path),
    };
  });

  return {
    id: `semantic:${index + 1}`,
    title,
    summary,
    files,
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
  limits: { maxChunkChars: number; maxHunksPerChunk: number }
): ReviewChunk[] {
  const batches: ReviewChunk[][] = [];
  let current: ReviewChunk[] = [];

  const pushCurrent = () => {
    if (current.length > 0) {
      batches.push(current);
      current = [];
    }
  };

  for (const chunk of chunks) {
    if (current.length === 0) {
      current = [chunk];
      continue;
    }

    const candidate = [...current, chunk];
    const candidateChunk = materializePlannedChunk(startIndex + batches.length, title, summary, candidate);
    const exceedsHunks = candidate.length > limits.maxHunksPerChunk;
    const exceedsChars = reviewChunkContentChars(candidateChunk) > limits.maxChunkChars;

    if (exceedsHunks || exceedsChars) {
      pushCurrent();
      current = [chunk];
    } else {
      current = candidate;
    }
  }

  pushCurrent();

  return batches.map((batch, batchIndex) => materializePlannedChunk(
    startIndex + batchIndex,
    plannedChunkTitle(title, batchIndex + 1, batches.length),
    summary,
    batch,
  ));
}

function groupFromPreparedFile(file: PreparedFile): ReviewChunkGroup {
  const filenames = [...new Set(file.chunks.flatMap((chunk) => chunk.files.map((chunkFile) => chunkFile.path)))];
  return {
    displayName: file.filename,
    filenames: filenames.length > 0 ? filenames : [file.filename],
    chunks: file.chunks,
  };
}

function groupFromPlannedChunk(chunk: ReviewChunk): ReviewChunkGroup {
  const filenames = [...new Set(chunk.files.map((file) => file.path))];
  const [firstFilename] = filenames;
  return {
    displayName: filenames.length <= 1
      ? firstFilename ?? chunk.title
      : `${firstFilename ?? chunk.title} + ${filenames.length - 1} file${filenames.length === 2 ? '' : 's'}`,
    filenames,
    chunks: [chunk],
  };
}

/**
 * Populate ReviewChunk semantic summaries with a model-backed planning pass.
 */
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
    model: options.model,
    maxRetries: options.maxRetries,
  });

  if (!result.success) {
    throw new SkillRunnerError(`Semantic chunk planning failed: ${result.error}`, {
      code: 'sdk_error',
    });
  }

  const chunksById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const seen = new Set<string>();
  const plannedChunks: ReviewChunk[] = [];
  const maxChunks = options.maxChunks ?? 20;
  const maxHunksPerChunk = options.maxHunksPerChunk ?? 50;
  const maxChunkChars = options.maxChunkChars ?? 30000;

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
    plannedChunks.push(...splitPlannedChunks(plannedChunks.length, group.title, group.summary, groupChunks, {
      maxChunkChars,
      maxHunksPerChunk,
    }));
  }

  const missing = chunks.filter((chunk) => !seen.has(chunk.id));
  if (missing.length > 0) {
    throw new SkillRunnerError(
      `Semantic chunk planning omitted ${missing.length} chunk${missing.length === 1 ? '' : 's'}`,
      { code: 'sdk_error' },
    );
  }

  return {
    groups: plannedChunks.map(groupFromPlannedChunk),
    usage: result.usage,
  };
}
