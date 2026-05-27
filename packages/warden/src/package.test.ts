import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import ignore from 'ignore';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

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
