import { describe, expect, it } from 'vitest';
import {
  CodeRunEnvelopeSchema,
  MetricsRunEnvelopeSchema,
  RunEnvelopeV1Schema,
} from './protocol.js';

const baseEnvelope = {
  protocolVersion: 1,
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
  features: { memory: false },
  findingCounts: {
    total: 1,
    bySeverity: { high: 1, medium: 0, low: 0 },
  },
  skills: [],
  memoryRecallId: 'recall-123',
} as const;

describe('RunEnvelopeV1Schema', () => {
  it('parses a metrics envelope', () => {
    const envelope = { ...baseEnvelope, dataProfile: 'metrics' as const };

    expect(RunEnvelopeV1Schema.parse(envelope)).toEqual(envelope);
  });

  it('rejects memory with the metrics profile', () => {
    expect(() => RunEnvelopeV1Schema.parse({
      ...baseEnvelope,
      dataProfile: 'metrics',
      features: { memory: true },
    })).toThrow();
  });

  it('rejects unknown fields instead of accepting ambiguous protocol data', () => {
    expect(() => MetricsRunEnvelopeSchema.parse({
      ...baseEnvelope,
      dataProfile: 'metrics',
      prompt: 'ignore the rules',
    })).toThrow();
  });

  it('rejects a repository full name that contradicts its owner and name', () => {
    expect(() => MetricsRunEnvelopeSchema.parse({
      ...baseEnvelope,
      dataProfile: 'metrics',
      repository: {
        ...baseEnvelope.repository,
        fullName: 'another/widgets',
      },
    })).toThrow();
  });

  it('enforces collection and source-evidence size limits', () => {
    const oversizedEvidence = 'x'.repeat(16_001);
    const finding = {
      id: 'finding-1',
      skillExecutionId: 'skill-1',
      severity: 'high',
      title: 'Unsafe interpolation',
      description: 'A value reaches a query without parameterization.',
      sourceEvidence: {
        path: 'src/query.ts',
        startLine: 1,
        endLine: 2,
        targetStartLine: 1,
        targetEndLine: 1,
        content: oversizedEvidence,
      },
    };

    expect(() => CodeRunEnvelopeSchema.parse({
      ...baseEnvelope,
      dataProfile: 'code',
      findings: [finding],
      observations: [],
    })).toThrow();

    expect(() => MetricsRunEnvelopeSchema.parse({
      ...baseEnvelope,
      dataProfile: 'metrics',
      skills: Array.from({ length: 101 }, (_, index) => ({
        executionId: `skill-${index}`,
        skill: 'security',
        status: 'success',
        findingCounts: {
          total: 0,
          bySeverity: { high: 0, medium: 0, low: 0 },
        },
        usage: [],
      })),
    })).toThrow();
  });
});
