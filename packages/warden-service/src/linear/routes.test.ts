import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createWardenService } from '../app.js';
import type { ServiceContext } from '../context.js';
import type { DatabaseClient, WardenDatabase } from '../db/database.js';
import type { LinearOptions } from './client.js';

const tenantId = '00000000-0000-4000-8000-000000000001';
const findingId = '00000000-0000-4000-8000-000000000020';
const teamId = '00000000-0000-4000-8000-000000000030';
const origin = 'https://warden.example';
const path = `${origin}/api/v1/findings/${findingId}/linear-issue`;
const authority: ServiceContext = {
  tenantId, tokenId: null, roles: ['read'], repositoryAllowlist: null,
  credentialKind: 'browser', principalSubject: 'browser:engineer',
};
// Sanitized finding row from the history integration scenarios, in selected-column order.
const finding = {
  id: findingId, client_finding_id: 'finding-20', display_id: '7MV-5V7-2',
  run_id: '00000000-0000-4000-8000-000000000021', client_run_id: 'run-21',
  head_sha: 'abc123def456', source_evidence: null,
  verification: 'The route reads an account before checking the caller.',
  provider: 'github', owner: 'acme', name: 'widgets', full_name: 'acme/widgets',
  skill: 'security-review', primary_model: 'example-model', severity: 'high', confidence: 'high',
  title: 'Missing authorization & ownership check', description: 'The endpoint does not verify ownership.',
  path: 'src/api route.ts', start_line: 42, end_line: 48,
  observation_outcome: 'posted', observation_reason: null,
  first_observed_at: '2026-08-12T09:55:00.000Z', last_observed_at: '2026-08-12T10:02:00.000Z',
  completed_at: '2026-08-12T10:01:00.000Z',
};
const issue = {
  id: findingId, identifier: 'SEC-123',
  url: 'https://linear.app/acme/issue/SEC-123/missing-authorization',
};
const linear: LinearOptions = { apiKey: 'linear-server-secret', teamId, tenantId, baseUrl: origin };
const requestSchema = z.object({ query: z.string(), variables: z.record(z.string(), z.unknown()) });
const json = (body: unknown) => new Response(JSON.stringify(body), {
  headers: { 'content-type': 'application/json' },
});

function fixtureDatabase(rows: Record<string, unknown>[] = [finding]): WardenDatabase {
  const client: DatabaseClient = {
    async query<TRow extends Record<string, unknown>>() {
      return { rows: rows as TRow[], rowCount: rows.length };
    },
  };
  return {
    ...client, driver: 'postgres', maxConnections: 1, statementTimeoutMs: 15_000,
    async withClient(operation) { return operation(client); },
    async transaction(operation) { return operation(client); },
    async close() { return undefined; },
  };
}

function appFor(
  fetcher: typeof fetch,
  context: ServiceContext | null = authority,
  database = fixtureDatabase(),
): ReturnType<typeof createWardenService> {
  return createWardenService({
    database, linear: { ...linear, fetch: fetcher }, sessionOrigin: origin,
    dashboardAuth: { async authenticate() { return context; } },
  });
}

