import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useSearchParams } from 'react-router';
import type { HistoryDimensionsResponse } from '@sentry/warden-service-api';
import type { RemoteData } from './runtime.js';

interface Choice {
  value: string;
  label: string;
}
const ranges: Choice[] = [
  { value: 'all', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];
const severities: Choice[] = ['', 'high', 'medium', 'low'].map((value) => ({
  value,
  label: value ? value.charAt(0).toUpperCase() + value.slice(1) : 'All severities',
}));
const outcomes: Choice[] = [
  '',
  'posted',
  'resolved',
  'rejected',
  'revised',
  'deduped',
  'skipped',
  'failed',
].map((value) => ({
  value,
  label: value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Any status',
}));

interface SelectFieldProps {
  name: string;
  label: string;
  value: string;
  choices: Choice[];
  onChange: (name: string, value: string) => void;
}

function SelectField({ name, label, value, choices, onChange }: SelectFieldProps): JSX.Element {
  const available = choices.some((item) => item.value === value)
    ? choices
    : [...choices, { value, label: name === 'repositoryId' ? 'Selected repository' : value }];
  return (
    <label className="field">
      <span>{label}</span>
      <select name={name} value={value} onChange={(event) => onChange(name, event.target.value)}>
        {available.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Build shared API filters while keeping finding-specific filters in the browser URL. */
export function commonApiParams(params: URLSearchParams): URLSearchParams {
  const result = new URLSearchParams();
  for (const name of ['repositoryId', 'skill']) {
    const value = params.get(name);
    if (value) result.set(name, value);
  }
  const days = Number(params.get('range'));
  if (Number.isFinite(days) && days > 0)
    result.set('from', new Date(Date.now() - days * 86_400_000).toISOString());
  return result;
}

/** Update one filter without discarding filters belonging to the other dashboard tab. */
export function useFilterNavigation(): (values: Record<string, string>) => void {
  const [params, setParams] = useSearchParams();
  const latest = useRef(params);
  useEffect(() => {
    latest.current = params;
  }, [params]);
  return (values: Record<string, string>) => {
    // A debounced search may finish after another filter changes.
    const next = new URLSearchParams(latest.current);
    next.delete('cursor');
    for (const [name, value] of Object.entries(values)) {
      const normalized = value.trim();
      if (normalized) next.set(name, normalized);
      else next.delete(name);
    }
    setParams(next, { replace: true });
  };
}

interface FiltersProps {
  usage: boolean;
  dimensions: RemoteData<HistoryDimensionsResponse>;
}

/** Keep filters usable while their choices load. */
export function Filters({ usage, dimensions }: FiltersProps): JSX.Element {
  const [params] = useSearchParams();
  const update = useFilterNavigation();
  const [query, setQuery] = useState(params.get('query') ?? '');
  const [expanded, setExpanded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const advanced = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const urlQuery = params.get('query') ?? '';
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);
  useEffect(() => {
    if (!expanded) return;
    const close = (event: MouseEvent) => {
      if (event.target instanceof Node && !advanced.current?.contains(event.target))
        setExpanded(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
        summary.current?.focus();
      }
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', escape);
    };
  }, [expanded]);
  const available =
    dimensions.status === 'success' ? dimensions.data : { repositories: [], skills: [] };
  const counts = new Map<string, number>();
  for (const item of available.repositories)
    counts.set(item.repository.fullName, (counts.get(item.repository.fullName) ?? 0) + 1);
  const repositories = available.repositories
    .map((item) => ({
      value: item.id,
      label:
        (counts.get(item.repository.fullName) ?? 0) > 1
          ? `${item.repository.fullName} (${item.repository.provider})`
          : item.repository.fullName,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const skills = available.skills
    .map((value) => ({ value, label: value }))
    .sort((a, b) => a.label.localeCompare(b.label));
  function field(name: string, label: string, choices: Choice[]): JSX.Element {
    return (
      <SelectField
        name={name}
        label={label}
        value={params.get(name) ?? (name === 'range' ? '30' : '')}
        choices={choices}
        onChange={(key, value) => {
          clearTimeout(timer.current);
          update({ [key]: value, ...(usage ? {} : { query }) });
        }}
      />
    );
  }
  const skill = field('skill', 'Skill', [{ value: '', label: 'All skills' }, ...skills]);
  const chips = ['skill', 'severity'].filter((name) => params.get(name));
  return (
    <form
      className={`filter-bar${usage ? ' usage-filters' : ''}`}
      aria-label={usage ? 'Usage filters' : 'Finding filters'}
      onSubmit={(event) => {
        event.preventDefault();
        clearTimeout(timer.current);
        if (!usage) update({ query });
      }}
    >
      <div className="filter-main">
        {!usage && (
          <label className="field search-field">
            <span>Search findings</span>
            <input
              type="search"
              name="query"
              placeholder="Search findings, files, or descriptions…"
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                clearTimeout(timer.current);
                timer.current = setTimeout(() => update({ query: value }), 250);
              }}
            />
          </label>
        )}
        {field('repositoryId', 'Repository', [
          { value: '', label: 'All repositories' },
          ...repositories,
        ])}
        {usage && skill}
        {field('range', 'Time', ranges)}
        {!usage && (
          <details
            ref={advanced}
            className="advanced-filters"
            open={expanded}
            onToggle={(event) => setExpanded(event.currentTarget.open)}
          >
            <summary ref={summary}>Filters{chips.length ? ` · ${chips.length}` : ''}</summary>
            <div className="advanced-filter-controls">
              {skill}
              {field('severity', 'Severity', severities)}
              {field('findingOutcome', 'Finding status', outcomes)}
            </div>
          </details>
        )}
      </div>
      {!usage && (
        <div className="active-filters" hidden={!chips.length}>
          {chips.map((name) => (
            <button
              key={name}
              type="button"
              className="filter-chip"
              aria-label={`Clear ${name} filter`}
              onClick={() => {
                update({ [name]: '' });
                summary.current?.focus();
              }}
            >
              {name === 'severity'
                ? severities.find((item) => item.value === params.get(name))?.label
                : params.get(name)}{' '}
              ×
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
