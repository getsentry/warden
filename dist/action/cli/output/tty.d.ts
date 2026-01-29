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
//# sourceMappingURL=tty.d.ts.map