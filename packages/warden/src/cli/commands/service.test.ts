import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reporter } from '../output/index.js';
import { reviewFilePath } from '../inspect/reviews.js';
import { buildReplayEnvelope, runServiceCommand } from './service.js';

const serviceOptions = {
  url: 'https://warden.example.com',
  token: 'warden-test-token',
  data: 'findings' as const,
  memory: false,
  timeoutMs: 1_000,
};

const findingsArtifact = JSON.stringify({
  version: '1',
  timestamp: '2026-08-12T12:00:02.000Z',
  harness: { name: 'warden', version: '0.42.0' },
  repository: { owner: 'acme', name: 'widgets', fullName: 'acme/widgets' },
  event: 'pull_request',
  runId: 'findings-run-123',
  summary: {
    totalFindings: 1,
    findingsBySeverity: { high: 1, medium: 0, low: 0 },
    totalSkills: 1,
  },
  skills: [{
    name: 'security',
    summary: 'One issue found',
    durationMs: 2_000,
    findings: [{
      id: 'finding-1',
      severity: 'high',
      title: 'Unsafe query',
      description: 'Use a parameterized query.',
      location: { path: 'src/query.ts', startLine: 12 },
    }],
  }],
  findingObservations: [],
});

const legacyJsonlArtifact = `${JSON.stringify({
  run: {
    timestamp: '2026-08-12T12:00:00.000Z',
    durationMs: 2_000,
    cwd: '/tmp/acme/widgets',
    runId: 'legacy-run-123',
  },
  skill: 'security',
  summary: 'No issues found',
  findings: [],
})}\n${JSON.stringify({
  run: {
    timestamp: '2026-08-12T12:00:00.000Z',
    durationMs: 2_000,
    cwd: '/tmp/acme/widgets',
    runId: 'legacy-run-123',
  },
  type: 'summary',
  totalFindings: 0,
  bySeverity: { high: 0, medium: 0, low: 0 },
})}\n`;

function reporter() {
  return {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  } as unknown as Reporter;
}

