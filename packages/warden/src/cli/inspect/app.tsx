/**
 * Root Ink application for `warden inspect`.
 *
 * Three titled sections in alternate-screen mode:
 *   - Source   (left, full height)
 *   - Findings (top-right)
 *   - Review   (bottom-right)
 *
 * Tab / Shift+Tab cycles focus between them (ISC-3).
 * f / m / t (when modal is closed) open the verdict modal (ISC-8).
 * q / Esc (when no modal is open) exits (ISC-14 / plan §5).
 *
 * The modal is an overlay Box in the same Ink tree.  While open, section
 * focus input is disabled — only the modal's useInput handler is active
 * (ISC-8 constraint).
 *
 * No mouse / onClick / SGR mouse tracking (ISC-A-3).
 */

import React, { useState, useCallback } from 'react';
import { Box, useApp, useInput, useFocusManager } from 'ink';
import { useTerminalSize } from './use-terminal-size.js';
import type { InspectSession } from './session.js';
import type { ResolvedSource } from './source.js';
import { resolveSource } from './source.js';
import { flatFindingList } from './grouping.js';
import { SourcePane } from './panes/source-pane.js';
import { FindingsPane } from './panes/findings-pane.js';
import { ReviewPane } from './panes/review-pane.js';
import { VerdictModal, VERDICT_HOTKEYS } from './panes/verdict-modal.js';
import type { VerdictHotkey } from './panes/verdict-modal.js';
import type { ReviewVerdict } from './reviews.js';
import { upsertReview, saveReviews, loadReviews } from './reviews.js';
import { applyVerdict } from './session.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface InspectAppProps {
  session: InspectSession;
  repoRoot: string;
  runId: string;
  logPath: string;
  /** Working-directory from the JSONL log, used as a secondary path base. */
  logCwd?: string;
}

// ---------------------------------------------------------------------------
// Focus order
// ---------------------------------------------------------------------------

const FOCUS_IDS = ['source', 'findings', 'review'] as const;
type FocusId = (typeof FOCUS_IDS)[number];

// ---------------------------------------------------------------------------
// Modal state
// ---------------------------------------------------------------------------

