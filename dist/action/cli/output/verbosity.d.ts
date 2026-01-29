/**
 * Verbosity levels for CLI output.
 */
export declare enum Verbosity {
    /** Errors + final summary only */
    Quiet = 0,
    /** Normal output with progress */
    Normal = 1,
    /** Real-time findings, hunk details */
    Verbose = 2,
    /** Token counts, latencies, debug info */
    Debug = 3
}
/**
 * Parse verbosity from CLI flags.
 * @param quiet - If true, return Quiet
 * @param verboseCount - Number of -v flags (0, 1, or 2+)
 */
export declare function parseVerbosity(quiet: boolean, verboseCount: number): Verbosity;
//# sourceMappingURL=verbosity.d.ts.map