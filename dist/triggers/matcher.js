import { SEVERITY_ORDER } from '../types/index.js';
/** Cache for compiled glob patterns */
const globCache = new Map();
/** Clear the glob cache (useful for testing) */
export function clearGlobCache() {
    globCache.clear();
}
/**
 * Convert a glob pattern to a regex (cached).
 */
function globToRegex(pattern) {
    const cached = globCache.get(pattern);
    if (cached) {
        return cached;
    }
    // Use placeholders to avoid replacement conflicts
    let regexPattern = pattern
        // First, replace glob patterns with placeholders
        .replace(/\*\*\//g, '\0GLOBSTAR_SLASH\0')
        .replace(/\*\*/g, '\0GLOBSTAR\0')
        .replace(/\*/g, '\0STAR\0')
        .replace(/\?/g, '\0QUESTION\0');
    // Escape regex special characters
    regexPattern = regexPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    // Replace placeholders with regex patterns
    regexPattern = regexPattern
        .replace(/\0GLOBSTAR_SLASH\0/g, '(?:.*/)?') // **/ matches zero or more directories
        .replace(/\0GLOBSTAR\0/g, '.*') // ** matches anything
        .replace(/\0STAR\0/g, '[^/]*') // * matches anything except /
        .replace(/\0QUESTION\0/g, '[^/]'); // ? matches single char except /
    const regex = new RegExp(`^${regexPattern}$`);
    globCache.set(pattern, regex);
    return regex;
}
/**
 * Match a glob pattern against a file path.
 * Supports ** for recursive matching and * for single directory matching.
 */
export function matchGlob(pattern, path) {
    return globToRegex(pattern).test(path);
}
/**
 * Check if a trigger matches the given event context.
 */
export function matchTrigger(trigger, context) {
    if (trigger.event !== context.eventType) {
        return false;
    }
    // Schedule events don't have actions - they match based on whether
    // any files match the paths filter (context was already built with matching files)
    if (trigger.event === 'schedule') {
        return (context.pullRequest?.files.length ?? 0) > 0;
    }
    // For non-schedule events, actions must match
    if (!trigger.actions?.includes(context.action)) {
        return false;
    }
    const filenames = context.pullRequest?.files.map((f) => f.filename);
    const pathPatterns = trigger.filters?.paths;
    const ignorePatterns = trigger.filters?.ignorePaths;
    if (pathPatterns && filenames) {
        const hasMatch = filenames.some((file) => pathPatterns.some((pattern) => matchGlob(pattern, file)));
        if (!hasMatch) {
            return false;
        }
    }
    if (ignorePatterns && filenames) {
        const allIgnored = filenames.every((file) => ignorePatterns.some((pattern) => matchGlob(pattern, file)));
        if (allIgnored) {
            return false;
        }
    }
    return true;
}
/**
 * Check if a report has any findings at or above the given severity threshold.
 */
export function shouldFail(report, failOn) {
    const threshold = SEVERITY_ORDER[failOn];
    return report.findings.some((f) => SEVERITY_ORDER[f.severity] <= threshold);
}
/**
 * Count findings at or above the given severity threshold.
 */
export function countFindingsAtOrAbove(report, failOn) {
    const threshold = SEVERITY_ORDER[failOn];
    return report.findings.filter((f) => SEVERITY_ORDER[f.severity] <= threshold).length;
}
/**
 * Count findings of a specific severity across multiple reports.
 */
export function countSeverity(reports, severity) {
    return reports.reduce((count, report) => count + report.findings.filter((f) => f.severity === severity).length, 0);
}
//# sourceMappingURL=matcher.js.map