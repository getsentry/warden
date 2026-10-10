// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router';
import type { FindingFeedItem, FindingDetailResponse } from '@sentry/warden-service-api';
import { App } from './app.js';
import { createDashboardRuntime } from './api.js';
import type { DashboardRuntime } from './api.js';
import { RuntimeProvider } from './runtime.js';

// Sanitized fixture shared with the history integration scenarios.
const finding: FindingFeedItem = {
  id: 'finding-1',
  displayId: '7MV-5V7',
  runId: 'run-1',
  clientRunId: 'run-11',
  repository: { provider: 'github', owner: 'acme', name: 'widgets', fullName: 'acme/widgets' },
  skill: 'security-review',
  primaryModel: 'example-model',
  severity: 'high',
  confidence: 'high',
  title: 'Missing authorization check',
  description: 'The handler accepts a resource ID without checking ownership.',
  location: { path: 'src/api.ts', startLine: 42 },
  outcome: 'posted',
  outcomeReason: null,
  firstObservedAt: '2026-08-12T10:00:00.000Z',
  lastObservedAt: '2026-08-12T10:02:00.000Z',
  completedAt: '2026-08-12T10:01:00.000Z',
};
const detail: FindingDetailResponse = {
  finding,
  verification: 'Ownership is not checked before the resource is returned.',
};
const token = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Local agent',
  tokenSuffix: '12345678',
  expiresAt: '2026-11-12T10:00:00.000Z',
  createdAt: '2026-08-12T10:00:00.000Z',
  lastUsedAt: null,
};
const runtimes: DashboardRuntime[] = [];
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  localStorage.clear();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(async () => {
  cleanup();
  await Promise.all(runtimes.splice(0).map((runtime) => runtime.dispose()));
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockApi(
  override?: (
    url: URL,
    options: RequestInit | undefined,
  ) => Promise<Response> | Response | undefined,
) {
  const requests: URL[] = [];
  const fetcher = vi.fn<typeof fetch>(async (input, options) => {
    const url = new URL(String(input), window.location.origin);
    requests.push(url);
    const response = override?.(url, options);
    if (response) return response;
    switch (url.pathname) {
      case '/api/v1/auth/context':
        return json({ canManagePersonalTokens: true, authDisabled: false });
      case '/api/v1/history/dimensions':
        return json({
          repositories: [{ id: 'repo-1', repository: finding.repository }],
          skills: [finding.skill],
        });
      case '/api/v1/dashboard/summary':
        return json({
          totals: {
            runs: 12,
            findings: 5,
            costUsd: 2.31,
            failed: 0,
            successful: 12,
            cancelled: 0,
            skipped: 0,
          },
          breakdowns: Object.entries({
            day: '2026-08-12',
            repository: finding.repository.fullName,
            skill: finding.skill,
          }).map(([dimension, value]) => ({
            dimension,
            groups: [{ dimensions: { [dimension]: value }, costUsd: 2.31 }],
          })),
        });
      case '/api/v1/findings':
        return json({
          items: url.searchParams.get('query') === 'no-match' ? [] : [finding],
          nextCursor: 'page-2',
        });
      case '/api/v1/findings/finding-1':
      case '/api/v1/findings/7MV-5V7':
        return json(detail);
      case '/api/v1/personal-tokens':
        return json({ tokens: [token] });
      default:
        throw new Error(`Unexpected request: ${url}`);
    }
  });
  return { fetcher, requests };
}

function workspace(path = '/?view=findings&range=30', api = mockApi()) {
  window.history.replaceState({}, '', path);
  const runtime = createDashboardRuntime(api.fetcher);
  runtimes.push(runtime);
  render(
    <RuntimeProvider runtime={runtime}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </RuntimeProvider>,
  );
  return api;
}

function control<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing control ${selector}`);
  return element;
}
async function settled() {
  await waitFor(() => expect(control('#content').getAttribute('aria-busy')).toBe('false'));
}

it('inspects evidence beside the feed, restores focus, and retains filters on the full page', async () => {
  const { requests } = workspace('/?view=findings&repositoryId=repo-1&range=7');
  await screen.findByRole('heading', { name: 'Latest Findings' });
  expect(requests.some((url) => url.pathname.includes('/dashboard/'))).toBe(false);
  const item = control<HTMLButtonElement>('.finding-item');
  fireEvent.click(item);
  await screen.findByText(detail.verification ?? '');
  expect(screen.getByRole('list', { name: 'Findings' })).toBeTruthy();
  expect(item.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Close finding' }));
  expect(document.activeElement).toBe(item);
  fireEvent.click(item);
  await screen.findByText(detail.verification ?? '');
  fireEvent.click(screen.getByRole('link', { name: 'Open full page' }));
  await settled();
  expect(location.pathname).toBe('/findings/7MV-5V7');
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(finding.title);
  fireEvent.click(screen.getByRole('link', { name: 'Back to findings' }));
  await settled();
  expect(location.search).toContain('repositoryId=repo-1');
  expect(location.search).toContain('range=7');
});

it('lets users inspect findings while account controls are still loading', async () => {
  let release: (value: Response) => void = () => {
    throw new Error('Missing deferred response');
  };
  const account = new Promise<Response>((resolve) => {
    release = resolve;
  });
  workspace(
    '/?view=findings&range=30',
    mockApi((url) => (url.pathname === '/api/v1/auth/context' ? account : undefined)),
  );
  await screen.findByRole('heading', { name: 'Latest Findings' });
  expect(screen.queryByRole('button', { name: 'Open account menu' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: new RegExp(finding.title) }));
  await screen.findByText(detail.verification ?? '');
  await act(async () => {
    release(json({ canManagePersonalTokens: true, authDisabled: false }));
  });
  await screen.findByRole('button', { name: 'Open account menu' });
  fireEvent.click(screen.getByRole('link', { name: 'Usage' }));
  await settled();
  expect(screen.getByRole('heading', { name: 'Cost Breakdown' })).toBeTruthy();
});

it('interrupts obsolete tab requests and ignores responses that arrive after navigation', async () => {
  const observed: { signal: AbortSignal | null } = { signal: null };
  let release: (value: Response) => void = () => {
    throw new Error('Missing deferred response');
  };
  const response = new Promise<Response>((resolve) => {
    release = resolve;
  });
  workspace(
    '/?view=usage&range=30',
    mockApi((url, options) => {
      if (url.pathname === '/api/v1/findings') {
        observed.signal = options?.signal ?? null;
        return response;
      }
      return undefined;
    }),
  );
  await settled();
  fireEvent.click(screen.getByRole('link', { name: 'Findings' }));
  await waitFor(() => expect(observed.signal).not.toBeNull());
  expect(screen.getByRole('status').textContent).toBe('Loading findings…');
  expect(screen.getByLabelText('Search findings')).toBeTruthy();
  fireEvent.click(screen.getByRole('link', { name: 'Usage' }));
  await settled();
  expect(observed.signal?.aborted).toBe(true);
  await act(async () => {
    release(json({ items: [finding] }));
  });
  expect(document.title).toBe('Usage · Warden');
  expect(screen.queryByRole('list', { name: 'Findings' })).toBeNull();
});

it('preserves finding filters when shared usage filters change', async () => {
  const { requests } = workspace(
    '/?view=findings&repositoryId=repo-1&range=7&query=ownership&severity=high&findingOutcome=posted',
  );
  await settled();
  fireEvent.click(screen.getByRole('link', { name: 'Usage' }));
  await settled();
  fireEvent.change(screen.getByLabelText('Time'), { target: { value: '90' } });
  await settled();
  fireEvent.click(screen.getByRole('link', { name: 'Findings' }));
  await settled();
  const latest = requests.filter((url) => url.pathname === '/api/v1/findings').at(-1);
  expect(Object.fromEntries(latest?.searchParams ?? [])).toMatchObject({
    query: 'ownership',
    severity: 'high',
    outcome: 'posted',
    repositoryId: 'repo-1',
  });
  expect(location.search).toContain('range=90');
});

it('debounces search, resets pagination, and clears an empty result', async () => {
  workspace('/?view=findings&cursor=old-page&range=30&severity=high&skill=security-review');
  await settled();
  fireEvent.change(screen.getByLabelText('Search findings'), { target: { value: 'no-match' } });
  await screen.findByText('Nothing matches these filters');
  expect(location.search).toContain('query=no-match');
  expect(location.search).not.toContain('cursor');
  fireEvent.click(screen.getByRole('button', { name: 'Posted' }));
  await settled();
  expect(location.search).toContain('findingOutcome=posted');
  fireEvent.click(screen.getByRole('button', { name: 'Clear finding filters' }));
  await screen.findByRole('list', { name: 'Findings' });
  expect(location.search).not.toMatch(/severity|skill|query|findingOutcome/);
  expect(screen.getByLabelText<HTMLInputElement>('Search findings').value).toBe('');
});

it('cancels a pending search when switching views', async () => {
  workspace();
  await settled();
  fireEvent.change(screen.getByLabelText('Search findings'), { target: { value: 'no-match' } });
  fireEvent.click(screen.getByRole('link', { name: 'Usage' }));
  await settled();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
  expect(document.title).toBe('Usage · Warden');
  expect(location.search).not.toContain('no-match');
});

it('keeps the selected status when a pending search finishes', async () => {
  workspace();
  await settled();
  fireEvent.change(screen.getByLabelText('Search findings'), { target: { value: 'ownership' } });
  fireEvent.click(screen.getByRole('button', { name: 'Posted' }));
  await waitFor(() => expect(location.search).toContain('query=ownership'));
  expect(location.search).toContain('findingOutcome=posted');
  const posted = await screen.findByRole('button', { name: 'Posted' });
  expect(posted.getAttribute('aria-pressed')).toBe('true');
});

it('keeps newer search input when an earlier URL update finishes', async () => {
  workspace();
  await settled();
  const input = screen.getByLabelText<HTMLInputElement>('Search findings');
  vi.useFakeTimers();
  try {
    await act(async () => {
      fireEvent.change(input, { target: { value: 'owner' } });
      vi.advanceTimersByTime(250);
      fireEvent.change(input, { target: { value: 'ownership' } });
    });
    expect(new URLSearchParams(location.search).get('query')).toBe('owner');
    expect(input.value).toBe('ownership');
    await act(async () => vi.advanceTimersByTime(250));
    expect(new URLSearchParams(location.search).get('query')).toBe('ownership');
    expect(input.value).toBe('ownership');
  } finally {
    vi.useRealTimers();
  }
});

it('restores search from browser history and cancels unsent input', async () => {
  workspace('/?view=findings&range=30&query=ownership');
  await settled();
  const input = screen.getByLabelText<HTMLInputElement>('Search findings');
  fireEvent.change(input, { target: { value: 'unsent' } });
  await act(async () => {
    window.history.pushState({}, '', '/?view=findings&range=30&query=previous');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  expect(input.value).toBe('previous');
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
  expect(new URLSearchParams(location.search).get('query')).toBe('previous');
});

it('keeps the latest inspection and aborts a closed inspector request', async () => {
  let calls = 0;
  const signals: (AbortSignal | null)[] = [];
  let release: (value: Response) => void = () => {
    throw new Error('Missing deferred response');
  };
  const earlier = new Promise<Response>((resolve) => {
    release = resolve;
  });
  workspace(
    '/?view=findings&range=30',
    mockApi((url, options) => {
      if (url.pathname.startsWith('/api/v1/findings/')) {
        signals.push(options?.signal ?? null);
        return ++calls === 1 ? earlier : json({ ...detail, verification: 'Latest evidence' });
      }
      return undefined;
    }),
  );
  await settled();
  fireEvent.click(control('.finding-item'));
  await waitFor(() => expect(signals).toHaveLength(1));
  fireEvent.click(control('.finding-item'));
  await screen.findByText('Latest evidence');
  expect(signals[0]?.aborted).toBe(true);
  await act(async () => {
    release(json({ ...detail, verification: 'Outdated evidence' }));
  });
  expect(screen.queryByText('Outdated evidence')).toBeNull();
  fireEvent.keyDown(control('.finding-inspector'), { key: 'Escape' });
  expect(document.activeElement).toBe(control('.finding-item'));
});

it('retries a failed inspector request without losing the feed', async () => {
  let calls = 0;
  workspace(
    '/?view=findings&range=30',
    mockApi((url) =>
      url.pathname.startsWith('/api/v1/findings/') && ++calls === 1
        ? json({ error: { code: 'unavailable', message: 'Try later.' } }, 503)
        : undefined,
    ),
  );
  await settled();
  fireEvent.click(control('.finding-item'));
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  await screen.findByText(detail.verification ?? '');
  expect(screen.getByRole('list', { name: 'Findings' })).toBeTruthy();
});

it('shows an error when the service returns an invalid finding', async () => {
  workspace(
    '/?view=findings&range=30',
    mockApi((url) =>
      url.pathname === '/api/v1/findings'
        ? json({ items: [{ ...finding, severity: 'critical' }] })
        : undefined,
    ),
  );
  expect((await screen.findByRole('alert')).textContent).toBe(
    'The service returned an invalid response.',
  );
  expect(screen.queryByRole('list', { name: 'Findings' })).toBeNull();
});

it.each(['00000000-0000-4000-8000-000000000020', '7MV-5V7'])(
  'opens a direct finding URL with %s and safely displays its source',
  async (id) => {
    workspace(
      `/findings/${id}?range=7`,
      mockApi((url) =>
        url.pathname === `/api/v1/findings/${id}` || url.pathname === '/api/v1/findings/7MV-5V7'
          ? json({
              ...detail,
              verification: '<script>alert(1)</script>\nTrace line two',
              sourceUrl: 'https://github.com/acme/widgets/blob/1234567/src/api.ts#L42',
              headSha: '1234567890abcdef',
              sourceEvidence: {
                path: 'src/api.ts',
                language: 'typescript',
                startLine: 41,
                endLine: 43,
                targetStartLine: 42,
                targetEndLine: 42,
                content: 'before\n<script>unsafe</script>\nafter',
              },
            })
          : undefined,
      ),
    );
    await screen.findByRole('heading', { level: 1, name: finding.title });
    expect(location.pathname).toBe('/findings/7MV-5V7');
    expect(location.search).toBe('?range=7');
    expect(control('.finding-verification p').textContent).toBe(
      '<script>alert(1)</script>\nTrace line two',
    );
    expect(control('.source-line-target').textContent).toContain('<script>unsafe</script>');
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByRole('link', { name: 'Open on GitHub' }).getAttribute('href')).toContain(
      '#L42',
    );
  },
);

it('restores the saved theme without resetting an inspected finding', async () => {
  localStorage.setItem('warden.theme', 'dark');
  workspace();
  await settled();
  expect(document.documentElement.dataset['theme']).toBe('dark');
  fireEvent.click(control('.finding-item'));
  await screen.findByText(detail.verification ?? '');
  fireEvent.click(screen.getByRole('button', { name: 'Use light theme' }));
  expect(document.documentElement.dataset['theme']).toBe('light');
  expect(localStorage.getItem('warden.theme')).toBe('light');
  expect(control('.finding-item').getAttribute('aria-pressed')).toBe('true');
});

it('shows retained evidence in an open disclosure and explains missing historical evidence', async () => {
  workspace('/findings/finding-1');
  await settled();
  const evidence = control<HTMLDetailsElement>('.finding-verification');
  expect(evidence.open).toBe(true);
  expect(evidence.querySelector('summary')?.textContent).toBe('Evidence');
  expect(evidence.querySelector('p')?.textContent).toBe(detail.verification);
  cleanup();
  workspace(
    '/findings/finding-1',
    mockApi((url) =>
      url.pathname.startsWith('/api/v1/findings/') ? json({ finding }) : undefined,
    ),
  );
  await screen.findByText('No verification evidence was retained for this finding.');
});

it('defaults to thirty days of Usage and follows the system theme on a first visit', async () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  const { requests } = workspace('/');
  await settled();
  expect(document.title).toBe('Usage · Warden');
  expect(location.search).toContain('range=30');
  expect(requests.some((url) => url.pathname === '/api/v1/findings')).toBe(false);
  const summaries = requests.filter((url) => url.pathname === '/api/v1/dashboard/summary');
  expect(summaries.length).toBeGreaterThan(0);
  for (const url of summaries) {
    const from = url.searchParams.get('from');
    expect(from).not.toBeNull();
    expect(Date.parse(from ?? '')).toBeGreaterThan(Date.now() - 30 * 86_400_000 - 60_000);
  }
  expect(document.documentElement.dataset['theme']).toBe('dark');
  expect(localStorage.getItem('warden.theme')).toBeNull();
});

it('supports pagination and browser back navigation', async () => {
  workspace();
  await settled();
  fireEvent.click(screen.getByRole('link', { name: 'Next page' }));
  await settled();
  expect(location.search).toContain('cursor=page-2');
  await act(async () => {
    history.back();
  });
  await waitFor(() => expect(location.search).not.toContain('cursor'));
  await settled();
  expect(screen.getByRole('list', { name: 'Findings' })).toBeTruthy();
});

it('creates, copies, and revokes a personal token, then discards its secret on close', async () => {
  let tokens: (typeof token)[] = [];
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  workspace(
    '/?view=findings&range=30',
    mockApi((url, options) => {
      if (url.pathname === '/api/v1/personal-tokens') {
        if (options?.method === 'POST') {
          tokens = [token];
          return json({ ...token, token: 'wds_pat_secret12345678' }, 201);
        }
        return json({ tokens });
      }
      if (options?.method === 'DELETE') {
        tokens = [];
        return json({ revoked: true });
      }
      return undefined;
    }),
  );
  await settled();
  fireEvent.click(await screen.findByRole('button', { name: 'Open account menu' }));
  fireEvent.click(screen.getByRole('button', { name: 'API access' }));
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByText('No active API tokens.');
  fireEvent.change(within(dialog).getByLabelText('Token name'), {
    target: { value: 'Local agent' },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create token' }));
  await within(dialog).findByText('wds_pat_secret12345678');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Copy token' }));
  await within(dialog).findByRole('button', { name: 'Copied' });
  expect(writeText).toHaveBeenCalledWith('wds_pat_secret12345678');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));
  await within(dialog).findByText('No active API tokens.');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.queryByText('wds_pat_secret12345678')).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open account menu' }));
});

it('shows token mutation failures and keeps the token available for retry', async () => {
  workspace(
    '/?view=findings&range=30',
    mockApi((_url, options) =>
      options?.method === 'DELETE'
        ? json({ error: { code: 'unavailable', message: 'Try later.' } }, 503)
        : undefined,
    ),
  );
  await settled();
  fireEvent.click(await screen.findByRole('button', { name: 'Open account menu' }));
  fireEvent.click(screen.getByRole('button', { name: 'API access' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Revoke' }));
  expect((await screen.findByRole('alert')).textContent).toBe('Try later.');
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Revoke' }).disabled).toBe(false);
});

it('keeps a newly created token available to copy when the list refresh fails', async () => {
  let created = false;
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  workspace(
    '/?view=findings&range=30',
    mockApi((url, options) => {
      if (url.pathname !== '/api/v1/personal-tokens') return undefined;
      if (options?.method === 'POST') {
        created = true;
        return json({ ...token, token: 'wds_pat_secret12345678' }, 201);
      }
      return created
        ? json({ error: { code: 'unavailable', message: 'Try later.' } }, 503)
        : json({ tokens: [] });
    }),
  );
  await settled();
  fireEvent.click(await screen.findByRole('button', { name: 'Open account menu' }));
  fireEvent.click(screen.getByRole('button', { name: 'API access' }));
  await screen.findByText('No active API tokens.');
  fireEvent.change(screen.getByLabelText('Token name'), { target: { value: 'Local agent' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create token' }));
  await screen.findByText('Could not load API tokens. Try again.');
  expect(screen.getByText('wds_pat_secret12345678')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Copy token' }));
  await screen.findByRole('button', { name: 'Copied' });
  expect(writeText).toHaveBeenCalledWith('wds_pat_secret12345678');
});

it('recovers account controls after a failed request', async () => {
  let calls = 0;
  workspace(
    '/?view=findings&range=30',
    mockApi((url) => {
      if (url.pathname !== '/api/v1/auth/context') return undefined;
      calls += 1;
      return calls === 1
        ? json({ error: { code: 'unavailable', message: 'Try later.' } }, 503)
        : json({ canManagePersonalTokens: true, authDisabled: false });
    }),
  );
  await settled();
  fireEvent.click(await screen.findByRole('button', { name: 'Retry account' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Open account menu' }));
  expect(screen.getByRole('button', { name: 'API access' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
  expect(calls).toBe(2);
});

it('redirects an expired session to login with the current finding URL', async () => {
  const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => undefined);
  workspace(
    '/findings/finding-1?range=7',
    mockApi((url) =>
      url.pathname.endsWith('/findings/finding-1')
        ? json({ error: { code: 'unauthorized', message: 'Authentication required.' } }, 401)
        : undefined,
    ),
  );
  await waitFor(() =>
    expect(assign).toHaveBeenCalledWith(
      '/api/auth/login?returnTo=%2Ffindings%2Ffinding-1%3Frange%3D7',
    ),
  );
});

it('signs out and hides account controls when authentication is disabled', async () => {
  const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => undefined);
  const api = workspace(
    '/?view=usage&range=30',
    mockApi((url) =>
      url.pathname === '/api/auth/sign-out' ? new Response(null, { status: 200 }) : undefined,
    ),
  );
  await settled();
  fireEvent.click(await screen.findByRole('button', { name: 'Open account menu' }));
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
  expect(
    api.fetcher.mock.calls.some(
      ([input, options]) => input === '/api/auth/sign-out' && options?.method === 'POST',
    ),
  ).toBe(true);
  cleanup();
  workspace(
    '/?view=usage&range=30',
    mockApi((url) =>
      url.pathname === '/api/v1/auth/context'
        ? json({ canManagePersonalTokens: false, authDisabled: true })
        : undefined,
    ),
  );
  await settled();
  expect(screen.queryByRole('button', { name: 'Open account menu' })).toBeNull();
});

it('opens a repeated finding by its own short URL and keeps the selected occurrence', async () => {
  const repeated = { ...finding, displayId: '7MV-5V7-2' };
  workspace(
    '/?view=findings&range=30',
    mockApi((url) => {
      if (url.pathname === '/api/v1/findings') return json({ items: [repeated] });
      if (url.pathname === '/api/v1/findings/7MV-5V7') {
        return json({ ...detail, finding: { ...finding, id: 'finding-2', title: 'Other occurrence' } });
      }
      if (url.pathname.startsWith('/api/v1/findings/')) return json({ ...detail, finding: repeated });
      return undefined;
    }),
  );
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(finding.title) }));
  const link = await screen.findByRole<HTMLAnchorElement>('link', { name: 'Open full page' });
  expect(link.pathname).toBe('/findings/7MV-5V7-2');
  fireEvent.click(link);
  await screen.findByRole('heading', { level: 1, name: finding.title });
  expect(location.pathname).toBe('/findings/7MV-5V7-2');
  expect(screen.queryByText('Other occurrence')).toBeNull();
});
