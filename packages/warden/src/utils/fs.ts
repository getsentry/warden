import { mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Write a file atomically: content lands at `path` all-or-nothing, so
 * concurrent or interrupted readers never observe a partially written file.
 * Writes to a uniquely named temp file in the same directory, then renames
 * it into place (rename is atomic on the same filesystem).
 */
export function writeFileAtomic(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmpPath = join(dirname(path), `.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);

  try {
    writeFileSync(tmpPath, content);
    renameSync(tmpPath, path);
  } catch (error) {
    try {
      unlinkSync(tmpPath);
    } catch {
      // Temp file may not have been created yet; nothing to clean up.
    }
    throw error;
  }
}
