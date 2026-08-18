/**
 * Centered verdict modal overlay for `warden inspect`.
 *
 * Rendered in the same Ink tree as an overlay Box when `f`, `m`, or `t` is
 * pressed (ISC-8).  While open, only comment editing, Enter, and Esc are
 * active (section focus is disabled at the app level).
 *
 * Enter calls `onConfirm` with the current comment and closes.
 * Esc calls `onCancel` with no write (ISC-9).
 *
 * Comments may be empty (ISC-13).  Backspace / Delete supported.
 * No mouse / onClick handling (ISC-A-3).
 */

import React, { useCallback, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ReviewVerdict } from '../reviews.js';

// ---------------------------------------------------------------------------
// Hotkey mapping (ISC-8)
// ---------------------------------------------------------------------------

export const VERDICT_HOTKEYS = {
  f: 'false_positive',
  m: 'mitigated',
  t: 'true_positive',
} as const satisfies Record<string, ReviewVerdict>;

export type VerdictHotkey = keyof typeof VERDICT_HOTKEYS;

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const VERDICT_LABEL: Record<ReviewVerdict, string> = {
  false_positive: 'False Positive',
  mitigated: 'Mitigated',
  true_positive: 'True Positive',
};

const VERDICT_COLOR: Record<ReviewVerdict, string> = {
  false_positive: 'yellow',
  mitigated: 'blue',
  true_positive: 'green',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface VerdictModalProps {
  /** The verdict preset for this modal open (maps from hotkey). */
  verdict: ReviewVerdict;
  /** Title of the finding being labelled, shown in the modal header. */
  findingTitle: string;
  /** Called with the final comment when Enter is pressed. */
  onConfirm: (comment: string) => void;
  /** Called with no arguments when Esc is pressed (no write). */
  onCancel: () => void;
  /** Existing comment to pre-fill when reopening a reviewed finding. */
  initialComment?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VerdictModal({
  verdict,
  findingTitle,
  onConfirm,
  onCancel,
  initialComment = '',
}: VerdictModalProps): React.ReactElement {
  const [comment, setComment] = useState(initialComment);

  const label = VERDICT_LABEL[verdict];
  const color = VERDICT_COLOR[verdict];

  const handleInput = useCallback(
    (input: string, key: {
      return: boolean;
      escape: boolean;
      backspace: boolean;
      delete: boolean;
      ctrl: boolean;
    }) => {
      if (key.return) {
        onConfirm(comment);
        return;
      }

      if (key.escape) {
        onCancel();
        return;
      }

      if (key.backspace || key.delete) {
        setComment((prev) => prev.slice(0, -1));
        return;
      }

      // Ctrl+U: clear line (common terminal shortcut)
      if (key.ctrl && input === 'u') {
        setComment('');
        return;
      }

      // Printable characters only (no control chars, no tab).
      if (input && !key.ctrl && input !== '\t') {
        setComment((prev) => prev + input);
      }
    },
    [comment, onConfirm, onCancel],
  );

  useInput(handleInput);

  return (
    // Full-screen overlay using absolute positioning via zIndex + alignItems.
    // Ink doesn't support z-index or absolute positioning natively, so we
    // render this as the last child in a relative-positioned container with
    // marginTop auto to push it visually to the centre of the right column.
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={color}
      paddingX={2}
      paddingY={1}
      width={60}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={color}>
          {label}
        </Text>
        <Text dimColor> — </Text>
        <Text dimColor>{findingTitle.length > 36 ? findingTitle.slice(0, 33) + '...' : findingTitle}</Text>
      </Box>

      {/* Comment input */}
      <Box flexDirection="column">
        <Text bold dimColor>Comment (optional):</Text>
        <Box marginTop={1}>
          <Text color="white">{comment}</Text>
          <Text color="cyan">▌</Text>
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>Enter to confirm · Esc to cancel</Text>
      </Box>
    </Box>
  );
}
