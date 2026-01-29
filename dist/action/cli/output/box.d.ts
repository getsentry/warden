import type { OutputMode } from './tty.js';
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
export declare class BoxRenderer {
    private readonly title;
    private readonly badge;
    private readonly mode;
    private readonly width;
    private readonly lines;
    constructor(options: BoxOptions);
    /**
     * Render the top border with title and optional badge.
     * TTY: ┌─ title ─────────────────────── badge ─┐
     * CI:  === title (badge) ===
     */
    header(): this;
    /**
     * Get the available content width (excluding borders and padding).
     */
    get contentWidth(): number;
    /**
     * Add content lines with side borders (TTY) or plain (CI).
     * Long lines are automatically wrapped to fit within the box.
     */
    content(contentLines: string | string[]): this;
    /**
     * Wrap a line to fit within the content width.
     * Preserves leading indentation on wrapped lines.
     */
    private wrapLine;
    /**
     * Add an empty content line.
     */
    blank(): this;
    /**
     * Render a horizontal divider.
     * TTY: ├─────────────────────────────────────────────┤
     * CI:  ---
     */
    divider(): this;
    /**
     * Render the bottom border.
     * TTY: └─────────────────────────────────────────────┘
     * CI:  (nothing in CI mode - just ends)
     */
    footer(): this;
    /**
     * Get all rendered lines.
     */
    render(): string[];
    /**
     * Get the rendered output as a single string.
     */
    toString(): string;
    /**
     * Strip ANSI escape codes from a string for length calculation.
     */
    private stripAnsi;
}
//# sourceMappingURL=box.d.ts.map