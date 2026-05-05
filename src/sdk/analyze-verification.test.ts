import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SkillDefinition } from '../config/schema.js';
import type { EventContext, UsageStats } from '../types/index.js';
import { runSkill } from './analyze.js';
import { getRuntime, type Runtime } from './runtimes/index.js';
import { verifyFindings } from './verify.js';

vi.mock('./runtimes/index.js', () => ({
  getRuntime: vi.fn(),
  getRuntimeProviderOptions: vi.fn(() => undefined),
}));

vi.mock('./verify.js', () => ({
  verifyFindings: vi.fn(),
}));

function makeUsage(): UsageStats {
  return { inputTokens: 10, outputTokens: 5, costUSD: 0.001 };
}

function makeContext(): EventContext {
  return {
    eventType: 'pull_request',
    action: 'opened',
    repository: { owner: 'o', name: 'r', fullName: 'o/r', defaultBranch: 'main' },
    repoPath: '/repo',
    pullRequest: {
      number: 1,
      title: 'Test PR',
      body: '',
      author: 'test',
      baseBranch: 'main',
      headBranch: 'feature',
      headSha: 'head',
      baseSha: 'base',
      files: [{
        filename: 'src/app.ts',
        status: 'modified',
        additions: 1,
        deletions: 1,
        patch: '@@ -10,1 +10,1 @@\n-old\n+new',
        chunks: 1,
      }],
    },
  };
}

function makeSkill(): SkillDefinition {
  return {
    name: 'test-skill',
    description: 'test',
    prompt: 'Only report real bugs.',
  };
}

describe('runSkill verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRuntime).mockReturnValue({
      name: 'claude',
      runSkill: vi.fn().mockResolvedValue({
        result: {
          status: 'success',
          text: JSON.stringify({
            findings: [{
              id: 'raw',
              severity: 'high',
              confidence: 'high',
              title: 'Candidate',
              description: 'desc',
              location: { path: 'src/app.ts', startLine: 10 },
            }],
          }),
          errors: [],
          usage: makeUsage(),
        },
      }),
      runAuxiliary: vi.fn(),
      runSynthesis: vi.fn(),
    } as unknown as Runtime);
  });

  it('drops findings rejected by verification before reporting', async () => {
    vi.mocked(verifyFindings).mockResolvedValue({
      findings: [],
      usage: makeUsage(),
    });

    const report = await runSkill(makeSkill(), makeContext(), {
      auxiliaryModel: 'claude-haiku-4-5',
    });

    expect(report.findings).toEqual([]);
    expect(report.auxiliaryUsage?.['verification']).toEqual(makeUsage());
    expect(verifyFindings).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ model: 'claude-haiku-4-5' })
    );
  });
});
