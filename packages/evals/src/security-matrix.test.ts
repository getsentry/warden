import { describe, expect, it } from 'vitest';
import { matrixScenarioKind, summarizeSecurityMatrix, type MatrixResult } from './security-matrix.js';

function result(
  scenario: string,
  lane: MatrixResult['lane'],
  passed: boolean,
  kind: MatrixResult['kind'] = 'bug',
  skill = 'wrdn-authz',
): MatrixResult {
  return { skill, scenario, kind, lane, passed };
}

describe('matrixScenarioKind', () => {
  it('treats scenarios without a required should_find as clean', () => {
    expect(matrixScenarioKind({ should_find: [{ finding: 'real bug', required: true }] })).toBe('bug');
    expect(matrixScenarioKind({ should_find: [{ finding: 'no bugs expected', required: false }] })).toBe('clean');
  });
});

describe('summarizeSecurityMatrix', () => {
  it('counts bugs only the wrdn skill caught and clean fixtures each lane flagged', () => {
    const summary = summarizeSecurityMatrix([
      result('scim', 'skill', true),
      result('scim', 'security-review', false),
      result('projects', 'skill', true),
      result('projects', 'security-review', true),
      result('workflow', 'skill', false),
      result('workflow', 'security-review', true),
      result('fixed-scim', 'skill', false, 'clean'),
      result('fixed-scim', 'security-review', true, 'clean'),
    ]);

    expect(summary).toBe([
      'Security matrix',
      '',
      'wrdn-authz: 1 of 3 bugs caught only by wrdn-authz (scim)',
      '  caught: wrdn-authz 2/3, security-review 2/3',
      '  caught only by security-review: 1 (workflow)',
      '  clean fixtures flagged: wrdn-authz 1/1, security-review 0/1',
    ].join('\n'));
  });

  it('reports zero unique catches per skill and names scenarios missing a lane', () => {
    const summary = summarizeSecurityMatrix([
      result('ssrf', 'skill', true, 'bug', 'wrdn-data-exfil'),
      result('ssrf', 'security-review', true, 'bug', 'wrdn-data-exfil'),
      result('logs', 'skill', false, 'bug', 'wrdn-data-exfil'),
    ]);

    expect(summary).toContain('wrdn-data-exfil: 0 of 2 bugs caught only by wrdn-data-exfil');
    expect(summary).toContain('  incomplete, missing a lane: logs');
  });
});
