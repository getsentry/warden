import { describe, expect, it } from 'vitest';
import { ReviewMemoryJudgmentSchema } from './api.js';

describe('review memory judgments', () => {
  it('preserves review text without applying display-field trimming or limits', () => {
    const judgment = { verdict: 'reject', observedAt: '2026-09-28T20:00:00Z',
      candidate: { id: '', severity: 'low', title: '', description: '  original description  ',
        verification: 'evidence '.repeat(1000), location: { path: 'src/auth.ts', startLine: 1 } },
      reason: 'reason '.repeat(2000) };
    expect(ReviewMemoryJudgmentSchema.parse(judgment)).toEqual(judgment);
  });
});
