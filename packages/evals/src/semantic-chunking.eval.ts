import { describe, expect, it } from 'vitest';
import type { EventContext } from '../../warden/src/types/index.js';
import { prepareFiles } from '../../warden/src/sdk/prepare.js';
import { planSemanticReviewChunks } from '../../warden/src/sdk/semantic-chunk-planner.js';
import {
  DEFAULT_EVAL_RUNTIME,
  defaultEvalModel,
  getEvalProviderApiKey,
  getEvalRuntimeApiKey,
} from './auth.js';

const model = process.env['WARDEN_SEMANTIC_CHUNK_EVAL_MODEL'] ?? defaultEvalModel();
const apiKey = getEvalRuntimeApiKey(model);
const providerApiKey = getEvalProviderApiKey(model);

function makeSemanticChunkingContext(): EventContext {
  return {
    eventType: 'pull_request',
    action: 'opened',
    repository: {
      owner: 'getsentry',
      name: 'semantic-chunking-eval',
      fullName: 'getsentry/semantic-chunking-eval',
      defaultBranch: 'main',
    },
    repoPath: '/tmp/warden-semantic-chunking-eval',
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

describe.skipIf(!providerApiKey)('semantic chunking eval', () => {
  it('plans a behavior-level delta for many tiny related hunks', { timeout: 120_000 }, async () => {
    const context = makeSemanticChunkingContext();
    const prepared = prepareFiles(context, {
      chunking: {
        semantic: {
          enabled: true,
          maxChunks: 20,
          maxChunkChars: 30000,
          maxHunksPerChunk: 50,
          preferWholeFileBelowLines: 800,
        },
      },
    });

    const atomicChunks = prepared.files.flatMap((file) => file.chunks);
    expect(atomicChunks).toHaveLength(4);

    const planned = await planSemanticReviewChunks(prepared.files, context, {
      enabled: true,
      apiKey,
      runtime: DEFAULT_EVAL_RUNTIME,
      model,
      maxChunks: 20,
      maxChunkChars: 30000,
      maxHunksPerChunk: 50,
    });

    const chunks = planned.groups.flatMap((group) => group.chunks);
    expect(chunks.length).toBeLessThan(atomicChunks.length);
    const crossFileChunk = chunks.find((chunk) => chunk.files.length > 1);
    expect(crossFileChunk).toBeDefined();
    expect(crossFileChunk?.changedLineMap).toEqual(expect.arrayContaining([
      { path: 'src/dashboard.ts', start: 10, end: 10 },
      { path: 'src/dashboard.ts', start: 80, end: 80 },
      { path: 'src/dashboard.ts', start: 140, end: 140 },
      { path: 'tests/dashboard.test.ts', start: 220, end: 220 },
    ]));

    for (const chunk of chunks) {
      expect(chunk.summary).toBeTruthy();
      expect(chunk.summary).not.toMatch(/lines?\s+\d+/i);
      expect(chunk.summary).not.toMatch(/\b10\b.*\b80\b.*\b140\b/);
    }

    const summaryText = chunks.map((chunk) => chunk.summary ?? '').join(' ');
    expect(summaryText).toMatch(/axisRange|axis range|range/i);
    expect(summaryText).toMatch(/widget|convert|render|chart/i);

    const chunkText = crossFileChunk?.files.map((file) => file.content).join('\n') ?? '';
    expect(chunkText).toContain('convertWidgetToChart(widget, range)');
    expect(chunkText).toContain('renderChart(chart, series, range)');
    expect(chunkText).toContain('expect(rendered.range).toEqual(customAxisRange)');
  });
});
