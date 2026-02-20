import { describe, it, expect } from 'vitest';
import {
  formatCost,
  formatDuration,
  formatLocation,
  formatFindingCountsPlain,
  formatProgress,
  truncate,
  padRight,
  formatStatsCompact,
  formatSeverityBadge,
  formatConfidenceBadge,
} from './formatters.js';
import type { Severity, UsageStats, AuxiliaryUsageMap } from '../../types/index.js';

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
    const counts: Record<Severity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    expect(formatFindingCountsPlain(counts)).toBe('No findings');
  });

  it('formats single finding', () => {
    const counts: Record<Severity, number> = {
      critical: 0,
      high: 1,
      medium: 0,
      low: 0,
      info: 0,
    };
    expect(formatFindingCountsPlain(counts)).toBe('1 finding (1 high)');
  });

  it('formats multiple findings', () => {
    const counts: Record<Severity, number> = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 0,
      info: 1,
    };
    expect(formatFindingCountsPlain(counts)).toBe('7 findings (1 critical, 2 high, 3 medium, 1 info)');
  });
});

describe('formatSeverityBadge', () => {
  it('includes severity text for each level', () => {
    expect(formatSeverityBadge('critical')).toContain('critical');
    expect(formatSeverityBadge('high')).toContain('high');
    expect(formatSeverityBadge('medium')).toContain('medium');
    expect(formatSeverityBadge('low')).toContain('low');
    expect(formatSeverityBadge('info')).toContain('info');
  });
});

describe('formatConfidenceBadge', () => {
  it('includes confidence text for each level', () => {
    expect(formatConfidenceBadge('high')).toContain('high confidence');
    expect(formatConfidenceBadge('medium')).toContain('medium confidence');
    expect(formatConfidenceBadge('low')).toContain('low confidence');
  });

  it('returns empty string for undefined confidence', () => {
    expect(formatConfidenceBadge(undefined)).toBe('');
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

describe('formatCost', () => {
  it('always formats to 2 decimal places', () => {
    expect(formatCost(0.0048)).toBe('$0.00');
    expect(formatCost(0.01)).toBe('$0.01');
    expect(formatCost(1.5)).toBe('$1.50');
    expect(formatCost(0.0892)).toBe('$0.09');
    expect(formatCost(0)).toBe('$0.00');
  });
});

describe('formatStatsCompact', () => {
  it('formats duration only', () => {
    expect(formatStatsCompact(15800)).toBe('⏱ 15.8s');
  });

  it('formats usage only', () => {
    const usage: UsageStats = {
      inputTokens: 3000,
      outputTokens: 680,
      costUSD: 0.0048,
    };
    expect(formatStatsCompact(undefined, usage)).toBe('3.0k in / 680 out · $0.00');
  });

  it('formats both duration and usage', () => {
    const usage: UsageStats = {
      inputTokens: 3000,
      outputTokens: 680,
      costUSD: 0.0048,
    };
    expect(formatStatsCompact(15800, usage)).toBe('⏱ 15.8s · 3.0k in / 680 out · $0.00');
  });

  it('uses inputTokens directly as total (cache tokens are subsets)', () => {
    const usage: UsageStats = {
      inputTokens: 3000,
      cacheReadInputTokens: 2000,
      outputTokens: 500,
      costUSD: 0.003,
    };
    expect(formatStatsCompact(undefined, usage)).toBe('3.0k in / 500 out · $0.00');
  });

  it('returns empty string when no stats provided', () => {
    expect(formatStatsCompact()).toBe('');
  });

  it('formats milliseconds for short durations', () => {
    expect(formatStatsCompact(500)).toBe('⏱ 500ms');
  });

  it('formats large token counts', () => {
    const usage: UsageStats = {
      inputTokens: 120000,
      outputTokens: 3800,
      costUSD: 0.0892,
    };
    expect(formatStatsCompact(45600, usage)).toBe('⏱ 45.6s · 120.0k in / 3.8k out · $0.09');
  });

  it('includes auxiliary costs in total when provided', () => {
    const usage: UsageStats = {
      inputTokens: 3000,
      outputTokens: 680,
      costUSD: 0.0048,
    };
    const auxiliaryUsage: AuxiliaryUsageMap = {
      extraction: { inputTokens: 100, outputTokens: 50, costUSD: 0.0012 },
    };
    // Total cost: 0.0048 + 0.0012 = 0.0060
    expect(formatStatsCompact(15800, usage, auxiliaryUsage)).toBe(
      '⏱ 15.8s · 3.0k in / 680 out · $0.01 (+extraction: $0.00)'
    );
  });

  it('shows multiple auxiliary agents in suffix', () => {
    const usage: UsageStats = {
      inputTokens: 3000,
      outputTokens: 680,
      costUSD: 0.0048,
    };
    const auxiliaryUsage: AuxiliaryUsageMap = {
      extraction: { inputTokens: 100, outputTokens: 50, costUSD: 0.0012 },
      dedup: { inputTokens: 200, outputTokens: 80, costUSD: 0.0008 },
    };
    const result = formatStatsCompact(undefined, usage, auxiliaryUsage);
    expect(result).toContain('+extraction: $0.00');
    expect(result).toContain('+dedup: $0.00');
    // Total: 0.0048 + 0.0012 + 0.0008 = 0.0068
    expect(result).toContain('$0.01');
  });

  it('omits auxiliary suffix when all agents have zero cost', () => {
    const usage: UsageStats = {
      inputTokens: 3000,
      outputTokens: 680,
      costUSD: 0.0048,
    };
    const auxiliaryUsage: AuxiliaryUsageMap = {
      extraction: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
    };
    expect(formatStatsCompact(undefined, usage, auxiliaryUsage)).toBe('3.0k in / 680 out · $0.00');
  });

  it('ignores auxiliary when usage is not provided', () => {
    const auxiliaryUsage: AuxiliaryUsageMap = {
      extraction: { inputTokens: 100, outputTokens: 50, costUSD: 0.0012 },
    };
    // No usage means no cost line, so auxiliary is not shown
    expect(formatStatsCompact(15800, undefined, auxiliaryUsage)).toBe('⏱ 15.8s');
  });
});
