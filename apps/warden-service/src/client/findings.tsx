import { useEffect, useMemo, useRef, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import type {
  FindingDetailResponse,
  FindingFeedItem,
  FindingListResponse,
} from '@sentry/warden-service-api';
import { dashboardApi } from './api.js';
import { useQuery } from './runtime.js';
import {
  DateTime,
  findingLocation,
  formatNumber,
  outcomeDescription,
  outcomeLabel,
} from './format.js';
import { useFilterNavigation } from './filters.js';

interface FindingArticleProps {
  detail: FindingDetailResponse;
}

/** Share finding content between the inspector and full page. */
export function FindingArticle({ detail }: FindingArticleProps): JSX.Element {
  const { finding, sourceEvidence } = detail;
  const description = outcomeDescription(finding);
  const sourceUrl =
    detail.sourceUrl && /^https?:\/\//.test(detail.sourceUrl) ? detail.sourceUrl : undefined;
  const metadata: [string, ReactNode][] = [
    ['ID', finding.displayId],
    ['Repository', finding.repository.fullName],
    ['Skill', finding.skill],
    ['Location', findingLocation(finding)],
    ['Confidence', finding.confidence ?? 'Not reported'],
    ['Primary model', finding.primaryModel ?? 'Not reported'],
    ['Latest outcome', description],
    ['First observed', <DateTime key="first" value={finding.firstObservedAt} />],
    ['Last observed', <DateTime key="last" value={finding.lastObservedAt} />],
    ['Run completed', <DateTime key="completed" value={finding.completedAt} />],
    ['Run', finding.clientRunId],
    ['Commit', detail.headSha?.slice(0, 12) ?? 'Not reported'],
  ];
  return (
    <article className="finding-page-card">
      <div className="finding-page-heading">
        <span className={`severity ${finding.severity}`}>{finding.severity}</span>
        <span className={`finding-status ${finding.outcome ?? ''}`}>{outcomeLabel(finding)}</span>
      </div>
      {description !== outcomeLabel(finding) && (
        <p className="finding-reporting-note">{description}</p>
      )}
      <section className="finding-page-section">
        <h2>Why Warden Flagged This</h2>
        <p className="finding-page-description">{finding.description}</p>
      </section>
      <details className="finding-page-section finding-verification" open>
        <summary>Evidence</summary>
        <p>{detail.verification ?? 'No verification evidence was retained for this finding.'}</p>
      </details>
      <section className="finding-page-section">
        <div className="finding-page-section-header">
          <h2>Code Context</h2>
          {sourceUrl && (
            <a className="source-link text-link" href={sourceUrl} target="_blank" rel="noreferrer">
              Open on GitHub
            </a>
          )}
        </div>
        {sourceEvidence ? (
          <section className="source-context">
            <div className="source-context-header">
              <strong>{sourceEvidence.path}</strong>
              <span>{sourceEvidence.language ?? 'Code'}</span>
            </div>
            <pre>
              <code>
                {sourceEvidence.content.split('\n').map((content, index) => {
                  const number = sourceEvidence.startLine + index;
                  const target =
                    number >= sourceEvidence.targetStartLine &&
                    number <= sourceEvidence.targetEndLine;
                  return (
                    <span
                      key={number}
                      className={`source-line${target ? ' source-line-target' : ''}`}
                    >
                      <span className="source-line-number">{number}</span>
                      <span className="source-line-content">{content || ' '}</span>
                    </span>
                  );
                })}
              </code>
            </pre>
          </section>
        ) : (
          <div className="source-context-empty">
            {finding.location && <code>{findingLocation(finding)}</code>}
            <p>No source snippet was retained for this finding.</p>
          </div>
        )}
      </section>
      <details className="finding-page-section finding-metadata-disclosure">
        <summary>Finding Details</summary>
        <dl className="finding-page-metadata">
          {metadata.map(([label, value]) => (
            <div className="finding-detail-item" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </article>
  );
}

interface Selection {
  finding: FindingFeedItem;
  trigger: HTMLButtonElement;
  revision: number;
}

interface InspectorProps {
  selected: Selection;
  close: () => void;
}

function Inspector({ selected, close }: InspectorProps): JSX.Element {
  const { finding, trigger } = selected;
  const [attempt, setAttempt] = useState(0);
  const request = useMemo(() => dashboardApi.finding(finding.id), [finding.id]);
  const detail = useQuery(request, attempt);
  const title = useRef<HTMLHeadingElement>(null);
  const location = useLocation();
  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 720px)').matches;
    if (!narrow) trigger.scrollIntoView({ block: 'nearest' });
    title.current?.focus({ preventScroll: !narrow });
  }, [trigger]);
  let content: JSX.Element;
  if (detail.status === 'loading') {
    content = <div className="empty">Loading evidence…</div>;
  } else if (detail.status === 'success') {
    content = <FindingArticle detail={detail.data} />;
  } else {
    content = (
      <div className="inspector-error">
        <p>Could not load the evidence. Try again.</p>
        <button
          type="button"
          className="quiet-button"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Try again
        </button>
      </div>
    );
  }
  return (
    <aside
      id="finding-inspector"
      className="finding-inspector"
      aria-labelledby="inspector-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          close();
        }
      }}
    >
      <header className="inspector-header">
        <div className="inspector-actions">
          <span className="inspector-id">{finding.displayId}</span>
          <Link
            className="text-link"
            to={`/findings/${encodeURIComponent(finding.id)}${location.search}`}
          >
            Open full page
          </Link>
          <button
            type="button"
            className="quiet-button inspector-close"
            aria-label="Close finding"
            onClick={close}
          >
            Close
          </button>
        </div>
        <h2 ref={title} id="inspector-title" tabIndex={-1}>
          {finding.title}
        </h2>
        <p>
          {finding.repository.fullName} · {finding.skill}
        </p>
      </header>
      <div className="inspector-body" aria-live="polite" aria-busy={detail.status === 'loading'}>
        {content}
      </div>
    </aside>
  );
}

