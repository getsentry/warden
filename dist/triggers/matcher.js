import { SEVERITY_ORDER } from '../types/index.js';
/** Maximum number of patterns to cache (LRU eviction when exceeded) */
const GLOB_CACHE_MAX_SIZE = 1000;
/** Cache for compiled glob patterns with LRU eviction */
const globCache = new Map();
/** Clear the glob cache (useful for testing) */
export function clearGlobCache() {
    globCache.clear();
}
/** Get current cache size (useful for testing) */
export function getGlobCacheSize() {
    return globCache.size;
}
/**
 * Convert a glob pattern to a regex (cached with LRU eviction).
 */
function globToRegex(pattern) {
    const cached = globCache.get(pattern);
    if (cached) {
        // Move to end for LRU ordering (delete and re-add)
        globCache.delete(pattern);
        globCache.set(pattern, cached);
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
    // Evict oldest entry if cache is full
    if (globCache.size >= GLOB_CACHE_MAX_SIZE) {
        const oldestKey = globCache.keys().next().value;
        if (oldestKey !== undefined) {
            globCache.delete(oldestKey);
        }
    }
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
 * Check if a file list matches the path filters.
 * Returns true if paths match (or no filters), false if all files are excluded.
 */
function matchPathFilters(filters, filenames) {
    const { paths: pathPatterns, ignorePaths: ignorePatterns } = filters;
    // Fail trigger match when path filters are defined but filenames unavailable
    if ((pathPatterns || ignorePatterns) && (!filenames || filenames.length === 0)) {
        return false;
    }
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
 * Return a copy of the context with only files matching the path filters.
 * If no filters are set, returns the original context unchanged (no copy).
 */
export function filterContextByPaths(context, filters) {
    const { paths: pathPatterns, ignorePaths: ignorePatterns } = filters;
    // No filters — return original reference
    if (!pathPatterns && !ignorePatterns) {
        return context;
    }
    // No PR context — nothing to filter
    if (!context.pullRequest) {
        return context;
    }
    let files = context.pullRequest.files;
    if (pathPatterns) {
        files = files.filter((f) => pathPatterns.some((pattern) => matchGlob(pattern, f.filename)));
    }
    if (ignorePatterns) {
        files = files.filter((f) => !ignorePatterns.some((pattern) => matchGlob(pattern, f.filename)));
    }
    return {
        ...context,
        pullRequest: {
            ...context.pullRequest,
            files,
        },
    };
}
/**
 * Check if a trigger matches the given event context and environment.
 *
 * Trigger types:
 * - '*' (wildcard): matches all environments, skips event/action checks
 * - 'local': matches only when environment is 'local'
 * - 'pull_request': matches when environment is 'github' and event is pull_request
 * - 'schedule': matches when event is schedule
 */
export function matchTrigger(trigger, context, environment) {
    // Wildcard triggers match everywhere, only check path filters
    if (trigger.type === '*') {
        const filenames = context.pullRequest?.files.map((f) => f.filename);
        return matchPathFilters(trigger.filters, filenames);
    }
    // Type-based matching with early returns
    if (trigger.type === 'local') {
        if (environment !== 'local') {
            return false;
        }
    }
    if (trigger.type === 'pull_request') {
        if (environment === 'local') {
            return false;
        }
        if (context.eventType !== 'pull_request') {
            return false;
        }
        if (!trigger.actions?.includes(context.action)) {
            return false;
        }
    }
    if (trigger.type === 'schedule') {
        if (context.eventType !== 'schedule') {
            return false;
        }
        return (context.pullRequest?.files.length ?? 0) > 0;
    }
    // Apply path filters
    const filenames = context.pullRequest?.files.map((f) => f.filename);
    return matchPathFilters(trigger.filters, filenames);
}
/**
 * Check if a report has any findings at or above the given severity threshold.
 * Returns false if failOn is 'off' (disabled).
 */
export function shouldFail(report, failOn) {
    if (failOn === 'off')
        return false;
    const threshold = SEVERITY_ORDER[failOn];
    return report.findings.some((f) => SEVERITY_ORDER[f.severity] <= threshold);
}
/**
 * Count findings at or above the given severity threshold.
 * Returns 0 if failOn is 'off' (disabled).
 */
export function countFindingsAtOrAbove(report, failOn) {
    if (failOn === 'off')
        return 0;
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