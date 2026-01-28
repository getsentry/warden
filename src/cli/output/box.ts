import chalk from 'chalk';
import type { OutputMode } from './tty.js';

/**
 * Unicode box-drawing characters for TTY mode.
 */
const BOX = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  leftT: '├',
  rightT: '┤',
} as const;

/**
 * Options for creating a box.
 */
export interface BoxOptions {
  /** Title displayed in the header (left side) */
  title: string;
  /** Badge displayed in the header (right side, e.g., duration) */
  badge?: string;
  /** Output mode for TTY vs non-TTY rendering */
  mode: OutputMode;
  /** Minimum width for the box (default: 50) */
  minWidth?: number;
}

/**
 * Renders box-style containers for terminal output.
 * Supports TTY mode with Unicode box characters and CI mode with plain text.
 */
export class BoxRenderer {
  private readonly title: string;
  private readonly badge: string | undefined;
  private readonly mode: OutputMode;
  private readonly width: number;
  private readonly lines: string[] = [];

  constructor(options: BoxOptions) {
    this.title = options.title;
    this.badge = options.badge;
    this.mode = options.mode;

    // Calculate width based on terminal columns, with min/max constraints
    const minWidth = options.minWidth ?? 50;
    const maxWidth = Math.min(options.mode.columns - 2, 100);
    this.width = Math.max(minWidth, maxWidth);
  }

  /**
   * Render the top border with title and optional badge.
   * TTY: ┌─ title ─────────────────────── badge ─┐
   * CI:  === title (badge) ===
   */
  header(): this {
    if (this.mode.isTTY) {
      const titlePart = `${BOX.horizontal} ${this.title} `;
      const badgePart = this.badge ? ` ${this.badge} ${BOX.horizontal}` : BOX.horizontal;
      const titleLen = this.stripAnsi(titlePart).length;
      const badgeLen = this.stripAnsi(badgePart).length;
      const fillLen = Math.max(0, this.width - titleLen - badgeLen - 2);
      const fill = BOX.horizontal.repeat(fillLen);

      this.lines.push(
        chalk.dim(BOX.topLeft) +
          chalk.dim(BOX.horizontal + ' ') +
          chalk.bold(this.title) +
          chalk.dim(' ' + fill) +
          (this.badge ? chalk.dim(` ${this.badge} `) : '') +
          chalk.dim(BOX.horizontal + BOX.topRight)
      );
    } else {
      const badgePart = this.badge ? ` (${this.badge})` : '';
      this.lines.push(`=== ${this.title}${badgePart} ===`);
    }
    return this;
  }

  /**
   * Get the available content width (excluding borders and padding).
   */
  get contentWidth(): number {
    return this.width - 4; // 2 for borders + 2 for padding spaces
  }

  /**
   * Add content lines with side borders (TTY) or plain (CI).
   * Long lines are automatically wrapped to fit within the box.
   */
  content(contentLines: string | string[]): this {
    const lines = Array.isArray(contentLines) ? contentLines : [contentLines];

    for (const line of lines) {
      // Wrap long lines to fit within the box
      const wrappedLines = this.wrapLine(line);

      for (const wrappedLine of wrappedLines) {
        if (this.mode.isTTY) {
          const strippedLen = this.stripAnsi(wrappedLine).length;
          const padding = Math.max(0, this.width - strippedLen - 4);
          this.lines.push(
            chalk.dim(BOX.vertical) + ' ' + wrappedLine + ' '.repeat(padding) + ' ' + chalk.dim(BOX.vertical)
          );
        } else {
          this.lines.push(wrappedLine);
        }
      }
    }
    return this;
  }

  /**
   * Wrap a line to fit within the content width.
   * Preserves leading indentation on wrapped lines.
   */
  private wrapLine(line: string): string[] {
    const maxWidth = this.contentWidth;
    const stripped = this.stripAnsi(line);

    // If it fits, return as-is
    if (stripped.length <= maxWidth) {
      return [line];
    }

    // For lines with ANSI codes, we need to be careful.
    // For simplicity, if the line has ANSI codes and is too long,
    // we'll wrap the stripped version and lose formatting on continuation lines.
    const hasAnsi = line !== stripped;

    // Detect leading indentation
    const indentMatch = stripped.match(/^(\s*)/);
    const indent = indentMatch?.[1] ?? '';
    const textToWrap = hasAnsi ? stripped : line;

    const result: string[] = [];
    let remaining = textToWrap;
    let isFirstLine = true;

    while (remaining.length > 0) {
      const currentIndent = isFirstLine ? '' : indent;
      const availableWidth = maxWidth - currentIndent.length;

      if (this.stripAnsi(remaining).length <= availableWidth) {
        result.push(currentIndent + remaining);
        break;
      }

      // Find a good break point (prefer word boundaries)
      let breakPoint = availableWidth;
      const searchStart = Math.max(0, availableWidth - 20);

      for (let i = availableWidth; i >= searchStart; i--) {
        if (remaining[i] === ' ') {
          breakPoint = i;
          break;
        }
      }

      // If no space found, hard break at max width
      if (breakPoint === availableWidth && remaining[availableWidth] !== ' ') {
        breakPoint = availableWidth;
      }

      const chunk = remaining.slice(0, breakPoint);
      result.push(currentIndent + chunk);

      // Skip the space at the break point if there is one
      remaining = remaining.slice(breakPoint).trimStart();
      isFirstLine = false;
    }

    return result;
  }

  /**
   * Add an empty content line.
   */
  blank(): this {
    return this.content('');
  }

  /**
   * Render a horizontal divider.
   * TTY: ├─────────────────────────────────────────────┤
   * CI:  ---
   */
  divider(): this {
    if (this.mode.isTTY) {
      const fill = BOX.horizontal.repeat(this.width - 2);
      this.lines.push(chalk.dim(BOX.leftT + fill + BOX.rightT));
    } else {
      this.lines.push('---');
    }
    return this;
  }

  /**
   * Render the bottom border.
   * TTY: └─────────────────────────────────────────────┘
   * CI:  (nothing in CI mode - just ends)
   */
  footer(): this {
    if (this.mode.isTTY) {
      const fill = BOX.horizontal.repeat(this.width - 2);
      this.lines.push(chalk.dim(BOX.bottomLeft + fill + BOX.bottomRight));
    }
    return this;
  }

  /**
   * Get all rendered lines.
   */
  render(): string[] {
    return [...this.lines];
  }

  /**
   * Get the rendered output as a single string.
   */
  toString(): string {
    return this.lines.join('\n');
  }

  /**
   * Strip ANSI escape codes from a string for length calculation.
   */
  private stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }
}