interface ModalState {
  verdict: ReviewVerdict;
  /** Index into the flat finding list — which finding is being labelled. */
  findingIndex: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InspectApp({
  session: initialSession,
  repoRoot,
  runId,
  logPath,
  logCwd,
}: InspectAppProps): React.ReactElement {
  const { exit } = useApp();
  const { focus } = useFocusManager();
  const { columns, rows } = useTerminalSize();
  const sourceWidth = Math.max(20, Math.floor(columns / 2));
  const rightWidth = Math.max(20, columns - sourceWidth);
  const findingsHeight = Math.max(6, Math.floor(rows / 2));
  const reviewHeight = Math.max(6, rows - findingsHeight);

  // Live session state — updated in-memory when verdicts are saved.
  const [session, setSession] = useState<InspectSession>(initialSession);

  // Selected finding index into the flat list (unreviewed groups + reviewed).
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Current focus pane (for Tab key cycling — mirrors Ink's internal focus).
  const [currentFocusIdx, setCurrentFocusIdx] = useState(0);

  // Modal state: null = closed.
  const [modal, setModal] = useState<ModalState | null>(null);

  const flat = flatFindingList(session.unreviewed, session.reviewed);
  const selectedFinding = flat[selectedIndex] ?? null;

  // Resolve source for the selected finding.
  const resolvedSource: ResolvedSource | null = selectedFinding
    ? resolveSource(selectedFinding.finding, { repoRoot, cwd: logCwd })
    : null;

  // ---------------------------------------------------------------------------
  // Global key handler (only when modal is closed)
  // ---------------------------------------------------------------------------

  useInput(
    useCallback(
      (input: string, key: {
        tab: boolean;
        shift: boolean;
        escape: boolean;
      }) => {
        // Do not process global keys while modal is open.
        if (modal !== null) return;

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

        // Verdict hotkeys: f / m / t
        if (input in VERDICT_HOTKEYS && selectedFinding !== null) {
          const flatList = flatFindingList(session.unreviewed, session.reviewed);
          const idx = flatList.findIndex((f) => f.reviewKey === selectedFinding.reviewKey);
          setModal({
            verdict: VERDICT_HOTKEYS[input as VerdictHotkey],
            findingIndex: idx >= 0 ? idx : selectedIndex,
          });
          return;
        }
      },
      [currentFocusIdx, exit, focus, modal, selectedFinding, session, selectedIndex],
    ),
  );

  // ---------------------------------------------------------------------------
  // Modal handlers
  // ---------------------------------------------------------------------------

  const handleModalConfirm = useCallback(
    (comment: string) => {
      if (modal === null || selectedFinding === null) {
        setModal(null);
        return;
      }

      // Load the latest on-disk data so concurrent writers don't race.
      let reviewFile = loadReviews(repoRoot, runId, logPath);
      reviewFile = upsertReview(reviewFile, selectedFinding.reviewKey, {
        findingId: selectedFinding.finding.id,
        skill: selectedFinding.skill,
        verdict: modal.verdict,
        comment,
      });
      saveReviews(repoRoot, reviewFile);

      // Build the full review object to apply in-memory.
      const savedReview = reviewFile.reviews[selectedFinding.reviewKey]!;
      const nextSession = applyVerdict(session, selectedFinding.reviewKey, savedReview);
      setSession(nextSession);

      // After moving the finding to Reviewed, keep the cursor in bounds.
      const nextFlat = flatFindingList(nextSession.unreviewed, nextSession.reviewed);
      setSelectedIndex((prev) => Math.min(prev, Math.max(0, nextFlat.length - 1)));

      setModal(null);
    },
    [modal, selectedFinding, repoRoot, runId, logPath, session],
  );

  const handleModalCancel = useCallback(() => {
    setModal(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const modalFinding = modal !== null
    ? flatFindingList(session.unreviewed, session.reviewed)[modal.findingIndex] ?? selectedFinding
    : null;

  return (
    <Box
      flexDirection="row"
      width={columns}
      height={rows}
      minWidth={columns}
      minHeight={rows}
      maxWidth={columns}
      maxHeight={rows}
      flexShrink={0}
      overflow="hidden"
    >
      {/* Left column: Source */}
      <Box
        width={sourceWidth}
        height={rows}
        minWidth={sourceWidth}
        maxWidth={sourceWidth}
        minHeight={rows}
        maxHeight={rows}
        flexDirection="column"
        flexShrink={0}
        overflow="hidden"
      >
        <SourcePane source={resolvedSource} autoFocus height={rows} width={sourceWidth} />
      </Box>

      {/* Right column: Findings (top) + Review (bottom) */}
      <Box
        width={rightWidth}
        height={rows}
        minWidth={rightWidth}
        maxWidth={rightWidth}
        minHeight={rows}
        maxHeight={rows}
        flexDirection="column"
        flexShrink={0}
        overflow="hidden"
      >
        <Box
          height={findingsHeight}
          width={rightWidth}
          minHeight={findingsHeight}
          maxHeight={findingsHeight}
          minWidth={rightWidth}
          maxWidth={rightWidth}
          flexDirection="column"
          flexShrink={0}
          overflow="hidden"
        >
          <FindingsPane
            unreviewed={session.unreviewed}
            reviewed={session.reviewed}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            modalOpen={modal !== null}
            height={findingsHeight}
            width={rightWidth}
          />
        </Box>
        <Box
          height={reviewHeight}
          width={rightWidth}
          minHeight={reviewHeight}
          maxHeight={reviewHeight}
          minWidth={rightWidth}
          maxWidth={rightWidth}
          flexDirection="column"
          flexShrink={0}
          overflow="hidden"
        >
          <ReviewPane finding={selectedFinding} height={reviewHeight} width={rightWidth} />
        </Box>

        {/* Verdict modal overlay — rendered as last child on the right column */}
        {modal !== null && modalFinding !== null && (
          <Box
            position="absolute"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            width="100%"
            height="100%"
          >
            <VerdictModal
              verdict={modal.verdict}
              findingTitle={modalFinding.finding.title}
              onConfirm={handleModalConfirm}
              onCancel={handleModalCancel}
              initialComment={modalFinding.review?.comment ?? ''}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
