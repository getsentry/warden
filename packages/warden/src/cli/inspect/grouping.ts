/**
 * Grouping helpers for the `warden inspect` TUI.
 *
 * Pure functions — safe to test without Ink or React.
 */

import type { Severity } from '../../types/index.js';
import type { InspectFinding } from './session.js';
import type { ResolvedSource } from './source.js';

// ---------------------------------------------------------------------------
// Severity groups
// ---------------------------------------------------------------------------

/** Display order for severity groups (most severe first). */
export const DISPLAY_SEVERITY_ORDER: Severity[] = ['high', 'medium', 'low'];

export interface SeverityGroup {
  severity: Severity;
  findings: InspectFinding[];
}

/**
 * Partition unreviewed findings into per-severity groups in display order.
 * Empty groups are omitted.
 */
export function groupBySeverity(unreviewed: InspectFinding[]): SeverityGroup[] {
  const buckets = new Map<Severity, InspectFinding[]>(
    DISPLAY_SEVERITY_ORDER.map((s) => [s, []]),
  );

  for (const item of unreviewed) {
    buckets.get(item.finding.severity)?.push(item);
  }

  const groups: SeverityGroup[] = [];
  for (const severity of DISPLAY_SEVERITY_ORDER) {
    const findings = buckets.get(severity) ?? [];
    if (findings.length > 0) {
      groups.push({ severity, findings });
    }
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Flat list helpers (used by pane for arrow navigation)
// ---------------------------------------------------------------------------

/**
 * Build a flat list of all unreviewed + reviewed findings in display order,
 * suitable for index-based cursor navigation.
 *
 * Layout: severity groups (in DISPLAY_SEVERITY_ORDER) then reviewed block.
 */
export function flatFindingList(
  unreviewed: InspectFinding[],
  reviewed: InspectFinding[],
): InspectFinding[] {
  const byGroup = groupBySeverity(unreviewed);
  const flat: InspectFinding[] = [];
  for (const g of byGroup) {
    flat.push(...g.findings);
  }
  flat.push(...reviewed);
  return flat;
}

// ---------------------------------------------------------------------------
// Source pane title helpers
// ---------------------------------------------------------------------------

/**
 * Return the display title for the Source pane based on the resolved source.
 */
export function sourcePaneTitle(source: ResolvedSource | null): string {
  if (!source) return 'Source';
  if (source.kind === 'snippet') return source.title;
  if (source.kind === 'file') return source.title;
  return 'Source';
}

// ---------------------------------------------------------------------------
// Marked-line range helpers
// ---------------------------------------------------------------------------

/**
 * Return whether a given 1-based line number falls within the highlighted
 * range for the selected finding.
 */
export function isMarkedLine(lineNo: number, startLine?: number, endLine?: number): boolean {
  if (startLine === undefined) return false;
  const end = endLine ?? startLine;
  return lineNo >= startLine && lineNo <= end;
}

/**
 * Compute the scroll offset so that the marked range is visible within a
 * viewport of `viewHeight` lines.  Returns the 0-based index of the first
 * line to show.
 */
export function scrollToMarked(
  startLine: number | undefined,
  totalLines: number,
  viewHeight: number,
  currentOffset: number,
): number {
  if (startLine === undefined || totalLines === 0) return currentOffset;
  const targetLine = startLine - 1; // 0-based
  if (targetLine < currentOffset) {
    return Math.max(0, targetLine);
  }
  if (targetLine >= currentOffset + viewHeight) {
    return Math.max(0, targetLine - Math.floor(viewHeight / 2));
  }
  return currentOffset;
}
