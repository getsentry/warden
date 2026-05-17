import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { setupEvalRepo } from './runner.js';
import type { EvalMeta } from './types.js';

const evalsDir = join(import.meta.dirname, '..', '..', 'evals');
const repoRoot = join(import.meta.dirname, '..', '..');

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
});
