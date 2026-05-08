import { ExecError, execFileNonInteractive } from '../utils/exec.js';
import { WardenAuthenticationError } from './errors.js';
import type { RuntimeName } from './runtimes/index.js';

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
export function verifyAuth({ apiKey, runtime = 'claude' }: { apiKey?: string; runtime?: RuntimeName }): void {
  // Direct API auth — no subprocess needed.
  if (apiKey) return;

  if (runtime === 'codex') {
    verifyCodexAuth();
    return;
  }

  verifyClaudeAuth();
}

function verifyClaudeAuth(): void {
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
        'Either install Claude Code (https://claude.ai/install.sh) or set an API key.',
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

function verifyCodexAuth(): void {
  try {
    execFileNonInteractive('codex', ['login', 'status'], { timeout: 5000 });
  } catch (error) {
    const isNotFound =
      error instanceof ExecError
        ? error.stderr.includes('ENOENT')
        : (error as NodeJS.ErrnoException).code === 'ENOENT';
    if (isNotFound) {
      throw new WardenAuthenticationError(
        'Codex CLI not found on PATH.\n' +
        'Install Codex and run `codex login` to use your OpenAI subscription.',
        { cause: error, runtime: 'codex' }
      );
    }
    const detail =
      error instanceof ExecError ? error.stderr : (error as Error).message;
    throw new WardenAuthenticationError(
      `Codex CLI is not ready for local subscription auth: ${detail}\n` +
      'Run `codex login` and confirm `codex login status` succeeds.',
      { cause: error, runtime: 'codex' }
    );
  }
}
