import { describe, expect, it } from 'vitest';
import type { EventContext, Finding, SkillReport } from '../../types/index.js';
import { buildFindingsOutput, FindingsOutputSchema } from './output.js';

describe('findings output schema', () => {
  it('builds a schema-valid public findings payload', () => {
    const output = buildFindingsOutput([createReport()], createContext(), [
      {
        outcome: 'posted',
        finding: createFinding(),
        skill: 'test-skill',
      },
    ], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
    });

    expect(FindingsOutputSchema.parse(output)).toEqual(output);
    expect(output.summary).toEqual({
      totalFindings: 1,
      findingsBySeverity: { high: 1, medium: 0, low: 0 },
      totalSkills: 1,
    });
  });

  it('includes trigger run results for split report mode', () => {
    const report = createReport();
    const output = buildFindingsOutput([report], createContext(), [], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
      triggerResults: [
        {
          triggerName: 'test-trigger',
          skillName: 'test-skill',
          report,
        },
        {
          triggerName: 'failed-trigger',
          skillName: 'failed-skill',
          error: new Error('Token expired'),
        },
      ],
    });

    expect(FindingsOutputSchema.parse(output)).toEqual(output);
    expect(output.triggerResults).toEqual([
      {
        triggerName: 'test-trigger',
        skillName: 'test-skill',
        status: 'success',
        report,
      },
      {
        triggerName: 'failed-trigger',
        skillName: 'failed-skill',
        status: 'error',
        error: {
          name: 'Error',
          message: 'Token expired',
        },
      },
    ]);
  });

  it('serializes trigger results with the configured skill identity', () => {
    const report = createReport({ skill: 'frontmatter-skill' });
    const output = buildFindingsOutput([report], createContext(), [], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
      triggerResults: [
        {
          triggerName: 'test-trigger',
          skillName: 'config-skill',
          report,
        },
      ],
    });

    expect(output.triggerResults?.[0]).toMatchObject({
      triggerName: 'test-trigger',
      skillName: 'config-skill',
      status: 'success',
      report,
    });
  });

  it('projects trigger reports to fields needed for split-mode replay', () => {
    const report = createReport({
      metadata: { internal: true },
      runtime: 'pi',
      failedHunks: 1,
    });
    const output = buildFindingsOutput([report], createContext(), [], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
      triggerResults: [
        {
          triggerName: 'test-trigger',
          skillName: 'test-skill',
          report,
        },
      ],
    });

    expect(output.triggerResults?.[0]).toMatchObject({
      status: 'success',
      report: {
        skill: 'test-skill',
        summary: 'Found 1 issue',
      },
    });
    expect(output.triggerResults?.[0]).not.toHaveProperty('report.metadata');
    expect(output.triggerResults?.[0]).not.toHaveProperty('report.runtime');
    expect(output.triggerResults?.[0]).not.toHaveProperty('report.failedHunks');
  });

  it('requires status-specific trigger result data', () => {
    const output = buildFindingsOutput([createReport()], createContext(), [], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
    });

    expect(() =>
      FindingsOutputSchema.parse({
        ...output,
        triggerResults: [
          {
            triggerName: 'test-trigger',
            skillName: 'test-skill',
            status: 'success',
          },
        ],
      })
    ).toThrow();

    expect(() =>
      FindingsOutputSchema.parse({
        ...output,
        triggerResults: [
          {
            triggerName: 'failed-trigger',
            skillName: 'test-skill',
            status: 'error',
          },
        ],
      })
    ).toThrow();
  });

  it('rejects outcome details that do not match the observation kind', () => {
    const output = buildFindingsOutput([createReport()], createContext(), [], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
    });

    expect(() =>
      FindingsOutputSchema.parse({
        ...output,
        findingObservations: [
          {
            outcome: 'deduped',
            finding: createFinding(),
            skill: 'test-skill',
          },
        ],
      })
    ).toThrow();
  });

  it('rejects sentinel dedupe comment IDs', () => {
    const output = buildFindingsOutput([createReport()], createContext(), [], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
    });

    expect(() =>
      FindingsOutputSchema.parse({
        ...output,
        findingObservations: [
          {
            outcome: 'deduped',
            finding: createFinding(),
            skill: 'test-skill',
            dedupe: {
              source: 'warden',
              matchType: 'hash',
              existingFindingId: 'WRD-001',
              existingCommentId: -1,
            },
          },
        ],
      })
    ).toThrow();
  });
});

function createFinding(): Finding {
  return {
    id: 'WRD-001',
    severity: 'high',
    confidence: 'high',
    title: 'Finding title',
    description: 'Finding description',
    location: { path: 'src/index.ts', startLine: 1 },
  };
}

function createReport(overrides: Partial<SkillReport> = {}): SkillReport {
  return {
    skill: 'test-skill',
    summary: 'Found 1 issue',
    findings: [createFinding()],
    ...overrides,
  };
}

function createContext(): EventContext {
  return {
    eventType: 'pull_request',
    action: 'opened',
    repository: {
      owner: 'getsentry',
      name: 'warden',
      fullName: 'getsentry/warden',
      defaultBranch: 'main',
    },
    pullRequest: {
      number: 362,
      title: 'Test PR',
      body: '',
      author: 'user-123',
      baseBranch: 'main',
      headBranch: 'feature',
      headSha: 'abc123',
      baseSha: 'def456',
      files: [],
    },
    repoPath: '/tmp/warden',
  };
}
