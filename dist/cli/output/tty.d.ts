/**
 * Output mode configuration based on terminal capabilities.
 */
export interface OutputMode {
    /** Whether stdout is a TTY */
    isTTY: boolean;
    /** Whether colors are supported */
    supportsColor: boolean;
    /** Terminal width in columns */
    columns: number;
}
/**
 * Detect terminal capabilities.
 * @param colorOverride - Optional override for color support (--color / --no-color)
 */
export declare function detectOutputMode(colorOverride?: boolean): OutputMode;
/**
 * Get a timestamp for CI/non-TTY output.
 */
export declare function timestamp(): string;
/**
 * Log a timestamped action message to stderr.
 * Used by action workflow steps (dedup, fix eval, stale resolution) for consistent output.
 */
export declare function logAction(message: string): void;
/**
 * Log a timestamped warning to stderr.
 */
export declare function warnAction(message: string): void;
//# sourceMappingURL=tty.d.ts.map