import { describe, it, expect } from 'vitest';
import { coalesceHunks, wouldCoalesceReduce, splitLargeHunks } from './coalesce.js';
function makeHunk(newStart, newCount, content, options = {}) {
    const { oldStart = newStart, oldCount = newCount, header } = options;
    return {
        oldStart,
        oldCount,
        newStart,
        newCount,
        content,
        lines: content.split('\n'),
        header,
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
            expect(merged.newStart).toBe(1);
            expect(merged.newCount).toBe(14);
            expect(merged.content).toContain('first');
            expect(merged.content).toContain('...');
            expect(merged.content).toContain('second');
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
            expect(result[0].content).toContain('a');
            expect(result[0].content).toContain('d');
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
            const content = result[0].content;
            const firstPos = content.indexOf('first');
            const secondPos = content.indexOf('second');
            const thirdPos = content.indexOf('third');
            expect(firstPos).toBeLessThan(secondPos);
            expect(secondPos).toBeLessThan(thirdPos);
        });
    });
    describe('merged hunk properties', () => {
        it('calculates correct line ranges', () => {
            const hunk1 = makeHunk(10, 5, 'first', { oldStart: 8, oldCount: 5 });
            const hunk2 = makeHunk(25, 10, 'second', { oldStart: 23, oldCount: 10 });
            const result = coalesceHunks([hunk1, hunk2], { maxGapLines: 20 });
            expect(result).toHaveLength(1);
            expect(result[0].newStart).toBe(10);
            expect(result[0].newCount).toBe(25); // 10 to 35 (25 + 10)
            expect(result[0].oldStart).toBe(8);
            expect(result[0].oldCount).toBe(25); // 8 to 33 (23 + 10)
        });
        it('combines different headers from both hunks', () => {
            const hunk1 = makeHunk(1, 3, 'first', { header: 'function foo()' });
            const hunk2 = makeHunk(10, 3, 'second', { header: 'function bar()' });
            const result = coalesceHunks([hunk1, hunk2], { maxGapLines: 20 });
            expect(result[0].header).toBe('function foo() → function bar()');
        });
        it('preserves single header when only first hunk has one', () => {
            const hunk1 = makeHunk(1, 3, 'first', { header: 'function foo()' });
            const hunk2 = makeHunk(10, 3, 'second');
            const result = coalesceHunks([hunk1, hunk2], { maxGapLines: 20 });
            expect(result[0].header).toBe('function foo()');
        });
        it('preserves single header when only second hunk has one', () => {
            const hunk1 = makeHunk(1, 3, 'first');
            const hunk2 = makeHunk(10, 3, 'second', { header: 'function bar()' });
            const result = coalesceHunks([hunk1, hunk2], { maxGapLines: 20 });
            expect(result[0].header).toBe('function bar()');
        });
        it('preserves header when both hunks have identical headers', () => {
            const hunk1 = makeHunk(1, 3, 'first', { header: 'function foo()' });
            const hunk2 = makeHunk(10, 3, 'second', { header: 'function foo()' });
            const result = coalesceHunks([hunk1, hunk2], { maxGapLines: 20 });
            expect(result[0].header).toBe('function foo()');
        });
        it('combines lines from all merged hunks', () => {
            const hunk1 = makeHunk(1, 3, 'line1\nline2');
            const hunk2 = makeHunk(10, 3, 'line3\nline4');
            const result = coalesceHunks([hunk1, hunk2], { maxGapLines: 20 });
            expect(result[0].lines).toEqual(['line1', 'line2', 'line3', 'line4']);
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
describe('splitLargeHunks', () => {
    describe('edge cases', () => {
        it('returns empty array for empty input', () => {
            expect(splitLargeHunks([])).toEqual([]);
        });
        it('returns small hunk unchanged', () => {
            const hunk = makeHunk(1, 5, 'small content');
            const result = splitLargeHunks([hunk], { maxChunkSize: 8000 });
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(hunk);
        });
        it('passes through multiple small hunks unchanged', () => {
            const hunks = [
                makeHunk(1, 3, 'first'),
                makeHunk(10, 3, 'second'),
                makeHunk(20, 3, 'third'),
            ];
            const result = splitLargeHunks(hunks, { maxChunkSize: 8000 });
            expect(result).toHaveLength(3);
            expect(result).toEqual(hunks);
        });
    });
    describe('splitting large hunks', () => {
        it('splits a large hunk into multiple chunks', () => {
            // Create a hunk with ~2000 chars of content (will exceed 500 char limit)
            const lines = Array.from({ length: 50 }, (_, i) => ` line ${i}: ${'x'.repeat(30)}`);
            const content = lines.join('\n');
            const hunk = makeHunk(1, 50, content);
            const result = splitLargeHunks([hunk], { maxChunkSize: 500 });
            expect(result.length).toBeGreaterThan(1);
            // All resulting hunks should be smaller than or around the limit
            for (const h of result) {
                // Allow some tolerance since we split at logical breakpoints
                expect(h.content.length).toBeLessThan(1000);
            }
        });
        it('handles lines longer than maxChunkSize without infinite loop', () => {
            // Create lines where average length exceeds maxChunkSize
            // This previously caused an infinite loop when estimatedLines = 0
            const lines = Array.from({ length: 5 }, (_, i) => ` line ${i}: ${'x'.repeat(200)}`);
            const content = lines.join('\n');
            const hunk = makeHunk(1, 5, content);
            // maxChunkSize smaller than average line length
            const result = splitLargeHunks([hunk], { maxChunkSize: 100 });
            // Should still complete and produce results (one line per chunk in worst case)
            expect(result.length).toBeGreaterThan(0);
            expect(result.length).toBeLessThanOrEqual(lines.length);
        });
        it('prefers blank lines as split points', () => {
            // Create content with a clear blank line in the middle
            const part1 = Array.from({ length: 10 }, (_, i) => ` line ${i}: ${'a'.repeat(30)}`).join('\n');
            const part2 = Array.from({ length: 10 }, (_, i) => ` line ${i + 11}: ${'b'.repeat(30)}`).join('\n');
            const content = `${part1}\n \n${part2}`; // Blank line (context line) in middle
            const hunk = makeHunk(1, 21, content);
            const result = splitLargeHunks([hunk], { maxChunkSize: 600 });
            // Should split at or near the blank line
            expect(result.length).toBeGreaterThan(1);
        });
        it('selects empty string blank lines as split points', () => {
            // Empty strings ("") should match /^[ ]?$/ pattern as highest priority
            // Previously skipped due to !line check treating "" as falsy
            const lines = [
                ...Array.from({ length: 8 }, (_, i) => ` line ${i}: ${'a'.repeat(40)}`),
                '', // Empty string blank line
                ...Array.from({ length: 8 }, (_, i) => ` line ${i + 9}: ${'b'.repeat(40)}`),
            ];
            const content = lines.join('\n');
            const hunk = makeHunk(1, lines.length, content);
            const result = splitLargeHunks([hunk], { maxChunkSize: 500 });
            expect(result.length).toBeGreaterThan(1);
            // First chunk should end at or before the blank line
            expect(result[0].lines.length).toBeLessThanOrEqual(9);
        });
        it('prefers function definitions as split points', () => {
            // Create content with a function definition in the middle
            const lines = [
                ...Array.from({ length: 8 }, (_, i) => ` line ${i}: ${'a'.repeat(40)}`),
                ' function processData() {',
                ...Array.from({ length: 8 }, (_, i) => ` line ${i + 10}: ${'b'.repeat(40)}`),
            ];
            const content = lines.join('\n');
            const hunk = makeHunk(1, lines.length, content);
            const result = splitLargeHunks([hunk], { maxChunkSize: 600 });
            expect(result.length).toBeGreaterThan(1);
        });
    });
    describe('line number accuracy', () => {
        it('maintains correct newStart for split hunks', () => {
            // Create 30 lines of context (no + or -)
            const lines = Array.from({ length: 30 }, (_, i) => ` line ${i + 1}`);
            const content = lines.join('\n');
            const hunk = makeHunk(1, 30, content);
            const result = splitLargeHunks([hunk], { maxChunkSize: 200 });
            expect(result.length).toBeGreaterThan(1);
            // First chunk should start at line 1
            expect(result[0].newStart).toBe(1);
            // Subsequent chunks should have increasing start lines
            for (let i = 1; i < result.length; i++) {
                expect(result[i].newStart).toBeGreaterThan(result[i - 1].newStart);
            }
        });
        it('handles mixed add/remove lines correctly', () => {
            const lines = [
                ' context 1',
                '+added line 1',
                '-removed line',
                ' context 2',
                '+added line 2',
                ' context 3',
                ...Array.from({ length: 20 }, (_, i) => ` more context ${i}`),
            ];
            const content = lines.join('\n');
            // newCount: context(1) + added(1) + context(1) + added(1) + context(1) + more(20) = 25
            // oldCount: context(1) + removed(1) + context(1) + context(1) + more(20) = 24
            const hunk = {
                oldStart: 1,
                oldCount: 24,
                newStart: 1,
                newCount: 25,
                content: `@@ -1,24 +1,25 @@\n${content}`,
                lines,
            };
            const result = splitLargeHunks([hunk], { maxChunkSize: 200 });
            expect(result.length).toBeGreaterThan(1);
            // Each chunk should have valid line counts
            for (const h of result) {
                expect(h.newStart).toBeGreaterThanOrEqual(1);
                expect(h.newCount).toBeGreaterThan(0);
                expect(h.oldStart).toBeGreaterThanOrEqual(1);
                expect(h.oldCount).toBeGreaterThan(0);
            }
        });
        it('preserves original header in split hunks', () => {
            const lines = Array.from({ length: 30 }, (_, i) => ` line ${i + 1}`);
            const content = lines.join('\n');
            const hunk = makeHunk(1, 30, content, { header: 'function example()' });
            const result = splitLargeHunks([hunk], { maxChunkSize: 200 });
            expect(result.length).toBeGreaterThan(1);
            for (const h of result) {
                expect(h.header).toBe('function example()');
            }
        });
    });
    describe('integration with coalescing', () => {
        it('split then coalesce produces reasonable chunk count', () => {
            // Create a large hunk that should be split
            const largeLines = Array.from({ length: 100 }, (_, i) => ` line ${i + 1}: ${'x'.repeat(50)}`);
            const largeContent = largeLines.join('\n');
            const largeHunk = makeHunk(1, 100, largeContent);
            // Split into smaller chunks
            const splitResult = splitLargeHunks([largeHunk], { maxChunkSize: 1000 });
            // The split chunks are adjacent, so coalescing might re-merge some
            // but should still respect size limits
            const coalescedResult = coalesceHunks(splitResult, { maxGapLines: 50, maxChunkSize: 2000 });
            // Should have fewer chunks than split produced, but more than 1
            expect(coalescedResult.length).toBeLessThanOrEqual(splitResult.length);
            expect(coalescedResult.length).toBeGreaterThanOrEqual(1);
        });
        it('small hunks pass through both split and coalesce', () => {
            const hunks = [
                makeHunk(1, 3, 'small 1'),
                makeHunk(50, 3, 'small 2'),
            ];
            const splitResult = splitLargeHunks(hunks, { maxChunkSize: 8000 });
            expect(splitResult).toHaveLength(2);
            const coalescedResult = coalesceHunks(splitResult, { maxGapLines: 10 });
            // These are too far apart to coalesce (gap > 10)
            expect(coalescedResult).toHaveLength(2);
        });
    });
});
//# sourceMappingURL=coalesce.test.js.map