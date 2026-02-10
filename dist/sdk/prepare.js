import { parseFileDiff, expandDiffContext, classifyFile, coalesceHunks, splitLargeHunks, } from '../diff/index.js';
/**
 * Group hunks by filename into PreparedFile entries.
 */
export function groupHunksByFile(hunks) {
    const fileMap = new Map();
    for (const hunk of hunks) {
        const existing = fileMap.get(hunk.filename);
        if (existing) {
            existing.push(hunk);
        }
        else {
            fileMap.set(hunk.filename, [hunk]);
        }
    }
    return Array.from(fileMap, ([filename, fileHunks]) => ({ filename, hunks: fileHunks }));
}
/**
 * Prepare files for analysis by parsing patches into hunks with context.
 * Returns files that have changes to analyze and files that were skipped.
 */
export function prepareFiles(context, options = {}) {
    const { contextLines = 20, chunking } = options;
    if (!context.pullRequest) {
        return { files: [], skippedFiles: [] };
    }
    const pr = context.pullRequest;
    const allHunks = [];
    const skippedFiles = [];
    for (const file of pr.files) {
        if (!file.patch)
            continue;
        // Check if this file should be skipped based on chunking patterns
        const mode = classifyFile(file.filename, chunking?.filePatterns);
        if (mode === 'skip') {
            skippedFiles.push({
                filename: file.filename,
                reason: 'builtin', // Could be enhanced to track which pattern matched
            });
            continue;
        }
        const statusMap = {
            added: 'added',
            removed: 'removed',
            modified: 'modified',
            renamed: 'renamed',
            copied: 'added',
            changed: 'modified',
            unchanged: 'modified',
        };
        const status = statusMap[file.status] ?? 'modified';
        const diff = parseFileDiff(file.filename, file.patch, status);
        // Split large hunks first (handles large files becoming single hunks)
        const splitHunks = splitLargeHunks(diff.hunks, {
            maxChunkSize: chunking?.coalesce?.maxChunkSize,
        });
        // Then coalesce nearby small ones if enabled (default: enabled)
        const coalesceEnabled = chunking?.coalesce?.enabled !== false;
        const hunks = coalesceEnabled
            ? coalesceHunks(splitHunks, {
                maxGapLines: chunking?.coalesce?.maxGapLines,
                maxChunkSize: chunking?.coalesce?.maxChunkSize,
            })
            : splitHunks;
        const hunksWithContext = expandDiffContext(context.repoPath, { ...diff, hunks }, contextLines);
        allHunks.push(...hunksWithContext);
    }
    return {
        files: groupHunksByFile(allHunks),
        skippedFiles,
    };
}
//# sourceMappingURL=prepare.js.map