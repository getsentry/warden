import { ExecError, execFileNonInteractive } from '../utils/exec.js';
import { WardenAuthenticationError } from './errors.js';

/**
 * Pre-flight auth check: verify that authentication will work before starting analysis.
 *
 * - If an API key is provided, returns immediately (direct API auth).
 * - If no API key, verifies the `claude` binary exists on PATH so the SDK
 *   can use Claude Code subscription auth. Throws WardenAuthenticationError
 *   if the binary is missing.
 *
 * This catches the most common failure mode (binary not installed) early.
 * Subtler failures (binary exists but sandbox blocks IPC) are caught by the
 * isSubprocessError() handler in analyzeHunk().
 */
export function verifyAuth({ apiKey }: { apiKey?: string }): void {
  // Direct API auth — no subprocess needed
  if (apiKey) return;

  try {
    execFileNonInteractive('claude', ['--version'], { timeout: 5000 });
  } catch (error) {
    // execFileNonInteractive wraps spawn failures in ExecError.
    // The original error message (e.g., "spawn claude ENOENT") is in ExecError.stderr.
    const isNotFound =
      error instanceof ExecError
        ? error.stderr.includes('ENOENT')
        : (error as NodeJS.ErrnoException).code === 'ENOENT';
    if (isNotFound) {
      throw new WardenAuthenticationError(
        'Claude Code CLI not found on PATH.\n' +
        'Either install Claude Code (https://claude.ai/install.sh) or set an API key.'
      );
    }
    const detail =
      error instanceof ExecError ? error.stderr : (error as Error).message;
    throw new WardenAuthenticationError(
      `Claude Code CLI found but failed to execute: ${detail}\n` +
      'Check that the claude binary has correct permissions and can run in this environment.'
    );
  }
}
