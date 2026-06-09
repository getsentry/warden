import { ExecError, execFileNonInteractive } from '../utils/exec.js';
import { WardenAuthenticationError } from './errors.js';

/**
 * Pre-flight auth check: verify that authentication will work before starting analysis.
 *
 * - If an API key is provided, returns immediately (direct API auth).
 * - If no API key, verifies the configured Claude Code executable, or the
 *   `claude` binary on PATH, so the SDK can use local Claude Code auth.
 *   Throws WardenAuthenticationError if the binary is missing.
 *
 * This catches the most common failure mode (binary not installed) early.
 * Subtler failures (binary exists but sandbox blocks IPC) are caught by the
 * isSubprocessError() handler in analyzeHunk().
 */
export function verifyAuth({
  apiKey,
  pathToClaudeCodeExecutable,
}: {
  apiKey?: string;
  pathToClaudeCodeExecutable?: string;
}): void {
  // Direct API auth — no subprocess needed
  if (apiKey) return;

  const executable = pathToClaudeCodeExecutable ?? 'claude';
  try {
    execFileNonInteractive(executable, ['--version'], { timeout: 5000 });
  } catch (error) {
    // execFileNonInteractive wraps spawn failures in ExecError.
    // The original error message (e.g., "spawn claude ENOENT") is in ExecError.stderr.
    const isNotFound =
      error instanceof ExecError
        ? error.stderr.includes('ENOENT')
        : (error as NodeJS.ErrnoException).code === 'ENOENT';
    if (isNotFound) {
      throw new WardenAuthenticationError(
        'Claude Code CLI not found on PATH or configured path.\n' +
        'Either install Claude Code (https://claude.ai/install.sh), ' +
        'set WARDEN_ANTHROPIC_API_KEY, or set ANTHROPIC_API_KEY.',
        { cause: error }
      );
    }
    const detail =
      error instanceof ExecError ? error.stderr : (error as Error).message;
    throw new WardenAuthenticationError(
      `Claude Code CLI found but failed to execute: ${detail}\n` +
      'Check that the claude binary has correct permissions and can run in this environment.',
      { cause: error }
    );
  }
}
