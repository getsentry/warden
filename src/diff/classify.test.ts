import { describe, it, expect } from 'vitest';
import {
  classifyFile,
  shouldSkipFile,
  BUILTIN_SKIP_PATTERNS,
} from './classify.js';
import type { FilePattern } from '../config/schema.js';

describe('classifyFile', () => {
  describe('built-in skip patterns', () => {
    it.each([
      ['pnpm-lock.yaml', 'skip'],
      ['package-lock.json', 'skip'],
      ['yarn.lock', 'skip'],
      ['Cargo.lock', 'skip'],
      ['go.sum', 'skip'],
      ['poetry.lock', 'skip'],
      ['composer.lock', 'skip'],
      ['Gemfile.lock', 'skip'],
      ['Pipfile.lock', 'skip'],
      ['bun.lockb', 'skip'],
    ] as const)('skips lock file: %s', (filename, expected) => {
      expect(classifyFile(filename)).toBe(expected);
    });

    it.each([
      ['src/pnpm-lock.yaml', 'skip'],
      ['packages/web/package-lock.json', 'skip'],
      ['nested/deep/yarn.lock', 'skip'],
    ] as const)('skips nested lock file: %s', (filename, expected) => {
      expect(classifyFile(filename)).toBe(expected);
    });

    it.each([
      ['bundle.min.js', 'skip'],
      ['styles.min.css', 'skip'],
      ['vendor.bundle.js', 'skip'],
      ['app.bundle.css', 'skip'],
    ] as const)('skips minified/bundled file: %s', (filename, expected) => {
      expect(classifyFile(filename)).toBe(expected);
    });

    it.each([
      ['dist/index.js', 'skip'],
      ['build/main.js', 'skip'],
      ['node_modules/lodash/index.js', 'skip'],
      ['.next/static/chunks/main.js', 'skip'],
      ['out/index.html', 'skip'],
      ['coverage/lcov.info', 'skip'],
    ] as const)('skips build artifacts: %s', (filename, expected) => {
      expect(classifyFile(filename)).toBe(expected);
    });

    it.each([
      ['types.generated.ts', 'skip'],
      ['schema.g.ts', 'skip'],
      ['model.g.dart', 'skip'],
      ['generated/api.ts', 'skip'],
      ['__generated__/graphql.ts', 'skip'],
    ] as const)('skips generated files: %s', (filename, expected) => {
      expect(classifyFile(filename)).toBe(expected);
    });
  });

  describe('non-skipped files', () => {
    it.each([
      'src/index.ts',
      'lib/utils.js',
      'app/page.tsx',
      'server/routes.py',
      'main.go',
      'Cargo.toml', // toml, not lock
      'package.json', // json, not lock
      'README.md',
    ])('processes normal source file: %s', (filename) => {
      expect(classifyFile(filename)).toBe('per-hunk');
    });
  });

  describe('user patterns', () => {
    it('allows user pattern to override built-in skip', () => {
      const userPatterns: FilePattern[] = [
        { pattern: '**/pnpm-lock.yaml', mode: 'per-hunk' },
      ];
      expect(classifyFile('pnpm-lock.yaml', userPatterns)).toBe('per-hunk');
    });

    it('allows user pattern to skip custom files', () => {
      const userPatterns: FilePattern[] = [
        { pattern: '**/fixtures/**', mode: 'skip' },
      ];
      expect(classifyFile('src/fixtures/data.json', userPatterns)).toBe('skip');
    });

    it('supports whole-file mode', () => {
      const userPatterns: FilePattern[] = [
        { pattern: '**/*.sql', mode: 'whole-file' },
      ];
      expect(classifyFile('migrations/001.sql', userPatterns)).toBe('whole-file');
    });

    it('user patterns take precedence over built-ins', () => {
      const userPatterns: FilePattern[] = [
        { pattern: '**/dist/**', mode: 'per-hunk' }, // override built-in skip
      ];
      expect(classifyFile('dist/index.js', userPatterns)).toBe('per-hunk');
    });

    it('checks user patterns in order', () => {
      const userPatterns: FilePattern[] = [
        { pattern: '**/*.ts', mode: 'skip' },
        { pattern: '**/index.ts', mode: 'per-hunk' },
      ];
      // First matching pattern wins
      expect(classifyFile('src/index.ts', userPatterns)).toBe('skip');
    });

    it('falls back to built-ins if no user pattern matches', () => {
      const userPatterns: FilePattern[] = [
        { pattern: '**/*.custom', mode: 'skip' },
      ];
      expect(classifyFile('pnpm-lock.yaml', userPatterns)).toBe('skip');
    });
  });
});

describe('shouldSkipFile', () => {
  it('returns true for skipped files', () => {
    expect(shouldSkipFile('pnpm-lock.yaml')).toBe(true);
    expect(shouldSkipFile('dist/bundle.js')).toBe(true);
  });

  it('returns false for non-skipped files', () => {
    expect(shouldSkipFile('src/index.ts')).toBe(false);
    expect(shouldSkipFile('package.json')).toBe(false);
  });

  it('respects user patterns', () => {
    const userPatterns: FilePattern[] = [
      { pattern: '**/pnpm-lock.yaml', mode: 'per-hunk' },
    ];
    expect(shouldSkipFile('pnpm-lock.yaml', userPatterns)).toBe(false);
  });
});

describe('BUILTIN_SKIP_PATTERNS', () => {
  it('includes common lock files', () => {
    expect(BUILTIN_SKIP_PATTERNS).toContain('**/pnpm-lock.yaml');
    expect(BUILTIN_SKIP_PATTERNS).toContain('**/package-lock.json');
    expect(BUILTIN_SKIP_PATTERNS).toContain('**/yarn.lock');
  });

  it('includes minified files', () => {
    expect(BUILTIN_SKIP_PATTERNS).toContain('**/*.min.js');
    expect(BUILTIN_SKIP_PATTERNS).toContain('**/*.min.css');
  });

  it('includes build directories', () => {
    expect(BUILTIN_SKIP_PATTERNS).toContain('**/dist/**');
    expect(BUILTIN_SKIP_PATTERNS).toContain('**/node_modules/**');
  });
});
