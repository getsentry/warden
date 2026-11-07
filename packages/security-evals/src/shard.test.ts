import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type * as Warden from '@sentry/warden';
import { runSkill, type SkillReport } from '@sentry/warden';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFileEventContext } from '../../warden/src/cli/context.js';
import { resolveSuiteOptions } from './options.js';
import { scoreEntry } from './score.js';
import { loadSkills, runShardPass } from './shard.js';
import { testEntry } from './testing.js';

vi.mock('@sentry/warden', async (importOriginal) => ({
  ...await importOriginal<typeof Warden>(),
  runSkill: vi.fn(),
}));
vi.mock('../../warden/src/cli/context.js', () => ({ buildFileEventContext: vi.fn() }));
vi.mock('./score.js', () => ({ scoreEntry: vi.fn() }));

function writeSkill(root: string, dir: string, name: string): void {
  mkdirSync(join(root, 'skills', dir), { recursive: true });
  writeFileSync(
    join(root, 'skills', dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: Finds ${name} bugs.\n---\n\nLook for ${name} bugs.\n`,
  );
}

describe('loadSkills', () => {
  let worktree: string;

  beforeEach(() => {
    worktree = mkdtempSync(join(tmpdir(), 'warden-skills-'));
  });

  afterEach(() => {
    rmSync(worktree, { recursive: true, force: true });
  });

  it('loads builtin security-review and wrdn skills from the skills worktree', async () => {
    writeSkill(worktree, 'wrdn-authz', 'wrdn-authz');

    const skills = await loadSkills(['security-review', 'wrdn-authz'], worktree);

    expect([...skills.keys()]).toEqual(['security-review', 'wrdn-authz']);
    expect(skills.get('security-review')?.rootDir).toMatch(/builtin-skills\/security-review$/);
    expect(skills.get('wrdn-authz')?.rootDir).toBe(join(worktree, 'skills', 'wrdn-authz'));
  });

  it('needs no skills checkout for security-review alone', async () => {
    const skills = await loadSkills(['security-review'], undefined);
    expect([...skills.keys()]).toEqual(['security-review']);
  });

  it('fails once with the skill and path when a wrdn skill cannot load', async () => {
    await expect(loadSkills(['wrdn-authz'], undefined)).rejects.toThrow('wrdn-authz needs a getsentry/warden-skills checkout');
    await expect(loadSkills(['wrdn-pii'], worktree)).rejects.toThrow(
      `Could not load wrdn-pii from ${join(worktree, 'skills', 'wrdn-pii')}`,
    );
  });

  it('refuses a directory whose skill has another name', async () => {
    writeSkill(worktree, 'wrdn-pii', 'wrdn-other');
    await expect(loadSkills(['wrdn-pii'], worktree)).rejects.toThrow('loaded wrdn-other');
  });
});

describe('runShardPass', () => {
  const usage = { inputTokens: 100, outputTokens: 10, costUSD: 0.5 };
  const shard = {
    repository: 'getsentry/sentry',
    ref: 'a'.repeat(40),
    targets: ['a.py', 'b.py'],
    entries: [testEntry('on-a', { targets: ['a.py'] }), testEntry('on-b', { targets: ['b.py'] })],
  };
  const skill = { name: 'wrdn-authz' } as never;

  function pass(skills: string[] = ['wrdn-authz']) {
    return runShardPass({
      shard,
      worktree: '/worktree',
      skills: new Map(skills.map((name) => [name, skill])),
      options: resolveSuiteOptions({}),
      apiKey: 'key',
      log: () => undefined,
    });
  }

  beforeEach(() => {
    vi.mocked(buildFileEventContext).mockResolvedValue({
      pullRequest: { files: [{ filename: 'a.py' }, { filename: 'b.py' }] },
    } as never);
    vi.mocked(scoreEntry).mockResolvedValue({ hit: true, usage: { costUSD: 0.01 } } as never);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('scores every entry when the pass succeeds', async () => {
    vi.mocked(runSkill).mockResolvedValue({ findings: [], usage } as unknown as SkillReport);
    const [run] = await pass();
    expect(run).toMatchObject({ skill: 'wrdn-authz', errors: [], usage: { costUSD: 0.5, judgeCostUSD: 0.02 } });
    expect([...run!.hits]).toEqual([['on-a', true], ['on-b', true]]);
  });

  it('records entries on a failed chunk as errors and still scores the rest', async () => {
    vi.mocked(runSkill).mockResolvedValue({
      findings: [], usage, hunkFailures: [{ filename: 'b.py' }],
    } as unknown as SkillReport);
    const [run] = await pass();
    expect(run).toMatchObject({ errors: ['on-b'] });
    expect([...run!.hits.keys()]).toEqual(['on-a']);
  });

  it('records every entry as an error when the skill reports or throws one, keeping its spend', async () => {
    vi.mocked(runSkill).mockResolvedValueOnce({
      findings: [], usage, error: { message: 'provider 429' },
    } as unknown as SkillReport);
    vi.mocked(runSkill).mockRejectedValueOnce(new Error('GnuTLS recv error'));
    const runs = await pass(['wrdn-authz', 'security-review']);
    expect(runs.map(({ skill, error, errors, hits }) => ({ skill, error, errors, hits: hits.size }))).toEqual([
      { skill: 'wrdn-authz', error: 'provider 429', errors: ['on-a', 'on-b'], hits: 0 },
      { skill: 'security-review', error: 'GnuTLS recv error', errors: ['on-a', 'on-b'], hits: 0 },
    ]);
    expect(runs[0]!.usage.costUSD).toBe(0.5);
  });

  it('records a judge failure as errors, not misses', async () => {
    vi.mocked(runSkill).mockResolvedValue({ findings: [], usage } as unknown as SkillReport);
    vi.mocked(scoreEntry).mockRejectedValue(new Error('judge timed out'));
    const [run] = await pass();
    expect(run).toMatchObject({ error: 'judge timed out', errors: ['on-a', 'on-b'] });
  });

  it('refuses a worktree that is missing a target', async () => {
    vi.mocked(buildFileEventContext).mockResolvedValue({ pullRequest: { files: [{ filename: 'a.py' }] } } as never);
    await expect(pass()).rejects.toThrow('missing targets: b.py');
  });
});
