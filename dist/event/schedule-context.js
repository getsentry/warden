import { expandAndCreateFileChanges } from '../cli/files.js';
import { matchGlob } from '../triggers/matcher.js';
/**
 * Build an EventContext for scheduled runs.
 *
 * Creates a synthetic pullRequest context from file globs using real repo info.
 * The runner processes this normally because the files have patch data.
 */
export async function buildScheduleEventContext(options) {
    const { patterns, ignorePatterns, repoPath, owner, name, defaultBranch, headSha, } = options;
    // Expand glob patterns and create FileChange objects with full content as patch
    let fileChanges = await expandAndCreateFileChanges(patterns, repoPath);
    // Filter out ignored patterns
    if (ignorePatterns && ignorePatterns.length > 0) {
        fileChanges = fileChanges.filter((file) => {
            const isIgnored = ignorePatterns.some((pattern) => matchGlob(pattern, file.filename));
            return !isIgnored;
        });
    }
    return {
        eventType: 'schedule',
        action: 'scheduled',
        repository: {
            owner,
            name,
            fullName: `${owner}/${name}`,
            defaultBranch,
        },
        // Synthetic pullRequest context for runner compatibility
        pullRequest: {
            number: 0, // No actual PR
            title: 'Scheduled Analysis',
            body: null,
            author: 'warden',
            baseBranch: defaultBranch,
            headBranch: defaultBranch,
            headSha,
            files: fileChanges,
        },
        repoPath,
    };
}
/**
 * Filter file changes to only include files matching the given patterns.
 * Used when a schedule trigger has specific path filters.
 */
export function filterFilesByPatterns(files, patterns, ignorePatterns) {
    let filtered = files.filter((file) => patterns.some((pattern) => matchGlob(pattern, file.filename)));
    if (ignorePatterns && ignorePatterns.length > 0) {
        filtered = filtered.filter((file) => {
            const isIgnored = ignorePatterns.some((pattern) => matchGlob(pattern, file.filename));
            return !isIgnored;
        });
    }
    return filtered;
}
//# sourceMappingURL=schedule-context.js.map