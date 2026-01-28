import { basename } from 'node:path';
import type { EventContext, FileChange } from '../types/index.js';
import { expandAndCreateFileChanges } from './files.js';
import {
  getChangedFilesWithPatches,
  getCurrentBranch,
  getHeadSha,
  getDefaultBranch,
  getRepoRoot,
  getRepoName,
  type GitFileChange,
} from './git.js';

/**
 * Convert git file change to EventContext FileChange format.
 */
function toFileChange(file: GitFileChange): FileChange {
  return {
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch,
    chunks: file.chunks,
  };
}

export interface LocalContextOptions {
  base?: string;
  head?: string;
  cwd?: string;
}

/**
 * Build an EventContext from local git repository state.
 * Creates a synthetic pull_request event from git diff.
 */
export function buildLocalEventContext(options: LocalContextOptions = {}): EventContext {
  const cwd = options.cwd ?? process.cwd();
  const repoPath = getRepoRoot(cwd);
  const { owner, name } = getRepoName(cwd);
  const defaultBranch = getDefaultBranch(cwd);

  const base = options.base ?? defaultBranch;
  const head = options.head; // undefined means working tree
  const currentBranch = getCurrentBranch(cwd);
  const headSha = head ? head : getHeadSha(cwd);

  const changedFiles = getChangedFilesWithPatches(base, head, cwd);
  const files = changedFiles.map(toFileChange);

  return {
    eventType: 'pull_request',
    action: 'opened',
    repository: {
      owner,
      name,
      fullName: `${owner}/${name}`,
      defaultBranch,
    },
    pullRequest: {
      number: 0, // Local run, no real PR number
      title: `Local changes: ${currentBranch}`,
      body: `Analyzing local changes from ${base} to ${head ?? 'working tree'}`,
      author: 'local',
      baseBranch: base,
      headBranch: currentBranch,
      headSha,
      files,
    },
    repoPath,
  };
}

export interface FileContextOptions {
  patterns: string[];
  cwd?: string;
}

/**
 * Build an EventContext from a list of files or glob patterns.
 * Creates a synthetic pull_request event treating files as newly added.
 * This allows analysis without requiring git or a warden.toml config.
 */
export async function buildFileEventContext(options: FileContextOptions): Promise<EventContext> {
  const cwd = options.cwd ?? process.cwd();
  const dirName = basename(cwd);

  const files = await expandAndCreateFileChanges(options.patterns, cwd);

  return {
    eventType: 'pull_request',
    action: 'opened',
    repository: {
      owner: 'local',
      name: dirName,
      fullName: `local/${dirName}`,
      defaultBranch: 'main',
    },
    pullRequest: {
      number: 0,
      title: 'File analysis',
      body: `Analyzing ${files.length} file(s)`,
      author: 'local',
      baseBranch: 'main',
      headBranch: 'file-analysis',
      headSha: 'file-analysis',
      files,
    },
    repoPath: cwd,
  };
}
