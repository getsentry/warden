import { readFile } from 'node:fs/promises';
import { Window, type HTMLAnchorElement, type HTMLButtonElement, type HTMLInputElement, type HTMLSelectElement } from 'happy-dom';
import { afterEach, expect, it, vi } from 'vitest';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const script = await readFile(new URL('./app.js', import.meta.url), 'utf8');
// Mirrors the sanitized finding returned by the service's history integration tests.
const finding = {
  id: 'finding-1', displayId: '7MV-5V7', runId: 'run-1', clientRunId: 'run-11',
  repository: { provider: 'github', owner: 'acme', name: 'widgets', fullName: 'acme/widgets' },
  skill: 'security-review', primaryModel: 'example-model', severity: 'high', confidence: 'high',
  title: 'Missing authorization check', description: 'The handler accepts a resource ID without checking ownership.',
  location: { path: 'src/api.ts', startLine: 42 }, outcome: 'posted', outcomeReason: null,
  firstObservedAt: '2026-08-12T10:00:00.000Z', lastObservedAt: '2026-08-12T10:02:00.000Z',
  completedAt: '2026-08-12T10:01:00.000Z',
};
const windows: Window[] = [];

afterEach(async () => {
  await Promise.all(windows.splice(0).map((window) => window.happyDOM.close()));
});

async function workspace(query = '?view=findings', savedTheme?: string, systemTheme = 'light', beforeStart?: (window: Window) => void) {
  const window = new Window({
    url: `https://warden.example/${query}`,
    settings: {
      enableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      device: { prefersColorScheme: systemTheme },
    },
  });
  windows.push(window);
  if (savedTheme) window.localStorage.setItem('warden.theme', savedTheme);
  const requests: URL[] = [];
  window.fetch = vi.fn(async (input) => {
    const url = new URL(String(input), window.location.origin);
    requests.push(url);
    let data: unknown;
    switch (url.pathname) {
      case '/api/v1/auth/context':
        data = { canManagePersonalTokens: true, authDisabled: false };
        break;
      case '/api/v1/history/dimensions':
        data = { repositories: [{ id: 'repo-1', repository: finding.repository }], skills: [finding.skill] };
        break;
      case '/api/v1/dashboard/summary':
        data = {
          totals: { runs: 12, findings: 5, costUsd: 2.31, failed: 0 },
          breakdowns: Object.entries({
            day: '2026-08-12', repository: finding.repository.fullName, skill: finding.skill,
          }).map(([dimension, value]) => ({ dimension, groups: [{ dimensions: { [dimension]: value }, costUsd: 2.31 }] })),
        };
        break;
      case '/api/v1/findings':
        data = { items: url.searchParams.get('query') === 'no-match' ? [] : [finding], nextCursor: 'page-2' };
        break;
      case '/api/v1/findings/finding-1':
        data = { finding, verification: 'Ownership is not checked before the resource is returned.' };
        break;
      default: throw new Error(`Unexpected request: ${url}`);
    }
    return new window.Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
  });
  beforeStart?.(window);
  window.document.write(html);
  const initialTheme = window.document.documentElement.dataset['theme'];
  window.eval(script);
  await settled(window);
  return { window, document: window.document, requests, initialTheme };
}

async function settled(window: Window) {
  await vi.waitFor(() => expect(window.document.querySelector('#content')?.getAttribute('aria-busy')).toBe('false'));
}

it('inspects evidence beside the feed and retains filters when opening the full page', async () => {
  const { window, document, requests } = await workspace('?view=findings&repositoryId=repo-1&range=7');
  expect(document.title).toBe('Findings · Warden');
  expect(requests.some((url) => url.pathname.includes('/dashboard/'))).toBe(false);
  const item = document.querySelector<HTMLButtonElement>('.finding-item')!;
  item.click();
  await vi.waitFor(() => expect(document.querySelector('.finding-verification')?.textContent).toContain('Ownership is not checked'));
  expect(document.querySelector('.finding-list')).not.toBeNull();
  expect(window.location.pathname).toBe('/');
  expect(item.getAttribute('aria-pressed')).toBe('true');
  document.querySelector<HTMLButtonElement>('.inspector-close')!.click();
  expect(document.querySelector('.finding-inspector')?.hasAttribute('hidden')).toBe(true);
  expect(document.activeElement).toBe(item);
  item.click();
  await vi.waitFor(() => expect(document.querySelector('.inspector-body')?.getAttribute('aria-busy')).toBe('false'));
  document.querySelector<HTMLAnchorElement>('.inspector-actions .text-link')!.click();
  await settled(window);
  expect(window.location.pathname).toBe('/findings/finding-1');
  expect(document.querySelector('#page-title')?.textContent).toBe(finding.title);
  document.querySelector<HTMLAnchorElement>('.finding-page > a')!.click();
  await settled(window);
  expect(window.location.search).toContain('repositoryId=repo-1');
  expect(window.location.search).toContain('range=7');
  expect(document.title).toBe('Findings · Warden');
});

