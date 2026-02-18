import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { LogCleanupMode } from '../config/schema.js';
import type { Reporter } from './output/reporter.js';
import { readSingleKey } from './input.js';

/**
 * Find .jsonl log files in a directory that are older than retentionDays.
 */
export function findExpiredLogs(logsDir: string, retentionDays: number): string[] {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  let entries: string[];
  try {
    entries = readdirSync(logsDir);
  } catch {
    return [];
  }

  const expired: string[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('.jsonl')) continue;
    const fullPath = join(logsDir, entry);
    try {
      const stat = statSync(fullPath);
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
 * Clean up expired log files based on the configured mode.
 * Returns the number of files deleted.
 */
export async function cleanupLogs(opts: {
  logsDir: string;
  retentionDays: number;
  mode: LogCleanupMode;
  isTTY: boolean;
  reporter: Reporter;
}): Promise<number> {
  const { logsDir, retentionDays, mode, isTTY, reporter } = opts;

  if (mode === 'never') return 0;

  const expired = findExpiredLogs(logsDir, retentionDays);
  if (expired.length === 0) return 0;

  if (mode === 'ask') {
    if (!isTTY || !process.stdin.isTTY) return 0;

    process.stderr.write(
      `Found ${expired.length} log ${expired.length === 1 ? 'file' : 'files'} older than ${retentionDays} days. Remove? [y/N] `
    );
    const key = await readSingleKey();
    process.stderr.write(key + '\n');

    if (key !== 'y') return 0;
  }

  let deleted = 0;
  for (const filePath of expired) {
    try {
      unlinkSync(filePath);
      deleted++;
    } catch {
      // Skip files we can't delete
    }
  }

  if (deleted > 0) {
    reporter.debug(`Cleaned up ${deleted} expired log ${deleted === 1 ? 'file' : 'files'}`);
  }

  return deleted;
}
