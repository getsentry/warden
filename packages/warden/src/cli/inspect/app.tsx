/**
 * Root Ink application for `warden inspect`.
 *
 * Three titled sections in alternate-screen mode:
 *   - Source   (left, full height)
 *   - Findings (top-right)
 *   - Review   (bottom-right)
 *
 * Tab / Shift+Tab cycles focus between them (ISC-3).
 * q / Esc (when no modal is open) exits (ISC-14 / plan §5).
 * No mouse / onClick / SGR mouse tracking (ISC-A-3).
 *
 * The verdict modal is implemented in TODO-004 and will be wired here then.
 */

import React, { useState, useCallback } from 'react';
import { Box, useApp, useInput, useFocusManager } from 'ink';
import type { InspectSession } from './session.js';
import type { ResolvedSource } from './source.js';
import { resolveSource } from './source.js';
import { flatFindingList } from './grouping.js';
import { SourcePane } from './panes/source-pane.js';
import { FindingsPane } from './panes/findings-pane.js';
import { ReviewPane } from './panes/review-pane.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface InspectAppProps {
  session: InspectSession;
  repoRoot: string;
  /** Working-directory from the JSONL log, used as a secondary path base. */
  logCwd?: string;
}

// ---------------------------------------------------------------------------
// Focus order
// ---------------------------------------------------------------------------

const FOCUS_IDS = ['source', 'findings', 'review'] as const;
type FocusId = (typeof FOCUS_IDS)[number];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InspectApp({
  session,
  repoRoot,
  logCwd,
}: InspectAppProps): React.ReactElement {
  const { exit } = useApp();
  const { focus } = useFocusManager();

  // Selected finding index into the flat list (unreviewed groups + reviewed).
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Current focus pane (for Tab key cycling — mirrors Ink's internal focus).
  const [currentFocusIdx, setCurrentFocusIdx] = useState(0);

  const flat = flatFindingList(session.unreviewed, session.reviewed);
  const selectedFinding = flat[selectedIndex] ?? null;

  // Resolve source for the selected finding.
  const resolvedSource: ResolvedSource | null = selectedFinding
    ? resolveSource(selectedFinding.finding, { repoRoot, cwd: logCwd })
    : null;

  // Handle Tab / Shift+Tab focus cycling and q/Esc quit.
  useInput(
    useCallback(
      (input: string, key: {
        tab: boolean;
        shift: boolean;
        escape: boolean;
        return: boolean;
        upArrow: boolean;
        downArrow: boolean;
      }) => {
        if (key.tab) {
          const next = key.shift
            ? (currentFocusIdx - 1 + FOCUS_IDS.length) % FOCUS_IDS.length
            : (currentFocusIdx + 1) % FOCUS_IDS.length;
          setCurrentFocusIdx(next);
          focus(FOCUS_IDS[next] as FocusId);
          return;
        }

        if (key.escape || input === 'q') {
          exit();
          return;
        }

        // j/k navigation when findings pane is active (handled in FindingsPane
        // via its own useInput, but also handled at app level for convenience).
      },
      [currentFocusIdx, exit, focus],
    ),
  );

  const handleSelect = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  return (
    <Box flexDirection="row" width="100%" height="100%">
      {/* Left column: Source */}
      <Box width="50%" flexDirection="column" height="100%">
        <SourcePane source={resolvedSource} autoFocus />
      </Box>

      {/* Right column: Findings (top) + Review (bottom) */}
      <Box width="50%" flexDirection="column" height="100%">
        <FindingsPane
          unreviewed={session.unreviewed}
          reviewed={session.reviewed}
          selectedIndex={selectedIndex}
          onSelect={handleSelect}
        />
        <ReviewPane finding={selectedFinding} />
      </Box>
    </Box>
  );
}
