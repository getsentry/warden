import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Finding } from '../../types/index.js';
import type { NotificationContext } from '../types.js';
import { SlackProvider, buildSlackPayload } from './slack.js';

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

describe('buildSlackPayload', () => {
  it('includes header with finding count', () => {
    const payload = buildSlackPayload(makeContext());
    const blocks = payload['blocks'] as Record<string, unknown>[];
    const header = blocks[0] as Record<string, unknown>;
    const text = header['text'] as Record<string, string>;
    expect(text['text']).toBe('Warden: 1 finding');
  });

  it('pluralizes findings correctly', () => {
    const ctx = makeContext({ findings: [makeFinding({ id: 'f1' }), makeFinding({ id: 'f2' })] });
    const payload = buildSlackPayload(ctx);
    const blocks = payload['blocks'] as Record<string, unknown>[];
    const header = blocks[0] as Record<string, unknown>;
    const text = header['text'] as Record<string, string>;
    expect(text['text']).toBe('Warden: 2 findings');
  });

  it('includes repo, commit, and skill fields', () => {
    const payload = buildSlackPayload(makeContext());
    const blocks = payload['blocks'] as Record<string, unknown>[];
    const section = blocks[1] as Record<string, unknown>;
    const fields = section['fields'] as Record<string, string>[];
    const texts = fields.map((f) => f['text']);

    expect(texts).toContainEqual(expect.stringContaining('test-owner/test-repo'));
    expect(texts).toContainEqual(expect.stringContaining('abc123d'));
    expect(texts).toContainEqual(expect.stringContaining('security-audit'));
  });

  it('caps displayed findings at 10', () => {
    const findings = Array.from({ length: 15 }, (_, i) =>
      makeFinding({ id: `f${i}`, title: `Bug ${i}` })
    );
    const payload = buildSlackPayload(makeContext({ findings }));
    const blocks = payload['blocks'] as Record<string, unknown>[];

    // header + section + divider + 10 findings + overflow context = 14
    expect(blocks).toHaveLength(14);

    // Last block should be context with overflow message
    const last = blocks[blocks.length - 1]!;
    expect(last['type']).toBe('context');
  });
});

describe('SlackProvider', () => {
  let originalFetch: typeof globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function createProvider(webhookUrl = 'https://hooks.slack.com/services/test') {
    return new SlackProvider({ type: 'slack', webhookUrl });
  }

  it('posts to webhook and reports findings count', async () => {
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('ok') });

    const provider = createProvider();
    const result = await provider.notify(makeContext());

    expect(result.sent).toBe(1);
    expect(result.errors).toEqual([]);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://hooks.slack.com/services/test',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('skips when no findings', async () => {
    const provider = createProvider();
    const result = await provider.notify(makeContext({ findings: [] }));

    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('reports error when webhook returns non-ok status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('invalid_token'),
    });

    const provider = createProvider();
    const result = await provider.notify(makeContext());

    expect(result.sent).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('403');
  });

  it('reports error when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const provider = createProvider();
    const result = await provider.notify(makeContext());

    expect(result.sent).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Network error');
  });
});
