import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import ignore from 'ignore';
import { validateActionLayout } from './action/layout.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const monorepoRoot = join(repoRoot, '../..');

describe('npm package contents', () => {
  it('exposes only the documented package entrypoints', () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf-8')) as {
      exports?: unknown;
    };

    expect(pkg.exports).toEqual({
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
      },
      './package.json': './package.json',
    });
  });

  it('keeps bundled skill specs while excluding the root specification', () => {
    const npmIgnore = readFileSync(join(repoRoot, '.npmignore'), 'utf-8');
    const ignored = ignore().add(npmIgnore);

    expect(ignored.ignores('SPEC.md')).toBe(true);
    expect(ignored.ignores('src/skill-builder/skill.ts')).toBe(true);
    expect(ignored.ignores('src/internal-skills/skill-writer/SKILL.md')).toBe(false);
    expect(ignored.ignores('src/builtin-skills/security-review/SKILL.md')).toBe(false);
    expect(ignored.ignores('src/builtin-skills/security-review/references/javascript-typescript.md')).toBe(false);
    expect(ignored.ignores('src/builtin-skills/security-review/references/github-workflows.md')).toBe(false);
    expect(ignored.ignores('src/builtin-skills/code-review/SKILL.md')).toBe(false);
    expect(ignored.ignores('src/builtin-skills/code-review/SOURCES.md')).toBe(false);
    expect(ignored.ignores('src/builtin-skills/code-review/references/javascript-typescript.md')).toBe(false);
    expect(ignored.ignores('src/builtin-skills/code-review/references/github-workflows.md')).toBe(false);
    expect(ignored.ignores('src/builtin-skills/code-review/references/python.md')).toBe(false);
    expect(ignored.ignores('skills/warden/SPEC.md')).toBe(false);
    expect(ignored.ignores('src/internal-skills/skill-writer/scripts/quick_validate_test.py')).toBe(true);
    expect(ignored.ignores('.warden/skills/security/SKILL.md')).toBe(true);
    expect(ignored.ignores('.codex/config.toml')).toBe(true);
    expect(ignored.ignores('superwarden-bench/README.md')).toBe(true);
    expect(ignored.ignores('specs/generated-skills.md')).toBe(true);
    expect(ignored.ignores('bin/debug-helper.js')).toBe(true);
    expect(ignored.ignores('bin/warden.js')).toBe(false);
  });
});

describe('GitHub Action layout', () => {
  it('keeps plugin skill symlinks resolvable for action checkout staging', () => {
    expect(validateActionLayout({ repoRoot: monorepoRoot })).toEqual([]);
  });

  it('reports broken tracked symlinks before the action is published', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-action-layout-'));

    try {
      execFileSync('git', ['init'], { cwd: tempDir });
      writeFileSync(join(tempDir, 'action.yml'), 'name: test\nruns:\n  using: composite\n  steps: []\n');
      mkdirSync(join(tempDir, 'plugins/warden/skills'), { recursive: true });
      mkdirSync(join(tempDir, 'packages/warden/skills/warden'), { recursive: true });
      writeFileSync(join(tempDir, 'packages/warden/skills/warden/SKILL.md'), '---\nname: warden\n---\n');
      symlinkSync('../../../packages/warden/skills/warden', join(tempDir, 'plugins/warden/skills/warden'));
      symlinkSync('missing-target', join(tempDir, 'broken-link'));
      symlinkSync('target', join(tempDir, 'missing-link'));
      execFileSync('git', ['add', 'action.yml', 'plugins', 'packages', 'broken-link', 'missing-link'], {
        cwd: tempDir,
      });
      rmSync(join(tempDir, 'missing-link'));

      const errors = validateActionLayout({ repoRoot: tempDir });

      expect(errors).toContain('broken-link points to missing target missing-target');
      expect(errors).toContainEqual(expect.stringContaining('Tracked symlink is missing: missing-link'));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
