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

async function workspace(query = '', savedTheme?: string, systemTheme = 'light') {
  const window = new Window({
    url: `https://warden.example/${query}`,
    settings: {
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
        data = { totals: { runs: 12, findings: 5, costUsd: 2.31, failed: 0 }, breakdowns: [] };
        break;
      case '/api/v1/findings':
        data = { items: url.searchParams.get('query') === 'no-match' ? [] : [finding], nextCursor: 'page-2' };
        break;
      case '/api/v1/findings/finding-1':
        data = { finding, verification: 'Ownership is not checked before the resource is returned.' };
        break;
      case '/api/v1/personal-tokens':
        data = { tokens: [] };
        break;
      default: throw new Error(`Unexpected request: ${url}`);
    }
    return new window.Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
  });
  window.document.write(html);
  window.eval(script);
  await settled(window);
  return { window, document: window.document, requests };
}

async function settled(window: Window) {
  await vi.waitFor(() => expect(window.document.querySelector('#content')?.getAttribute('aria-busy')).toBe('false'));
}

it('inspects evidence beside the feed and retains filters when opening the full page', async () => {
  const { window, document, requests } = await workspace('?repositoryId=repo-1&range=7');
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
});

it('carries repository and date filters between findings and usage without requesting the other feed', async () => {
  const { window, document, requests } = await workspace('?repositoryId=repo-1&range=7');
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
});

it('filters findings, clears pagination, and renders an empty result', async () => {
  const { window, document, requests } = await workspace('?cursor=old-page&range=30');
  const input = document.querySelector<HTMLInputElement>('[name="query"]')!;
  input.value = 'no-match';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  await vi.waitFor(() => expect(document.querySelector('#content')?.textContent).toContain('Nothing matches these filters'));
  expect(window.location.search).toContain('query=no-match');
  expect(window.location.search).not.toContain('cursor');
  expect(requests.filter((url) => url.pathname === '/api/v1/findings').at(-1)?.searchParams.get('query')).toBe('no-match');
});

it('keeps token access available from the account menu', async () => {
  const { document } = await workspace();
  document.querySelector<HTMLButtonElement>('#account-menu-trigger')!.click();
  expect(document.querySelector('#account-menu-trigger')?.getAttribute('aria-expanded')).toBe('true');
  document.querySelector<HTMLButtonElement>('#api-access')!.click();
  await vi.waitFor(() => expect(document.querySelector('#api-dialog-content')?.textContent).toContain('No active API tokens.'));
  expect(document.querySelector('#api-dialog')?.hasAttribute('open')).toBe(true);
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

it('applies status shortcuts and clears advanced filters from an empty result', async () => {
  const { window, document, requests } = await workspace('?severity=high&skill=security-review&query=no-match');
  expect(document.querySelector('.advanced-filters > summary')?.textContent).toBe('Filters · 2');
  const posted = [...document.querySelectorAll<HTMLButtonElement>('.status-tab')].find((button) => button.textContent === 'Posted')!;
  posted.click();
  await settled(window);
  expect(requests.filter((url) => url.pathname === '/api/v1/findings').at(-1)?.searchParams.get('outcome')).toBe('posted');
  document.querySelector<HTMLButtonElement>('.empty-findings button')!.click();
  await settled(window);
  expect(document.querySelector('.finding-list')).not.toBeNull();
  expect(window.location.search).not.toMatch(/severity|skill|query|findingOutcome/);
  expect(document.querySelector('.advanced-filters > summary')?.textContent).toBe('Filters');
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
  const { window, document } = await workspace('?range=7', 'dark');
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
  expect(restored.document.documentElement.dataset['theme']).toBe('light');
});

it.each(['light', 'dark'])('automatically uses the system %s theme on the first visit', async (theme) => {
  const { window, document } = await workspace('', undefined, theme);
  expect(document.documentElement.dataset['theme']).toBe(theme);
  expect(window.localStorage.getItem('warden.theme')).toBeNull();
});
