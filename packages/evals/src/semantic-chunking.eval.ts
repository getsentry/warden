import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { expect } from 'vitest';
import { createJudge, describeEval } from 'vitest-evals';
import type { JudgeContext } from 'vitest-evals';
import { normalizeContent, toJsonValue, type Harness, type JsonValue } from 'vitest-evals/harness';
import { z } from 'zod';
import type { EventContext } from '../../warden/src/types/index.js';
import { prepareFiles } from '../../warden/src/sdk/prepare.js';
import { planSemanticReviewChunks } from '../../warden/src/semantic/index.js';
import {
  DEFAULT_EVAL_RUNTIME,
  defaultEvalModel,
  getEvalProviderApiKey,
  getEvalRuntimeApiKey,
} from './auth.js';

const model = process.env['WARDEN_SEMANTIC_CHUNK_EVAL_MODEL'] ?? defaultEvalModel();
const apiKey = getEvalRuntimeApiKey(model);
const providerApiKey = getEvalProviderApiKey(model);

const SemanticChunkingEvalInputSchema = z.object({
  name: z.string(),
});
type SemanticChunkingEvalInput = z.infer<typeof SemanticChunkingEvalInputSchema>;

const SemanticChunkingEvalOutputSchema = z.object({
  atomicChunkCount: z.number().int().nonnegative(),
  groups: z.array(z.object({
    displayName: z.string(),
    files: z.array(z.string()),
    changedLineMap: z.array(z.object({
      path: z.string(),
      start: z.number().int(),
      end: z.number().int(),
    })),
    summary: z.string().optional(),
    scannerChunkCount: z.number().int().positive(),
  })),
  chunks: z.array(z.object({
    summary: z.string().optional(),
    files: z.array(z.string()),
    changedLineMap: z.array(z.object({
      path: z.string(),
      start: z.number().int(),
      end: z.number().int(),
    })),
    content: z.string(),
  })),
});

async function createSemanticChunkingRepo(): Promise<string> {
  const repoPath = await mkdtemp(join(tmpdir(), 'warden-semantic-chunking-eval-'));
  await mkdir(join(repoPath, 'src'), { recursive: true });
  await mkdir(join(repoPath, 'tests'), { recursive: true });
  await writeFile(join(repoPath, 'src/dashboard.ts'), [
    'const range = widget.axisRange ?? getDefaultAxisRange(widget);',
    'const chart = convertWidgetToChart(widget, range);',
    'return renderChart(chart, series, range);',
  ].join('\n'));
  await writeFile(join(repoPath, 'tests/dashboard.test.ts'), [
    'expect(rendered.range).toEqual(customAxisRange);',
  ].join('\n'));
  return repoPath;
}

function makeSemanticChunkingContext(repoPath: string): EventContext {
  return {
    eventType: 'pull_request',
    action: 'opened',
    repository: {
      owner: 'getsentry',
      name: 'semantic-chunking-eval',
      fullName: 'getsentry/semantic-chunking-eval',
      defaultBranch: 'main',
    },
    repoPath,
    pullRequest: {
      number: 313,
      title: 'Update dashboard behavior',
      body: '',
      author: 'eval',
      baseBranch: 'main',
      headBranch: 'semantic-axis-range',
      headSha: 'head',
      baseSha: 'base',
      files: [{
        filename: 'src/dashboard.ts',
        status: 'modified',
        additions: 3,
        deletions: 3,
        chunks: 3,
        patch: [
          '@@ -10,1 +10,1 @@',
          '-const range = getDefaultAxisRange(widget);',
          '+const range = widget.axisRange ?? getDefaultAxisRange(widget);',
          '@@ -80,1 +80,1 @@',
          '-const chart = convertWidgetToChart(widget);',
          '+const chart = convertWidgetToChart(widget, range);',
          '@@ -140,1 +140,1 @@',
          '-return renderChart(chart, series);',
          '+return renderChart(chart, series, range);',
        ].join('\n'),
      }, {
        filename: 'tests/dashboard.test.ts',
        status: 'modified',
        additions: 1,
        deletions: 1,
        chunks: 1,
        patch: [
          '@@ -220,1 +220,1 @@',
          '-expect(rendered.range).toEqual(defaultAxisRange);',
          '+expect(rendered.range).toEqual(customAxisRange);',
        ].join('\n'),
      }],
    },
  };
}

