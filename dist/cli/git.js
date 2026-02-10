import { countPatchChunks } from '../types/index.js';
import { execNonInteractive } from '../utils/exec.js';
/**
 * Execute a git command and return stdout.
 * Uses non-interactive mode to prevent SSH passphrase prompts.
 */
function git(args, cwd = process.cwd()) {
    try {
        return execNonInteractive(`git ${args}`, { cwd });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Git command failed: git ${args}\n${message}`);
    }
}
/**
 * Get the current branch name.
 */
export function getCurrentBranch(cwd = process.cwd()) {
    return git('rev-parse --abbrev-ref HEAD', cwd);
}
/**
 * Get the HEAD commit SHA.
 */
export function getHeadSha(cwd = process.cwd()) {
    return resolveRef('HEAD', cwd);
}
/**
 * Resolve a ref (branch name, tag, SHA) to a full commit SHA.
 */
export function resolveRef(ref, cwd = process.cwd()) {
    return git(`rev-parse ${ref}`, cwd);
}
/**
 * Detect the default branch by checking common branch names locally.
 * Also checks remote tracking refs (origin/*) for shallow clones
 * where local branches may not exist (e.g. GitHub Actions).
 * Does not perform any remote operations to avoid SSH prompts.
 */
export function getDefaultBranch(cwd = process.cwd()) {
    // Check common default branches locally (no remote operations)
    for (const branch of ['main', 'master', 'develop']) {
        try {
            git(`rev-parse --verify ${branch}`, cwd);
            return branch;
        }
        catch {
            // Try next branch
        }
    }
    // Check remote tracking refs (common in shallow clones / CI)
    for (const branch of ['main', 'master', 'develop']) {
        try {
            git(`rev-parse --verify origin/${branch}`, cwd);
            return `origin/${branch}`;
        }
        catch {
            // Try next branch
        }
    }
    // Check remote HEAD symbolic ref (set by clone, no network needed)
    try {
        const remoteHead = git('symbolic-ref refs/remotes/origin/HEAD', cwd);
        if (remoteHead) {
            // Returns e.g. "refs/remotes/origin/main" → extract "origin/main"
            const match = remoteHead.match(/refs\/remotes\/(.*)/);
            if (match?.[1]) {
                return match[1];
            }
        }
    }
    catch {
        // No remote HEAD configured
    }
    // Check git config for user-configured default branch
    try {
        const configuredDefault = git('config init.defaultBranch', cwd);
        if (configuredDefault) {
            return configuredDefault;
        }
    }
    catch {
        // Config not set
    }
    return 'main'; // Default fallback
}
/**
 * Get the repository root path.
 */
export function getRepoRoot(cwd = process.cwd()) {
    return git('rev-parse --show-toplevel', cwd);
}
/**
 * Get the repository name from the git remote or directory name.
 */
export function getRepoName(cwd = process.cwd()) {
    try {
        const remoteUrl = git('config --get remote.origin.url', cwd);
        // Handle SSH: git@github.com:owner/repo.git
        // Handle HTTPS: https://github.com/owner/repo.git
        const match = remoteUrl.match(/[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
        if (match && match[1] && match[2]) {
            return { owner: match[1], name: match[2] };
        }
    }
    catch {
        // No remote configured
    }
    // Fall back to directory name
    const repoRoot = getRepoRoot(cwd);
    const dirName = repoRoot.split('/').pop() ?? 'unknown';
    return { owner: 'local', name: dirName };
}
/**
 * Get the GitHub repository URL if the remote is on GitHub.
 * Returns null if the remote is not GitHub or not configured.
 */
export function getGitHubRepoUrl(cwd = process.cwd()) {
    try {
        const remoteUrl = git('config --get remote.origin.url', cwd);
        // Handle SSH: git@github.com:owner/repo.git
        const sshMatch = remoteUrl.match(/git@github\.com:([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
        if (sshMatch && sshMatch[1] && sshMatch[2]) {
            return `https://github.com/${sshMatch[1]}/${sshMatch[2]}`;
        }
        // Handle HTTPS: https://github.com/owner/repo.git
        const httpsMatch = remoteUrl.match(/https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
        if (httpsMatch && httpsMatch[1] && httpsMatch[2]) {
            return `https://github.com/${httpsMatch[1]}/${httpsMatch[2]}`;
        }
    }
    catch {
        // No remote configured
    }
    return null;
}
/**
 * Map git status letter to FileChange status.
 */
