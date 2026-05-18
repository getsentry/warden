import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { setupEvalRepo } from './runner.js';
import type { EvalMeta } from './types.js';

const evalsDir = join(import.meta.dirname, '..');
const repoRoot = join(import.meta.dirname, '..', '..', '..');

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

describe('setupEvalRepo', () => {
  it('keeps skill files out of the eval diff', () => {
    const meta: EvalMeta = {
      name: 'sentry-preprod-size-analysis-base-artifact-access',
      category: 'security-review',
      skillName: 'security-review',
      given: 'public size-analysis endpoint accepts a baseArtifactId',
      skillPath: join(repoRoot, 'src', 'builtin-skills', 'security-review', 'SKILL.md'),
      filePaths: [
        join(
          evalsDir,
          'fixtures',
          'sentry-preprod-size-analysis-base-artifact-access',
          'organization_preprod_size_analysis.py'
        ),
      ],
      model: 'anthropic/claude-sonnet-4-6',
      runtime: 'pi',
      should_find: [{ finding: 'baseArtifactId bypass', required: true }],
      should_not_find: [],
    };

    const logs: string[] = [];
    const repoDir = setupEvalRepo(meta, (message) => {
      logs.push(message);
    });
    try {
      const changedFiles = git(repoDir, ['diff', '--name-only', 'main...eval'])
        .trim()
        .split('\n')
        .filter(Boolean);

      expect(changedFiles).toEqual(['sentry-preprod-size-analysis-base-artifact-access/organization_preprod_size_analysis.py']);
      expect(existsSync(join(repoDir, '.warden', 'skills', 'security-review', 'SKILL.md'))).toBe(true);
    } finally {
      rmSync(repoDir, { recursive: true, force: true });
    }
  });

  it('preserves nested fixture paths from evals/fixtures', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'warden-eval-runner-'));
    const fixturePath = join(
      tempRoot,
      'evals',
      'fixtures',
      'source-context',
      'github',
      'getsentry',
      'sentry',
      'src',
      'sentry',
      'api',
      'endpoint.py',
    );
    const licensePath = join(
      tempRoot,
      'evals',
      'fixtures',
      'source-context',
      'github',
      'getsentry',
      'sentry',
      'LICENSE',
    );
    mkdirSync(dirname(fixturePath), { recursive: true });
    writeFileSync(fixturePath, 'def endpoint():\n    pass\n');
    writeFileSync(licensePath, 'source license\n');

    const meta: EvalMeta = {
      name: 'source-context',
      category: 'security-review',
      skillName: 'security-review',
      given: 'fixture source path carries repository context',
      skillPath: join(repoRoot, 'src', 'builtin-skills', 'security-review', 'SKILL.md'),
      filePaths: [fixturePath],
      supportingFilePaths: [licensePath],
      model: 'anthropic/claude-sonnet-4-6',
      runtime: 'pi',
      should_find: [{ finding: 'source path context', required: true }],
      should_not_find: [],
    };

    let repoDir: string | undefined;
    const logs: string[] = [];
    try {
      repoDir = setupEvalRepo(meta, (message) => {
        logs.push(message);
      });
      const changedFiles = git(repoDir, ['diff', '--name-only', 'main...eval'])
        .trim()
        .split('\n')
        .filter(Boolean);

      expect(changedFiles).toEqual(['source-context/src/sentry/api/endpoint.py']);
      expect(git(repoDir, ['config', '--get', 'remote.origin.url']).trim())
        .toBe('https://github.com/getsentry/sentry.git');
      expect(existsSync(join(repoDir, 'source-context', 'src', 'sentry', 'api', 'endpoint.py')))
        .toBe(true);
      expect(git(repoDir, ['cat-file', '-e', 'main:source-context/LICENSE']))
        .toBe('');
    } finally {
      if (repoDir) {
        rmSync(repoDir, { recursive: true, force: true });
      }
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
