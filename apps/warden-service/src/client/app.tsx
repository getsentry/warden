import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { Effect } from 'effect';
import type { DashboardSummaryResponse, FindingListResponse } from '@sentry/warden-service-api';
import { dashboardApi } from './api.js';
import { useQuery } from './runtime.js';
import { Account } from './account.js';
import { ThemeToggle } from './theme.js';
import { Filters, commonApiParams } from './filters.js';
import { Findings, FindingArticle } from './findings.js';
import { Usage } from './usage.js';

function PageTitle({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    document.title = `${title} · Warden`;
  }, [title]);
  return (
    <header className="page-header">
      <h1 id="page-title">{title}</h1>
      <p id="page-description">{description}</p>
    </header>
  );
}

type ExploreData =
  | { kind: 'usage'; data: DashboardSummaryResponse }
  | { kind: 'findings'; data: FindingListResponse };

function Explore({ usage }: { usage: boolean }) {
  const [params, setParams] = useSearchParams();
  const normalized = new URLSearchParams(params);
  if (!normalized.get('range')) normalized.set('range', '30');
  const query = normalized.toString();
  useEffect(() => {
    if (!params.get('range')) {
      const next = new URLSearchParams(params);
      next.set('range', '30');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);
  const request = useMemo(() => {
    const common = commonApiParams(new URLSearchParams(query));
    if (usage)
      return dashboardApi
        .summary(common.toString())
        .pipe(Effect.map((data): ExploreData => ({ kind: 'usage', data })));
    const current = new URLSearchParams(query);
    for (const name of ['query', 'severity', 'cursor']) {
      const value = current.get(name);
      if (value) common.set(name, value);
    }
    const outcome = current.get('findingOutcome');
    if (outcome) common.set('outcome', outcome);
    common.set('limit', '30');
    return dashboardApi
      .findings(common.toString())
      .pipe(Effect.map((data): ExploreData => ({ kind: 'findings', data })));
  }, [usage, query]);
  const result = useQuery(request);
  const [dimensionsEnabled, setDimensionsEnabled] = useState(false);
  useEffect(() => {
    if (result.status === 'success') setDimensionsEnabled(true);
  }, [result.status]);
  const dimensions = useQuery(dimensionsEnabled ? dashboardApi.dimensions : null);
  return (
    <>
      <PageTitle
        title={usage ? 'Usage' : 'Findings'}
        description={
          usage ? 'The cost of keeping watch.' : 'Review findings and the evidence behind them.'
        }
      />
      <section id="filters" className="filter-host">
        <Filters key={usage ? 'usage' : 'findings'} usage={usage} dimensions={dimensions} />
      </section>
      <section
        id="content"
        aria-live="polite"
        tabIndex={-1}
        aria-busy={result.status === 'loading'}
      >
        {result.status === 'loading' ? (
          <div role="status" className="page-loading">
            Loading {usage ? 'usage' : 'findings'}…
          </div>
        ) : result.status === 'error' ? (
          <div className="error" role="alert">
            {result.message}
          </div>
        ) : result.data.kind === 'usage' ? (
          <Usage summary={result.data.data} />
        ) : (
          <Findings key={query} data={result.data.data} />
        )}
      </section>
    </>
  );
}

function FindingPage({ id }: { id: string }) {
  const request = useMemo(() => dashboardApi.finding(id), [id]);
  const result = useQuery(request);
  const [params] = useSearchParams();
  const back = new URLSearchParams(params);
  back.set('view', 'findings');
  return (
    <>
      <PageTitle
        title={result.status === 'success' ? result.data.finding.title : 'Finding'}
        description={
          result.status === 'success'
            ? `${result.data.finding.displayId} · ${result.data.finding.repository.fullName} · ${result.data.finding.skill}`
            : 'Loading finding details.'
        }
      />
      <section
        id="content"
        aria-live="polite"
        tabIndex={-1}
        aria-busy={result.status === 'loading'}
      >
        {result.status === 'loading' ? (
          <div className="page-loading" role="status">
            Loading finding…
          </div>
        ) : result.status === 'error' ? (
          <div className="error" role="alert">
            {result.message}
          </div>
        ) : (
          <section className="finding-page">
            <Link className="text-link" to={`/?${back}`}>
              Back to findings
            </Link>
            <FindingArticle detail={result.data} />
          </section>
        )}
      </section>
    </>
  );
}

/** Render the dashboard shell and route-specific React views. */
export function App() {
  const location = useLocation();
  const [params] = useSearchParams();
  const match = location.pathname.match(/^\/findings\/([^/]+)\/?$/);
  const findingId = match?.[1] ? decodeURIComponent(match[1]) : undefined;
  const usage = !findingId && params.get('view') !== 'findings';
  const nav = (view: string) => {
    const next = new URLSearchParams(params);
    next.delete('cursor');
    next.set('view', view);
    return `/?${next}`;
  };
  return (
    <>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <Link className="brand" to="/">
          <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
            <path d="M32 10 50 17v18c0 10-8 17-18 20-10-3-18-10-18-20V17Z" fill="currentColor" />
            <path d="m32 17 12 5v13c0 7-5 12-12 14-7-2-12-7-12-14V22Z" fill="var(--chrome)" />
            <circle cx="32" cy="33" r="5" fill="currentColor" />
          </svg>
          <span>Warden</span>
        </Link>
        <nav className="workspace-nav" aria-label="Workspace">
          <Link id="nav-usage" to={nav('usage')} aria-current={usage ? 'page' : undefined}>
            Usage
          </Link>
          <Link id="nav-findings" to={nav('findings')} aria-current={!usage ? 'page' : undefined}>
            Findings
          </Link>
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <Account />
        </div>
      </header>
      <main className="shell">
        {findingId ? <FindingPage id={findingId} /> : <Explore usage={usage} />}
      </main>
    </>
  );
}
