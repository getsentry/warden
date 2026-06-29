import { describe, expect, it, vi } from 'vitest';
import type { EventContext } from '../types/index.js';
import { prepareFiles } from './prepare.js';
import { planSemanticReviewChunks } from './semantic-chunk-planner.js';
import type { Runtime } from './runtimes/index.js';
import type * as RuntimeModule from './runtimes/index.js';

const runAuxiliary = vi.fn();

vi.mock('./runtimes/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof RuntimeModule>();
  return {
    ...actual,
    getRuntime: vi.fn(() => ({
      name: 'pi',
      runSkill: vi.fn(),
      runAuxiliary,
      runSynthesis: vi.fn(),
    } satisfies Runtime)),
  };
});

function makeContext(): EventContext {
  return {
    eventType: 'pull_request',
    action: 'opened',
    repository: {
      owner: 'qa',
      name: 'repo',
      fullName: 'qa/repo',
      defaultBranch: 'main',
    },
    repoPath: '/tmp/warden-semantic-planner-test',
    pullRequest: {
      number: 1,
      title: 'Preserve user-selected dashboard axis range',
      body: '',
      author: 'qa',
      baseBranch: 'main',
      headBranch: 'feature',
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
          '-const range = getDefaultRange(widget);',
          '+const range = widget.axisRange ?? getDefaultRange(widget);',
          '@@ -100,1 +100,1 @@',
          '-return buildChart(series);',
          '+return buildChart(series, range);',
          '@@ -200,1 +200,1 @@',
          '-expect(chart.range).toEqual(defaultRange);',
          '+expect(chart.range).toEqual(customAxisRange);',
        ].join('\n'),
      }],
    },
  };
}

describe('planSemanticReviewChunks', () => {
  it('groups atomic chunks using a model-provided semantic delta', async () => {
    runAuxiliary.mockResolvedValueOnce({
      success: true,
      data: {
        groups: [{
          title: 'Preserve dashboard axis range',
          summary: 'Dashboard charts now carry a widget-provided axis range through chart construction and assert that custom range in tests.',
          chunkIds: [
            'src/dashboard.ts:10',
            'src/dashboard.ts:100',
            'src/dashboard.ts:200',
          ],
        }],
      },
      usage: {
        inputTokens: 100,
        outputTokens: 25,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheCreation5mInputTokens: 0,
        cacheCreation1hInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0.001,
      },
    });

    const context = makeContext();
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
    expect(prepared.files[0]?.chunks).toHaveLength(3);

    const planned = await planSemanticReviewChunks(prepared.files, context, {
      enabled: true,
      runtime: 'pi',
      model: 'anthropic/claude-sonnet-4-6',
      maxChunks: 20,
      maxChunkChars: 30000,
      maxHunksPerChunk: 50,
    });

    expect(planned.groups).toHaveLength(1);
    expect(planned.groups[0]?.chunks).toHaveLength(1);
    expect(planned.groups[0]?.chunks[0]).toMatchObject({
      id: 'semantic:1',
      title: 'Preserve dashboard axis range',
      summary: 'Dashboard charts now carry a widget-provided axis range through chart construction and assert that custom range in tests.',
      changedLineMap: [
        { path: 'src/dashboard.ts', start: 10, end: 10 },
        { path: 'src/dashboard.ts', start: 100, end: 100 },
        { path: 'src/dashboard.ts', start: 200, end: 200 },
      ],
    });
    expect(runAuxiliary).toHaveBeenCalledWith(expect.objectContaining({
      task: 'semantic_chunking',
      agentName: 'semantic-chunk-planner',
    }));
    const prompt = runAuxiliary.mock.calls[0]?.[0].prompt as string;
    expect(prompt).toContain('Group atomic git chunks into semantic review chunks.');
    expect(prompt).toContain('Do not restate filenames or line ranges.');
  });

  it('rejects planned groups that exceed maxChunkChars after materialization', async () => {
    runAuxiliary.mockResolvedValueOnce({
      success: true,
      data: {
        groups: [{
          title: 'Preserve dashboard axis range',
          summary: 'Dashboard charts now carry a widget-provided axis range through chart construction and assert that custom range in tests.',
          chunkIds: ['src/dashboard.ts:10', 'src/dashboard.ts:100'],
        }],
      },
      usage: {
        inputTokens: 100,
        outputTokens: 25,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheCreation5mInputTokens: 0,
        cacheCreation1hInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0.001,
      },
    });

    const context = makeContext();
    const prepared = prepareFiles(context);

    await expect(planSemanticReviewChunks(prepared.files, context, {
      enabled: true,
      runtime: 'pi',
      maxChunkChars: 10,
    })).rejects.toThrow('exceeding maxChunkChars 10');
  });

  it('materializes semantic groups across multiple files', async () => {
    runAuxiliary.mockResolvedValueOnce({
      success: true,
      data: {
        groups: [{
          title: 'Preserve dashboard axis range',
          summary: 'Dashboard charts now carry widget axis ranges through rendering and assert that behavior in tests.',
          chunkIds: [
            'src/dashboard.ts:10',
            'tests/dashboard.test.ts:20',
          ],
        }],
      },
      usage: {
        inputTokens: 100,
        outputTokens: 25,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheCreation5mInputTokens: 0,
        cacheCreation1hInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0.001,
      },
    });

    const context = makeContext();
    context.pullRequest!.files = [
      {
        filename: 'src/dashboard.ts',
        status: 'modified',
        additions: 1,
        deletions: 1,
        chunks: 1,
        patch: [
          '@@ -10,1 +10,1 @@',
          '-const range = getDefaultRange(widget);',
          '+const range = widget.axisRange ?? getDefaultRange(widget);',
        ].join('\n'),
      },
      {
        filename: 'tests/dashboard.test.ts',
        status: 'modified',
        additions: 1,
        deletions: 1,
        chunks: 1,
        patch: [
          '@@ -20,1 +20,1 @@',
          '-expect(chart.range).toEqual(defaultRange);',
          '+expect(chart.range).toEqual(customAxisRange);',
        ].join('\n'),
      },
    ];

    const prepared = prepareFiles(context);
    const planned = await planSemanticReviewChunks(prepared.files, context, {
      enabled: true,
      runtime: 'pi',
      maxChunks: 20,
      maxChunkChars: 30000,
      maxHunksPerChunk: 50,
    });

    const chunk = planned.groups[0]?.chunks[0];
    expect(planned.groups).toHaveLength(1);
    expect(chunk).toMatchObject({
      id: 'semantic:1',
      title: 'Preserve dashboard axis range',
      changedLineMap: [
        { path: 'src/dashboard.ts', start: 10, end: 10 },
        { path: 'tests/dashboard.test.ts', start: 20, end: 20 },
      ],
    });
    expect(chunk?.files).toHaveLength(2);
    expect(chunk?.files.map((file) => file.path)).toEqual([
      'src/dashboard.ts',
      'tests/dashboard.test.ts',
    ]);
  });
});
