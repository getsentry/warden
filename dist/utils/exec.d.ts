/**
 * Error thrown when a command fails.
 */
export declare class ExecError extends Error {
    readonly command: string;
    readonly exitCode: number | null;
    readonly stderr: string;
    readonly signal: string | null;
    constructor(command: string, exitCode: number | null, stderr: string, signal: string | null);
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
export declare const GIT_NON_INTERACTIVE_ENV: {
    GIT_TERMINAL_PROMPT: string;
    GIT_SSH_COMMAND: string;
};
/**
 * Execute a shell command in non-interactive mode.
 * Uses piped stdio to avoid passing terminal to child process.
 *
 * @param command - The shell command to execute
 * @param options - Execution options (cwd, env, timeout)
 * @returns The trimmed stdout output
 * @throws ExecError if the command fails
 */
export declare function execNonInteractive(command: string, options?: ExecOptions): string;
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
export declare function execFileNonInteractive(file: string, args: string[], options?: ExecOptions): string;
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
export declare function execGitNonInteractive(args: string[], options?: ExecOptions): string;
//# sourceMappingURL=exec.d.ts.map