it('loads findings without waiting for account controls and reuses the account lookup', async () => {
  let release!: () => void;
  const accountReady = new Promise<void>((resolve) => { release = resolve; });
  let browser!: Window;
  const loading = workspace('?view=findings', undefined, 'light', (window) => {
    browser = window;
    const fetch = window.fetch;
    window.fetch = async (input, options) => {
      if (String(input) === '/api/v1/auth/context') await accountReady;
      return fetch(input, options);
    };
  });
  try {
    await vi.waitFor(() => expect(browser.document.querySelector('.finding-item')).not.toBeNull());
    expect(browser.document.querySelector('#account-menu')?.hasAttribute('hidden')).toBe(true);
    expect(browser.document.querySelector('#content')?.getAttribute('aria-busy')).toBe('false');
  } finally {
    release();
  }
  const { window, document, requests } = await loading;
  await vi.waitFor(() => expect(document.querySelector('#account-menu')?.hasAttribute('hidden')).toBe(false));
  document.querySelector<HTMLAnchorElement>('#nav-usage')!.click();
  await settled(window);
  expect(document.title).toBe('Usage · Warden');
  expect(requests.filter((url) => url.pathname === '/api/v1/auth/context')).toHaveLength(1);
});

it('switches tabs immediately while data is pending and ignores a late response from the previous tab', async () => {
  const { window, document } = await workspace('');
  const fetch = window.fetch;
  const pending = new Map<string, () => void>();
  window.fetch = async (input, options) => {
    const path = new URL(String(input), window.location.origin).pathname;
    if (path === '/api/v1/findings' || path === '/api/v1/dashboard/summary') {
      await new Promise<void>((resolve) => { pending.set(path, resolve); });
    }
    return fetch(input, options);
  };
  try {
    document.querySelector<HTMLAnchorElement>('#nav-findings')!.click();
    expect(document.querySelector('#nav-findings')?.getAttribute('aria-current')).toBe('page');
    expect(document.title).toBe('Findings · Warden');
    expect(document.querySelector('[name="query"]')).not.toBeNull();
    expect(document.querySelector('.metrics')).toBeNull();
    expect(document.querySelector('[role="status"]')?.textContent).toBe('Loading findings…');

    document.querySelector<HTMLAnchorElement>('#nav-usage')!.click();
    expect(document.querySelector('#nav-usage')?.getAttribute('aria-current')).toBe('page');
    expect(document.title).toBe('Usage · Warden');
    expect(document.querySelector('[name="query"]')).toBeNull();
    expect(document.querySelector('[role="status"]')?.textContent).toBe('Loading usage…');
    pending.get('/api/v1/findings')!();
    // Let the obsolete response finish while the current tab is still loading.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('.finding-list')).toBeNull();
    expect(document.querySelector('[role="status"]')?.textContent).toBe('Loading usage…');
    expect(document.querySelector('#content')?.getAttribute('aria-busy')).toBe('true');

    pending.get('/api/v1/dashboard/summary')!();
    await settled(window);
    expect(document.querySelector('.metrics')).not.toBeNull();
    expect(document.querySelector('[role="status"]')).toBeNull();
  } finally {
    for (const resolve of pending.values()) resolve();
  }
});

it('preserves finding filters when changing shared filters in Usage', async () => {
  const { window, document, requests } = await workspace('?view=findings&repositoryId=repo-1&range=7&query=ownership&severity=high&findingOutcome=posted');
  requests.length = 0;
  document.querySelector<HTMLAnchorElement>('#nav-usage')!.click();
  await settled(window);
  expect(document.title).toBe('Usage · Warden');
  expect(document.querySelector('#nav-usage')?.getAttribute('aria-current')).toBe('page');
  expect(document.querySelectorAll('.filter-bar select')).toHaveLength(3);
  expect(document.querySelector('[name="query"]')).toBeNull();
  expect(requests.some((url) => url.pathname === '/api/v1/findings')).toBe(false);
  expect(requests.find((url) => url.pathname.includes('/dashboard/'))?.searchParams.get('repositoryId')).toBe('repo-1');
  const range = document.querySelector<HTMLSelectElement>('[name="range"]')!;
  range.value = '90';
  range.dispatchEvent(new window.Event('change', { bubbles: true }));
  await settled(window);
  expect(window.location.search).toContain('view=usage');
  document.querySelector<HTMLAnchorElement>('#nav-findings')!.click();
  await settled(window);
  expect(document.title).toBe('Findings · Warden');
  expect(window.location.search).toContain('repositoryId=repo-1');
  expect(window.location.search).toContain('range=90');
  const params = requests.filter((url) => url.pathname === '/api/v1/findings').at(-1)!.searchParams;
  expect(Object.fromEntries(params)).toMatchObject({ query: 'ownership', severity: 'high', outcome: 'posted' });
});

