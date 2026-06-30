import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';
import type { EventContext } from '../types/index.js';
import type { ReviewChunk } from '../diff/index.js';
import type { AuxiliaryTool } from '../sdk/runtimes/index.js';

const execFileAsync = promisify(execFile);
const MAX_FILE_CHARS = 20000;
const MAX_SEARCH_CHARS = 12000;
const MAX_CHUNK_DIFF_CHARS = 12000;

export const SEMANTIC_PLANNER_TOOLS: AuxiliaryTool[] = [
  {
    name: 'read_review_chunk',
    description: 'Read exact diff content for one atomic review chunk by Chunk ID. Use this to inspect the actual delta without embedding the whole patch.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        chunkId: { type: 'string', description: 'Atomic review chunk ID from the planner input' },
      },
      required: ['chunkId'],
    },
  },
  {
    name: 'read_changed_file',
    description: 'Read the current head content for a changed file in this pull request. Output is capped.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Changed file path to read' },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_repo',
    description: 'Search the repository with ripgrep for imports, symbols, and usage relationships. Output is capped.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Literal or regex query to search for' },
        path: { type: 'string', description: 'Optional path or directory to limit the search' },
      },
      required: ['query'],
    },
  },
];

const ReadChangedFileInput = z.object({
  path: z.string().min(1),
});

const ReadReviewChunkInput = z.object({
  chunkId: z.string().min(1),
});

const SearchRepoInput = z.object({
  query: z.string().min(1).max(200),
  path: z.string().min(1).optional(),
});

function safeRepoPath(repoPath: string, inputPath: string): string | undefined {
  if (isAbsolute(inputPath)) return undefined;
  const absolute = resolve(repoPath, inputPath);
  const repoRelative = relative(repoPath, absolute);
  if (repoRelative.startsWith('..') || isAbsolute(repoRelative)) return undefined;
  return absolute;
}

function capText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n[truncated at ${maxChars} chars]`;
}

function errorStdout(error: unknown): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'stdout' in error
    && ((typeof error.stdout === 'string') || Buffer.isBuffer(error.stdout))
  ) {
    return String(error.stdout);
  }
  return '';
}

/** Create the read-only tool executor used by the semantic chunk planner. */
export function createSemanticPlannerToolExecutor(
  context: EventContext,
  chunks: ReviewChunk[],
): (name: string, input: Record<string, unknown>) => Promise<string> {
  const changedFiles = new Set((context.pullRequest?.files ?? []).map((file) => file.filename));
  const chunksById = new Map(chunks.map((chunk) => [chunk.id, chunk]));

  return async (name: string, input: Record<string, unknown>): Promise<string> => {
    if (name === 'read_review_chunk') {
      const parsed = ReadReviewChunkInput.safeParse(input);
      if (!parsed.success) return `Invalid input: ${parsed.error.message}`;

      const chunk = chunksById.get(parsed.data.chunkId);
      if (!chunk) return 'Unknown review chunk ID';

      return capText(chunk.files.map((file) => [
        `File: ${file.path}`,
        `Changed ranges: ${file.changedRanges.map((range) => `${range.path}:${range.start}-${range.end}`).join(', ')}`,
        file.content,
      ].join('\n')).join('\n\n---\n\n'), MAX_CHUNK_DIFF_CHARS);
    }

    if (name === 'read_changed_file') {
      const parsed = ReadChangedFileInput.safeParse(input);
      if (!parsed.success) return `Invalid input: ${parsed.error.message}`;
      if (!changedFiles.has(parsed.data.path)) return 'Refusing to read a file that is not in the changed file list';

      const absolutePath = safeRepoPath(context.repoPath, parsed.data.path);
      if (!absolutePath) return 'Invalid path';

      try {
        return capText(await readFile(absolutePath, 'utf8'), MAX_FILE_CHARS);
      } catch (error) {
        return `Unable to read file: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    if (name === 'search_repo') {
      const parsed = SearchRepoInput.safeParse(input);
      if (!parsed.success) return `Invalid input: ${parsed.error.message}`;

      const searchPath = parsed.data.path ? safeRepoPath(context.repoPath, parsed.data.path) : context.repoPath;
      if (!searchPath) return 'Invalid path';

      try {
        const { stdout } = await execFileAsync('rg', [
          '--line-number',
          '--max-count',
          '40',
          parsed.data.query,
          searchPath,
        ], {
          cwd: context.repoPath,
          maxBuffer: MAX_SEARCH_CHARS * 2,
        });
        return capText(stdout, MAX_SEARCH_CHARS);
      } catch (error) {
        const maybeStdout = errorStdout(error);
        if (maybeStdout) return capText(maybeStdout, MAX_SEARCH_CHARS);
        return 'No matches found';
      }
    }

    return `Unknown tool: ${name}`;
  };
}
