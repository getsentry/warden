import { describe, it, expect } from 'vitest';
import { formatDuration, formatLocation, formatFindingCountsPlain, formatProgress, truncate, padRight, } from './formatters.js';
describe('formatDuration', () => {
    it('formats milliseconds under 1s', () => {
        expect(formatDuration(50)).toBe('50ms');
        expect(formatDuration(999)).toBe('999ms');
    });
    it('formats seconds', () => {
        expect(formatDuration(1000)).toBe('1.0s');
        expect(formatDuration(1500)).toBe('1.5s');
        expect(formatDuration(12345)).toBe('12.3s');
    });
    it('rounds milliseconds', () => {
        expect(formatDuration(50.6)).toBe('51ms');
    });
});
describe('formatLocation', () => {
    it('formats path only', () => {
        expect(formatLocation('src/file.ts')).toBe('src/file.ts');
    });
    it('formats path with single line', () => {
        expect(formatLocation('src/file.ts', 10)).toBe('src/file.ts:10');
    });
    it('formats path with line range', () => {
        expect(formatLocation('src/file.ts', 10, 20)).toBe('src/file.ts:10-20');
    });
    it('formats path with same start and end line as single line', () => {
        expect(formatLocation('src/file.ts', 10, 10)).toBe('src/file.ts:10');
    });
});
describe('formatFindingCountsPlain', () => {
    it('formats zero findings', () => {
        const counts = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            info: 0,
        };
        expect(formatFindingCountsPlain(counts)).toBe('No findings');
    });
    it('formats single finding', () => {
        const counts = {
            critical: 0,
            high: 1,
            medium: 0,
            low: 0,
            info: 0,
        };
        expect(formatFindingCountsPlain(counts)).toBe('1 finding (1 high)');
    });
    it('formats multiple findings', () => {
        const counts = {
            critical: 1,
            high: 2,
            medium: 3,
            low: 0,
            info: 1,
        };
        expect(formatFindingCountsPlain(counts)).toBe('7 findings (1 critical, 2 high, 3 medium, 1 info)');
    });
});
describe('formatProgress', () => {
    it('formats progress indicator', () => {
        // Note: formatProgress uses chalk.dim, so we just check it contains the numbers
        const result = formatProgress(1, 5);
        expect(result).toContain('1');
        expect(result).toContain('5');
    });
});
describe('truncate', () => {
    it('returns string unchanged if shorter than max width', () => {
        expect(truncate('hello', 10)).toBe('hello');
    });
    it('returns string unchanged if equal to max width', () => {
        expect(truncate('hello', 5)).toBe('hello');
    });
    it('truncates and adds ellipsis if longer than max width', () => {
        const result = truncate('hello world', 8);
        expect(result.length).toBe(8);
        expect(result.endsWith('…') || result.endsWith('...')).toBe(true);
    });
    it('handles very short max width', () => {
        expect(truncate('hello', 3).length).toBe(3);
        expect(truncate('hello', 2).length).toBe(2);
    });
});
describe('padRight', () => {
    it('pads string to reach width', () => {
        expect(padRight('hi', 5)).toBe('hi   ');
    });
    it('returns string unchanged if already at width', () => {
        expect(padRight('hello', 5)).toBe('hello');
    });
    it('returns string unchanged if longer than width', () => {
        expect(padRight('hello', 3)).toBe('hello');
    });
});
//# sourceMappingURL=formatters.test.js.map