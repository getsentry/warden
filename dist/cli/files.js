import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import fg from 'fast-glob';
import { countPatchChunks } from '../types/index.js';
/**
 * Expand glob patterns to a list of file paths.
 */
export async function expandFileGlobs(patterns, cwd = process.cwd()) {
    const files = await fg(patterns, {
        cwd,
        onlyFiles: true,
        absolute: true,
        dot: false,
    });
    return files.sort();
}
/**
 * Create a unified diff patch for a file, treating entire content as added.
 */
export function createPatchFromContent(content) {
    const lines = content.split('\n');
    const lineCount = lines.length;
    // Handle empty files
    if (lineCount === 0 || (lineCount === 1 && lines[0] === '')) {
        return '@@ -0,0 +0,0 @@\n';
    }
    // Create patch header showing all lines as additions
    const patchLines = [`@@ -0,0 +1,${lineCount} @@`];
    for (const line of lines) {
        patchLines.push(`+${line}`);
    }
    return patchLines.join('\n');
}
/**
 * Read a file and create a synthetic FileChange treating it as newly added.
 */
export function createSyntheticFileChange(absolutePath, basePath) {
    const content = readFileSync(absolutePath, 'utf-8');
    const lines = content.split('\n');
    const lineCount = lines.length;
    const relativePath = relative(basePath, absolutePath);
    const patch = createPatchFromContent(content);
    return {
        filename: relativePath,
        status: 'added',
        additions: lineCount,
        deletions: 0,
        patch,
        chunks: countPatchChunks(patch),
    };
}
/**
 * Process a list of file paths into FileChange objects.
 */
export function createSyntheticFileChanges(absolutePaths, basePath) {
    return absolutePaths.map((filePath) => createSyntheticFileChange(filePath, basePath));
}
/**
 * Expand glob patterns and create FileChange objects for all matching files.
 */
export async function expandAndCreateFileChanges(patterns, cwd = process.cwd()) {
    const resolvedCwd = resolve(cwd);
    const files = await expandFileGlobs(patterns, resolvedCwd);
    return createSyntheticFileChanges(files, resolvedCwd);
}
//# sourceMappingURL=files.js.map