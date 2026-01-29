/**
 * Verbosity levels for CLI output.
 */
export var Verbosity;
(function (Verbosity) {
    /** Errors + final summary only */
    Verbosity[Verbosity["Quiet"] = 0] = "Quiet";
    /** Normal output with progress */
    Verbosity[Verbosity["Normal"] = 1] = "Normal";
    /** Real-time findings, hunk details */
    Verbosity[Verbosity["Verbose"] = 2] = "Verbose";
    /** Token counts, latencies, debug info */
    Verbosity[Verbosity["Debug"] = 3] = "Debug";
})(Verbosity || (Verbosity = {}));
/**
 * Parse verbosity from CLI flags.
 * @param quiet - If true, return Quiet
 * @param verboseCount - Number of -v flags (0, 1, or 2+)
 */
export function parseVerbosity(quiet, verboseCount) {
    if (quiet) {
        return Verbosity.Quiet;
    }
    if (verboseCount >= 2) {
        return Verbosity.Debug;
    }
    if (verboseCount === 1) {
        return Verbosity.Verbose;
    }
    return Verbosity.Normal;
}
//# sourceMappingURL=verbosity.js.map