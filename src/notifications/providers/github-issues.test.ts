import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Octokit } from '@octokit/rest';
import type { Finding } from '../../types/index.js';
import type { NotificationContext } from '../types.js';
import {
  GitHubIssuesProvider,
  generateIssueHash,
  generateIssueMarker,
  parseIssueMarker,
} from './github-issues.js';

// Mock Haiku to avoid real API calls
vi.mock('../../sdk/haiku.js', () => ({
  callHaiku: vi.fn(() => Promise.resolve({ success: true, data: [], usage: {} })),
}));

import { callHaiku } from '../../sdk/haiku.js';
const mockCallHaiku = vi.mocked(callHaiku);

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'f1',
    severity: 'high',
    title: 'SQL injection vulnerability',
    description: 'Unsanitized user input in query builder',
    location: { path: 'src/db/query.ts', startLine: 42 },
    ...overrides,
  };
}

function makeContext(overrides: Partial<NotificationContext> = {}): NotificationContext {
  return {
    findings: [makeFinding()],
    reports: [],
    repository: { owner: 'test-owner', name: 'test-repo' },
    commitSha: 'abc123def456',
    skillName: 'security-audit',
    ...overrides,
  };
}

function createMockOctokit(existingIssues: unknown[] = []): Octokit {
  return {
    issues: {
      listForRepo: vi.fn(() => Promise.resolve({ data: existingIssues })),
      create: vi.fn(() => Promise.resolve({ data: { number: 1, html_url: 'https://example.com/1' } })),
      getLabel: vi.fn(() => Promise.reject(new Error('Not found'))),
      createLabel: vi.fn(() => Promise.resolve({ data: {} })),
    },
  } as unknown as Octokit;
}

describe('generateIssueHash', () => {
  it('generates consistent hash for same input', () => {
    const hash1 = generateIssueHash('title', 'desc');
    const hash2 = generateIssueHash('title', 'desc');
    expect(hash1).toBe(hash2);
  });

  it('generates different hash for different input', () => {
    const hash1 = generateIssueHash('title1', 'desc');
    const hash2 = generateIssueHash('title2', 'desc');
    expect(hash1).not.toBe(hash2);
  });

  it('returns 16-char hex string', () => {
    const hash = generateIssueHash('title', 'desc');
    expect(hash).toMatch(/^[a-f0-9]{16}$/);
  });
});

describe('generateIssueMarker / parseIssueMarker', () => {
  it('round-trips marker', () => {
    const hash = 'abcdef0123456789';
    const marker = generateIssueMarker(hash);
    expect(parseIssueMarker(marker)).toBe(hash);
  });

  it('returns null for body without marker', () => {
    expect(parseIssueMarker('some body text')).toBeNull();
  });
});

describe('GitHubIssuesProvider', () => {
  let mockOctokit: Octokit;

  beforeEach(() => {
    vi.resetAllMocks();
    mockOctokit = createMockOctokit();
    mockCallHaiku.mockResolvedValue({ success: true, data: [], usage: {} as never });
  });

  function createProvider(octokit?: Octokit) {
    return new GitHubIssuesProvider({
      config: { type: 'github-issues', labels: ['warden'] },
      octokit: octokit ?? mockOctokit,
      apiKey: 'test-key',
    });
  }

  it('creates issue for new finding', async () => {
    const provider = createProvider();
    const result = await provider.notify(makeContext());

    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([]);
    expect(vi.mocked(mockOctokit.issues.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'test-owner',
        repo: 'test-repo',
        title: '[Warden] SQL injection vulnerability',
        labels: ['warden', 'warden:security-audit'],
      })
    );
  });

  it('skips creating issue when hash matches existing open issue', async () => {
    const finding = makeFinding();
    const hash = generateIssueHash(finding.title, finding.description);
    const existingIssue = {
      number: 42,
      title: '[Warden] SQL injection vulnerability',
      body: `Some body\n${generateIssueMarker(hash)}`,
      state: 'open',
      labels: [{ name: 'warden' }],
    };

    mockOctokit = createMockOctokit([existingIssue]);
    const provider = createProvider(mockOctokit);
    const result = await provider.notify(makeContext({ findings: [finding] }));

    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
    expect(vi.mocked(mockOctokit.issues.create)).not.toHaveBeenCalled();
  });

  it('skips creating issue when hash matches closed false-positive', async () => {
    const finding = makeFinding();
    const hash = generateIssueHash(finding.title, finding.description);
    const closedIssue = {
      number: 99,
      title: '[Warden] SQL injection vulnerability',
      body: `Some body\n${generateIssueMarker(hash)}`,
      state: 'closed',
      labels: [{ name: 'warden' }, { name: 'warden:false-positive' }],
    };

    // listForRepo is called twice: once for open, once for closed
    vi.mocked(mockOctokit.issues.listForRepo)
      .mockResolvedValueOnce({ data: [] } as never)
      .mockResolvedValueOnce({ data: [closedIssue] } as never);

    const provider = createProvider(mockOctokit);
    const result = await provider.notify(makeContext({ findings: [finding] }));

    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it('skips finding when semantic match found via Haiku', async () => {
    const existingIssue = {
      number: 10,
      title: '[Warden] SQL injection risk',
      body: `Body\n<!-- warden:issue:different_hash_1 -->`,
      state: 'open',
      labels: [{ name: 'warden' }],
    };

    vi.mocked(mockOctokit.issues.listForRepo)
      .mockResolvedValueOnce({ data: [existingIssue] } as never)
      .mockResolvedValueOnce({ data: [] } as never);

    // Haiku says finding 1 matches issue 1
    mockCallHaiku.mockResolvedValue({
      success: true,
      data: [{ findingIndex: 1, issueIndex: 1 }],
      usage: {} as never,
    });

    const provider = createProvider(mockOctokit);
    const result = await provider.notify(makeContext());

    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it('returns empty result when no findings', async () => {
    const provider = createProvider();
    const result = await provider.notify(makeContext({ findings: [] }));

    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(0);
    expect(vi.mocked(mockOctokit.issues.listForRepo)).not.toHaveBeenCalled();
  });

  it('reports errors when issue creation fails', async () => {
    vi.mocked(mockOctokit.issues.create).mockRejectedValue(new Error('Rate limited'));

    const provider = createProvider();
    const result = await provider.notify(makeContext());

    expect(result.sent).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Rate limited');
  });

  it('creates issues for multiple new findings', async () => {
    const findings = [
      makeFinding({ id: 'f1', title: 'Bug 1' }),
      makeFinding({ id: 'f2', title: 'Bug 2' }),
    ];

    const provider = createProvider();
    const result = await provider.notify(makeContext({ findings }));

    expect(result.sent).toBe(2);
    expect(vi.mocked(mockOctokit.issues.create)).toHaveBeenCalledTimes(2);
  });

  it('issue body contains severity, description, location link, and hash marker', async () => {
    const provider = createProvider();
    await provider.notify(makeContext());

    const createCall = vi.mocked(mockOctokit.issues.create).mock.calls[0]?.[0];
    const body = createCall?.body as string;

    expect(body).toContain('**Severity:** high');
    expect(body).toContain('`security-audit`');
    expect(body).toContain('src/db/query.ts');
    expect(body).toContain('<!-- warden:issue:');
    expect(body).toContain('Generated by [Warden]');
  });
});
