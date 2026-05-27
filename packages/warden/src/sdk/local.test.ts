import { describe, expect, it, vi } from 'vitest';
import type { SkillDefinition } from '../config/schema.js';
import type { EventContext, Finding, SkillReport } from '../types/index.js';
import { buildLocalEventContext } from '../cli/context.js';
import { resolveSkillAsync } from '../skills/loader.js';
import { runSkill } from './analyze.js';
import { verifyFindings } from './verify.js';
import { runLocalSkill, verifyLocalFindings } from './local.js';

vi.mock('../cli/context.js', () => ({
  buildLocalEventContext: vi.fn(),
}));

vi.mock('../skills/loader.js', () => ({
  resolveSkillAsync: vi.fn(),
}));

vi.mock('./analyze.js', () => ({
  runSkill: vi.fn(),
}));

vi.mock('./verify.js', () => ({
  verifyFindings: vi.fn(),
}));

const skill: SkillDefinition = {
  name: 'security-review',
  description: 'Find security issues',
  prompt: 'Review the diff.',
};

const context: EventContext = {
  eventType: 'pull_request',
  action: 'opened',
  repository: { owner: 'getsentry', name: 'warden', fullName: 'getsentry/warden', defaultBranch: 'main' },
  repoPath: '/tmp/repo',
  pullRequest: {
    number: 1,
    title: 'Test PR',
    body: '',
    author: 'dev',
    baseBranch: 'main',
    headBranch: 'feature',
    headSha: 'abc123',
    baseSha: 'def456',
    files: [],
  },
};

const report: SkillReport = {
  skill: 'security-review',
  summary: 'No findings.',
  findings: [],
  usage: {
    inputTokens: 0,
    outputTokens: 0,
    costUSD: 0,
  },
};

describe('local SDK entrypoints', () => {
  it('runs a resolved skill against a local diff', async () => {
    vi.mocked(buildLocalEventContext).mockReturnValue(context);
    vi.mocked(resolveSkillAsync).mockResolvedValue(skill);
    vi.mocked(runSkill).mockResolvedValue(report);

    const callbacks = {};
    const result = await runLocalSkill({
      skillPath: '.warden/skills/security-review',
      cwd: '/tmp/repo',
      base: 'main',
      head: 'eval',
      defaultBranch: 'main',
      apiKey: 'test-key',
      model: 'claude-sonnet-4-6',
      runtime: 'claude',
      parallel: false,
      maxTurns: 7,
      callbacks,
    });

    expect(buildLocalEventContext).toHaveBeenCalledWith(expect.objectContaining({
      cwd: '/tmp/repo',
      base: 'main',
      head: 'eval',
      defaultBranch: 'main',
    }));
    expect(resolveSkillAsync).toHaveBeenCalledWith('.warden/skills/security-review', '/tmp/repo');
    expect(runSkill).toHaveBeenCalledWith(skill, context, expect.objectContaining({
      apiKey: 'test-key',
      model: 'claude-sonnet-4-6',
      runtime: 'claude',
      parallel: false,
      maxTurns: 7,
      callbacks,
    }));
    expect(result).toEqual({ skill, context, report });
  });

  it('verifies findings with a resolved skill', async () => {
    const findings: Finding[] = [{
      id: 'finding-1',
      title: 'Unsafe input',
      description: 'User input reaches a sink.',
      severity: 'high',
      location: { path: 'src/app.ts', startLine: 10 },
    }];
    vi.mocked(resolveSkillAsync).mockResolvedValue(skill);
    vi.mocked(verifyFindings).mockResolvedValue({ findings });

    const result = await verifyLocalFindings({
      findings,
      skillPath: '.warden/skills/security-review',
      repoPath: '/tmp/repo',
      apiKey: 'test-key',
      runtime: 'pi',
      model: 'anthropic/claude-sonnet-4-6',
    });

    expect(resolveSkillAsync).toHaveBeenCalledWith('.warden/skills/security-review', '/tmp/repo');
    expect(verifyFindings).toHaveBeenCalledWith(findings, expect.objectContaining({
      repoPath: '/tmp/repo',
      skill,
      apiKey: 'test-key',
      runtime: 'pi',
      model: 'anthropic/claude-sonnet-4-6',
    }));
    expect(result).toEqual({ skill, findings });
  });
});
