import { describe, expect, it } from 'vitest';
import type { ServiceContext } from '../context.js';
import type { QueryResult, WardenDatabase } from '../db/database.js';
import {
  aggregateCostBreakdowns,
  aggregateCosts,
  getFindingDetail,
  getRunDetail,
  listFindings,
  listHistoryDimensions,
  listRepositories,
  listRuns,
  listSkills,
  summarizeDashboard,
  summarizeOutcomes,
} from './store.js';

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
      started_at: '2026-08-12T10:00:00.000Z',
      completed_at: completedAt,
      outcome: 'success',
      finding_count: 0,
      high_count: 0,
      medium_count: 0,
      low_count: 0,
      trace_id: null,
      provider: 'github',
      owner: 'acme',
      name: 'widgets',
      full_name: 'acme/widgets',
      cost_usd: null,
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
    expect(seen[0]?.sql).toContain('"runs"."tenant_id" = $1');
    expect(seen[0]?.values).toContain(context.tenantId);
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

    expect(captured?.sql).toContain('"runs"."tenant_id" = $1');
    expect(captured?.sql).toContain('exists (select 1 from "usage_line_items" "filtered_usage"');
    expect(captured?.sql).toContain('inner join "skill_executions" "filtered_se"');
    expect(captured?.sql).toContain('"filtered_se"."id" = "filtered_usage"."skill_execution_id"');
    expect(captured?.sql).not.toContain('left join "usage_line_items"');
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

    expect(statements).toHaveLength(3);
    for (const sql of statements) {
      expect(sql).toContain('exists (select 1 from "skill_executions" "filtered_se"');
      expect(sql).toContain('"filtered_se"."skill" =');
      expect(sql).toContain('"filtered_se"."error_code" =');
      expect(sql).not.toContain('"filtered_se"."id" = "usage_line_items"."skill_execution_id"');
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
        first_observed_at: '2026-08-12T10:00:00.000Z',
        last_observed_at: '2026-08-12T10:02:00.000Z',
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
      firstObservedAt: '2026-08-12T10:00:00.000Z',
      lastObservedAt: '2026-08-12T10:02:00.000Z',
    });
    expect(captured?.sql).toContain('from "runs" inner join "findings"');
    expect(captured?.sql).toContain('"findings"."run_id" = "runs"."id"');
    expect(captured?.sql).toContain('"runs"."tenant_id" =');
    expect(captured?.sql).toContain('POSITION(');
    expect(captured?.sql).toContain('left join lateral');
    expect(captured?.values).toEqual(expect.arrayContaining([
      context.tenantId,
      'security-review',
      'high',
      'posted',
      'authorization',
    ]));
  });

  it('preserves duplicate observation timestamp columns returned by PostgreSQL', async () => {
    const rowValues = [
      '00000000-0000-0000-0000-000000000020',
      '7MV-5V7',
      null,
      '00000000-0000-0000-0000-000000000021',
      'run-21',
      'github',
      'acme',
      'widgets',
      'acme/widgets',
      'security-review',
      'high',
      'high',
      'Missing authorization check',
      'The endpoint does not verify ownership.',
      'src/api.ts',
      42,
      48,
      'posted',
      '2026-08-12T10:00:00.000Z',
      '2026-08-12T10:02:00.000Z',
      '2026-08-12T10:01:00.000Z',
    ];
    let capturedSql = '';
    const database = {
      async query(sql: string) {
        capturedSql = sql;
        const timestamps = sql.includes('as "first_observed_at"')
          && sql.includes('as "last_observed_at"')
          ? {
              first_observed_at: rowValues[18],
              last_observed_at: rowValues[19],
            }
          : { observed_at: rowValues[19] };
        return {
          rows: [{
            id: rowValues[0],
            client_finding_id: rowValues[1],
            reported_id: rowValues[2],
            run_id: rowValues[3],
            client_run_id: rowValues[4],
            provider: rowValues[5],
            owner: rowValues[6],
            name: rowValues[7],
            full_name: rowValues[8],
            skill: rowValues[9],
            severity: rowValues[10],
            confidence: rowValues[11],
            title: rowValues[12],
            description: rowValues[13],
            path: rowValues[14],
            start_line: rowValues[15],
            end_line: rowValues[16],
            observation_outcome: rowValues[17],
            ...timestamps,
            completed_at: rowValues[20],
          }],
          rowCount: 1,
        };
      },
    } as unknown as WardenDatabase;

    const page = await listFindings(database, context, {});

    expect(page.items[0]).toMatchObject({
      firstObservedAt: '2026-08-12T10:00:00.000Z',
      lastObservedAt: '2026-08-12T10:02:00.000Z',
      completedAt: '2026-08-12T10:01:00.000Z',
    });
    expect(capturedSql).toContain('as "first_observed_at"');
    expect(capturedSql).toContain('as "last_observed_at"');
  });

  it('returns source and verification context with the latest finding observation', async () => {
    let detailSql = '';
    const database = databaseFor((sql) => {
      detailSql = sql;
      return {
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
          verification: 'The route reads an account before checking the caller.',
          provider: 'github', owner: 'acme', name: 'widgets', full_name: 'acme/widgets',
          skill: 'security-review', severity: 'high', confidence: 'high',
          title: 'Missing authorization check', description: 'The endpoint does not verify ownership.',
          path: 'src/api route.ts', start_line: 42, end_line: 48,
          observation_outcome: 'posted',
          first_observed_at: '2026-08-12T09:55:00.000Z',
          last_observed_at: '2026-08-12T10:02:00.000Z',
          completed_at: '2026-08-12T10:01:00.000Z',
        }],
        rowCount: 1,
      };
    });

    await expect(getFindingDetail(
      database,
      context,
      '00000000-0000-0000-0000-000000000020',
    )).resolves.toMatchObject({
      headSha: 'abc123def456',
      sourceUrl: 'https://github.com/acme/widgets/blob/abc123def456/src/api%20route.ts#L42-L48',
      sourceEvidence: { targetStartLine: 42, content: 'authorize(request);' },
      verification: 'The route reads an account before checking the caller.',
      finding: {
        firstObservedAt: '2026-08-12T09:55:00.000Z',
        lastObservedAt: '2026-08-12T10:02:00.000Z',
      },
    });
    expect(detailSql).toContain(
      'order by "finding_observations"."observed_at" desc, "finding_observations"."id" desc limit',
    );
    expect(detailSql).toContain(
      'order by "finding_observations"."observed_at" asc, "finding_observations"."id" asc limit',
    );
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
    await listHistoryDimensions(database, restricted);
    await summarizeOutcomes(database, restricted, {});
    await summarizeDashboard(database, restricted, {});
    await aggregateCosts(database, restricted, {}, ['repository']);

    expect(statements).toHaveLength(19);
    for (const statement of statements) {
      expect(statement.sql).toContain('"full_name" in');
      expect(statement.values).toContain('acme/widgets');
    }
  });

  it('uses narrow indexable aggregates instead of tenant-wide cost CTEs', async () => {
    const statements: string[] = [];
    const database = databaseFor((sql) => {
      statements.push(sql);
      return { rows: [], rowCount: 0 };
    });

    await listRepositories(database, context);
    await listSkills(database, context);
    await summarizeOutcomes(database, context, {});

    expect(statements).toHaveLength(7);
    expect(statements).not.toEqual(expect.arrayContaining([
      expect.stringContaining('with "run_costs" as'),
      expect.stringContaining('with "skill_costs" as'),
      expect.stringContaining('select distinct'),
    ]));
    expect(statements).toEqual(expect.arrayContaining([
      expect.stringContaining('from "runs" where "runs"."tenant_id" = $1 group by "runs"."repository_id"'),
      expect.stringContaining('from "usage_line_items" inner join "runs"'),
      expect.stringContaining('from "skill_executions" where "skill_executions"."tenant_id" = $1 group by "skill_executions"."skill"'),
      expect.stringContaining('from "usage_line_items" inner join "skill_executions"'),
    ]));
  });

  it('aggregates allowlisted dimensions while keeping unknown cost null', async () => {
    const database = databaseFor((sql) => ({
      rows: sql.includes('group by') ? [{
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

  it('loads filter dimensions without running summary aggregations', async () => {
    const statements: string[] = [];
    const database = databaseFor((sql) => {
      statements.push(sql);
      if (sql.includes('select distinct')) {
        return { rows: [{ skill: 'security' }], rowCount: 1 };
      }
      return { rows: [{
        id: '00000000-0000-0000-0000-000000000010',
        provider: 'github',
        owner: 'acme',
        name: 'widgets',
        fullName: 'acme/widgets',
      }], rowCount: 1 };
    });

    await expect(listHistoryDimensions(database, context)).resolves.toEqual({
      repositories: [{
        id: '00000000-0000-0000-0000-000000000010',
        repository: { provider: 'github', owner: 'acme', name: 'widgets', fullName: 'acme/widgets' },
      }],
      skills: ['security'],
    });
    expect(statements).toHaveLength(2);
    const skillStatement = statements.find((statement) => statement.includes('select distinct'));
    expect(skillStatement).not.toContain('join "runs"');
    expect(skillStatement).not.toContain('join "repositories"');
    expect(statements).not.toEqual(expect.arrayContaining([
      expect.stringContaining('SUM('),
      expect.stringContaining('COUNT('),
      expect.stringContaining('usage_line_items'),
    ]));
  });

  it('loads independent cost breakdowns without unused total queries', async () => {
    const statements: string[] = [];
    const database = databaseFor((sql) => {
      statements.push(sql);
      const dimension = sql.includes("date_trunc('day'")
        ? '2026-08-15'
        : sql.includes('"repositories"."full_name" as "dimension_0"')
          ? 'acme/widgets'
          : 'security';
      return {
        rows: [{
          dimension_0: dimension,
          runs: 2, input_tokens: '120', output_tokens: '30', cost_usd: '0.01',
        }],
        rowCount: 1,
      };
    });

    const response = await aggregateCostBreakdowns(database, context, {}, ['day', 'repository', 'skill']);

    expect(response.breakdowns.map((item) => item.dimension)).toEqual(['day', 'repository', 'skill']);
    expect(response.breakdowns.map((item) => item.groups[0]?.dimensions)).toEqual([
      { day: '2026-08-15' },
      { repository: 'acme/widgets' },
      { skill: 'security' },
    ]);
    expect(statements).toHaveLength(3);
    expect(statements).not.toEqual(expect.arrayContaining([expect.stringContaining('GROUPING SETS')]));
    const day = statements.find((statement) => statement.includes("date_trunc('day'"));
    const repository = statements.find((statement) => statement.includes('"repositories"."full_name" as "dimension_0"'));
    const skill = statements.find((statement) => statement.includes('"skill_executions"."skill"'));
    expect(day).not.toContain('join "repositories"');
    expect(day).not.toContain('join "skill_executions"');
    expect(repository).toContain('join "repositories"');
    expect(repository).not.toContain('join "skill_executions"');
    expect(skill).toContain('join "skill_executions"');
    expect(skill).not.toContain('join "repositories"');
  });

  it('loads dashboard costs without calculating unused usage totals', async () => {
    const statements: string[] = [];
    const database = databaseFor((sql) => {
      statements.push(sql);
      if (sql.includes('COUNT(*)')) {
        return { rows: [{
          runs: 3,
          successful: 2,
          failed: 1,
          cancelled: 0,
          skipped: 0,
          findings: 4,
        }], rowCount: 1 };
      }
      const dimension = sql.includes("date_trunc('day'")
        ? '2026-08-15'
        : sql.includes('"repositories"."full_name" as "dimension_0"')
          ? 'acme/widgets'
          : 'security';
      return {
        rows: [{ dimension_0: dimension, cost_usd: '0.01' }],
        rowCount: 1,
      };
    });

    const response = await summarizeDashboard(database, context, {});

    expect(response.totals).toEqual({
      runs: 3,
      successful: 2,
      failed: 1,
      cancelled: 0,
      skipped: 0,
      findings: 4,
      costUsd: 0.01,
    });
    expect(response.breakdowns.map((item) => item.groups[0])).toEqual([
      { dimensions: { day: '2026-08-15' }, costUsd: 0.01 },
      { dimensions: { repository: 'acme/widgets' }, costUsd: 0.01 },
      { dimensions: { skill: 'security' }, costUsd: 0.01 },
    ]);
    expect(statements).toHaveLength(4);
    const costStatements = statements.filter((statement) => statement.includes('from "usage_line_items"'));
    expect(costStatements).toHaveLength(3);
    for (const statement of costStatements) {
      expect(statement).toContain('SUM("usage_line_items"."cost_usd")');
      expect(statement).not.toContain('input_tokens');
      expect(statement).not.toContain('output_tokens');
      expect(statement).not.toContain('COUNT(DISTINCT');
    }
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
