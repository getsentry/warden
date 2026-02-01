import { spawnSync, type SpawnSyncOptions } from 'node:child_process';

/**
 * Error thrown when a command fails.
 */
export class ExecError extends Error {
  constructor(
    public readonly command: string,
    public readonly exitCode: number | null,
    public readonly stderr: string,
    public readonly signal: string | null
  ) {
    const details = stderr || (signal ? `Killed by signal ${signal}` : 'Unknown error');
    super(`Command failed: ${command}\n${details}`);
    this.name = 'ExecError';
  }
}

/**
 * Options for exec functions.
 */
export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

/**
 * Git environment variables that disable interactive prompts.
 * - GIT_TERMINAL_PROMPT=0: Disables git's internal prompts
 * - GIT_SSH_COMMAND with BatchMode=yes: Makes SSH fail instead of prompting for passphrase
 */
export const GIT_NON_INTERACTIVE_ENV = {
  GIT_TERMINAL_PROMPT: '0',
  GIT_SSH_COMMAND: 'ssh -o BatchMode=yes',
};

/**
 * Build spawn options for non-interactive execution.
 * - stdin: 'ignore' maps to /dev/null, ensuring immediate EOF on read (no hangs)
 * - stdout/stderr: 'pipe' to capture output
 */
function buildSpawnOptions(options?: ExecOptions): SpawnSyncOptions {
  return {
    encoding: 'utf-8',
    cwd: options?.cwd,
    env: options?.env ? { ...process.env, ...options.env } : process.env,
    timeout: options?.timeout,
    stdio: ['ignore', 'pipe', 'pipe'],
  };
}

/**
 * Execute a shell command in non-interactive mode.
 * Uses piped stdio to avoid passing terminal to child process.
 *
 * @param command - The shell command to execute
 * @param options - Execution options (cwd, env, timeout)
 * @returns The trimmed stdout output
 * @throws ExecError if the command fails
 */
export function execNonInteractive(command: string, options?: ExecOptions): string {
  const spawnOptions = buildSpawnOptions(options);

  // Use shell to execute the command string
  const result = spawnSync(command, {
    ...spawnOptions,
    shell: true,
  });

  if (result.error) {
    throw new ExecError(command, null, result.error.message, null);
  }

  if (result.status !== 0) {
    const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
    throw new ExecError(command, result.status, stderr, result.signal?.toString() ?? null);
  }

  const stdout = typeof result.stdout === 'string' ? result.stdout : '';
  return stdout.trim();
}

/**
 * Execute a file with arguments in non-interactive mode.
 * Uses execFile semantics (no shell), avoiding shell injection vulnerabilities.
 * Uses piped stdio to avoid passing terminal to child process.
 *
 * @param file - The executable to run
 * @param args - Arguments to pass to the executable
 * @param options - Execution options (cwd, env, timeout)
 * @returns The trimmed stdout output
 * @throws ExecError if the command fails
 */
export function execFileNonInteractive(
  file: string,
  args: string[],
  options?: ExecOptions
): string {
  const spawnOptions = buildSpawnOptions(options);
  const command = `${file} ${args.join(' ')}`;

  const result = spawnSync(file, args, spawnOptions);

  if (result.error) {
    throw new ExecError(command, null, result.error.message, null);
  }

  if (result.status !== 0) {
    const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
    throw new ExecError(command, result.status, stderr, result.signal?.toString() ?? null);
  }

  const stdout = typeof result.stdout === 'string' ? result.stdout : '';
  return stdout.trim();
}

/**
 * Execute a git command in non-interactive mode.
 * Combines execFileNonInteractive with GIT_NON_INTERACTIVE_ENV for
 * defense-in-depth against SSH prompts.
 *
 * @param args - Arguments to pass to git
 * @param options - Execution options (cwd, env, timeout)
 * @returns The trimmed stdout output
 * @throws ExecError if the command fails
 */
export function execGitNonInteractive(args: string[], options?: ExecOptions): string {
  const env = {
    ...options?.env,
    ...GIT_NON_INTERACTIVE_ENV, // Always override to ensure non-interactive
  };

  return execFileNonInteractive('git', args, { ...options, env });
}
