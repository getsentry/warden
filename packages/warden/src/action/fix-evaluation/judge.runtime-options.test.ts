import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Octokit } from '@octokit/rest';
import type { ExistingComment } from '../../output/dedup.js';
import type { FixJudgeContext, FixJudgeInput, FixJudgeRuntimeOptions } from './judge.js';

describe('evaluateFix runtime options', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('treats null runtime options as empty options', async () => {
    const runAuxiliary = vi.fn().mockResolvedValue({
      success: true,
      data: { status: 'not_attempted', reasoning: 'No related changes' },
      usage: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
    });
    const getRuntime = vi.fn(() => ({ runAuxiliary }));

    vi.doMock('../../sdk/runtimes/index.js', () => ({
      getRuntime,
    }));

    const { evaluateFix } = await import('./judge.js');

    const comment: ExistingComment = {
      id: 1,
      path: 'src/handler.ts',
      line: 12,
      title: 'SQL injection',
      description: 'User input is concatenated into SQL',
      contentHash: 'abc123',
      isWarden: true,
      threadId: 'thread-1',
    };

    const input: FixJudgeInput = {
      comment,
      changedFiles: ['src/handler.ts'],
      codeBeforeFix: '12: const query = "SELECT * FROM users WHERE id = " + id;',
    };

    const context: FixJudgeContext = {
      octokit: {} as Octokit,
      owner: 'test-owner',
      repo: 'test-repo',
      baseSha: 'base123',
      headSha: 'head456',
      patches: new Map(),
    };

    const result = await evaluateFix(
      input,
      context,
      'api-key',
      null as unknown as FixJudgeRuntimeOptions
    );

    expect(result.usedFallback).toBe(false);
    expect(getRuntime).toHaveBeenCalledWith(undefined);
    expect(runAuxiliary).toHaveBeenCalledWith(
      expect.objectContaining({
        model: undefined,
        maxRetries: undefined,
        prompt: expect.stringContaining('<reported_issue>'),
      })
    );
    expect(runAuxiliary).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('<output_format>'),
      })
    );
  });
});
