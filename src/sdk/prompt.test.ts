import { describe, it, expect } from 'vitest';
import { buildHunkUserPrompt, type PRPromptContext } from './prompt.js';
import type { SkillDefinition } from '../config/schema.js';
import type { HunkWithContext } from '../diff/index.js';

const skill: SkillDefinition = {
  name: 'test-skill',
  description: 'A test skill',
  prompt: 'Check for issues.',
};

function makeHunk(filename = 'src/app.ts'): HunkWithContext {
  return {
    filename,
    hunk: {
      oldStart: 1,
      oldCount: 5,
      newStart: 1,
      newCount: 5,
      content: '@@ -1,5 +1,5 @@\n+const x = 1;',
      lines: ['+const x = 1;'],
    },
    contextBefore: [],
    contextAfter: [],
    contextStartLine: 1,
    language: 'typescript',
  };
}

describe('buildHunkUserPrompt', () => {
  describe('Other Files section', () => {
    it('omits "Other Files" when changedFiles is empty (non-PR context)', () => {
      const prContext: PRPromptContext = {
        changedFiles: [],
        title: 'Local changes',
      };
      const result = buildHunkUserPrompt(skill, makeHunk(), prContext);
      expect(result).not.toContain('Other Files in This PR');
    });

    it('omits "Other Files" when no prContext is provided', () => {
      const result = buildHunkUserPrompt(skill, makeHunk());
      expect(result).not.toContain('Other Files in This PR');
    });

    it('includes "Other Files" section for PR contexts with files', () => {
      const prContext: PRPromptContext = {
        changedFiles: ['src/app.ts', 'src/utils.ts', 'src/index.ts'],
        title: 'Add feature',
      };
      const result = buildHunkUserPrompt(skill, makeHunk('src/app.ts'), prContext);
      expect(result).toContain('Other Files in This PR');
      expect(result).toContain('- src/utils.ts');
      expect(result).toContain('- src/index.ts');
      // Current file should be excluded
      expect(result).not.toContain('- src/app.ts');
    });

    it('caps file list at maxContextFiles with truncation message', () => {
      const files = Array.from({ length: 100 }, (_, i) => `src/file-${i}.ts`);
      const prContext: PRPromptContext = {
        changedFiles: files,
        title: 'Big PR',
        maxContextFiles: 10,
      };
      const hunk = makeHunk('src/other.ts'); // not in the list
      const result = buildHunkUserPrompt(skill, hunk, prContext);
      expect(result).toContain('Other Files in This PR');
      // Should have first 10 files
      expect(result).toContain('- src/file-0.ts');
      expect(result).toContain('- src/file-9.ts');
      // Should NOT have file 10+
      expect(result).not.toContain('- src/file-10.ts');
      // Should have truncation message
      expect(result).toContain('... and 90 more');
    });

    it('does not show truncation message when files fit within limit', () => {
      const prContext: PRPromptContext = {
        changedFiles: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
        title: 'Small PR',
        maxContextFiles: 50,
      };
      const result = buildHunkUserPrompt(skill, makeHunk('src/a.ts'), prContext);
      expect(result).toContain('- src/b.ts');
      expect(result).toContain('- src/c.ts');
      expect(result).not.toContain('... and');
    });

    it('omits "Other Files" section entirely when maxContextFiles is 0', () => {
      const prContext: PRPromptContext = {
        changedFiles: ['src/app.ts', 'src/utils.ts'],
        title: 'Some PR',
        maxContextFiles: 0,
      };
      const result = buildHunkUserPrompt(skill, makeHunk('src/app.ts'), prContext);
      expect(result).not.toContain('Other Files in This PR');
    });

    it('uses default cap of 50 when maxContextFiles is not specified', () => {
      const files = Array.from({ length: 60 }, (_, i) => `src/file-${i}.ts`);
      const prContext: PRPromptContext = {
        changedFiles: files,
        title: 'Large PR',
        // no maxContextFiles — defaults to 50
      };
      const hunk = makeHunk('src/other.ts');
      const result = buildHunkUserPrompt(skill, hunk, prContext);
      expect(result).toContain('- src/file-49.ts');
      expect(result).not.toContain('- src/file-50.ts');
      expect(result).toContain('... and 10 more');
    });
  });
});