describe('finding Linear routes', () => {
  it('creates a ticket from the stored finding using server credentials', async () => {
    const inputs: unknown[] = [];
    const fetcher = vi.fn<typeof fetch>(async (url, init) => {
      expect(url).toBe('https://api.linear.app/graphql');
      expect(init?.headers).toMatchObject({ authorization: linear.apiKey });
      const request = requestSchema.parse(JSON.parse(String(init?.body)));
      if (request.query.includes('mutation')) {
        inputs.push(request.variables['input']);
        return json({ data: { issueCreate: { success: true, issue } } });
      }
      return json({ data: { issues: { nodes: [] } } });
    });
    const response = await appFor(fetcher).request(path, {
      method: 'POST', headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ teamId: 'attacker-team', title: 'Untrusted browser title' }),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ enabled: true, issue });
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({ id: findingId, teamId, title: finding.title });
    const { description } = z.object({ description: z.string() }).parse(inputs[0]);
    expect(description).toContain(finding.description);
    expect(description).toContain(`## Evidence\n\n${finding.verification}`);
    expect(description).toContain(`${origin}/findings/${finding.display_id}`);
    expect(description).toContain('- Location: src/api route.ts:42-48');
    expect(description).toContain('https://github.com/acme/widgets/blob/abc123def456/src/api%20route.ts#L42-L48');
  });

  it('recovers a lost creation response and reuses the ticket on later requests', async () => {
    let created = false;
    let mutations = 0;
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      const { query, variables } = requestSchema.parse(JSON.parse(String(init?.body)));
      if (query.includes('mutation')) {
        mutations += 1;
        expect(variables['input']).toMatchObject({ id: findingId });
        created = true;
        throw new Error('Connection lost after Linear saved the issue');
      }
      expect(variables['filter']).toEqual({ id: { eq: findingId } });
      return json({ data: { issues: { nodes: created ? [issue] : [] } } });
    });
    const app = appFor(fetcher);
    for (const method of ['POST', 'GET', 'POST']) {
      const response = await app.request(path, { method, headers: { origin } });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ enabled: true, issue });
    }
    expect(mutations).toBe(1);
  });

  it('creates a ticket for an older finding without evidence or source context', async () => {
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      const { query, variables } = requestSchema.parse(JSON.parse(String(init?.body)));
      if (!query.includes('mutation')) return json({ data: { issues: { nodes: [] } } });
      const { description } = z.object({ description: z.string() }).parse(variables['input']);
      expect(description).toContain(finding.description);
      expect(description).not.toMatch(/## Evidence|- Location:|- Source:|- Commit:|undefined/);
      return json({ data: { issueCreate: { success: true, issue } } });
    });
    const database = fixtureDatabase([{ ...finding, path: null, start_line: null, end_line: null, head_sha: null, verification: null }]);
    const response = await appFor(fetcher, authority, database).request(path, { method: 'POST', headers: { origin } });
    expect(response.status).toBe(200);
  });

  it('rejects unauthorized requests before contacting Linear', async () => {
    const fetcher = vi.fn<typeof fetch>();
    expect((await appFor(fetcher, null).request(path, { method: 'POST', headers: { origin } })).status).toBe(401);
    for (const context of [
      { ...authority, tenantId: '00000000-0000-4000-8000-000000000099' },
      { ...authority, credentialKind: 'service' as const },
    ]) {
      expect((await appFor(fetcher, context).request(path, { method: 'POST', headers: { origin } })).status).toBe(403);
    }
    const app = appFor(fetcher);
    for (const headers of [{}, { origin: 'https://attacker.example' }]) {
      expect((await app.request(path, { method: 'POST', headers })).status).toBe(403);
    }
    expect((await appFor(fetcher, authority, fixtureDatabase([])).request(path, { method: 'POST', headers: { origin } })).status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('supports private deployments and hides the action without configuration', async () => {
    const database = fixtureDatabase();
    const disabled = createWardenService({ database, disableAuth: { tenantId }, sessionOrigin: origin });
    await expect((await disabled.request(path)).json()).resolves.toEqual({ enabled: false, issue: null });
    expect((await disabled.request(path, { method: 'POST', headers: { origin } })).status).toBe(503);

    const fetcher = vi.fn<typeof fetch>(async () => json({ data: { issues: { nodes: [issue] } } }));
    const privateApp = createWardenService({
      database, disableAuth: { tenantId }, sessionOrigin: origin, linear: { ...linear, fetch: fetcher },
    });
    await expect((await privateApp.request(path, { method: 'POST', headers: { origin } })).json())
      .resolves.toEqual({ enabled: true, issue });
  });

  it('hides provider error details even when Linear returns HTTP 200', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json({
      errors: [{ message: `Private provider response: ${linear.apiKey}`, extensions: { code: 'FORBIDDEN' } }],
    }));
    const response = await appFor(fetcher).request(path, { method: 'POST', headers: { origin } });
    expect(response.status).toBe(502);
    expect(await response.text()).toBe(JSON.stringify({ error: { code: 'linear_error', message: 'Could not reach Linear. Try again.' } }));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
