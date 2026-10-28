import { describe, it, expect } from 'vitest';
import { classifyFile } from './classify.js';
import type { FilePattern } from '../config/schema.js';

describe('classifyFile', () => {
  describe('default mode', () => {
    it.each([
      'src/index.ts',
      'pnpm-lock.yaml',
      'dist/index.js',
      'generated/api.ts',
    ])('processes files per hunk unless chunking config matches: %s', (filename) => {
      expect(classifyFile(filename)).toBe('per-hunk');
    });
  });

  describe('user patterns', () => {
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

    it('checks user patterns in order', () => {
      const userPatterns: FilePattern[] = [
        { pattern: '**/*.ts', mode: 'skip' },
        { pattern: '**/index.ts', mode: 'per-hunk' },
      ];
      // First matching pattern wins
      expect(classifyFile('src/index.ts', userPatterns)).toBe('skip');
    });
  });
});
