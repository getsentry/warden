import type { FindingFeedItem } from '@sentry/warden-service-api';

/** Format known costs without presenting missing usage as free. */
export function formatCost(value: number | null): string {
  return value === null
    ? 'Unknown'
    : new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: value < 1 ? 4 : 2,
      }).format(value);
}

/** Format an aggregate count using the browser locale. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

/** Display timestamps consistently in finding and account views. */
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

/** Retain an absolute timestamp even when the feed shows relative time. */
export function DateTime({
  value,
  relative = false,
}: {
  value: string | null;
  relative?: boolean;
}) {
  if (!value) return <span>Not reported</span>;
  let label = formatDate(value);
  if (relative) {
    const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60_000);
    const unit = Math.abs(minutes) < 60 ? 'minute' : Math.abs(minutes) < 1440 ? 'hour' : 'day';
    label = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(
      Math.round(minutes / (unit === 'minute' ? 1 : unit === 'hour' ? 60 : 1440)),
      unit,
    );
  }
  return (
    <time dateTime={value} title={new Date(value).toISOString()}>
      {label}
    </time>
  );
}

/** Distinguish delivery skipped after a PR update from other skipped findings. */
export function outcomeLabel(finding: FindingFeedItem): string {
  if (finding.outcome === 'skipped' && finding.outcomeReason === 'pull_request_changed')
    return 'Not posted: PR changed';
  return finding.outcome
    ? finding.outcome.charAt(0).toUpperCase() + finding.outcome.slice(1)
    : 'Delivery not tracked';
}

/** Explain incomplete delivery records and stale PR results. */
export function outcomeDescription(finding: FindingFeedItem): string {
  if (finding.outcome === 'skipped' && finding.outcomeReason === 'pull_request_changed')
    return 'Warden did not post this finding because the pull request changed before Warden finished. It refers to an older commit; the newer run reviews the updated code.';
  if (finding.outcome === 'skipped' && finding.outcomeReason === 'review_not_posted')
    return 'Skipped because Warden could not verify that the pull request was still current, so it did not add review feedback.';
  if (!finding.outcome)
    return 'Warden did not record how this finding was delivered. Scheduled scans and older runs may omit this data.';
  return outcomeLabel(finding);
}

/** Render a source location consistently in the feed and full finding. */
export function findingLocation(finding: FindingFeedItem): string {
  if (!finding.location) return '—';
  const { path, startLine, endLine } = finding.location;
  return `${path}:${startLine}${endLine && endLine !== startLine ? `-${endLine}` : ''}`;
}
