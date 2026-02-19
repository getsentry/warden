import { describe, it, expect } from 'vitest';
import { filterFindingsByConfidence, ConfidenceThresholdSchema } from './index.js';
import type { Finding } from './index.js';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'test-1',
    severity: 'medium',
    title: 'Test finding',
    description: 'Test description',
    ...overrides,
  };
}

describe('ConfidenceThresholdSchema', () => {
  it('accepts valid values', () => {
    expect(ConfidenceThresholdSchema.parse('off')).toBe('off');
    expect(ConfidenceThresholdSchema.parse('high')).toBe('high');
    expect(ConfidenceThresholdSchema.parse('medium')).toBe('medium');
    expect(ConfidenceThresholdSchema.parse('low')).toBe('low');
  });

  it('rejects invalid values', () => {
    expect(() => ConfidenceThresholdSchema.parse('critical')).toThrow();
    expect(() => ConfidenceThresholdSchema.parse('')).toThrow();
  });
});

describe('filterFindingsByConfidence', () => {
  const findings: Finding[] = [
    makeFinding({ id: 'high-conf', confidence: 'high' }),
    makeFinding({ id: 'med-conf', confidence: 'medium' }),
    makeFinding({ id: 'low-conf', confidence: 'low' }),
    makeFinding({ id: 'no-conf' }), // no confidence field
  ];

  it('returns all findings when no threshold', () => {
    expect(filterFindingsByConfidence(findings)).toHaveLength(4);
  });

  it('returns all findings when threshold is off', () => {
    expect(filterFindingsByConfidence(findings, 'off')).toHaveLength(4);
  });

  it('filters to high confidence only', () => {
    const result = filterFindingsByConfidence(findings, 'high');
    expect(result.map((f) => f.id)).toEqual(['high-conf', 'no-conf']);
  });

  it('filters to medium and above', () => {
    const result = filterFindingsByConfidence(findings, 'medium');
    expect(result.map((f) => f.id)).toEqual(['high-conf', 'med-conf', 'no-conf']);
  });

  it('includes all when threshold is low', () => {
    const result = filterFindingsByConfidence(findings, 'low');
    expect(result).toHaveLength(4);
  });

  it('always includes findings without confidence (backwards compat)', () => {
    const noConfFindings = [makeFinding({ id: 'no-conf-1' }), makeFinding({ id: 'no-conf-2' })];
    expect(filterFindingsByConfidence(noConfFindings, 'high')).toHaveLength(2);
  });

  it('returns empty array when input is empty', () => {
    expect(filterFindingsByConfidence([], 'medium')).toEqual([]);
  });
});
