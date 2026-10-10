import type { DashboardSummaryResponse } from '@sentry/warden-service-api';
import { formatCost, formatNumber } from './format.js';

type Groups = DashboardSummaryResponse['breakdowns'][number]['groups'];

function BarBreakdown({
  title,
  groups,
  dimension,
}: {
  title: string;
  groups: Groups;
  dimension: string;
}) {
  const sorted = [...groups].sort((a, b) => (b.costUsd ?? 0) - (a.costUsd ?? 0)).slice(0, 7);
  const max = Math.max(...sorted.map((group) => group.costUsd ?? 0), 0.000001);
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        <span>Known cost</span>
      </div>
      {sorted.length ? (
        <div className="bar-list">
          {sorted.map((group) => (
            <div className="bar-row" key={group.dimensions[dimension]}>
              <div className="bar-label">
                <span>{group.dimensions[dimension]}</span>
                <span>{formatCost(group.costUsd)}</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${Math.max(1, ((group.costUsd ?? 0) / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">No usage in this range.</div>
      )}
    </section>
  );
}

function DailyChart({ groups }: { groups: Groups }) {
  const sorted = [...groups]
    .sort((a, b) => (a.dimensions['day'] ?? '').localeCompare(b.dimensions['day'] ?? ''))
    .slice(-30);
  const max = Math.max(...sorted.map((group) => group.costUsd ?? 0), 0.000001);
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Cost over time</h2>
        <span>Last 30 active days</span>
      </div>
      {sorted.length ? (
        <>
          <div className="daily-chart">
            {sorted.map((group) => {
              const label = `${group.dimensions['day']}: ${formatCost(group.costUsd)}`;
              return (
                <div
                  className="daily-column"
                  key={group.dimensions['day']}
                  title={label}
                  tabIndex={0}
                  role="img"
                  aria-label={label}
                >
                  <div
                    className="daily-bar"
                    style={{ height: `${Math.max(2, ((group.costUsd ?? 0) / max) * 100)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="chart-caption">
            <span>{sorted[0]?.dimensions['day']}</span>
            <span>{sorted.at(-1)?.dimensions['day']}</span>
          </div>
        </>
      ) : (
        <div className="empty">No usage in this range.</div>
      )}
    </section>
  );
}

/** Render the usage summary from the single bounded dashboard request. */
export function Usage({ summary }: { summary: DashboardSummaryResponse }) {
  const { totals } = summary;
  const metrics = [
    ['Known cost', formatCost(totals.costUsd)],
    ['Runs', formatNumber(totals.runs)],
    ['Findings', formatNumber(totals.findings)],
    ['Failed runs', formatNumber(totals.failed)],
  ];
  const groups = (dimension: string) =>
    summary.breakdowns.find((item) => item.dimension === dimension)?.groups ?? [];
  return (
    <>
      <div className="metrics">
        {metrics.map(([label, value]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <section className="section">
        <div className="section-header">
          <h2>Cost Breakdown</h2>
          <p>Reported and estimated usage</p>
        </div>
        <div className="analytics-grid">
          <DailyChart groups={groups('day')} />
          <BarBreakdown
            title="By repository"
            groups={groups('repository')}
            dimension="repository"
          />
          <BarBreakdown title="By skill" groups={groups('skill')} dimension="skill" />
        </div>
      </section>
    </>
  );
}
