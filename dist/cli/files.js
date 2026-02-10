import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative, dirname, join } from 'node:path';
import fg from 'fast-glob';
import ignore from 'ignore';
import { countPatchChunks } from '../types/index.js';
/**
 * Normalize path separators to forward slashes for cross-platform consistency.
 * fast-glob always returns forward slashes, but Node.js path functions use
 * backslashes on Windows.
 */
function normalizePath(path) {
    return path.replace(/\\/g, '/');
}
/**
 * Find the git root directory by walking up from the given path.
 * Returns the git root path, or null if not in a git repository.
 */
function findGitRoot(startPath) {
    // Resolve to absolute path to handle relative paths like '.' or 'src'
    let current = resolve(startPath);
    while (current !== dirname(current)) {
        const gitDir = join(current, '.git');
        if (existsSync(gitDir)) {
            return current;
        }
        current = dirname(current);
    }
    return null;
}
/**
 * Prefix gitignore patterns with a directory path.
 * Handles negation patterns, leading slashes, and preserves comments/empty lines.
 *
 * Note: Patterns without slashes (like *.log) are intentionally NOT prefixed
 * with **\/ because the ignore package handles them correctly - they match
 * at any depth relative to the .gitignore location when the path being tested
 * is relative to the git root with the subdir prefix included.
 */
function prefixGitignorePatterns(content, prefix) {
    return content
        .split('\n')
        .map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            return line;
        }
        // Handle negation patterns
        const isNegation = trimmed.startsWith('!');
        const pattern = isNegation ? trimmed.slice(1) : trimmed;
        // Handle patterns with leading slash (anchored to .gitignore location)
        // Remove leading slash to avoid double slashes: /build -> subdir/build
        const cleanPattern = pattern.startsWith('/') ? pattern.slice(1) : pattern;
        const prefixedPattern = `${prefix}/${cleanPattern}`;
        return isNegation ? `!${prefixedPattern}` : prefixedPattern;
    })
        .join('\n');
}
/**
 * Load all .gitignore files in the repository.
 * Returns an ignore instance that can check if a file path should be ignored.
 *
 * The ignore package handles the complexity of gitignore semantics:
 * - Patterns are applied relative to their .gitignore location
 * - Negation patterns (!) work correctly
 * - Directory patterns with trailing / work correctly
 */
async function loadGitignoreRules(gitRoot, cwd) {
    const ig = ignore();
    // Always ignore .git directory
    ig.add('.git');
    // Normalize git root for consistent comparisons
    const normalizedGitRoot = normalizePath(gitRoot);
    // Find all .gitignore files in the repository
    // fast-glob always returns forward slashes
    const gitignoreFiles = await fg('**/.gitignore', {
        cwd: gitRoot,
        absolute: true,
        dot: true,
        ignore: ['**/.git/**'],
    });
    // Also check from cwd up to git root for any .gitignore files
    // that might be outside the search scope
    let current = resolve(cwd);
    while (current !== dirname(current)) {
        const gitignorePath = join(current, '.gitignore');
        // Normalize for comparison with fast-glob results
        const normalizedPath = normalizePath(gitignorePath);
        if (existsSync(gitignorePath) && !gitignoreFiles.includes(normalizedPath)) {
            gitignoreFiles.push(normalizedPath);
        }
        if (normalizePath(current) === normalizedGitRoot) {
            break;
        }
        current = dirname(current);
    }
    // Sort by path depth (root first, then nested)
    // Use forward slashes for consistent depth counting
    gitignoreFiles.sort((a, b) => a.split('/').length - b.split('/').length);
    // Process gitignore files from root down (parent rules apply first)
    for (const gitignorePath of gitignoreFiles) {
        try {
            const content = readFileSync(gitignorePath, 'utf-8');
            // Use normalized paths for relative calculation
            const relativeDir = normalizePath(relative(gitRoot, dirname(gitignorePath)));
            if (relativeDir) {
                ig.add(prefixGitignorePatterns(content, relativeDir));
            }
            else {
                ig.add(content);
            }
        }
        catch {
            // Ignore read errors (e.g., permission issues)
        }
    }
    return ig;
}
/**
 * Expand glob patterns to a list of file paths.
 *
 * By default, respects .gitignore files to automatically exclude ignored
 * directories like node_modules/. This can be disabled by setting
 * gitignore: false.
 */
export async function expandFileGlobs(patterns, cwdOrOptions = process.cwd()) {
    const options = typeof cwdOrOptions === 'string' ? { cwd: cwdOrOptions } : cwdOrOptions;
    // Resolve to absolute path to handle relative paths like '.' or 'src'
    const cwd = resolve(options.cwd ?? process.cwd());
    const useGitignore = options.gitignore ?? true;
    // Get all matching files first
    const files = await fg(patterns, {
        cwd,
        onlyFiles: true,
        absolute: true,
        dot: false,
        // Always exclude .git directory
        ignore: ['**/.git/**'],
    });
    // If gitignore is disabled, return files as-is
    if (!useGitignore) {
        return files.sort();
    }
    // Find git root - if not in a git repo, don't apply gitignore rules
    const gitRoot = findGitRoot(cwd);
    if (!gitRoot) {
        return files.sort();
    }
    // Load and apply gitignore rules
    const ig = await loadGitignoreRules(gitRoot, cwd);
    // Filter files using gitignore rules
    // Normalize paths to forward slashes for consistent matching
    const filteredFiles = files.filter((file) => {
        const relativePath = normalizePath(relative(gitRoot, file));
        return !ig.ignores(relativePath);
    });
    return filteredFiles.sort();
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