interface FindingsProps {
  data: FindingListResponse;
}

/** Keep the feed visible while users inspect findings. */
export function Findings({ data }: FindingsProps): JSX.Element {
  const [params] = useSearchParams();
  const update = useFilterNavigation();
  const [selected, setSelected] = useState<Selection | null>(null);
  const current = params.get('findingOutcome') ?? '';
  const statuses: [string, string][] = [
    ['', 'All findings'],
    ['posted', 'Posted'],
    ['resolved', 'Resolved'],
    ['rejected', 'Rejected'],
  ];
  if (current && !statuses.some(([value]) => value === current))
    statuses.push([current, current.charAt(0).toUpperCase() + current.slice(1)]);
  const next = new URLSearchParams(params);
  if (data.nextCursor) next.set('cursor', data.nextCursor);
  const close = () => {
    selected?.trigger.focus();
    setSelected(null);
  };
  return (
    <section className="findings-section">
      <div className="findings-toolbar">
        <nav className="status-navigation" aria-label="Finding status shortcuts">
          {statuses.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="status-tab"
              aria-pressed={current === value}
              onClick={() => update({ findingOutcome: value })}
            >
              {label}
            </button>
          ))}
        </nav>
        <span className="feed-count">{formatNumber(data.items.length)} on this page</span>
      </div>
      {data.items.length ? (
        <div className={`review-workspace${selected ? ' has-inspector' : ''}`}>
          <div className="review-feed">
            <div className="feed-heading">
              <h2>Latest Findings</h2>
              <span>Newest runs first</span>
            </div>
            <ul className="finding-list" aria-label="Findings">
              {data.items.map((finding) => (
                <li key={finding.id}>
                  <button
                    type="button"
                    className="finding-item"
                    data-finding-id={finding.id}
                    aria-pressed={selected?.finding.id === finding.id}
                    aria-controls="finding-inspector"
                    onClick={(event) =>
                      setSelected({
                        finding,
                        trigger: event.currentTarget,
                        revision: (selected?.revision ?? 0) + 1,
                      })
                    }
                  >
                    <span className="finding-priority">
                      <span className={`severity ${finding.severity}`}>{finding.severity}</span>
                      <span className="finding-display-id">{finding.displayId}</span>
                    </span>
                    <span className="finding-summary">
                      <span className="finding-title">{finding.title}</span>
                      <span className="finding-context">
                        <span className="finding-repository">{finding.repository.fullName}</span>
                        <span className="finding-skill">{finding.skill}</span>
                      </span>
                      <span className="finding-location">{findingLocation(finding)}</span>
                    </span>
                    <span className="finding-observation">
                      <span className={`finding-status ${finding.outcome ?? ''}`}>
                        {outcomeLabel(finding)}
                      </span>
                      <DateTime value={finding.lastObservedAt} relative />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {data.nextCursor && (
              <div className="pagination">
                <Link className="text-link" to={`/?${next}`}>
                  Next page
                </Link>
              </div>
            )}
          </div>
          {selected ? (
            <Inspector
              key={`${selected.finding.id}-${selected.revision}`}
              selected={selected}
              close={close}
            />
          ) : (
            <aside id="finding-inspector" className="finding-inspector" hidden />
          )}
        </div>
      ) : (
        <div className="empty-findings">
          <h2>Nothing matches these filters</h2>
          <p>Try a wider date range or clear the finding filters.</p>
          <button
            type="button"
            className="quiet-button"
            onClick={() => update({ query: '', severity: '', skill: '', findingOutcome: '' })}
          >
            Clear finding filters
          </button>
        </div>
      )}
    </section>
  );
}
