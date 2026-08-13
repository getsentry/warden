import { describe, expect, it } from 'vitest';
import { redactRunProjection } from './redaction.js';
import type { DataProfile, RunProjection } from './protocol.js';

function projection(dataProfile: DataProfile): RunProjection {
  return {
    protocolVersion: 1,
    dataProfile,
    clientRunId: 'run-123',
    source: 'action',
    wardenVersion: '1.2.3',
    startedAt: '2026-08-12T10:00:00.000Z',
    completedAt: '2026-08-12T10:00:03.000Z',
    outcome: 'success',
    repository: {
      provider: 'github',
      owner: 'acme',
      name: 'widgets',
      fullName: 'acme/widgets',
    },
    features: { memory: dataProfile !== 'metrics' },
    findingCounts: {
      total: 1,
      bySeverity: { high: 1, medium: 0, low: 0 },
    },
    skills: [{
      executionId: 'skill-1',
      skill: 'security',
      status: 'success',
      findingCounts: {
        total: 1,
        bySeverity: { high: 1, medium: 0, low: 0 },
      },
      usage: [{
        lane: 'scan',
        model: 'example-model',
        inputTokens: 100,
        outputTokens: 20,
        costUsd: null,
        costBasis: 'unknown',
      }],
    }],
    findings: [{
      id: 'finding-1',
      skillExecutionId: 'skill-1',
      severity: 'high',
      title: 'Unsafe interpolation',
      description: 'A value reaches a query without parameterization.',
      location: { path: 'src/query.ts', startLine: 10 },
      sourceEvidence: {
        path: 'src/query.ts',
        language: 'typescript',
        startLine: 8,
        endLine: 12,
        targetStartLine: 10,
        targetEndLine: 10,
        content: 'db.query(`SELECT ${value}`)',
      },
    }],
    observations: [{
      findingId: 'finding-1',
      skillExecutionId: 'skill-1',
      outcome: 'posted',
      observedAt: '2026-08-12T10:00:03.000Z',
    }],
  };
}

describe('redactRunProjection', () => {
  it.each(['metrics', 'findings', 'code'] as const)('builds a strict %s envelope', (profile) => {
    expect(redactRunProjection(projection(profile)).dataProfile).toBe(profile);
  });

  it('removes all finding content from metrics envelopes', () => {
    const serialized = JSON.stringify(redactRunProjection(projection('metrics')));

    expect(serialized).not.toContain('findings');
    expect(serialized).not.toContain('src/query.ts');
    expect(serialized).not.toContain('Unsafe interpolation');
    expect(serialized).not.toContain('SELECT');
  });

  it('removes code evidence but retains bounded finding data for findings envelopes', () => {
    const envelope = redactRunProjection(projection('findings'));
    const serialized = JSON.stringify(envelope);

    expect(serialized).toContain('Unsafe interpolation');
    expect(serialized).toContain('src/query.ts');
    expect(serialized).not.toContain('sourceEvidence');
    expect(serialized).not.toContain('SELECT');
  });

  it('retains bounded source evidence only for code envelopes', () => {
    const serialized = JSON.stringify(redactRunProjection(projection('code')));

    expect(serialized).toContain('sourceEvidence');
    expect(serialized).toContain('SELECT');
  });

  it.each(['prompt', 'transcript', 'tools', 'diff', 'traceBody'])('rejects forbidden %s fields', (field) => {
    expect(() => redactRunProjection({
      ...projection('code'),
      [field]: 'private content',
    })).toThrow();
  });
});
