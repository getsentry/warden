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
    const statA = fs.statSync(a);
    const statB = fs.statSync(b);
    return statB.mtime.getTime() - statA.mtime.getTime();
  });
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
