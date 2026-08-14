import { describe, expect, it } from 'vitest';
import type { ServiceContext } from '../context.js';
import type { QueryResult, WardenDatabase } from '../db/database.js';
import { aggregateCosts, getFindingDetail, getRunDetail, listFindings, listRepositories, listRuns, listSkills, summarizeOutcomes } from './store.js';

const context: ServiceContext = {
  tenantId: '00000000-0000-0000-0000-000000000001',
  tokenId: '00000000-0000-0000-0000-000000000002',
  roles: ['read'],
  repositoryAllowlist: null,
};

function databaseFor(query: (sql: string, values: readonly unknown[]) => QueryResult<Record<string, unknown>>): WardenDatabase {
  return {
    async query(sql: string, values: readonly unknown[] = []) {
      return query(sql, values) as never;
    },
  } as unknown as WardenDatabase;
}

describe('history store', () => {
  it('lists only tenant-filtered runs with stable pagination and nullable cost', async () => {
    const seen: { sql: string; values: readonly unknown[] }[] = [];
    const row = (id: string, completedAt: string) => ({
      id,
      client_run_id: `client-${id}`,
      source: 'action',
      data_profile: 'metrics',
      provider: 'github',
      owner: 'acme',
      name: 'widgets',
      full_name: 'acme/widgets',
      started_at: '2026-08-12T10:00:00.000Z',
      completed_at: completedAt,
      outcome: 'success',
      finding_count: 0,
      high_count: 0,
      medium_count: 0,
      low_count: 0,
      cost_usd: null,
      trace_id: null,
    });
    const database = databaseFor((sql, values) => {
      seen.push({ sql, values });
      return { rows: [
        row('00000000-0000-0000-0000-000000000010', '2026-08-12T10:01:00.000Z'),
        row('00000000-0000-0000-0000-000000000011', '2026-08-12T10:00:00.000Z'),
      ], rowCount: 2 };
    });

    const page = await listRuns(database, context, { limit: 1, source: 'action' });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.costUsd).toBeNull();
    expect(page.nextCursor).toBeTypeOf('string');
    expect(seen[0]?.sql).toContain('r.tenant_id = $1');
    expect(seen[0]?.values[0]).toBe(context.tenantId);
  });

  it('combines history dimensions without weakening tenant scope', async () => {
    let captured: { sql: string; values: readonly unknown[] } | undefined;
    const database = databaseFor((sql, values) => {
      captured = { sql, values };
      return { rows: [], rowCount: 0 };
    });

    await listRuns(database, context, {
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-31T23:59:59.000Z',
      repositoryId: '00000000-0000-0000-0000-000000000010',
      skill: 'security',
      model: 'example-model',
      runtime: 'claude',
      provider: 'anthropic',
      lane: 'verification',
      source: 'action',
      outcome: 'failure',
      errorCode: 'provider_unavailable',
    });

    expect(captured?.sql).toContain('r.tenant_id = $1');
    expect(captured?.sql).toContain('EXISTS (SELECT 1 FROM skill_executions filtered_se');
    expect(captured?.sql).toContain('filtered_se.id = u.skill_execution_id');
    expect(captured?.values).toEqual(expect.arrayContaining([
      context.tenantId,
      'security',
      'example-model',
      'verification',
      'provider_unavailable',
    ]));
  });

  it('filters runs and outcomes by executions even when they have no usage rows', async () => {
    const statements: string[] = [];
    const database = databaseFor((sql) => {
      statements.push(sql);
      return { rows: [], rowCount: 0 };
    });

    await listRuns(database, context, { skill: 'security', errorCode: 'provider_unavailable' });
    await summarizeOutcomes(database, context, { skill: 'security', errorCode: 'provider_unavailable' });

    expect(statements).toHaveLength(2);
    for (const sql of statements) {
      expect(sql).toContain('EXISTS (SELECT 1 FROM skill_executions filtered_se');
      expect(sql).toContain('filtered_se.skill =');
      expect(sql).toContain('filtered_se.error_code =');
      expect(sql).not.toContain('filtered_se.id = u.skill_execution_id');
      expect(sql).not.toContain('se.id = u.skill_execution_id');
    }
  });

  it('lists findings with literal search and investigation filters', async () => {
    let captured: { sql: string; values: readonly unknown[] } | undefined;
    const database = databaseFor((sql, values) => {
      captured = { sql, values };
      return { rows: [{
        id: '00000000-0000-0000-0000-000000000020',
        client_finding_id: '7MV-5V7',
        reported_id: null,
        run_id: '00000000-0000-0000-0000-000000000021',
        client_run_id: 'run-21',
        provider: 'github',
        owner: 'acme',
        name: 'widgets',
        full_name: 'acme/widgets',
        skill: 'security-review',
        severity: 'high',
        confidence: 'high',
        title: 'Missing authorization check',
        description: 'The endpoint does not verify ownership.',
        path: 'src/api.ts',
        start_line: 42,
        end_line: 48,
        observation_outcome: 'posted',
        observed_at: '2026-08-12T10:02:00.000Z',
        completed_at: '2026-08-12T10:01:00.000Z',
      }], rowCount: 1 };
    });

    const page = await listFindings(database, context, {
      repositoryId: '00000000-0000-0000-0000-000000000010',
      skill: 'security-review',
      severity: 'high',
      outcome: 'posted',
      query: 'Authorization',
    });

    expect(page.items[0]).toMatchObject({
      displayId: '7MV-5V7',
      title: 'Missing authorization check',
      repository: { fullName: 'acme/widgets' },
      location: { path: 'src/api.ts', startLine: 42 },
      outcome: 'posted',
    });
    expect(captured?.sql).toContain('POSITION(');
    expect(captured?.sql).toContain('LEFT JOIN LATERAL');
    expect(captured?.values).toEqual(expect.arrayContaining([
      context.tenantId,
      'security-review',
      'high',
      'posted',
      'authorization',
    ]));
  });

  it('returns bounded source evidence and a commit-pinned GitHub link for finding detail', async () => {
    const database = databaseFor(() => ({
      rows: [{
        id: '00000000-0000-0000-0000-000000000020',
        client_finding_id: 'finding-20',
        reported_id: '7MV-5V7',
        run_id: '00000000-0000-0000-0000-000000000021',
        client_run_id: 'run-21',
        head_sha: 'abc123def456',
        source_evidence: {
          path: 'src/api route.ts', language: 'typescript', startLine: 40, endLine: 49,
          targetStartLine: 42, targetEndLine: 48, content: 'authorize(request);',
        },
        provider: 'github', owner: 'acme', name: 'widgets', full_name: 'acme/widgets',
        skill: 'security-review', severity: 'high', confidence: 'high',
        title: 'Missing authorization check', description: 'The endpoint does not verify ownership.',
        path: 'src/api route.ts', start_line: 42, end_line: 48,
        observation_outcome: 'posted', observed_at: '2026-08-12T10:02:00.000Z',
        completed_at: '2026-08-12T10:01:00.000Z',
      }],
      rowCount: 1,
    }));

    await expect(getFindingDetail(
      database,
      context,
      '00000000-0000-0000-0000-000000000020',
    )).resolves.toMatchObject({
      headSha: 'abc123def456',
      sourceUrl: 'https://github.com/acme/widgets/blob/abc123def456/src/api%20route.ts#L42-L48',
      sourceEvidence: { targetStartLine: 42, content: 'authorize(request);' },
    });
  });

  it('applies repository allowlists to every history read boundary', async () => {
    const statements: { sql: string; values: readonly unknown[] }[] = [];
    const restricted = { ...context, repositoryAllowlist: ['acme/widgets'] };
    const database = databaseFor((sql, values) => {
      statements.push({ sql, values });
      return { rows: [], rowCount: 0 };
    });

    await listRuns(database, restricted, {});
    await listFindings(database, restricted, {});
    await getFindingDetail(database, restricted, '00000000-0000-0000-0000-000000000098');
    await getRunDetail(database, restricted, '00000000-0000-0000-0000-000000000099');
    await listRepositories(database, restricted);
    await listSkills(database, restricted);
    await summarizeOutcomes(database, restricted, {});
    await aggregateCosts(database, restricted, {}, ['repository']);

    expect(statements).toHaveLength(9);
    for (const statement of statements) {
      expect(statement.sql).toContain('full_name = ANY');
      expect(statement.values).toContainEqual(['acme/widgets']);
    }
  });

  it('pre-aggregates summary costs instead of probing usage for every row', async () => {
    const statements: string[] = [];
    const database = databaseFor((sql) => {
      statements.push(sql);
      return { rows: [], rowCount: 0 };
    });

    await listRepositories(database, context);
    await listSkills(database, context);
    await summarizeOutcomes(database, context, {});

    expect(statements[0]).toContain('WITH run_costs AS');
    expect(statements[0]).toContain('LEFT JOIN run_costs costs ON costs.run_id = r.id');
    expect(statements[1]).toContain('WITH skill_costs AS');
    expect(statements[1]).toContain('LEFT JOIN skill_costs costs ON costs.skill_execution_id = se.id');
    expect(statements[2]).toContain('run_costs AS');
    expect(statements[2]).toContain('LEFT JOIN run_costs costs ON costs.run_id = filtered_runs.id');
    expect(statements).not.toEqual(expect.arrayContaining([expect.stringContaining('LEFT JOIN LATERAL')]));
  });

  it('aggregates allowlisted dimensions while keeping unknown cost null', async () => {
    const database = databaseFor((sql) => ({
      rows: sql.includes('GROUP BY') ? [{
        dimension_0: 'acme/widgets',
        dimension_1: 'security',
        runs: 2,
        input_tokens: '120',
        output_tokens: '30',
        cost_usd: null,
      }] : [{
        runs: 2,
        input_tokens: '120',
        output_tokens: '30',
        cost_usd: null,
      }],
      rowCount: 1,
    }));

    const aggregate = await aggregateCosts(database, context, {}, ['repository', 'skill']);

    expect(aggregate.groups[0]).toEqual({
      dimensions: { repository: 'acme/widgets', skill: 'security' },
      runs: 2,
      inputTokens: 120,
      outputTokens: 30,
      costUsd: null,
    });
    expect(aggregate.totals.costUsd).toBeNull();
  });

  it('returns not found for a run ID absent from the authenticated tenant', async () => {
    const database = databaseFor((_sql, values) => {
      expect(values[0]).toBe(context.tenantId);
      return { rows: [], rowCount: 0 };
    });

    await expect(getRunDetail(
      database,
      context,
      '00000000-0000-0000-0000-000000000099',
    )).resolves.toBeNull();
  });
});
