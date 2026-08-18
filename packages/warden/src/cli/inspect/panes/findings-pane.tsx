/**
 * Findings pane for `warden inspect`.
 *
 * Shows unreviewed findings grouped and color-coded by severity, then a
 * **Reviewed** block.  j/k or arrow keys move the selection when this pane
 * is focused (ISC-4).
 */

import React, { useCallback } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';
import type { Severity } from '../../../types/index.js';
import type { InspectFinding } from '../session.js';
import type { FindingReview } from '../reviews.js';
import { groupBySeverity, flatFindingList, DISPLAY_SEVERITY_ORDER } from '../grouping.js';
import { truncate } from '../../output/formatters.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FindingsPaneProps {
  unreviewed: InspectFinding[];
  reviewed: InspectFinding[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** When true, the modal is open and this pane must not process navigation. */
  modalOpen?: boolean;
  /** Explicit terminal-backed height so the pane fills its half of the column. */
  height: number;
  /** Explicit terminal-backed width. */
  width: number;
}

// ---------------------------------------------------------------------------
// Severity color map
// ---------------------------------------------------------------------------

const SEVERITY_COLOR: Record<Severity, string> = {
  high: 'red',
  medium: 'yellow',
  low: 'green',
};

// ---------------------------------------------------------------------------
// Verdict label helpers
// ---------------------------------------------------------------------------

function verdictLabel(review: FindingReview): string {
  switch (review.verdict) {
    case 'true_positive': return 'TP';
    case 'false_positive': return 'FP';
    case 'mitigated': return 'MI';
    default: return '??';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FindingsPane({
  unreviewed,
  reviewed,
  selectedIndex,
  onSelect,
  modalOpen = false,
  height,
  width,
}: FindingsPaneProps): React.ReactElement {
  const { isFocused } = useFocus({ id: 'findings' });

  const flat = flatFindingList(unreviewed, reviewed);
  const total = flat.length;

  // Navigation is disabled while the verdict modal is open.
  const navActive = isFocused && !modalOpen;

  const handleInput = useCallback(
    (input: string, key: { upArrow: boolean; downArrow: boolean }) => {
      if (!navActive) return;
      if (key.upArrow || input === 'k') {
        onSelect(Math.max(0, selectedIndex - 1));
      } else if (key.downArrow || input === 'j') {
        onSelect(Math.min(total - 1, selectedIndex + 1));
      }
    },
    [navActive, selectedIndex, total, onSelect],
  );

  useInput(handleInput, { isActive: navActive });

  const borderColor = isFocused ? 'cyan' : 'gray';

  // Build rows
  const groups = groupBySeverity(unreviewed);

  let rowIndex = 0;
  const rows: React.ReactElement[] = [];

  // Unreviewed groups
  for (const group of groups) {
    rows.push(
      <Box key={`group-header-${group.severity}`} height={1} flexShrink={0} paddingLeft={1}>
        <Text bold color={SEVERITY_COLOR[group.severity]} wrap="truncate">
          {group.severity.toUpperCase()}
        </Text>
      </Box>,
    );

    for (const item of group.findings) {
      const isSelected = rowIndex === selectedIndex;
      const currentRowIndex = rowIndex;
      rowIndex++;

      rows.push(
        <FindingRow
          key={item.reviewKey}
          item={item}
          isSelected={isSelected}
          onSelect={() => onSelect(currentRowIndex)}
        />,
      );
    }
  }

  // Reviewed group
  if (reviewed.length > 0) {
    rows.push(
      <Box key="group-header-reviewed" height={1} flexShrink={0} paddingLeft={1} marginTop={1}>
        <Text bold dimColor wrap="truncate">REVIEWED</Text>
      </Box>,
    );

    for (const item of reviewed) {
      const isSelected = rowIndex === selectedIndex;
      const currentRowIndex = rowIndex;
      rowIndex++;

      rows.push(
        <FindingRow
          key={item.reviewKey}
          item={item}
          isSelected={isSelected}
          onSelect={() => onSelect(currentRowIndex)}
          verdict={item.review ? verdictLabel(item.review) : undefined}
        />,
      );
    }
  }

  if (rows.length === 0) {
    rows.push(
      <Box key="empty" paddingLeft={1}>
        <Text dimColor>No findings.</Text>
      </Box>,
    );
  }

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      flexShrink={0}
      borderStyle="round"
      borderColor={borderColor}
      overflow="hidden"
    >
      <Box height={1} width={Math.max(1, width - 2)} flexShrink={0}>
        <Text bold color={isFocused ? 'cyan' : undefined} wrap="truncate">
          {' Findings'}
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {rows}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Row sub-component
// ---------------------------------------------------------------------------

interface FindingRowProps {
  item: InspectFinding;
  isSelected: boolean;
  onSelect: () => void;
  verdict?: string;
}

function FindingRow({ item, isSelected, verdict }: FindingRowProps): React.ReactElement {
  const { finding } = item;
  const severityColor = SEVERITY_COLOR[finding.severity] as string;
  const prefix = isSelected ? '▶ ' : '  ';

  return (
    <Box height={1} flexShrink={0} paddingLeft={1}>
      <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
        {prefix}
      </Text>
      <Text color={severityColor}>{finding.severity[0]?.toUpperCase() ?? ''} </Text>
      <Text color={isSelected ? 'cyan' : undefined} bold={isSelected} wrap="truncate">
        {truncate(finding.title, 48)}
      </Text>
      {verdict ? <Text dimColor> [{verdict}]</Text> : null}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Export helpers used by tests
// ---------------------------------------------------------------------------

export { DISPLAY_SEVERITY_ORDER, groupBySeverity };
