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

function createReport(): SkillReport {
  return {
    skill: 'test-skill',
    summary: 'Found 1 issue',
    findings: [createFinding()],
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
