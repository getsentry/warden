import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Octokit } from '@octokit/rest';
import type { EventContext } from '../../types/index.js';
import { ReviewFeedbackGate } from './review-feedback-gate.js';

function createContext(overrides: Partial<EventContext> = {}): EventContext {
  return {
    eventType: 'pull_request',
    action: 'opened',
    repository: { owner: 'test-owner', name: 'test-repo', fullName: 'test-owner/test-repo', defaultBranch: 'main' },
    pullRequest: {
      number: 123,
      title: 'Test PR',
      body: '',
      author: 'test-user',
      baseBranch: 'main',
      headBranch: 'feature',
      headSha: 'run-head-sha',
      baseSha: 'base-sha',
      files: [],
    },
    repoPath: '/test/path',
    ...overrides,
  };
}

function createOctokit(getMock: ReturnType<typeof vi.fn>): Octokit {
  return { pulls: { get: getMock } } as unknown as Octokit;
}

function headResponse(sha: string) {
  return { data: { head: { sha } } };
}

describe('ReviewFeedbackGate', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns blocked without API calls when there is no pull request context', async () => {
    const getMock = vi.fn();
    const gate = new ReviewFeedbackGate(createOctokit(getMock), createContext({ pullRequest: undefined }));

    expect(await gate.check()).toBe('blocked');
    expect(await gate.canWrite()).toBe(false);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('returns writable when the PR head matches and memoizes within the TTL', async () => {
    const getMock = vi.fn().mockResolvedValue(headResponse('run-head-sha'));
    const gate = new ReviewFeedbackGate(createOctokit(getMock), createContext());

    expect(await gate.check()).toBe('writable');
    expect(await gate.check()).toBe('writable');
    expect(await gate.canWrite()).toBe(true);
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after the TTL expires', async () => {
    const getMock = vi.fn().mockResolvedValue(headResponse('run-head-sha'));
    const gate = new ReviewFeedbackGate(createOctokit(getMock), createContext(), { ttlMs: 0 });

    expect(await gate.check()).toBe('writable');
    expect(await gate.check()).toBe('writable');
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it('blocks permanently once the head has advanced', async () => {
    const getMock = vi.fn().mockResolvedValue(headResponse('new-head-sha'));
    const gate = new ReviewFeedbackGate(createOctokit(getMock), createContext(), { ttlMs: 0 });

    expect(await gate.check()).toBe('blocked');
    expect(await gate.check()).toBe('blocked');
    expect(await gate.canWrite()).toBe(false);
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('retries transient head fetch errors before succeeding', async () => {
    const getMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(headResponse('run-head-sha'));
    const gate = new ReviewFeedbackGate(createOctokit(getMock), createContext(), { retryDelayMs: 0 });

    expect(await gate.check()).toBe('writable');
    expect(getMock).toHaveBeenCalledTimes(3);
  });

  it('returns unknown after exhausting retries and retries again after the TTL', async () => {
    const getMock = vi.fn().mockRejectedValue(new Error('boom'));
    const gate = new ReviewFeedbackGate(createOctokit(getMock), createContext(), {
      attempts: 2,
      retryDelayMs: 0,
      ttlMs: 0,
    });

    expect(await gate.check()).toBe('unknown');
    expect(await gate.canWrite()).toBe(false);
    expect(getMock).toHaveBeenCalledTimes(4);
  });

  it('caches unknown within the TTL so bursts of checks do not re-fetch', async () => {
    const getMock = vi.fn().mockRejectedValue(new Error('boom'));
    const gate = new ReviewFeedbackGate(createOctokit(getMock), createContext(), {
      attempts: 2,
      retryDelayMs: 0,
    });

    expect(await gate.check()).toBe('unknown');
    expect(await gate.check()).toBe('unknown');
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it('recovers to writable when a later fetch succeeds after unknown', async () => {
    const getMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(headResponse('run-head-sha'));
    const gate = new ReviewFeedbackGate(createOctokit(getMock), createContext(), {
      attempts: 1,
      retryDelayMs: 0,
      ttlMs: 0,
    });

    expect(await gate.check()).toBe('unknown');
    expect(await gate.check()).toBe('writable');
  });
});
