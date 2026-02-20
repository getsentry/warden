import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Default directory for session storage relative to repo root */
export const DEFAULT_SESSIONS_DIR = '.warden/sessions';

/** Options for session storage */
export interface SessionStorageOptions {
  /** Enable session storage (default: true) */
  enabled?: boolean;
  /** Directory to store sessions (default: .warden/sessions) */
  directory?: string;
}

/**
 * Derive the directory key Claude Code uses for a given project path.
 * Claude Code maps /abs/path/to/project → -abs-path-to-project
 */
export function getClaudeProjectHash(projectPath: string): string {
  return projectPath.replace(/\//g, '-');
}

/**
 * Return the directory where Claude Code stores session files for a given repo path.
 * Sessions are stored as <uuid>.jsonl files inside this directory.
 */
export function getClaudeProjectDir(repoPath: string): string {
  const homeDir = os.homedir();
  const hash = getClaudeProjectHash(repoPath);
  return path.join(homeDir, '.claude', 'projects', hash);
}

/**
 * Ensure the sessions directory exists.
 * Creates the directory and any parent directories if they don't exist.
 */
export function ensureSessionsDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Snapshot the set of .jsonl files in Claude's project directory for a given repo.
 * Call before executeQuery, then use moveNewSessions after to capture any new files.
 */
export function snapshotSessionFiles(repoPath: string): Set<string> {
  const projectDir = getClaudeProjectDir(repoPath);
  try {
    return new Set(
      fs.readdirSync(projectDir).filter(f => f.endsWith('.jsonl'))
    );
  } catch {
    return new Set();
  }
}

/**
 * Move any new session files that appeared since the snapshot.
 * Safe to call concurrently -- skips files already moved by another caller.
 * Returns paths of moved files.
 */
export function moveNewSessions(
  repoPath: string,
  before: Set<string>,
  targetDir: string
): string[] {
  const projectDir = getClaudeProjectDir(repoPath);
  let current: string[];
  try {
    current = fs.readdirSync(projectDir).filter(f => f.endsWith('.jsonl'));
  } catch {
    return [];
  }

  const newFiles = current.filter(f => !before.has(f));
  if (newFiles.length === 0) return [];

  ensureSessionsDir(targetDir);
  const moved: string[] = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  for (const file of newFiles) {
    const sourceFile = path.join(projectDir, file);
    // Guard against race: another concurrent hunk may have already moved this file
    if (!fs.existsSync(sourceFile)) continue;

    const uuid = file.replace('.jsonl', '');
    const targetFile = path.join(targetDir, `${timestamp}-${uuid}.jsonl`);
    try {
      // Use copy+delete instead of rename to handle cross-device moves (EXDEV)
      fs.copyFileSync(sourceFile, targetFile);
      fs.unlinkSync(sourceFile);
      moved.push(targetFile);
    } catch {
      // Non-fatal: file may have been moved by a concurrent hunk
    }
  }

  return moved;
}

/**
 * Resolve the absolute sessions directory from options and repo path.
 */
export function resolveSessionsDir(repoPath: string, directory?: string): string {
  const dir = directory ?? DEFAULT_SESSIONS_DIR;
  return path.isAbsolute(dir) ? dir : path.join(repoPath, dir);
}

/**
 * List all session files in the given directory.
 * Returns an array of session file paths sorted by modification time (newest first).
 */
export function listSessions(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => path.join(dir, f));

  // Sort by modification time, newest first
  return files.sort((a, b) => {
    let statA, statB;
    try {
      statA = fs.statSync(a);
      statB = fs.statSync(b);
    } catch {
      // If we can't stat, treat as oldest (will be filtered out)
      if (!statA) return 1;
      if (!statB) return -1;
      return 0;
    }
    return statB.mtime.getTime() - statA.mtime.getTime();
  });
}