function createSemanticChunkingHarness(): Harness<SemanticChunkingEvalInput, JsonValue> {
  return {
    name: 'semantic-chunking',
    run: async (input) => {
      SemanticChunkingEvalInputSchema.parse(input);
      const startTime = Date.now();
      const repoPath = await createSemanticChunkingRepo();
      try {
        const context = makeSemanticChunkingContext(repoPath);
        const prepared = prepareFiles(context, {
          chunking: {
            semantic: {
              enabled: true,
              maxChunks: 20,
              maxChunkChars: 30000,
              maxHunksPerChunk: 50,
            },
          },
        });
        const atomicChunks = prepared.files.flatMap((file) => file.chunks);
        const planned = await planSemanticReviewChunks(prepared.files, context, {
          enabled: true,
          apiKey,
          runtime: DEFAULT_EVAL_RUNTIME,
          model,
          maxChunks: 20,
          maxChunkChars: 30000,
          maxHunksPerChunk: 50,
          maxEmbeddedDiffChars: 0,
          maxEmbeddedDiffChunks: 0,
          maxEmbeddedDiffRanges: 0,
        });
        const chunks = planned.groups.flatMap((group) => group.chunks);
        const output = {
          atomicChunkCount: atomicChunks.length,
          groups: planned.groups.map((group) => ({
            displayName: group.displayName,
            files: group.filenames,
            changedLineMap: group.chunks.flatMap((chunk) => chunk.changedLineMap),
            summary: group.chunks.find((chunk) => chunk.summary)?.summary,
            scannerChunkCount: group.chunks.length,
          })),
          chunks: chunks.map((chunk) => ({
            summary: chunk.summary,
            files: chunk.files.map((file) => file.path),
            changedLineMap: chunk.changedLineMap,
            content: chunk.files.map((file) => file.content).join('\n'),
          })),
        };

        return {
          output: toJsonValue(output) as JsonValue,
          session: {
            messages: [
              {
                role: 'user',
                content: normalizeContent({
                  name: input.name,
                  goal: 'Group related dashboard range changes semantically across implementation and test files.',
                }),
              },
              {
                role: 'assistant',
                content: normalizeContent(output),
              },
            ],
            provider: DEFAULT_EVAL_RUNTIME,
            model,
          },
          usage: {},
          timings: { totalMs: Date.now() - startTime },
          artifacts: {},
          errors: [],
        };
      } finally {
        await rm(repoPath, { recursive: true, force: true });
      }
    },
  };
}

function createSemanticChunkingJudge() {
  return createJudge<JudgeContext<SemanticChunkingEvalInput, JsonValue>>('SemanticChunkingJudge', async ({ run }) => {
    const output = SemanticChunkingEvalOutputSchema.safeParse(run.output);
    if (!output.success) {
      return {
        score: 0,
        metadata: { rationale: `Invalid semantic chunking output: ${output.error.message}` },
      };
    }

    const chunks = output.data.chunks;
    const groups = output.data.groups;
    const crossFileGroup = groups.find((group) => group.files.length > 1);
    const summaryText = groups.map((group) => group.summary ?? '').join(' ');
    const hasSemanticSummary = /axisRange|axis range|range/i.test(summaryText)
      && /widget|convert|render|chart/i.test(summaryText)
      && !/lines?\s+\d+/i.test(summaryText)
      && !/\b10\b.*\b80\b.*\b140\b/.test(summaryText);
    const hasExpectedLineMap = Boolean(crossFileGroup)
      && [
        { path: 'src/dashboard.ts', start: 10, end: 10 },
        { path: 'src/dashboard.ts', start: 80, end: 80 },
        { path: 'src/dashboard.ts', start: 140, end: 140 },
        { path: 'tests/dashboard.test.ts', start: 220, end: 220 },
      ].every((range) =>
        crossFileGroup?.changedLineMap.some((actual) =>
          actual.path === range.path && actual.start === range.start && actual.end === range.end
        )
      );
    const allContent = chunks.map((chunk) => chunk.content).join('\n');
    const hasExpectedContent = Boolean(crossFileGroup)
      && allContent.includes('convertWidgetToChart(widget, range)')
      && allContent.includes('renderChart(chart, series, range)')
      && allContent.includes('expect(rendered.range).toEqual(customAxisRange)');
    const reducedChunks = chunks.length < output.data.atomicChunkCount;
    const passed = reducedChunks && Boolean(crossFileGroup) && hasExpectedLineMap
      && hasSemanticSummary && hasExpectedContent;

    return {
      score: passed ? 1 : 0,
      metadata: {
        rationale: passed
          ? 'Planner produced a semantic cross-file chunk with behavior-level summary.'
          : 'Planner did not produce the expected semantic cross-file chunk.',
        atomicChunkCount: output.data.atomicChunkCount,
        chunkCount: chunks.length,
        hasCrossFileGroup: Boolean(crossFileGroup),
        hasExpectedLineMap,
        hasSemanticSummary,
        hasExpectedContent,
      },
    };
  });
}

describeEval(
  'semantic-chunking',
  {
    harness: createSemanticChunkingHarness(),
    judges: [createSemanticChunkingJudge()],
    judgeThreshold: 1,
    skipIf: () => !providerApiKey,
  },
  (it) => {
    it('plans a behavior-level delta for many tiny related hunks', { timeout: 120_000 }, async ({ run }) => {
      const result = await run({ name: 'dashboard-axis-range' });
      const output = SemanticChunkingEvalOutputSchema.parse(result.output);
      const chunks = output.chunks;

      expect(output.atomicChunkCount).toBe(4);
      expect(chunks.length).toBeLessThan(output.atomicChunkCount);
      expect(output.groups.some((group) => group.files.length > 1)).toBe(true);
    });
  },
);
