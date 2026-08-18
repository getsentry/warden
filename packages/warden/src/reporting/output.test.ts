import { describe, expect, it } from 'vitest';
import type { EventContext, Finding, SkillReport } from '../types/index.js';
import { buildFindingsOutput, buildResolvedDefaults, FindingsOutputSchema } from './output.js';

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
      totalSkillExecutions: 1,
      byOutcome: { posted: 1, deduped: 0, skipped: 0, resolved: 0, failed: 0 },
    });
  });

  it('defaults observations for historical version 1 artifacts', () => {
    const output = buildFindingsOutput([createReport()], createContext(), [], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
    });
    const { findingObservations: _observations, ...historical } = output;

    expect(FindingsOutputSchema.parse(historical).findingObservations).toEqual([]);
  });

  it('produces the exact pre-existing shape when none of the new inputs are available', () => {
    const context = createContext();
    const finding = createFinding();
    const report = createReport({ findings: [finding] });

    // GitHub Actions always sets GITHUB_RUN_ATTEMPT, but this assertion is
    // specifically about the shape when nothing is available — isolate it
    // from the ambient environment rather than relying on it being unset.
    const originalRunAttempt = process.env['GITHUB_RUN_ATTEMPT'];
    delete process.env['GITHUB_RUN_ATTEMPT'];
    let output: ReturnType<typeof buildFindingsOutput>;
    try {
      output = buildFindingsOutput([report], context, [], {
        timestamp: '2026-01-01T00:00:00.000Z',
        runId: '123',
      });
    } finally {
      if (originalRunAttempt === undefined) {
        delete process.env['GITHUB_RUN_ATTEMPT'];
      } else {
        process.env['GITHUB_RUN_ATTEMPT'] = originalRunAttempt;
      }
    }

    expect(output).toEqual({
      version: '1',
      timestamp: '2026-01-01T00:00:00.000Z',
      runAttempt: undefined,
      harness: { name: 'warden', version: expect.any(String), actionRef: undefined },
      repository: {
        owner: context.repository.owner,
        name: context.repository.name,
        fullName: context.repository.fullName,
      },
      event: context.eventType,
      pullRequest: {
        number: context.pullRequest!.number,
        author: context.pullRequest!.author,
        title: context.pullRequest!.title,
        baseBranch: context.pullRequest!.baseBranch,
        headBranch: context.pullRequest!.headBranch,
        headSha: context.pullRequest!.headSha,
      },
      runId: '123',
      resolvedDefaults: undefined,
      skippedTriggers: undefined,
      summary: {
        totalFindings: 1,
        findingsBySeverity: { high: 1, medium: 0, low: 0 },
        totalSkills: 1,
        totalSkillExecutions: 1,
        byOutcome: { posted: 0, deduped: 0, skipped: 0, resolved: 0, failed: 0 },
      },
      skills: [
        {
          name: report.skill,
          summary: report.summary,
          model: undefined,
          auxiliaryModel: undefined,
          synthesisModel: undefined,
          durationMs: undefined,
          usage: undefined,
          failedHunks: undefined,
          failedExtractions: undefined,
          error: undefined,
          skillExecutionId: undefined,
          triggerId: undefined,
          triggerName: undefined,
          findingsBySeverity: { high: 1, medium: 0, low: 0 },
          checkRunUrl: undefined,
          checkRunId: undefined,
          reviewEvent: undefined,
          checkConclusion: undefined,
          issueNumber: undefined,
          issueUrl: undefined,
          findings: [
            {
              id: finding.id,
              reportedId: undefined,
              severity: finding.severity,
              confidence: finding.confidence,
              title: finding.title,
              description: finding.description,
              verification: undefined,
              location: finding.location,
              additionalLocations: undefined,
              sourceSnippet: undefined,
              contentHash: expect.any(String),
              reportedBy: undefined,
              provenance: undefined,
            },
          ],
        },
      ],
      discardedFindings: undefined,
      triggerResults: undefined,
      findingObservations: [],
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
      auxiliaryUsageAttribution: { verification: { model: 'verifier', runtime: 'claude' } },
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
        runtime: 'pi',
        auxiliaryUsageAttribution: { verification: { model: 'verifier', runtime: 'claude' } },
      },
    });
    expect(output.triggerResults?.[0]).not.toHaveProperty('report.metadata');
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

  it('includes skill reliability fields when present', () => {
    const report = createReport({
      failedHunks: 2,
      failedExtractions: 1,
      error: { code: 'sdk_error', message: 'boom' },
    });
    const output = buildFindingsOutput([report], createContext(), [], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
    });

    expect(FindingsOutputSchema.parse(output)).toEqual(output);
    expect(output.skills[0]).toMatchObject({
      failedHunks: 2,
      failedExtractions: 1,
      error: { code: 'sdk_error', message: 'boom' },
    });
  });

  it('omits skill reliability fields when absent', () => {
    const output = buildFindingsOutput([createReport()], createContext(), [], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
    });

    expect(output.skills[0]?.failedHunks).toBeUndefined();
    expect(output.skills[0]?.failedExtractions).toBeUndefined();
    expect(output.skills[0]?.error).toBeUndefined();

    const serialized = JSON.parse(JSON.stringify(output.skills[0]));
    expect('failedHunks' in serialized).toBe(false);
    expect('failedExtractions' in serialized).toBe(false);
    expect('error' in serialized).toBe(false);
  });

  it('includes harness/resolvedDefaults/skippedTriggers when provided', () => {
    const output = buildFindingsOutput([createReport()], createContext(), [], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
      runAttempt: '2',
      actionRef: 'babylist/warden@v1',
      resolvedDefaults: { failOn: 'high', maxFindings: 25 },
      skippedTriggers: [
        { skillName: 'style-guide', triggerId: 'trg-1', triggerName: 'style-guide', reason: 'path_filter' },
      ],
    });

    expect(FindingsOutputSchema.parse(output)).toEqual(output);
    expect(output.runAttempt).toBe('2');
    expect(output.harness).toEqual({ name: 'warden', version: expect.any(String), actionRef: 'babylist/warden@v1' });
    expect(output.resolvedDefaults).toEqual({ failOn: 'high', maxFindings: 25 });
    expect(output.skippedTriggers).toEqual([
      { skillName: 'style-guide', triggerId: 'trg-1', triggerName: 'style-guide', reason: 'path_filter' },
    ]);
  });

  it('falls back to GITHUB_RUN_ATTEMPT when no runAttempt option is passed', () => {
    const original = process.env['GITHUB_RUN_ATTEMPT'];
    process.env['GITHUB_RUN_ATTEMPT'] = '3';

    try {
      const output = buildFindingsOutput([createReport()], createContext(), [], {
        timestamp: '2026-01-01T00:00:00.000Z',
        runId: '123',
      });

      expect(output.runAttempt).toBe('3');
    } finally {
      if (original === undefined) {
        delete process.env['GITHUB_RUN_ATTEMPT'];
      } else {
        process.env['GITHUB_RUN_ATTEMPT'] = original;
      }
    }
  });

  it('passes through the verification field already carried on Finding', () => {
    const finding = createFinding();
    finding.verification = '- traced the guard clause at line 42';
    const output = buildFindingsOutput([createReport({ findings: [finding] })], createContext(), [], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
    });

    expect(output.skills[0]?.findings[0]?.verification).toBe('- traced the guard clause at line 42');
  });

  it('mirrors reportedId onto id only when dedupe/recenter has stamped it', () => {
    const untouched = createFinding();
    const recentered = { ...createFinding(), id: 'existing-comment-id', reportedId: 'existing-comment-id' };
    const output = buildFindingsOutput(
      [createReport({ findings: [untouched, recentered] })],
      createContext(),
      [],
      { timestamp: '2026-01-01T00:00:00.000Z', runId: '123' }
    );

    expect(output.skills[0]?.findings[0]?.reportedId).toBeUndefined();
    expect(output.skills[0]?.findings[1]?.reportedId).toBe('existing-comment-id');
  });

  it('attaches skillExecutionId, triggerId, posting-derived fields, and primary reportedBy from skillExecutions', () => {
    const report = createReport();
    const output = buildFindingsOutput([report], createContext(), [], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
      skillExecutions: [
        {
          report,
          skillExecutionId: 'exec-abc',
          triggerId: 'trg-1',
          triggerName: 'security-check',
          checkRunUrl: 'https://github.com/check/1',
          checkRunId: 1,
          reviewEvent: 'COMMENT',
          checkConclusion: 'success',
        },
      ],
    });

    expect(FindingsOutputSchema.parse(output)).toEqual(output);
    const skill = output.skills[0];
    expect(skill?.skillExecutionId).toBe('exec-abc');
    expect(skill?.triggerId).toBe('trg-1');
    expect(skill?.triggerName).toBe('security-check');
    expect(skill?.checkRunUrl).toBe('https://github.com/check/1');
    expect(skill?.checkRunId).toBe(1);
    expect(skill?.reviewEvent).toBe('COMMENT');
    expect(skill?.checkConclusion).toBe('success');
    expect(skill?.findings[0]?.reportedBy).toEqual([
      { skillExecutionId: 'exec-abc', skillName: 'test-skill', role: 'primary' },
    ]);
  });

  it('adds corroborating reportedBy entries from a deduped finding observation', () => {
    const finding = createFinding();
    const report = createReport({ findings: [finding] });
    const output = buildFindingsOutput(
      [report],
      createContext(),
      [
        {
          // A cross-run dedupe: some other skill's finding matched this
          // exact survivor (by its own id) on a prior run.
          outcome: 'deduped',
          finding: createFinding({ id: 'other-run-finding-id' }),
          skill: 'other-skill',
          dedupe: {
            source: 'warden',
            matchType: 'hash',
            existingFindingId: finding.id,
            existingSkills: ['test-skill', 'other-skill'],
          },
        },
      ],
      {
        timestamp: '2026-01-01T00:00:00.000Z',
        runId: '123',
        skillExecutions: [{ report, skillExecutionId: 'exec-abc' }],
      }
    );

    expect(output.skills[0]?.findings[0]?.reportedBy).toEqual([
      { skillExecutionId: 'exec-abc', skillName: 'test-skill', role: 'primary' },
      { skillName: 'other-skill', role: 'corroborating', matchType: 'hash' },
    ]);
  });

  it('does not attribute dedupe corroboration to an unrelated finding that merely shares title+description', () => {
    // Regression: two findings with identical wording but different locations
    // and no relationship to each other. Only the one at the deduped
    // location should inherit reportedBy corroboration.
    const survivor = createFinding({ id: 'a', location: { path: 'src/a.ts', startLine: 1 } });
    const dedupedElsewhere = createFinding({ id: 'b', location: { path: 'src/b.ts', startLine: 99 } });
    const report = createReport({ findings: [survivor] });

    const output = buildFindingsOutput(
      [report],
      createContext(),
      [
        {
          outcome: 'deduped',
          finding: dedupedElsewhere,
          skill: 'other-skill',
          dedupe: {
            source: 'warden',
            matchType: 'hash',
            existingFindingId: 'prior-id',
            existingSkills: ['other-skill', 'some-prior-skill'],
          },
        },
      ],
      {
        timestamp: '2026-01-01T00:00:00.000Z',
        runId: '123',
        skillExecutions: [{ report, skillExecutionId: 'exec-abc' }],
      }
    );

    expect(output.skills[0]?.findings[0]?.reportedBy).toEqual([
      { skillExecutionId: 'exec-abc', skillName: 'test-skill', role: 'primary' },
    ]);
  });

  it('omits reportedBy entirely when no skillExecutions metadata is given', () => {
    const output = buildFindingsOutput([createReport()], createContext(), [], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
    });

    expect(output.skills[0]?.findings[0]?.reportedBy).toBeUndefined();
  });

  it('builds provenance for a revised finding and discardedFindings for rejected/merged candidates', () => {
    const survivor = createFinding();
    const rejectedFinding = { ...createFinding(), id: 'rejected-1', title: 'Rejected finding' };
    const absorbedFinding = { ...createFinding(), id: 'absorbed-1', title: 'Absorbed finding' };
    const report = createReport({ findings: [survivor] });

    const output = buildFindingsOutput([report], createContext(), [], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
      skillExecutions: [
        {
          report,
          skillExecutionId: 'exec-abc',
          findingProcessingEvents: [
            {
              stage: 'verification',
              action: 'revised',
              finding: { ...survivor, title: 'Original title', severity: 'low' },
              replacement: survivor,
              reason: 'narrowed after tracing the guard clause',
            },
            { stage: 'verification', action: 'rejected', finding: rejectedFinding, reason: 'not reproducible' },
            { stage: 'merge', action: 'merged', finding: absorbedFinding, replacement: survivor, reason: 'same root cause' },
          ],
        },
      ],
    });

    expect(FindingsOutputSchema.parse(output)).toEqual(output);
    expect(output.skills[0]?.findings[0]?.provenance).toEqual({
      originSkillExecutionId: 'exec-abc',
      originModel: undefined,
      verification: {
        outcome: 'revised',
        model: undefined,
        evidence: 'narrowed after tracing the guard clause',
        before: { title: 'Original title', description: survivor.description, severity: 'low', confidence: survivor.confidence },
      },
      merge: { model: undefined, absorbedFindingIds: ['absorbed-1'] },
    });
    expect(output.discardedFindings).toEqual([
      {
        originSkillExecutionId: 'exec-abc',
        stage: 'verification_rejected',
        severity: rejectedFinding.severity,
        title: 'Rejected finding',
        location: rejectedFinding.location,
        model: undefined,
        reason: 'not reproducible',
        survivorFindingId: undefined,
      },
      {
        originSkillExecutionId: 'exec-abc',
        stage: 'merge_absorbed',
        severity: absorbedFinding.severity,
        title: 'Absorbed finding',
        location: absorbedFinding.location,
        model: undefined,
        reason: 'same root cause',
        survivorFindingId: survivor.id,
      },
    ]);
  });

  it('omits discardedFindings when there is nothing to discard', () => {
    const output = buildFindingsOutput([createReport()], createContext(), [], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
    });

    expect(output.discardedFindings).toBeUndefined();
    expect('discardedFindings' in JSON.parse(JSON.stringify(output))).toBe(false);
  });

  it('keeps each skill execution\'s provenance independent when same-run recentering shares a finding id', () => {
    // Regression: same-run dedupe can recenter two different skills' survivor
    // findings onto the same id. A run-global provenance map keyed only by
    // finding id would let the second skill's event overwrite the first's.
    const sharedId = 'shared-comment-id';
    const findingA = createFinding({ id: sharedId });
    const findingB = createFinding({ id: sharedId, title: 'Different wording' });
    const reportA = createReport({ skill: 'skill-a', findings: [findingA] });
    const reportB = createReport({ skill: 'skill-b', findings: [findingB] });

    const output = buildFindingsOutput([reportA, reportB], createContext(), [], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
      skillExecutions: [
        {
          report: reportA,
          skillExecutionId: 'exec-a',
          findingProcessingEvents: [
            {
              stage: 'verification',
              action: 'revised',
              finding: { ...findingA, title: 'Original A title', severity: 'low' },
              replacement: findingA,
              reason: 'narrowed A',
            },
          ],
        },
        {
          report: reportB,
          skillExecutionId: 'exec-b',
          findingProcessingEvents: [
            {
              stage: 'verification',
              action: 'revised',
              finding: { ...findingB, title: 'Original B title', severity: 'medium' },
              replacement: findingB,
              reason: 'narrowed B',
            },
          ],
        },
      ],
    });

    expect(output.skills[0]?.findings[0]?.provenance?.verification?.before.title).toBe('Original A title');
    expect(output.skills[1]?.findings[0]?.provenance?.verification?.before.title).toBe('Original B title');
  });

  it('attributes provenance to the model that ran each stage, not the primary analysis model', () => {
    const survivor = createFinding();
    const absorbed = { ...createFinding(), id: 'absorbed-1' };
    const report = createReport({ skill: 'security-skill', findings: [survivor], model: 'primary-model' });

    const output = buildFindingsOutput([report], createContext(), [], {
      timestamp: '2026-01-01T00:00:00.000Z',
      runId: '123',
      skillExecutions: [
        {
          report,
          skillExecutionId: 'exec-abc',
          auxiliaryModel: 'verification-model',
          synthesisModel: 'merge-model',
          findingProcessingEvents: [
            {
              stage: 'verification',
              action: 'revised',
              finding: { ...survivor, title: 'Original title' },
              replacement: survivor,
              reason: 'narrowed',
            },
            { stage: 'merge', action: 'merged', finding: absorbed, replacement: survivor, reason: 'same root cause' },
          ],
        },
      ],
    });

    const provenance = output.skills[0]?.findings[0]?.provenance;
    expect(provenance?.originModel).toBe('primary-model');
    expect(provenance?.verification?.model).toBe('verification-model');
    expect(provenance?.merge?.model).toBe('merge-model');
    expect(output.discardedFindings?.[0]).toMatchObject({ stage: 'merge_absorbed', model: 'merge-model' });
  });

  it('joins same-run cross-skill dedupe by existingFindingId, including semantic matches with a different content hash', () => {
    const survivorFinding = createFinding({
      id: 'survivor-id',
      title: 'SQL injection risk',
      description: 'user input concatenated into query',
    });
    const duplicateFinding = createFinding({
      id: 'dup-id',
      title: 'Unsanitized SQL input',
      description: 'raw value passed to db.query',
    });
    const survivorReport = createReport({ skill: 'security-skill', findings: [survivorFinding] });

    const output = buildFindingsOutput(
      [survivorReport],
      createContext(),
      [
        {
          outcome: 'deduped',
          finding: duplicateFinding,
          skill: 'style-skill',
          dedupe: {
            source: 'warden',
            matchType: 'semantic',
            existingFindingId: survivorFinding.id,
            existingSkills: ['security-skill'],
          },
        },
      ],
      {
        timestamp: '2026-01-01T00:00:00.000Z',
        runId: '123',
        skillExecutions: [{ report: survivorReport, skillExecutionId: 'exec-security' }],
      }
    );

    expect(output.skills[0]?.findings[0]?.reportedBy).toEqual([
      { skillExecutionId: 'exec-security', skillName: 'security-skill', role: 'primary' },
      { skillName: 'style-skill', role: 'corroborating', matchType: 'semantic' },
    ]);
  });
});

describe('buildResolvedDefaults', () => {
  it('extracts the five resolved-default fields from action inputs', () => {
    expect(buildResolvedDefaults({
      failOn: 'high',
      reportOn: 'medium',
      failCheck: true,
      requestChanges: false,
      maxFindings: 25,
    })).toEqual({
      failOn: 'high',
      reportOn: 'medium',
      failCheck: true,
      requestChanges: false,
      maxFindings: 25,
    });
  });

  it('carries through undefined optional fields', () => {
    expect(buildResolvedDefaults({ maxFindings: 50 })).toEqual({
      failOn: undefined,
      reportOn: undefined,
      failCheck: undefined,
      requestChanges: undefined,
      maxFindings: 50,
    });
  });
});

function createFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'WRD-001',
    severity: 'high',
    confidence: 'high',
    title: 'Finding title',
    description: 'Finding description',
    location: { path: 'src/index.ts', startLine: 1 },
    ...overrides,
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
