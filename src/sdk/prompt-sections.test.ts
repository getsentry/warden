import { describe, expect, it } from 'vitest';
import {
  buildFileListSection,
  buildJsonOutputSection,
  buildTaggedSection,
  formatIndexedFindingsForPrompt,
  joinPromptSections,
} from './prompt-sections.js';
import type { Finding } from '../types/index.js';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'ABC-123',
    severity: 'high',
    confidence: 'medium',
    title: 'Unsafe query',
    description: 'User input reaches SQL without parameters.',
    location: { path: 'src/db.ts', startLine: 10, endLine: 12 },
    ...overrides,
  };
}

describe('prompt section helpers', () => {
  it('builds tagged sections and omits empty content', () => {
    expect(buildTaggedSection('task', 'Review this')).toBe('<task>\nReview this\n</task>');
    expect(buildTaggedSection('task', '   ')).toBeUndefined();
  });

  it('builds a consistent JSON output section', () => {
    const section = buildJsonOutputSection('{"ok": true}');

    expect(section).toContain('<output_format>');
    expect(section).toContain('Return only valid JSON');
    expect(section).toContain('{"ok": true}');
  });

  it('joins optional sections with consistent spacing', () => {
    expect(joinPromptSections(['one', undefined, 'two'])).toBe('one\n\ntwo');
  });

  it('builds capped file lists with current-file exclusion', () => {
    const section = buildFileListSection('changed_files', ['src/a.ts', 'src/b.ts', 'src/c.ts'], {
      currentFile: 'src/a.ts',
      maxFiles: 1,
    });

    expect(section).toContain('<changed_files>');
    expect(section).not.toContain('src/a.ts');
    expect(section).toContain('- src/b.ts');
    expect(section).toContain('... and 1 more');
  });

  it('formats indexed findings consistently for auxiliary prompts', () => {
    const text = formatIndexedFindingsForPrompt([makeFinding()], {
      includeSeverity: true,
      locationStyle: 'range',
    });

    expect(text).toBe(
      '1. [src/db.ts:10-12] (high) "Unsafe query" - User input reaches SQL without parameters.'
    );
  });
});
