import { describe, it, expect } from 'vitest';
import { applySuppression } from './matcher.js';
import type { Finding } from '../types/index.js';
import type { SuppressionRule } from './types.js';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'f1',
    severity: 'high',
    title: 'SQL injection in query builder',
    description: 'Unsanitized input',
    location: { path: 'src/admin/query.ts', startLine: 10 },
    ...overrides,
  };
}

describe('applySuppression', () => {
  it('returns all findings when no rules', () => {
    const findings = [makeFinding()];
    expect(applySuppression(findings, [], 'security-audit')).toEqual(findings);
  });

  it('returns all findings when rules are for different skill', () => {
    const rules: SuppressionRule[] = [{
      skill: 'other-skill',
      paths: ['**/*'],
      reason: 'test',
    }];
    const findings = [makeFinding()];

    expect(applySuppression(findings, rules, 'security-audit')).toEqual(findings);
  });

  it('suppresses finding matching skill and path glob', () => {
    const rules: SuppressionRule[] = [{
      skill: 'security-audit',
      paths: ['src/admin/**'],
      reason: 'Legacy code',
    }];
    const findings = [makeFinding()];

    expect(applySuppression(findings, rules, 'security-audit')).toEqual([]);
  });

  it('does not suppress finding when path does not match glob', () => {
    const rules: SuppressionRule[] = [{
      skill: 'security-audit',
      paths: ['src/api/**'],
      reason: 'test',
    }];
    const findings = [makeFinding()];

    expect(applySuppression(findings, rules, 'security-audit')).toEqual(findings);
  });

  it('suppresses finding matching skill, path, and title substring', () => {
    const rules: SuppressionRule[] = [{
      skill: 'security-audit',
      paths: ['src/admin/**'],
      title: 'SQL injection',
      reason: 'Uses parameterized queries',
    }];
    const findings = [makeFinding()];

    expect(applySuppression(findings, rules, 'security-audit')).toEqual([]);
  });

  it('does not suppress when title does not match', () => {
    const rules: SuppressionRule[] = [{
      skill: 'security-audit',
      paths: ['src/admin/**'],
      title: 'XSS',
      reason: 'test',
    }];
    const findings = [makeFinding()];

    expect(applySuppression(findings, rules, 'security-audit')).toEqual(findings);
  });

  it('title matching is case-insensitive', () => {
    const rules: SuppressionRule[] = [{
      skill: 'security-audit',
      paths: ['src/admin/**'],
      title: 'sql INJECTION',
      reason: 'test',
    }];
    const findings = [makeFinding()];

    expect(applySuppression(findings, rules, 'security-audit')).toEqual([]);
  });

  it('does not suppress findings without location', () => {
    const rules: SuppressionRule[] = [{
      skill: 'security-audit',
      paths: ['**/*'],
      reason: 'test',
    }];
    const findings = [makeFinding({ location: undefined })];

    expect(applySuppression(findings, rules, 'security-audit')).toEqual(findings);
  });

  it('suppresses only matching findings from mixed set', () => {
    const rules: SuppressionRule[] = [{
      skill: 'security-audit',
      paths: ['src/legacy/**'],
      reason: 'Legacy code',
    }];

    const findings = [
      makeFinding({ id: 'f1', location: { path: 'src/legacy/old.ts', startLine: 5 } }),
      makeFinding({ id: 'f2', location: { path: 'src/new/fresh.ts', startLine: 10 } }),
      makeFinding({ id: 'f3', location: { path: 'src/legacy/ancient.ts', startLine: 1 } }),
    ];

    const result = applySuppression(findings, rules, 'security-audit');
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('f2');
  });

  it('matches exact file path pattern', () => {
    const rules: SuppressionRule[] = [{
      skill: 'security-audit',
      paths: ['src/admin/query.ts'],
      reason: 'test',
    }];
    const findings = [makeFinding()];

    expect(applySuppression(findings, rules, 'security-audit')).toEqual([]);
  });

  it('multiple path patterns are OR-matched', () => {
    const rules: SuppressionRule[] = [{
      skill: 'security-audit',
      paths: ['src/api/**', 'src/admin/**'],
      reason: 'test',
    }];
    const findings = [makeFinding()];

    expect(applySuppression(findings, rules, 'security-audit')).toEqual([]);
  });
});
