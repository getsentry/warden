import { describe, it, expect, vi } from 'vitest';
import type { Finding } from '../types/index.js';
import type { SuppressionRule } from '../suppressions/types.js';
import type { NotificationProvider, NotificationResult } from './types.js';
import { NotificationDispatcher } from './dispatcher.js';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'f1',
    severity: 'high',
    title: 'SQL injection vulnerability',
    description: 'Unsanitized user input',
    location: { path: 'src/db/query.ts', startLine: 42 },
    ...overrides,
  };
}

function makeProvider(
  name: string,
  result?: Partial<NotificationResult>
): NotificationProvider {
  return {
    name,
    notify: vi.fn(() =>
      Promise.resolve({
        provider: name,
        sent: 0,
        skipped: 0,
        errors: [],
        ...result,
      })
    ),
  };
}

const baseContext = {
  reports: [],
  repository: { owner: 'test-owner', name: 'test-repo' },
  commitSha: 'abc123',
  skillName: 'security-audit',
};

describe('NotificationDispatcher', () => {
  it('passes findings to all providers', async () => {
    const p1 = makeProvider('p1', { sent: 1 });
    const p2 = makeProvider('p2', { sent: 1 });
    const dispatcher = new NotificationDispatcher([p1, p2], []);

    const result = await dispatcher.dispatch({
      ...baseContext,
      findings: [makeFinding()],
    });

    expect(result.suppressed).toBe(0);
    expect(result.results).toHaveLength(2);
    expect(p1.notify).toHaveBeenCalledTimes(1);
    expect(p2.notify).toHaveBeenCalledTimes(1);
  });

  it('applies suppressions before sending to providers', async () => {
    const rules: SuppressionRule[] = [{
      skill: 'security-audit',
      paths: ['src/db/**'],
      reason: 'Known false positive',
    }];

    const provider = makeProvider('test');
    const dispatcher = new NotificationDispatcher([provider], rules);

    const result = await dispatcher.dispatch({
      ...baseContext,
      findings: [makeFinding()],
    });

    expect(result.suppressed).toBe(1);
    // Provider should receive empty findings
    const notifyCall = vi.mocked(provider.notify).mock.calls[0]?.[0];
    expect(notifyCall?.findings).toEqual([]);
  });

  it('only suppresses matching findings', async () => {
    const rules: SuppressionRule[] = [{
      skill: 'security-audit',
      paths: ['src/api/**'],
      reason: 'test',
    }];

    const provider = makeProvider('test', { sent: 1 });
    const dispatcher = new NotificationDispatcher([provider], rules);

    const result = await dispatcher.dispatch({
      ...baseContext,
      findings: [
        makeFinding({ id: 'f1', location: { path: 'src/db/query.ts', startLine: 1 } }),
        makeFinding({ id: 'f2', location: { path: 'src/api/handler.ts', startLine: 1 } }),
      ],
    });

    expect(result.suppressed).toBe(1);
    const notifyCall = vi.mocked(provider.notify).mock.calls[0]?.[0];
    expect(notifyCall?.findings).toHaveLength(1);
    expect(notifyCall?.findings[0]?.id).toBe('f1');
  });

  it('handles provider errors gracefully', async () => {
    const provider: NotificationProvider = {
      name: 'failing',
      notify: vi.fn(() => Promise.reject(new Error('Connection refused'))),
    };
    const dispatcher = new NotificationDispatcher([provider], []);

    const result = await dispatcher.dispatch({
      ...baseContext,
      findings: [makeFinding()],
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.errors).toContain('Connection refused');
  });

  it('works with no providers', async () => {
    const dispatcher = new NotificationDispatcher([], []);

    const result = await dispatcher.dispatch({
      ...baseContext,
      findings: [makeFinding()],
    });

    expect(result.suppressed).toBe(0);
    expect(result.results).toEqual([]);
  });

  it('skips suppression rules for different skill', async () => {
    const rules: SuppressionRule[] = [{
      skill: 'other-skill',
      paths: ['**/*'],
      reason: 'test',
    }];

    const provider = makeProvider('test', { sent: 1 });
    const dispatcher = new NotificationDispatcher([provider], rules);

    const result = await dispatcher.dispatch({
      ...baseContext,
      findings: [makeFinding()],
    });

    expect(result.suppressed).toBe(0);
    const notifyCall = vi.mocked(provider.notify).mock.calls[0]?.[0];
    expect(notifyCall?.findings).toHaveLength(1);
  });
});
