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
 * Move a Claude SDK session file from its internal storage location to .warden/sessions/.
 *
 * The SDK stores sessions at: ~/.claude/projects/<project-hash>/<uuid>.jsonl
 * After execution, this moves that file to: <targetDir>/<timestamp>-<uuid>.jsonl
 *
 * Returns the path to the moved file, or undefined if the session file was not found.
 */
export function moveSession(
  uuid: string,
  repoPath: string,
  targetDir: string
): string | undefined {
  const projectDir = getClaudeProjectDir(repoPath);
  const sourceFile = path.join(projectDir, `${uuid}.jsonl`);

  if (!fs.existsSync(sourceFile)) {
    return undefined;
  }

  ensureSessionsDir(targetDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetFile = path.join(targetDir, `${timestamp}-${uuid}.jsonl`);

  // Use copy+delete instead of rename to handle cross-device moves (EXDEV)
  fs.copyFileSync(sourceFile, targetFile);
  fs.unlinkSync(sourceFile);
  return targetFile;
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

/**
 * Find session files older than the given retention period.
 */
export function findExpiredSessions(dir: string, retentionDays: number): string[] {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }

  const expired: string[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('.jsonl')) continue;
    const fullPath = path.join(dir, entry);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.mtimeMs < cutoff) {
        expired.push(fullPath);
      }
    } catch {
      // Skip files we can't stat
    }
  }

  return expired;
}

/**
 * Delete old sessions, keeping only the most recent N sessions.
 * Returns the number of deleted sessions.
 */
export function pruneOldSessions(dir: string, keepCount: number): number {
  const sessions = listSessions(dir);
  const toDelete = sessions.slice(keepCount);

  for (const filepath of toDelete) {
    fs.unlinkSync(filepath);
  }

  return toDelete.length;
}
