import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Octokit } from '@octokit/rest';
import type { ExistingComment } from '../../output/dedup.js';
import type { ProvidersConfig } from '../../config/schema.js';
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
      getRuntimeProviderOptions: vi.fn(() => undefined),
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
    // Omitted runtime resolves to 'pi' (getRuntime's default), and the same
    // value drives the provider-options lookup so the two never diverge.
    expect(getRuntime).toHaveBeenCalledWith('pi');
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
        providerOptions: undefined,
      })
    );
  });

  it('forwards resolved provider options to runAuxiliary', async () => {
    const runAuxiliary = vi.fn().mockResolvedValue({
      success: true,
      data: { status: 'not_attempted', reasoning: 'No related changes' },
      usage: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
    });
    const getRuntime = vi.fn(() => ({ runAuxiliary }));
    const providerOptions = { providers: [{ name: 'litellm' }] };
    const getRuntimeProviderOptions = vi.fn(() => providerOptions);

    vi.doMock('../../sdk/runtimes/index.js', () => ({
      getRuntime,
      getRuntimeProviderOptions,
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

    const providers: ProvidersConfig = {
      litellm: {
        baseUrl: 'http://localhost:4000',
        api: 'openai-completions',
        models: [{ id: 'litellm/gpt-4o', name: 'gpt-4o' }],
      },
    };

    await evaluateFix(input, context, 'api-key', { runtime: 'pi', providers });

    expect(getRuntime).toHaveBeenCalledWith('pi');
    expect(getRuntimeProviderOptions).toHaveBeenCalledWith('pi', { providers });
    expect(runAuxiliary).toHaveBeenCalledWith(
      expect.objectContaining({ providerOptions })
    );
  });

  it('builds provider options for the resolved runtime when runtime is omitted', async () => {
    const runAuxiliary = vi.fn().mockResolvedValue({
      success: true,
      data: { status: 'not_attempted', reasoning: 'No related changes' },
      usage: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
    });
    const getRuntime = vi.fn(() => ({ runAuxiliary }));
    const providerOptions = { providers: [{ name: 'litellm' }] };
    const getRuntimeProviderOptions = vi.fn(() => providerOptions);

    vi.doMock('../../sdk/runtimes/index.js', () => ({
      getRuntime,
      getRuntimeProviderOptions,
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

    const providers: ProvidersConfig = {
      litellm: {
        baseUrl: 'http://localhost:4000',
        api: 'openai-completions',
        models: [{ id: 'litellm/gpt-4o', name: 'gpt-4o' }],
      },
    };

    // No runtime specified: it resolves to 'pi', and the provider-options lookup
    // must use that same 'pi' so custom providers are built, not dropped.
    await evaluateFix(input, context, 'api-key', { providers });

    expect(getRuntime).toHaveBeenCalledWith('pi');
    expect(getRuntimeProviderOptions).toHaveBeenCalledWith('pi', { providers });
    expect(runAuxiliary).toHaveBeenCalledWith(
      expect.objectContaining({ providerOptions })
    );
  });
});
