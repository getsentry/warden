import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventContext } from '../types/index.js';
import { prepareFiles } from '../sdk/prepare.js';
import { planSemanticReviewChunks } from './planner.js';
import type { Runtime } from '../sdk/runtimes/index.js';
import type * as RuntimeModule from '../sdk/runtimes/index.js';

const runAuxiliary = vi.fn();

vi.mock('../sdk/runtimes/index.js', async (importOriginal) => {
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

beforeEach(() => {
  runAuxiliary.mockReset();
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
      model: 'anthropic/claude-sonnet-4-6',
      tools: expect.arrayContaining([
        expect.objectContaining({ name: 'read_review_chunk' }),
        expect.objectContaining({ name: 'read_changed_file' }),
        expect.objectContaining({ name: 'search_repo' }),
      ]),
      executeTool: expect.any(Function),
      maxIterations: 5,
    }));
    const prompt = runAuxiliary.mock.calls[0]?.[0].prompt as string;
    expect(prompt).toContain('Changed-line preview:');
    expect(prompt).toContain('Embedded small diff:');
    expect(prompt).toContain('@@ -10,1 +10,1 @@');
  });

  it('keeps many-hunk planner prompts metadata-first and tool-backed', async () => {
    const context = makeContext();
    context.pullRequest!.files = [{
      filename: 'src/dashboard.ts',
      status: 'modified',
      additions: 13,
      deletions: 13,
      chunks: 13,
      patch: Array.from({ length: 13 }, (_, index) => {
        const line = index + 1;
        return [
          `@@ -${line},1 +${line},1 @@`,
          `-const value${line} = getDefaultRange(widget);`,
          `+const value${line} = widget.axisRange ?? getDefaultRange(widget);`,
        ].join('\n');
      }).join('\n'),
    }];
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
    const chunkIds = prepared.files.flatMap((file) => file.chunks.map((chunk) => chunk.id));
    runAuxiliary.mockResolvedValueOnce({
      success: true,
      data: {
        groups: [{
          title: 'Preserve dashboard axis range',
          summary: 'Dashboard range values now prefer widget-provided axis ranges across repeated dashboard call sites.',
          chunkIds,
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

    await planSemanticReviewChunks(prepared.files, context, {
      enabled: true,
      runtime: 'pi',
      model: 'anthropic/claude-sonnet-4-6',
    });

    const prompt = runAuxiliary.mock.calls[0]?.[0].prompt as string;
    expect(prompt).toContain('Changed-line preview:');
    expect(prompt).not.toContain('Embedded small diff:');
    expect(prompt).not.toContain('@@ -1,1 +1,1 @@');
    const executeTool = runAuxiliary.mock.calls[0]?.[0].executeTool as (
      name: string,
      input: Record<string, unknown>,
    ) => Promise<string>;
    await expect(executeTool('read_review_chunk', { chunkId: chunkIds[0] }))
      .resolves.toContain('@@ -1,1 +1,1 @@');
  });

  it('uses configured embedded diff limits for smaller-context models', async () => {
    runAuxiliary.mockResolvedValueOnce({
      success: true,
      data: {
        groups: [{
          title: 'Preserve dashboard axis range',
          summary: 'Dashboard charts now carry a widget-provided axis range through chart construction and assert that custom range in tests.',
          chunkIds: ['src/dashboard.ts:10', 'src/dashboard.ts:100', 'src/dashboard.ts:200'],
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

    await planSemanticReviewChunks(prepared.files, context, {
      enabled: true,
      runtime: 'pi',
      model: 'small-context-model',
      maxEmbeddedDiffChars: 0,
      maxEmbeddedDiffChunks: 0,
      maxEmbeddedDiffRanges: 0,
    });

    const prompt = runAuxiliary.mock.calls[0]?.[0].prompt as string;
    expect(prompt).toContain('0 chars, 0 chunks, 0 changed ranges');
    expect(prompt).toContain('Changed-line preview:');
    expect(prompt).not.toContain('Embedded small diff:');
    expect(prompt).not.toContain('@@ -10,1 +10,1 @@');
  });

  it('splits planned groups that exceed maxChunkChars after materialization', async () => {
    runAuxiliary.mockResolvedValueOnce({
      success: true,
      data: {
        groups: [{
          title: 'Preserve dashboard axis range',
          summary: 'Dashboard charts now carry a widget-provided axis range through chart construction and assert that custom range in tests.',
          chunkIds: ['src/dashboard.ts:10', 'src/dashboard.ts:100', 'src/dashboard.ts:200'],
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

    const planned = await planSemanticReviewChunks(prepared.files, context, {
      enabled: true,
      runtime: 'pi',
      maxChunkChars: 500,
    });

    expect(planned.groups).toHaveLength(2);
    expect(planned.groups.map((group) => group.chunks[0]?.title)).toEqual([
      'Preserve dashboard axis range (1/2)',
      'Preserve dashboard axis range (2/2)',
    ]);
    expect(planned.groups.map((group) => group.chunks[0]?.changedLineMap)).toEqual([
      [
        { path: 'src/dashboard.ts', start: 10, end: 10 },
        { path: 'src/dashboard.ts', start: 100, end: 100 },
      ],
      [{ path: 'src/dashboard.ts', start: 200, end: 200 }],
    ]);
  });

  it('rejects materialized groups that exceed maxChunks after splitting', async () => {
    runAuxiliary.mockResolvedValueOnce({
      success: true,
      data: {
        groups: [{
          title: 'Preserve dashboard axis range',
          summary: 'Dashboard charts now carry a widget-provided axis range through chart construction and assert that custom range in tests.',
          chunkIds: ['src/dashboard.ts:10', 'src/dashboard.ts:100', 'src/dashboard.ts:200'],
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
      maxChunks: 1,
      maxChunkChars: 500,
    })).rejects.toThrow('materialized 2 groups, exceeding maxChunks 1');
  });

  it('rejects atomic chunks that exceed maxChunkChars', async () => {
    runAuxiliary.mockResolvedValueOnce({
      success: true,
      data: {
        groups: [{
          title: 'Preserve dashboard axis range',
          summary: 'Dashboard charts now carry a widget-provided axis range through chart construction and assert that custom range in tests.',
          chunkIds: ['src/dashboard.ts:10'],
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
    })).rejects.toThrow('cannot split atomic chunk src/dashboard.ts:10 under maxChunkChars 10');
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