it('filters findings, resets pagination, and clears filters from an empty result', async () => {
  const { window, document, requests } = await workspace('?view=findings&cursor=old-page&range=30&severity=high&skill=security-review');
  const input = document.querySelector<HTMLInputElement>('[name="query"]')!;
  input.value = 'no-match';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  await vi.waitFor(() => expect(document.querySelector('#content')?.textContent).toContain('Nothing matches these filters'));
  expect(window.location.search).toContain('query=no-match');
  expect(window.location.search).not.toContain('cursor');
  expect(requests.filter((url) => url.pathname === '/api/v1/findings').at(-1)?.searchParams.get('query')).toBe('no-match');
  const posted = [...document.querySelectorAll<HTMLButtonElement>('.status-tab')].find((button) => button.textContent === 'Posted')!;
  posted.click();
  await settled(window);
  expect(requests.filter((url) => url.pathname === '/api/v1/findings').at(-1)?.searchParams.get('outcome')).toBe('posted');
  document.querySelector<HTMLButtonElement>('.empty-findings button')!.click();
  await settled(window);
  expect(document.querySelector('.finding-list')).not.toBeNull();
  expect(window.location.search).not.toMatch(/severity|skill|query|findingOutcome/);
});

it('does not let a pending search replace the usage view after navigation', async () => {
  const { window, document } = await workspace();
  const input = document.querySelector<HTMLInputElement>('[name="query"]')!;
  input.value = 'no-match';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  document.querySelector<HTMLAnchorElement>('#nav-usage')!.click();
  await settled(window);
  // Advance past the search debounce to catch a stale form applying after navigation.
  await new Promise((resolve) => setTimeout(resolve, 300));
  expect(document.title).toBe('Usage · Warden');
  expect(document.querySelector('[name="query"]')).toBeNull();
  expect(window.location.search).not.toContain('no-match');
});

it('keeps the latest evidence when an earlier inspection request completes late', async () => {
  const { window, document } = await workspace();
  const fetch = window.fetch;
  let release: (response: InstanceType<typeof window.Response>) => void;
  const earlier = new Promise<InstanceType<typeof window.Response>>((resolve) => { release = resolve; });
  let inspections = 0;
  window.fetch = async (input, options) => {
    if (String(input).startsWith('/api/v1/findings/')) {
      if (++inspections === 1) return earlier;
      return new window.Response(JSON.stringify({ finding, verification: 'Latest evidence' }));
    }
    return fetch(input, options);
  };
  const item = document.querySelector<HTMLButtonElement>('.finding-item')!;
  item.click();
  item.click();
  await vi.waitFor(() => expect(document.querySelector('.finding-verification')?.textContent).toContain('Latest evidence'));
  release!(new window.Response(JSON.stringify({ finding, verification: 'Outdated evidence' })));
  await window.happyDOM.whenAsyncComplete();
  expect(document.querySelector('.finding-verification')?.textContent).toContain('Latest evidence');
});

it('restores the theme and switches it without resetting the selected finding', async () => {
  const { window, document, initialTheme } = await workspace('?view=findings&range=7', 'dark');
  expect(initialTheme).toBe('dark');
  expect(document.documentElement.dataset['theme']).toBe('dark');
  const toggle = document.querySelector<HTMLButtonElement>('#theme-toggle')!;
  expect(toggle.getAttribute('aria-label')).toBe('Use light theme');
  const item = document.querySelector<HTMLButtonElement>('.finding-item')!;
  item.click();
  await vi.waitFor(() => expect(document.querySelector('.inspector-body')?.getAttribute('aria-busy')).toBe('false'));
  toggle.click();
  expect(document.documentElement.dataset['theme']).toBe('light');
  expect(window.localStorage.getItem('warden.theme')).toBe('light');
  expect(toggle.getAttribute('aria-label')).toBe('Use dark theme');
  expect(item.getAttribute('aria-pressed')).toBe('true');
  expect(document.querySelector('.finding-verification')).not.toBeNull();
  const restored = await workspace('', window.localStorage.getItem('warden.theme')!);
  expect(restored.initialTheme).toBe('light');
});

it('lands on Usage with the system theme on a first visit', async () => {
  const { window, document, requests, initialTheme } = await workspace('', undefined, 'dark');
  expect(document.title).toBe('Usage · Warden');
  expect(document.querySelector('#nav-usage')?.getAttribute('aria-current')).toBe('page');
  expect(requests.some((url) => url.pathname === '/api/v1/dashboard/summary')).toBe(true);
  expect(requests.some((url) => url.pathname === '/api/v1/findings')).toBe(false);
  expect(initialTheme).toBe('dark');
  expect(window.localStorage.getItem('warden.theme')).toBeNull();
});
