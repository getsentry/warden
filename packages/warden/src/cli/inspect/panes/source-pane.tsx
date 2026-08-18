/**
 * Source pane for `warden inspect`.
 *
 * Shows a syntax-highlighted, scrollable view of the selected finding's source.
 * The pane title reflects whether the source came from an attached snippet or
 * from the working tree (ISC-6).  Marked lines (the finding range) are visually
 * distinct (ISC-7).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';
import type { ResolvedSource, SnippetSource, FileSource } from '../source.js';
import { isMarkedLine, scrollToMarked, sourcePaneTitle } from '../grouping.js';
import { highlightCodeSync, primeHighlighter } from '../highlight.js';
import { truncate } from '../../output/formatters.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SourcePaneProps {
  source: ResolvedSource | null;
  /** Whether this pane starts auto-focused. */
  autoFocus?: boolean;
  /** Explicit terminal-backed height so the pane fills its column. */
  height: number;
  /** Explicit terminal-backed width so long lines truncate instead of wrapping. */
  width: number;
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

/** Visible width of the line-number + marker gutter, e.g. `  42 │ `. */
const GUTTER_WIDTH = 7;
/** Rounded border consumes one column on each side. */
const BORDER_X = 2;

export function SourcePane({ source, autoFocus, height, width }: SourcePaneProps): React.ReactElement {
  const { isFocused } = useFocus({ id: 'source', autoFocus });

  // Border (2) + pinned title row (1).
  const viewHeight = Math.max(1, height - 3);
  const innerWidth = Math.max(1, width - BORDER_X);
  const codeWidth = Math.max(8, innerWidth - GUTTER_WIDTH);

  const [scrollOffset, setScrollOffset] = useState(0);
  const [highlighterReady, setHighlighterReady] = useState(false);

  // Prime the highlighter once on mount, then re-render so ANSI colors appear.
  useEffect(() => {
    void primeHighlighter().then(() => setHighlighterReady(true));
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
  }, [source, viewHeight]);

  const handleScroll = useCallback(
    (input: string, key: { upArrow: boolean; downArrow: boolean }) => {
      if (!isFocused) return;
      if (!source || source.kind === 'empty') return;
      const { lines } = getSourceLines(source);
      const maxOffset = Math.max(0, lines.length - viewHeight);
      if (key.upArrow || input === 'k') {
        setScrollOffset((o) => Math.max(0, o - 1));
      } else if (key.downArrow || input === 'j') {
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
    const highlightedLines = highlighterReady
      ? getHighlightedLines(rawLines, language)
      : rawLines;

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
          const rawLine = visibleRaw[idx] ?? '';
          const highlighted = visibleHighlighted[idx] ?? rawLine;
          // Clip the raw line first so Yoga measures a one-row width even when
          // the highlighter injects ANSI sequences.
          const displayLine = rawLine.length > codeWidth
            ? truncate(rawLine, codeWidth)
            : highlighted;
          const lineNoStr = String(lineNo).padStart(4, ' ');
          return (
            <Box key={lineNo} height={1} width={innerWidth} flexShrink={0}>
              <Text color={marked ? 'yellow' : 'gray'} dimColor={!marked}>
                {lineNoStr}{marked ? '▶' : '│'}
              </Text>
              {marked ? (
                <Text bold wrap="truncate">{displayLine}</Text>
              ) : (
                <Text wrap="truncate">{displayLine}</Text>
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
      width={width}
      height={height}
      flexShrink={0}
      borderStyle="round"
      borderColor={borderColor}
      overflow="hidden"
    >
      <Box height={1} width={innerWidth} flexShrink={0}>
        <Text bold color={isFocused ? 'cyan' : undefined} wrap="truncate">
          {` ${truncate(title, Math.max(8, innerWidth - 1))}`}
        </Text>
      </Box>
      {content}
    </Box>
  );
}
