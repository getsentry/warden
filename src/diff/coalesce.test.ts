import { describe, it, expect } from 'vitest';
import { coalesceHunks, wouldCoalesceReduce } from './coalesce.js';
import type { DiffHunk } from './parser.js';

function makeHunk(
  newStart: number,
  newCount: number,
  content: string,
  oldStart = newStart,
  oldCount = newCount
): DiffHunk {
  return {
    oldStart,
    oldCount,
    newStart,
    newCount,
    content,
    lines: content.split('\n'),
  };
}

describe('coalesceHunks', () => {
  describe('edge cases', () => {
    it('returns empty array for empty input', () => {
      expect(coalesceHunks([])).toEqual([]);
    });

    it('returns single hunk unchanged', () => {
      const hunk = makeHunk(1, 5, 'test content');
      expect(coalesceHunks([hunk])).toEqual([hunk]);
    });
  });

  describe('merging nearby hunks', () => {
    it('merges two adjacent hunks within gap limit', () => {
      const hunk1 = makeHunk(1, 5, 'first');
      const hunk2 = makeHunk(10, 5, 'second');

      const result = coalesceHunks([hunk1, hunk2], { maxGapLines: 10 });
      const [merged] = result;

      expect(result).toHaveLength(1);
      expect(merged!.newStart).toBe(1);
      expect(merged!.newCount).toBe(14);
      expect(merged!.content).toContain('first');
      expect(merged!.content).toContain('...');
      expect(merged!.content).toContain('second');
    });

    it('does not merge hunks beyond gap limit', () => {
      const hunk1 = makeHunk(1, 5, 'first');
      const hunk2 = makeHunk(50, 5, 'second');

      const result = coalesceHunks([hunk1, hunk2], { maxGapLines: 30 });

      expect(result).toHaveLength(2);
    });

    it('does not merge when combined size exceeds limit', () => {
      const hunk1 = makeHunk(1, 5, 'a'.repeat(5000));
      const hunk2 = makeHunk(10, 5, 'b'.repeat(5000));

      const result = coalesceHunks([hunk1, hunk2], { maxChunkSize: 8000 });

      expect(result).toHaveLength(2);
    });

    it('merges multiple hunks into one when all within limits', () => {
      const hunks = [
        makeHunk(1, 3, 'a'),
        makeHunk(10, 3, 'b'),
        makeHunk(20, 3, 'c'),
        makeHunk(30, 3, 'd'),
      ];

      const result = coalesceHunks(hunks, { maxGapLines: 15, maxChunkSize: 10000 });

      expect(result).toHaveLength(1);
      expect(result[0]!.content).toContain('a');
      expect(result[0]!.content).toContain('d');
    });

    it('creates multiple chunks when limits are reached', () => {
      const hunks = [
        makeHunk(1, 3, 'a'.repeat(3000)),
        makeHunk(10, 3, 'b'.repeat(3000)),
        makeHunk(20, 3, 'c'.repeat(3000)),
        makeHunk(30, 3, 'd'.repeat(3000)),
      ];

      const result = coalesceHunks(hunks, { maxGapLines: 15, maxChunkSize: 8000 });

      // First two can merge (6000 chars), third can't fit (9000 > 8000)
      // So result should be: [a+b], [c+d]
      expect(result).toHaveLength(2);
    });
  });

  describe('sorting', () => {
    it('sorts hunks by start line before merging', () => {
      const hunks = [
        makeHunk(20, 3, 'third'),
        makeHunk(1, 3, 'first'),
        makeHunk(10, 3, 'second'),
      ];

      const result = coalesceHunks(hunks, { maxGapLines: 15, maxChunkSize: 10000 });

      expect(result).toHaveLength(1);
      // Should be merged in order: first, second, third
      const content = result[0]!.content;
      const firstPos = content.indexOf('first');
      const secondPos = content.indexOf('second');
      const thirdPos = content.indexOf('third');
      expect(firstPos).toBeLessThan(secondPos);
      expect(secondPos).toBeLessThan(thirdPos);
    });
  });

  describe('merged hunk properties', () => {
    it('calculates correct line ranges', () => {
      const hunk1 = makeHunk(10, 5, 'first', 8, 5);
      const hunk2 = makeHunk(25, 10, 'second', 23, 10);

      const result = coalesceHunks([hunk1, hunk2], { maxGapLines: 20 });

      expect(result).toHaveLength(1);
      expect(result[0]!.newStart).toBe(10);
      expect(result[0]!.newCount).toBe(25); // 10 to 35 (25 + 10)
      expect(result[0]!.oldStart).toBe(8);
      expect(result[0]!.oldCount).toBe(25); // 8 to 33 (23 + 10)
    });

    it('preserves first hunk header', () => {
      const hunk1 = makeHunk(1, 3, 'first');
      hunk1.header = 'function foo()';
      const hunk2 = makeHunk(10, 3, 'second');
      hunk2.header = 'function bar()';

      const result = coalesceHunks([hunk1, hunk2], { maxGapLines: 20 });

      expect(result[0]!.header).toBe('function foo()');
    });

    it('combines lines from all merged hunks', () => {
      const hunk1 = makeHunk(1, 3, 'line1\nline2');
      const hunk2 = makeHunk(10, 3, 'line3\nline4');

      const result = coalesceHunks([hunk1, hunk2], { maxGapLines: 20 });

      expect(result[0]!.lines).toEqual(['line1', 'line2', 'line3', 'line4']);
    });
  });

});

describe('wouldCoalesceReduce', () => {
  it('returns false for empty array', () => {
    expect(wouldCoalesceReduce([])).toBe(false);
  });

  it('returns false for single hunk', () => {
    const hunk = makeHunk(1, 5, 'test');
    expect(wouldCoalesceReduce([hunk])).toBe(false);
  });

  it('returns true when coalescing would reduce count', () => {
    const hunks = [
      makeHunk(1, 3, 'a'),
      makeHunk(10, 3, 'b'),
    ];
    expect(wouldCoalesceReduce(hunks, { maxGapLines: 20 })).toBe(true);
  });

  it('returns false when coalescing would not reduce count', () => {
    const hunks = [
      makeHunk(1, 3, 'a'),
      makeHunk(100, 3, 'b'), // Too far apart
    ];
    expect(wouldCoalesceReduce(hunks, { maxGapLines: 10 })).toBe(false);
  });
});
