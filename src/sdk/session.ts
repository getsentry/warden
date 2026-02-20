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
 * Call before analysis, then use moveNewSessions after to capture any new files.
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
 * Files are named <prefix>-<uuid>.jsonl where prefix identifies the warden run
 * (e.g. "notseer-a049e7f7") and uuid is the Claude session ID.
 *
 * Safe to call concurrently -- skips files already moved by another caller.
 * Returns paths of moved files.
 */
export function moveNewSessions(
  repoPath: string,
  before: Set<string>,
  targetDir: string,
  prefix?: string
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

  for (const file of newFiles) {
    const sourceFile = path.join(projectDir, file);
    // Guard against race: another concurrent hunk may have already moved this file
    if (!fs.existsSync(sourceFile)) continue;

    // Skip empty files (SDK may not have flushed yet)
    try {
      const stat = fs.statSync(sourceFile);
      if (stat.size === 0) continue;
    } catch {
      continue;
    }

    const uuid = file.replace('.jsonl', '');
    // Short UUID: first 8 chars of the session ID
    const shortUuid = uuid.split('-')[0] || uuid.slice(0, 8);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const targetName = prefix ? `${prefix}-${shortUuid}-${ts}.jsonl` : `${shortUuid}-${ts}.jsonl`;
    const targetFile = path.join(targetDir, targetName);
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

