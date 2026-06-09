import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EventContext, SkillReport } from '../types/index.js';
import { buildLocalEventContext } from '../cli/context.js';
import { runSkill } from './analyze.js';
import { runLocalSkill } from './local.js';

vi.mock('../cli/context.js', () => ({
  buildLocalEventContext: vi.fn(),
}));

vi.mock('./analyze.js', () => ({
  runSkill: vi.fn(),
}));

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
  skill: 'local-skill',
  summary: 'No findings.',
  findings: [],
  usage: {
    inputTokens: 0,
    outputTokens: 0,
    costUSD: 0,
  },
};

describe('local SDK skill resolution', () => {
  let tempDir: string | undefined;
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
    vi.clearAllMocks();
  });

  it('resolves relative skill paths against the caller-supplied cwd', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-local-sdk-'));
    const skillDir = join(tempDir, '.warden', 'skills', 'local-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      [
        '---',
        'name: local-skill',
        'description: Review local changes',
        '---',
        'Review the diff.',
        '',
      ].join('\n')
    );

    vi.mocked(buildLocalEventContext).mockReturnValue({ ...context, repoPath: tempDir });
    vi.mocked(runSkill).mockResolvedValue(report);

    const result = await runLocalSkill({
      skillPath: '.warden/skills/local-skill',
      cwd: tempDir,
      apiKey: 'test-key',
      runtime: 'claude',
    });

    expect(result.skill).toMatchObject({
      name: 'local-skill',
      rootDir: skillDir,
    });
    expect(runSkill).toHaveBeenCalledWith(result.skill, expect.objectContaining({ repoPath: tempDir }), expect.any(Object));
  });

  it('resolves relative skill paths against process cwd when cwd is omitted', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-local-sdk-'));
    const skillDir = join(tempDir, '.warden', 'skills', 'local-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      [
        '---',
        'name: local-skill',
        'description: Review local changes',
        '---',
        'Review the diff.',
        '',
      ].join('\n')
    );

    process.chdir(tempDir);
    vi.mocked(buildLocalEventContext).mockReturnValue({ ...context, repoPath: tempDir });
    vi.mocked(runSkill).mockResolvedValue(report);

    const result = await runLocalSkill({
      skillPath: '.warden/skills/local-skill',
      apiKey: 'test-key',
      runtime: 'claude',
    });

    expect(buildLocalEventContext).toHaveBeenCalledWith(expect.objectContaining({
      cwd: undefined,
    }));
    expect(result.skill).toMatchObject({
      name: 'local-skill',
      rootDir: realpathSync(skillDir),
    });
  });

  it('resolves named skills against the local git repo root', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-local-sdk-'));
    const skillDir = join(tempDir, '.agents', 'skills', 'local-skill');
    const cwd = join(tempDir, 'packages', 'service');
    mkdirSync(skillDir, { recursive: true });
    mkdirSync(cwd, { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      [
        '---',
        'name: local-skill',
        'description: Review local changes',
        '---',
        'Review the diff.',
        '',
      ].join('\n')
    );

    vi.mocked(buildLocalEventContext).mockReturnValue({ ...context, repoPath: tempDir });
    vi.mocked(runSkill).mockResolvedValue(report);

    const result = await runLocalSkill({
      skillPath: 'local-skill',
      cwd,
      apiKey: 'test-key',
      runtime: 'claude',
    });

    expect(result.skill).toMatchObject({
      name: 'local-skill',
      rootDir: skillDir,
    });
  });
});
