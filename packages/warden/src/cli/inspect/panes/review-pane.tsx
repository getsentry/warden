/**
 * Review pane for `warden inspect`.
 *
 * Shows the selected finding's full details: severity, confidence, title,
 * description, verification, location, and current verdict/comment if the
 * sidecar already has one (ISC-5).  Read-only in this todo; no verdict modal.
 */

import React, { useCallback } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';
import type { InspectFinding } from '../session.js';
import type { Severity, Confidence } from '../../../types/index.js';

// ---------------------------------------------------------------------------
// Severity / confidence color maps
// ---------------------------------------------------------------------------

const SEVERITY_COLOR: Record<Severity, string> = {
  high: 'red',
  medium: 'yellow',
  low: 'green',
};

const CONFIDENCE_COLOR: Record<Confidence, string> = {
  high: 'green',
  medium: 'yellow',
  low: 'red',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ReviewPaneProps {
  finding: InspectFinding | null;
  /** Explicit terminal-backed height so the pane fills its half of the column. */
  height: number;
  /** Explicit terminal-backed width. */
  width: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReviewPane({ finding, height, width }: ReviewPaneProps): React.ReactElement {
  const { isFocused } = useFocus({ id: 'review' });

  const borderColor = isFocused ? 'cyan' : 'gray';

  const handleInput = useCallback((_input: string, _key: unknown) => {
    // Scroll is not yet implemented in this todo (no separate scroll state).
    // This hook exists so the pane participates in focus cycling.
  }, []);

  useInput(handleInput, { isActive: isFocused });

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
          {' Review'}
        </Text>
      </Box>
      <Box flexDirection="column" paddingLeft={1} flexGrow={1}>
        {finding ? (
          <FindingDetail item={finding} />
        ) : (
          <Box flexGrow={1} alignItems="center" justifyContent="center">
            <Text dimColor>No finding selected.</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Detail sub-component
// ---------------------------------------------------------------------------

function FindingDetail({ item }: { item: InspectFinding }): React.ReactElement {
  const { finding, skill, review } = item;

  return (
    <>
      {/* Header: severity + confidence */}
      <Box>
        <Text bold color={SEVERITY_COLOR[finding.severity]}>
          {finding.severity.toUpperCase()}
        </Text>
        {finding.confidence ? (
          <Text color={CONFIDENCE_COLOR[finding.confidence]} dimColor>
            {'  '}[{finding.confidence} confidence]
          </Text>
        ) : null}
        <Text dimColor>{'  '}{skill}</Text>
      </Box>

      {/* Title */}
      <Box marginTop={1}>
        <Text bold>{finding.title}</Text>
      </Box>

      {/* Location */}
      {finding.location ? (
        <Box>
          <Text dimColor>
            {finding.location.path}
            {finding.location.startLine != null
              ? `:${finding.location.startLine}`
              : ''}
            {finding.location.endLine != null &&
            finding.location.endLine !== finding.location.startLine
              ? `-${finding.location.endLine}`
              : ''}
          </Text>
        </Box>
      ) : null}

      {/* Description */}
      <Box marginTop={1} flexDirection="column">
        <Text bold dimColor>Description</Text>
        <Text wrap="wrap">{finding.description}</Text>
      </Box>

      {/* Verification */}
      {finding.verification ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold dimColor>Verification</Text>
          <Text wrap="wrap">{finding.verification}</Text>
        </Box>
      ) : null}

      {/* Current verdict from sidecar */}
      {review ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold dimColor>Verdict</Text>
          <Box>
            <Text color="cyan">{review.verdict.replace('_', ' ')}</Text>
            {review.comment ? (
              <Text dimColor>{'  — '}{review.comment}</Text>
            ) : null}
          </Box>
        </Box>
      ) : null}
    </>
  );
}