describe('service replay', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'warden-service-replay-'));
    vi.stubEnv('WARDEN_SERVICE_URL', '');
    vi.stubEnv('WARDEN_SERVICE_TOKEN', 'warden-test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    rmSync(testDir, { recursive: true, force: true });
  });

  it('normalizes findings output and legacy JSONL with their original run IDs', () => {
    const findings = buildReplayEnvelope(findingsArtifact, serviceOptions, join(testDir, 'findings.json'));
    const legacy = buildReplayEnvelope(legacyJsonlArtifact, serviceOptions, join(testDir, 'legacy.jsonl'));

    expect(findings).toMatchObject({
      clientRunId: 'findings-run-123',
      source: 'replay',
      dataProfile: 'findings',
      repository: { provider: 'github', fullName: 'acme/widgets' },
    });
    if (findings.dataProfile !== 'findings') throw new Error('Expected findings replay envelope');
    expect(findings.findings[0]).toMatchObject({ title: 'Unsafe query' });
    expect(legacy).toMatchObject({
      clientRunId: 'legacy-run-123',
      source: 'replay',
      dataProfile: 'findings',
    });
  });

  it('normalizes legacy oversized trigger IDs and skill-scoped duplicate finding IDs', () => {
    const artifact = JSON.parse(findingsArtifact) as {
      skills: (Record<string, unknown> & { findings: Record<string, unknown>[] })[];
      summary: Record<string, unknown>;
    };
    const baseSkill = artifact.skills[0];
    if (!baseSkill) throw new Error('Expected a skill fixture');
    artifact.skills = [
      {
        ...baseSkill,
        findings: [...baseSkill.findings, ...baseSkill.findings],
        skillExecutionId: 'execution-a',
        triggerId: 'a'.repeat(180),
      },
      { ...baseSkill, findings: baseSkill.findings, name: 'corroborating-security', skillExecutionId: 'execution-b' },
    ];
    artifact.summary = {
      totalFindings: 3,
      findingsBySeverity: { high: 3, medium: 0, low: 0 },
      totalSkills: 2,
    };

    const envelope = buildReplayEnvelope(JSON.stringify(artifact), serviceOptions, join(testDir, 'legacy-findings.json'));

    if (envelope.dataProfile !== 'findings') throw new Error('Expected findings replay envelope');
    expect(envelope.skills[0]?.triggerId).toHaveLength(128);
    expect(new Set(envelope.findings.map((finding) => finding.id)).size).toBe(3);
    expect(envelope.findings.map((finding) => finding.reportedId)).toEqual([
      'finding-1',
      'finding-1',
      'finding-1',
    ]);
  });

  it('publishes idempotently without changing the saved artifact', async () => {
    const artifactPath = join(testDir, 'findings.json');
    writeFileSync(artifactPath, findingsArtifact);
    const output = reporter();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      protocolVersion: 1,
      runId: 'stored-run-123',
      checksum: 'a'.repeat(64),
      created: true,
    }));

    await expect(runServiceCommand(
      { subcommand: 'replay', artifact: artifactPath },
      { serviceUrl: serviceOptions.url } as never,
      output,
    )).resolves.toBe(0);

    expect(readFileSync(artifactPath, 'utf8')).toBe(findingsArtifact);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(new Headers(request?.headers).get('idempotency-key')).toBe('findings-run-123');
    expect(JSON.parse(String(request?.body))).toMatchObject({
      clientRunId: 'findings-run-123',
      source: 'replay',
    });
    expect(output.success).toHaveBeenCalledWith('Published run findings-run-123.');
  });

  it('uses explicit replay settings when warden.toml cannot be read', async () => {
    const artifactPath = join(testDir, 'findings.json');
    writeFileSync(artifactPath, findingsArtifact);
    writeFileSync(join(testDir, 'warden.toml'), 'not valid toml = [');
    vi.spyOn(process, 'cwd').mockReturnValue(testDir);
    const output = reporter();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      protocolVersion: 1,
      runId: 'stored-run-123',
      checksum: 'a'.repeat(64),
      created: true,
    }));

    await expect(runServiceCommand(
      { subcommand: 'replay', artifact: artifactPath },
      { serviceUrl: serviceOptions.url } as never,
      output,
    )).resolves.toBe(0);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(output.warning).toHaveBeenCalledWith(
      'Could not read warden.toml. Replaying with the command-line service settings.',
    );
  });

  it('rejects an unsupported artifact before publication', async () => {
    const artifactPath = join(testDir, 'invalid.json');
    writeFileSync(artifactPath, '{"not":"a completed run"}');
    const output = reporter();
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(runServiceCommand(
      { subcommand: 'replay', artifact: artifactPath },
      { serviceUrl: serviceOptions.url } as never,
      output,
    )).resolves.toBe(1);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(output.error).toHaveBeenCalledWith('Artifact is not a supported completed JSONL or findings-output file.');
  });

  it('requires explicit service configuration', async () => {
    const artifactPath = join(testDir, 'findings.json');
    writeFileSync(artifactPath, findingsArtifact);
    const output = reporter();

    await expect(runServiceCommand(
      { subcommand: 'replay', artifact: artifactPath },
      {} as never,
      output,
    )).resolves.toBe(1);

    expect(output.error).toHaveBeenCalledWith('Warden service is not configured for replay.');
  });

  it('reports publication failure without changing the artifact', async () => {
    const artifactPath = join(testDir, 'legacy.jsonl');
    writeFileSync(artifactPath, legacyJsonlArtifact);
    const output = reporter();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('private response body'));

    await expect(runServiceCommand(
      { subcommand: 'replay', artifact: artifactPath },
      { serviceUrl: serviceOptions.url, serviceTimeoutMs: 500 } as never,
      output,
    )).resolves.toBe(1);

    expect(readFileSync(artifactPath, 'utf8')).toBe(legacyJsonlArtifact);
    expect(output.warning).toHaveBeenCalledWith(
      'Warden service could not publish run legacy-run-123. Local results are unchanged.',
    );
  });

  it('publishes the run then pushes an existing sidecar (ISC-9)', async () => {
    const artifactPath = join(testDir, 'findings.json');
    writeFileSync(artifactPath, findingsArtifact);
    mkdirSync(join(testDir, '.warden', 'reviews'), { recursive: true });
    writeFileSync(
      reviewFilePath(testDir, 'findings-run-123'),
      JSON.stringify({
        schemaVersion: 2,
        runId: 'findings-run-123',
        logPath: artifactPath,
        updatedAt: '2026-08-19T10:00:00.000Z',
        reviews: {
          'security:finding-1:1': {
            findingId: 'finding-1',
            skill: 'security',
            occurrence: 1,
            verdict: 'false_positive',
            comment: 'test fixture, not a real leak',
            updatedAt: '2026-08-19T10:00:00.000Z',
          },
        },
      }) + '\n',
    );
    vi.spyOn(process, 'cwd').mockReturnValue(testDir);
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);
    const output = reporter();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/api/v1/runs/findings-run-123/reviews')) {
        return Response.json({
          runId: 'stored-run-123',
          clientRunId: 'findings-run-123',
          applied: 1,
          unmatched: [],
        });
      }
      return Response.json({
        protocolVersion: 1,
        runId: 'stored-run-123',
        checksum: 'a'.repeat(64),
        created: true,
      });
    });

    await expect(runServiceCommand(
      { subcommand: 'replay', artifact: artifactPath },
      { serviceUrl: serviceOptions.url } as never,
      output,
    )).resolves.toBe(0);

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls).toEqual([
      'https://warden.example.com/api/v1/runs',
      'https://warden.example.com/api/v1/runs/findings-run-123/reviews',
    ]);
    const reviewsBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(reviewsBody).toEqual({
      reviews: [{
        skill: 'security',
        findingId: 'finding-1',
        occurrence: 1,
        verdict: 'false_positive',
        comment: 'test fixture, not a real leak',
        updatedAt: '2026-08-19T10:00:00.000Z',
      }],
    });
    expect(output.success).toHaveBeenCalledWith('Published run findings-run-123.');
  });

  it('does not push reviews when run publish fails', async () => {
    const artifactPath = join(testDir, 'findings.json');
    writeFileSync(artifactPath, findingsArtifact);
    mkdirSync(join(testDir, '.warden', 'reviews'), { recursive: true });
    writeFileSync(
      reviewFilePath(testDir, 'findings-run-123'),
      JSON.stringify({
        schemaVersion: 2,
        runId: 'findings-run-123',
        logPath: artifactPath,
        updatedAt: '2026-08-19T10:00:00.000Z',
        reviews: {
          'security:finding-1:1': {
            findingId: 'finding-1',
            skill: 'security',
            occurrence: 1,
            verdict: 'true_positive',
            comment: '',
            updatedAt: '2026-08-19T10:00:00.000Z',
          },
        },
      }) + '\n',
    );
    vi.spyOn(process, 'cwd').mockReturnValue(testDir);
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);
    const output = reporter();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('private response body'));

    await expect(runServiceCommand(
      { subcommand: 'replay', artifact: artifactPath },
      { serviceUrl: serviceOptions.url, serviceTimeoutMs: 500 } as never,
      output,
    )).resolves.toBe(1);

    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes('/reviews'))).toBe(true);
  });
});
