import { describe, expect, it } from 'vitest';
import { ReviewMemoryJudgmentSchema, ReviewMemoryWriteRequestSchema } from './api.js';

describe('review memory judgments', () => {
  it('preserves review text without applying display-field trimming or limits', () => {
    const judgment = { verdict: 'reject', observedAt: '2026-09-28T20:00:00Z',
      candidate: { id: '', severity: 'low', title: '', description: '  original description  ',
        verification: 'evidence '.repeat(1000), location: { path: 'src/auth.ts', startLine: 1 } },
      reason: 'reason '.repeat(2000) };
    expect(ReviewMemoryJudgmentSchema.parse(judgment)).toEqual(judgment);
  });

  it('validates generated source metadata within the stored note budget', () => {
    const input = { repository: { provider: 'github', owner: 'acme', name: 'widgets', fullName: 'acme/widgets' },
      skill: 'security', paths: ['src/auth.ts'], reason: 'Current evidence.', content: 'e'.repeat(4_000) };
    expect(() => ReviewMemoryWriteRequestSchema.parse(input)).toThrow('Shorten the note or use fewer paths');
    const suffix = '\n\nSources: src/auth.ts';
    const content = 'e'.repeat(4_000 - suffix.length);
    expect(ReviewMemoryWriteRequestSchema.parse({ ...input, content }).content).toBe(content);
    expect(ReviewMemoryWriteRequestSchema.parse({ ...input, content: content + suffix }).content).toBe(content + suffix);
  });
});
