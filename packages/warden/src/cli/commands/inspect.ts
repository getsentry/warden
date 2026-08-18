/**
 * `warden inspect <id>` command.
 *
 * Resolves a JSONL path or short run ID the same way `warden runs show` does,
 * validates that the file exists and is readable, refuses non-TTY environments,
 * then loads the session and hands off to the Ink TUI render hook.
 *
 * The Ink panes are built in a later todo.  This file wires up all the error
 * paths and calls a stub render hook so the rest of the CLI layer can be
 * tested independently.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getRepoRoot } from '../git.js';
import { parseJsonlReports } from '../output/index.js';
import type { Reporter } from '../output/reporter.js';
import { buildInspectSession } from '../inspect/session.js';
import { loadReviews } from '../inspect/reviews.js';
import { resolveLogDir, resolveFileArg } from './runs.js';
import type { InspectOptions } from '../args.js';
import type { CLIOptions } from '../args.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Context passed to the render hook.  In a later todo this will be consumed by
 * the Ink TUI; for now the stub just returns immediately.
 */
export interface InspectContext {
  logPath: string;
  repoRoot: string;
  runId: string;
  session: ReturnType<typeof buildInspectSession>;
}

/**
 * Render hook — swapped out by the TUI implementation in the next todo.
 * Returns a Promise<number> exit code.
 */
export type RenderInspect = (ctx: InspectContext) => Promise<number>;

// ---------------------------------------------------------------------------
// Default stub render hook
// ---------------------------------------------------------------------------

/**
 * Stub render hook used until the Ink TUI lands.
 * Prints a one-line summary so the command is usable for smoke-testing now.
 */
const stubRender: RenderInspect = async (ctx) => {
  const { session } = ctx;
  const total = session.unreviewed.length + session.reviewed.length;
  process.stdout.write(
    `[inspect stub] ${total} finding(s) loaded from ${ctx.logPath}\n`,
  );
  return 0;
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Run `warden inspect <id>`.
 *
 * Error exits (ISC-14):
 * - Non-TTY stdout → exit 1
 * - Missing log file  → exit 1
 * - Unreadable / unparseable JSONL → exit 1
 */
export async function runInspect(
  inspectOptions: InspectOptions,
  options: CLIOptions,
  reporter: Reporter,
  render: RenderInspect = stubRender,
): Promise<number> {
  // 1. Non-TTY check — the TUI requires an interactive terminal.
  if (!reporter.mode.isTTY) {
    reporter.error('warden inspect requires an interactive terminal (non-TTY detected)');
    reporter.tip('Pipe output or redirect to a file? Use "warden runs show" instead.');
    return 1;
  }

  // 2. Resolve the JSONL path (path or short run ID).
  const { target } = inspectOptions;
  const resolved = resolveLogDir();
  const logDir = resolved?.logDir;
  const repoPath = resolved?.repoPath;

  let logPath: string | undefined;

  if (logDir) {
    const matches = resolveFileArg(target, logDir);
    if (matches.length > 0) {
      logPath = matches[0];
    }
  }

  if (!logPath) {
    // Fall back to treating as a direct file path.
    logPath = resolve(options.cwd ?? process.cwd(), target);
  }

  // 3. Existence check.
  if (!existsSync(logPath)) {
    reporter.error(`Log file not found: ${logPath}`);
    return 1;
  }

  // 4. Read and parse the JSONL log.
  let content: string;
  try {
    content = readFileSync(logPath, 'utf-8');
  } catch (err) {
    reporter.error(
      `Cannot read log file: ${err instanceof Error ? err.message : String(err)}`,
    );
    return 1;
  }

  let parsed: ReturnType<typeof parseJsonlReports>;
  try {
    parsed = parseJsonlReports(content);
  } catch (err) {
    reporter.error(
      `Failed to parse log file: ${err instanceof Error ? err.message : String(err)}`,
    );
    return 1;
  }

  if (parsed.reports.length === 0) {
    reporter.error('No skill reports found in log file');
    return 1;
  }

  // 5. Determine repo root and run ID.
  let repoRoot: string;
  try {
    repoRoot = repoPath ?? getRepoRoot(options.cwd ?? process.cwd());
  } catch {
    // Not in a git repo — use the log's cwd or the current directory.
    repoRoot = parsed.runMetadata?.cwd ?? options.cwd ?? process.cwd();
  }

  // Stable run ID: use the one from the log, or derive a fallback from the filename.
  const runId = parsed.runMetadata?.runId ?? deriveRunIdFromPath(logPath);

  // 6. Load existing reviews (returns an empty sidecar on first open).
  let reviewFile: ReturnType<typeof loadReviews>;
  try {
    reviewFile = loadReviews(repoRoot, runId, logPath);
  } catch (err) {
    reporter.error(
      `Failed to load review sidecar: ${err instanceof Error ? err.message : String(err)}`,
    );
    return 1;
  }

  // 7. Build the session model.
  const session = buildInspectSession(parsed.reports, reviewFile);

  // 8. Hand off to the render hook (stub for now; replaced by Ink TUI later).
  return render({ logPath, repoRoot, runId, session });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive a stable fallback run ID from a JSONL filename when the log carries
 * no `runId`.  The fallback is prefixed with `file:` so callers can distinguish
 * it from a real UUID.
 *
 * Example: `a1b2c3d4-2026-08-18T09-11-07-000Z.jsonl` → `file:a1b2c3d4-2026-08-18T09-11-07-000Z`
 */
function deriveRunIdFromPath(logPath: string): string {
  const basename = logPath.split('/').pop() ?? logPath;
  const name = basename.endsWith('.jsonl') ? basename.slice(0, -6) : basename;
  return `file:${name}`;
}