function mapStatus(status) {
    switch (status[0]) {
        case 'A':
            return 'added';
        case 'D':
            return 'removed';
        case 'M':
            return 'modified';
        case 'R':
            return 'renamed';
        case 'C':
            return 'copied';
        default:
            return 'modified';
    }
}
/**
 * Get list of changed files between two refs.
 * If head is undefined, compares against the working tree.
 */
export function getChangedFiles(base, head, cwd = process.cwd()) {
    // Get file statuses
    const diffArgs = head ? `${base}...${head}` : base;
    const nameStatusOutput = git(`diff --name-status ${diffArgs}`, cwd);
    if (!nameStatusOutput) {
        return [];
    }
    const files = [];
    for (const line of nameStatusOutput.split('\n')) {
        if (!line.trim())
            continue;
        const parts = line.split('\t');
        const status = parts[0] ?? '';
        // For renames, format is "R100\told-name\tnew-name"
        const filename = parts.length > 2 ? (parts[2] ?? '') : (parts[1] ?? '');
        if (!filename)
            continue;
        files.push({
            filename,
            status: mapStatus(status),
            additions: 0,
            deletions: 0,
        });
    }
    // Get numstat for additions/deletions
    const numstatOutput = git(`diff --numstat ${diffArgs}`, cwd);
    if (numstatOutput) {
        for (const line of numstatOutput.split('\n')) {
            if (!line.trim())
                continue;
            const parts = line.split('\t');
            const additions = parts[0] ?? '0';
            const deletions = parts[1] ?? '0';
            const filename = parts[2] ?? '';
            const file = files.find((f) => f.filename === filename);
            if (file) {
                file.additions = additions === '-' ? 0 : parseInt(additions, 10);
                file.deletions = deletions === '-' ? 0 : parseInt(deletions, 10);
            }
        }
    }
    return files;
}
/**
 * Get the patch for a specific file.
 */
export function getFilePatch(base, head, filename, cwd = process.cwd()) {
    try {
        const diffArgs = head ? `${base}...${head}` : base;
        return git(`diff ${diffArgs} -- "${filename}"`, cwd);
    }
    catch {
        return undefined;
    }
}
/**
 * Parse a combined diff output into individual file patches.
 */
function parseCombinedDiff(diffOutput) {
    const patches = new Map();
    if (!diffOutput)
        return patches;
    // Split by "diff --git" but keep the delimiter
    const parts = diffOutput.split(/(?=^diff --git )/m);
    for (const part of parts) {
        if (!part.trim())
            continue;
        // Extract filename from "diff --git a/path b/path" line
        const match = part.match(/^diff --git a\/(.+?) b\/(.+?)\n/);
        if (match) {
            // Use the "b" path (destination) as the filename
            const filename = match[2];
            if (filename) {
                patches.set(filename, part);
            }
        }
    }
    return patches;
}
/**
 * Get patches for all changed files in a single git command.
 */
export function getChangedFilesWithPatches(base, head, cwd = process.cwd()) {
    const files = getChangedFiles(base, head, cwd);
    if (files.length === 0) {
        return files;
    }
    // Get all patches in a single git diff command
    try {
        const diffArgs = head ? `${base}...${head}` : base;
        const combinedDiff = git(`diff ${diffArgs}`, cwd);
        const patches = parseCombinedDiff(combinedDiff);
        for (const file of files) {
            file.patch = patches.get(file.filename);
            file.chunks = countPatchChunks(file.patch);
        }
    }
    catch {
        // Fall back to per-file patches if combined diff fails
        for (const file of files) {
            file.patch = getFilePatch(base, head, file.filename, cwd);
            file.chunks = countPatchChunks(file.patch);
        }
    }
    return files;
}
/**
 * Check if there are uncommitted changes in the working tree.
 */
export function hasUncommittedChanges(cwd = process.cwd()) {
    const status = git('status --porcelain', cwd);
    return status.length > 0;
}
/**
 * Check if a ref exists.
 */
export function refExists(ref, cwd = process.cwd()) {
    try {
        git(`rev-parse --verify ${ref}`, cwd);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get the commit message for a specific ref.
 * Returns subject (first line) and body (remaining lines) separately.
 */
export function getCommitMessage(ref, cwd = process.cwd()) {
    // %s = subject, %b = body
    const subject = git(`log -1 --format=%s ${ref}`, cwd);
    const body = git(`log -1 --format=%b ${ref}`, cwd);
    return { subject, body };
}
//# sourceMappingURL=git.js.map