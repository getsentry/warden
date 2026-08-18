/**
 * Source pane for `warden inspect`.
 *
 * Shows a syntax-highlighted, scrollable view of the selected finding's source.
 * The pane title reflects whether the source came from an attached snippet or
 * from the working tree (ISC-6).  Marked lines (the finding range) are visually
 * distinct (ISC-7).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text, useInput, useFocus, useWindowSize } from 'ink';
import type { ResolvedSource, SnippetSource, FileSource } from '../source.js';
import { isMarkedLine, scrollToMarked, sourcePaneTitle } from '../grouping.js';
import { highlightCodeSync, primeHighlighter } from '../highlight.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SourcePaneProps {
  source: ResolvedSource | null;
  /** Whether this pane starts auto-focused. */
  autoFocus?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract lines + mark range from either source kind. */
function getSourceLines(source: ResolvedSource): {
  lines: string[];
  startLine: number | undefined;
  endLine: number | undefined;
  language: string | undefined;
} {
  if (source.kind === 'snippet') {
    const s = source as SnippetSource;
    return {
      lines: s.snippet.lines.map((l) => l.content),
      startLine: s.snippet.targetStartLine,
      endLine: s.snippet.targetEndLine,
      language: s.snippet.language,
    };
  }
  if (source.kind === 'file') {
    const f = source as FileSource;
    return {
      lines: f.lines,
      startLine: f.startLine,
      endLine: f.endLine,
      language: f.language,
    };
  }
  return { lines: [], startLine: undefined, endLine: undefined, language: undefined };
}

/** Return highlighted lines (synchronous after priming). */
function getHighlightedLines(rawLines: string[], language: string | undefined): string[] {
  if (rawLines.length === 0) return rawLines;
  const code = rawLines.join('\n');
  const highlighted = highlightCodeSync(code, { language });
  return highlighted.split('\n');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** ANSI-stripped line number prefix width. */
const LINE_NO_WIDTH = 5; // e.g. "  42 │"

export function SourcePane({ source, autoFocus }: SourcePaneProps): React.ReactElement {
  const { isFocused } = useFocus({ id: 'source', autoFocus });
  const { rows: termRows } = useWindowSize();

  // Reserve rows for the border/title line (top + bottom = 2).
  const viewHeight = Math.max(4, (termRows ?? 24) - 2 - /* other rows */ 4);

  const [scrollOffset, setScrollOffset] = useState(0);

  // Prime the highlighter once on mount.
  useEffect(() => {
    void primeHighlighter();
  }, []);

  // Auto-scroll to marked lines when source changes.
  useEffect(() => {
    if (!source || source.kind === 'empty') {
      setScrollOffset(0);
      return;
    }
    const { startLine, lines } = getSourceLines(source);
    const next = scrollToMarked(startLine, lines.length, viewHeight, 0);
    setScrollOffset(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const handleScroll = useCallback(
    (_input: string, key: { upArrow: boolean; downArrow: boolean }) => {
      if (!isFocused) return;
      if (!source || source.kind === 'empty') return;
      const { lines } = getSourceLines(source);
      const maxOffset = Math.max(0, lines.length - viewHeight);
      if (key.upArrow) {
        setScrollOffset((o) => Math.max(0, o - 1));
      } else if (key.downArrow) {
        setScrollOffset((o) => Math.min(maxOffset, o + 1));
      }
    },
    [isFocused, source, viewHeight],
  );

  useInput(handleScroll, { isActive: isFocused });

  // Title
  const title = sourcePaneTitle(source);
  const borderColor = isFocused ? 'cyan' : 'gray';

  // Content
  let content: React.ReactElement;

  if (!source || source.kind === 'empty') {
    const reason = source?.kind === 'empty' ? source.reason : 'No finding selected.';
    content = (
      <Box flexGrow={1} alignItems="center" justifyContent="center">
        <Text dimColor>{reason}</Text>
      </Box>
    );
  } else {
    const { lines: rawLines, startLine, endLine, language } = getSourceLines(source);
    const highlightedLines = getHighlightedLines(rawLines, language);

    // Clamp offset
    const maxOffset = Math.max(0, rawLines.length - viewHeight);
    const safeOffset = Math.min(scrollOffset, maxOffset);
    const visibleRaw = rawLines.slice(safeOffset, safeOffset + viewHeight);
    const visibleHighlighted = highlightedLines.slice(safeOffset, safeOffset + viewHeight);

    // Line-number base (1-based)
    const lineBase =
      source.kind === 'snippet'
        ? (source as SnippetSource).snippet.startLine
        : 1;

    content = (
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        {visibleRaw.map((_, idx) => {
          const lineNo = lineBase + safeOffset + idx;
          const marked = isMarkedLine(lineNo, startLine, endLine);
          const displayLine = visibleHighlighted[idx] ?? visibleRaw[idx] ?? '';
          const lineNoStr = String(lineNo).padStart(LINE_NO_WIDTH - 2, ' ');
          return (
            <Box key={lineNo}>
              <Text color={marked ? 'yellow' : 'gray'} dimColor={!marked}>
                {lineNoStr} {marked ? '▶' : '│'}{' '}
              </Text>
              {marked ? (
                <Text bold>{displayLine}</Text>
              ) : (
                <Text>{displayLine}</Text>
              )}
            </Box>
          );
        })}
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle="round"
      borderColor={borderColor}
      overflow="hidden"
    >
      <Box>
        <Text bold color={isFocused ? 'cyan' : undefined}>
          {' '}{title}{' '}
        </Text>
        {isFocused && (
          <Text dimColor> [j/k or ↑↓ to scroll]</Text>
        )}
      </Box>
      {content}
    </Box>
  );
}
