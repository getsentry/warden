import { existsSync, openSync, closeSync, fstatSync, readSync, readdirSync, readFileSync, unlinkSync, watch } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import chalk from 'chalk';
import { loadWardenConfig } from '../../config/loader.js';
import type { ConfidenceThreshold, Severity, SkillReport } from '../../types/index.js';
import type { CLIOptions, RunsOptions } from '../args.js';
import { getRepoRoot } from '../git.js';
import { findExpiredArtifacts } from '../log-cleanup.js';
import { renderTerminalReport, filterReports } from '../terminal.js';
import type { Reporter } from '../output/reporter.js';
import {
  pluralize,
  formatDuration,
  formatCost,
  shortRunId,
  parseJsonlReports,
  parseLogMetadata,
  renderJsonlString,
  JsonlRecordSchema,
  JsonlSummaryRecordSchema,
  type JsonlRunMetadata,
  type LogFileMetadata,
} from '../output/index.js';

/**
 * Resolve a log directory path from the repo root.
 */
function resolveLogDir(): { logDir: string; repoPath: string } | undefined {
  const cwd = process.cwd();
  let repoPath: string;
  try {
    repoPath = getRepoRoot(cwd);
  } catch {
    return undefined;
  }
  return { logDir: join(repoPath, '.warden', 'logs'), repoPath };
}

/**
 * Recover an ISO timestamp from `{runId8}-{ISO-datetime}.jsonl`.
 * Used as the list sort key for in-progress runs (no summary yet).
 */
function filenameTimestamp(filename: string): string {
  const match = filename.match(/-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.jsonl$/);
  const stamp = match?.[1];
  if (!stamp) return '';
  return stamp.replace(
    /^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/,
    '$1:$2:$3.$4Z',
  );
}

/**
 * Resolve a file argument to a full path.
 * If the argument looks like a run ID (no `/` or `.`), look up matching files in .warden/logs/.
 */
function resolveFileArg(arg: string, logDir: string): string[] {
  // If it contains path separators or dots, treat as a file path
  if (arg.includes('/') || arg.includes('.')) {
    return [resolve(process.cwd(), arg)];
  }

  // Treat as a short run ID — glob for matching files
  try {
    const entries = readdirSync(logDir);
    const matches = entries
      .filter((e) => e.endsWith('.jsonl') && e.startsWith(arg))
      .map((e) => join(logDir, e));
    return matches;
  } catch {
    return [];
  }
}

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g;

/**
 * Get the visual width of a string (ignoring ANSI escape codes).
 */
function visualWidth(str: string): number {
  return str.replace(ANSI_RE, '').length;
}

/**
 * Pad a string to a visual width, accounting for ANSI codes.
 */
function padToWidth(str: string, width: number): string {
  const pad = width - visualWidth(str);
  return pad > 0 ? str + ' '.repeat(pad) : str;
}

/**
 * Right-align a string to a visual width, accounting for ANSI codes.
 */
function rightAlign(str: string, width: number): string {
  const pad = width - visualWidth(str);
  return pad > 0 ? ' '.repeat(pad) + str : str;
}

/**
 * Format a date as a human-friendly relative or short absolute string.
 */
function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  // Older than a week: show short date
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear();
  const currentYear = new Date().getFullYear();
  return year === currentYear ? `${month} ${day}` : `${month} ${day}, ${year}`;
}

const SEVERITY_COLORS: Record<Severity, (s: string) => string> = {
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.green,
};

/**
 * Format a severity breakdown as colored counts.
 */
function formatSeverityBreakdown(bySeverity: Partial<Record<Severity, number>>): string {
  const severities: Severity[] = ['high', 'medium', 'low'];
  const parts = severities.map((sev) => {
    const count = bySeverity[sev] ?? 0;
    return count > 0 ? SEVERITY_COLORS[sev](String(count)) : chalk.dim('0');
  });
  return parts.join(chalk.dim(' / '));
}

/**
 * List sessions in `.warden/logs/`. Empty (no-file, no-skill) runs
 * are hidden unless `all` is set.
 */
export async function runRunsList(
  options: CLIOptions,
  reporter: Reporter,
  listOptions: { all?: boolean } = {},
): Promise<number> {
  const resolved = resolveLogDir();
  if (!resolved) {
    reporter.error('Not a git repository');
    return 1;
  }

  const { logDir } = resolved;

  let entries: string[];
  try {
    entries = readdirSync(logDir)
      .filter((e) => e.endsWith('.jsonl'))
      .sort()
      .reverse(); // newest first (filenames embed timestamps)
  } catch {
    entries = [];
  }

  if (entries.length === 0) {
    reporter.warning('No saved sessions found');
    reporter.tip('Run warden to generate sessions in .warden/logs/');
    return 0;
  }

  const allLogData: { entry: string; meta: LogFileMetadata | undefined }[] = [];
  for (const entry of entries) {
    const filePath = join(logDir, entry);
    allLogData.push({ entry, meta: parseLogMetadata(filePath) });
  }
  // In-progress runs have no summary; fall back to the run record's
  // timestamp, then to the filename, so they sort to the top.
  const sortKey = (entry: { entry: string; meta: LogFileMetadata | undefined }) =>
    entry.meta?.summary?.run.timestamp ??
    entry.meta?.runMetadata?.timestamp ??
    filenameTimestamp(entry.entry);
  allLogData.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));

  // Run-level errors (auth, config) stay visible even with zero files —
  // the error is the point of keeping the record. In-progress runs also
  // stay visible so users can find the active session.
  const isEmptyRun = (entry: { meta: LogFileMetadata | undefined }) => {
    const meta = entry.meta;
    if (!meta || meta.inProgress) return false;
    if (meta.summary?.error) return false;
    return meta.totalFiles === 0 && meta.skills.length === 0;
  };
  const showAll = listOptions.all ?? false;
  const logData = showAll ? allLogData : allLogData.filter((e) => !isEmptyRun(e));
  const hiddenCount = allLogData.length - logData.length;

  if (options.json) {
    const results = logData.map(({ entry, meta }) => ({
      file: entry,
      runId: meta?.runMetadata?.runId,
      timestamp: meta?.runMetadata?.timestamp,
      model: meta?.model,
      headSha: meta?.headSha,
      files: meta?.totalFiles,
      findings: meta?.summary?.totalFindings,
      bySeverity: meta?.summary?.bySeverity,
      durationMs: meta?.summary?.run.durationMs,
      costUSD: meta?.summary?.usage?.costUSD,
      skills: meta?.skills,
      inProgress: meta?.inProgress ?? false,
    }));

    process.stdout.write(JSON.stringify(results, null, 2) + '\n');
    return 0;
  }

  // Build row data so we can calculate column widths
  interface Row {
    runId: string;
    date: string;
    files: string;
    findings: string;
    time: string;
    cost: string;
    sha: string;
    model: string;
    skills: string;
  }

  const rows: Row[] = [];

  // Aggregate totals across all runs
  const totals = {
    findings: 0,
    bySeverity: { high: 0, medium: 0, low: 0 } as Record<Severity, number>,
    costUSD: 0,
    durationMs: 0,
    skills: new Set<string>(),
  };

  for (const { entry, meta } of logData) {
    if (!meta) {
      rows.push({
        runId: entry.slice(0, 8),
        date: '',
        files: '',
        findings: chalk.dim('parse error'),
        time: '',
        cost: '',
        sha: '',
        model: '-',
        skills: '',
      });
      continue;
    }

    const { summary, runMetadata, skills, inProgress } = meta;

    if (inProgress) {
      const ts = runMetadata?.timestamp ?? filenameTimestamp(entry);
      const runId = runMetadata?.runId
        ? shortRunId(runMetadata.runId)
        : entry.slice(0, 8);
      rows.push({
        runId,
        date: ts ? formatRelativeTime(new Date(ts)) : '',
        files: meta.totalFiles > 0 ? String(meta.totalFiles) : '',
        findings: chalk.yellow('running'),
        time: '',
        cost: '',
        sha: meta.headSha ? meta.headSha.slice(0, 7) : '',
        model: meta.model ?? '-',
        skills: skills.join(', '),
      });
      for (const skill of skills) totals.skills.add(skill);
      continue;
    }

    if (summary) {
      totals.findings += summary.totalFindings;
      totals.durationMs += summary.run.durationMs;
      if (summary.usage) totals.costUSD += summary.usage.costUSD;
      for (const [sev, count] of Object.entries(summary.bySeverity)) {
        totals.bySeverity[sev as Severity] += count;
      }
      for (const skill of skills) totals.skills.add(skill);

      rows.push({
        runId: shortRunId(summary.run.runId),
        date: formatRelativeTime(new Date(summary.run.timestamp)),
        files: meta.totalFiles > 0 ? String(meta.totalFiles) : '',
        findings: formatSeverityBreakdown(summary.bySeverity),
        time: formatDuration(summary.run.durationMs),
        cost: summary.usage ? formatCost(summary.usage.costUSD) : '',
        sha: meta.headSha ? meta.headSha.slice(0, 7) : '',
        model: meta.model ?? '-',
        skills: skills.join(', '),
      });
    }
  }

  // Calculate column widths
  const headers = {
    runId: 'RUN',
    date: 'DATE',
    files: 'FILES',
    findings: 'FINDINGS',
    time: 'TIME',
    cost: 'COST',
    sha: 'SHA',
    model: 'MODEL',
    skills: 'SKILLS',
  };
  const widths = Object.fromEntries(
    Object.keys(headers).map((key) => {
      const col = key as keyof Row;
      return [col, Math.max(headers[col].length, ...rows.map((r) => visualWidth(r[col])))];
    }),
  ) as Record<keyof Row, number>;

  // Header row
  const headerLine =
    `  ${padToWidth(headers.runId, widths.runId)}  ` +
    `${padToWidth(headers.date, widths.date)}  ` +
    `${rightAlign(headers.files, widths.files)}  ` +
    `${padToWidth(headers.findings, widths.findings)}  ` +
    `${rightAlign(headers.time, widths.time)}  ` +
    `${rightAlign(headers.cost, widths.cost)}  ` +
    `${padToWidth(headers.sha, widths.sha)}  ` +
    `${padToWidth(headers.model, widths.model)}  ` +
    `${headers.skills}`;
  reporter.text(chalk.dim(headerLine));

  // Data rows
  for (const row of rows) {
    const line =
      `  ${padToWidth(chalk.bold(row.runId), widths.runId)}  ` +
      `${padToWidth(chalk.dim(row.date), widths.date)}  ` +
      `${rightAlign(chalk.dim(row.files), widths.files)}  ` +
      `${padToWidth(row.findings, widths.findings)}  ` +
      `${rightAlign(chalk.dim(row.time), widths.time)}  ` +
      `${rightAlign(chalk.dim(row.cost), widths.cost)}  ` +
      `${padToWidth(chalk.dim(row.sha), widths.sha)}  ` +
      `${padToWidth(chalk.dim(row.model), widths.model)}  ` +
      `${chalk.dim(row.skills)}`;
    reporter.text(line);
  }

  // Summary footer
  reporter.blank();
  reporter.text(
    chalk.dim(
      `${rows.length} ${pluralize(rows.length, 'run')}  ·  ` +
      `${totals.findings} ${pluralize(totals.findings, 'finding')}  `
    ) +
    formatSeverityBreakdown(totals.bySeverity) +
    chalk.dim(
      `  ·  ${formatDuration(totals.durationMs)}` +
      `  ·  ${formatCost(totals.costUSD)}` +
      `  ·  ${totals.skills.size} ${pluralize(totals.skills.size, 'skill')}`
    )
  );

  if (hiddenCount > 0) {
    reporter.text(
      chalk.dim(
        `${hiddenCount} empty ${pluralize(hiddenCount, 'session')} hidden — pass --all to show`,
      ),
    );
  }

  return 0;
}

/**
 * Show results from JSONL log files (replaces `warden replay`).
 */
export async function runRunsShow(
  runsOptions: RunsOptions,
  options: CLIOptions,
  reporter: Reporter,
): Promise<number> {
  const { files: fileArgs } = runsOptions;

  if (fileArgs.length === 0) {
    reporter.error('No log files specified');
    reporter.tip('Usage: warden runs show <file.jsonl> [file2.jsonl ...]');
    return 1;
  }

  // Resolve file arguments (may be paths or run IDs)
  const resolved = resolveLogDir();
  const logDir = resolved?.logDir;

  const resolvedFiles: string[] = [];
  for (const arg of fileArgs) {
    if (logDir) {
      const matches = resolveFileArg(arg, logDir);
      if (matches.length > 0) {
        resolvedFiles.push(...matches);
        continue;
      }
    }
    // Fall back to treating as a direct path
    resolvedFiles.push(resolve(process.cwd(), arg));
  }

  // Validate all files exist
  const missingFiles: string[] = [];
  for (const file of resolvedFiles) {
    if (!existsSync(file)) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    reporter.error(`Log ${pluralize(missingFiles.length, 'file')} not found: ${missingFiles.join(', ')}`);
    return 1;
  }

  // Parse and merge reports from all files
  const allReports: SkillReport[] = [];
  let totalDurationMs = 0;
  let lastRunMetadata: JsonlRunMetadata | undefined;

  for (const file of resolvedFiles) {
    try {
      const content = readFileSync(file, 'utf-8');
      const parsed = parseJsonlReports(content);
      allReports.push(...parsed.reports);
      totalDurationMs += parsed.totalDurationMs;

      if (parsed.runMetadata) {
        lastRunMetadata = parsed.runMetadata;
        reporter.debug(`Loaded ${parsed.reports.length} ${pluralize(parsed.reports.length, 'skill')} from ${file}`);
        reporter.debug(`  Run ID: ${parsed.runMetadata.runId}`);
        reporter.debug(`  Timestamp: ${parsed.runMetadata.timestamp}`);
      }
    } catch (err) {
      reporter.error(`Failed to parse ${file}: ${err instanceof Error ? err.message : String(err)}`);
      return 1;
    }
  }

  if (allReports.length === 0) {
    reporter.warning('No skill reports found in log files');
    return 0;
  }

  // Load config for minConfidence default (matches main run flow)
  let configMinConfidence: ConfidenceThreshold | undefined;
  if (resolved) {
    try {
      const configPath = resolve(resolved.repoPath, 'warden.toml');
      if (existsSync(configPath)) {
        const config = loadWardenConfig(dirname(configPath));
        configMinConfidence = config.defaults?.minConfidence;
      }
    } catch {
      // Use default
    }
  }

  // Apply filtering
  const filteredReports = filterReports(allReports, options.reportOn, options.minConfidence ?? configMinConfidence ?? 'medium');

  // Output results
  reporter.blank();
  if (options.json) {
    const jsonlContent = renderJsonlString(filteredReports, totalDurationMs, lastRunMetadata ? {
      runId: lastRunMetadata.runId,
      traceId: lastRunMetadata.traceId,
      timestamp: new Date(lastRunMetadata.timestamp),
      model: lastRunMetadata.model,
      headSha: lastRunMetadata.headSha,
      cwd: lastRunMetadata.cwd,
    } : undefined);
    process.stdout.write(jsonlContent);
  } else {
    console.log(renderTerminalReport(filteredReports, reporter.mode, { verbosity: reporter.verbosity }));
  }

  // Show summary
  reporter.blank();
  reporter.renderSummary(filteredReports, totalDurationMs);

  return 0;
}

/**
 * Garbage-collect expired log files.
 */
export async function runRunsGc(options: CLIOptions, reporter: Reporter): Promise<number> {
  const resolved = resolveLogDir();
  if (!resolved) {
    reporter.error('Not a git repository');
    return 1;
  }

  const { logDir, repoPath } = resolved;

  // Load config for retentionDays
  let retentionDays = 30;
  try {
    const configPath = resolve(repoPath, 'warden.toml');
    if (existsSync(configPath)) {
      const config = loadWardenConfig(dirname(configPath));
      retentionDays = config.logs?.retentionDays ?? 30;
    }
  } catch {
    // Use default
  }

  const expired = findExpiredArtifacts(logDir, retentionDays);

  if (expired.length === 0) {
    reporter.success('Nothing to clean up');
    return 0;
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

  reporter.success(`Removed ${deleted} expired ${pluralize(deleted, 'log file')}`);

  return 0;
}

/**
 * Resolve a follow target. With no arg, picks the newest session whose
 * file lacks a trailing `summary` record — a reliable proxy for "the
 * run currently happening in another terminal."
 */
function resolveFollowTarget(arg: string | undefined, logDir: string): string | undefined {
  if (arg) {
    if (arg.includes('/') || arg.includes('.')) {
      const path = resolve(process.cwd(), arg);
      return existsSync(path) ? path : undefined;
    }
    return resolveFileArg(arg, logDir)[0];
  }

  let entries: string[];
  try {
    entries = readdirSync(logDir)
      .filter((e) => e.endsWith('.jsonl'))
      .sort()
      .reverse();
  } catch {
    return undefined;
  }
  for (const entry of entries) {
    const filePath = join(logDir, entry);
    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }
    const lines = content.trim().split('\n').filter((l) => l.trim());
    const last = lines[lines.length - 1];
    if (!last) return filePath;
    let parsed: unknown;
    try {
      parsed = JSON.parse(last);
    } catch {
      // Corrupt tail — treating this as in-progress would hang forever.
      continue;
    }
    if ((parsed as { type?: string } | null)?.type !== 'summary') {
      return filePath;
    }
  }
  return undefined;
}

/** Render one JSONL line for the human follower. Stops on the summary record. */
function renderFollowLine(line: string, reporter: Reporter): { stop: boolean } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    reporter.warning(`Skipping malformed line: ${line.slice(0, 80)}`);
    return { stop: false };
  }

  const obj = parsed as { type?: string };

  if (obj.type === 'summary') {
    const summary = JsonlSummaryRecordSchema.safeParse(obj);
    if (summary.success) {
      const { totalFindings, bySeverity } = summary.data;
      reporter.blank();
      reporter.text(
        chalk.dim(`Run finished — ${totalFindings} ${pluralize(totalFindings, 'finding')}  `) +
          formatSeverityBreakdown(bySeverity),
      );
    }
    return { stop: true };
  }

  if (obj.type === 'fix-evaluation') return { stop: false };

  const skillResult = JsonlRecordSchema.safeParse(obj);
  if (!skillResult.success) {
    reporter.warning(`Skipping unrecognized record`);
    return { stop: false };
  }
  const { run: _run, ...report } = skillResult.data;
  console.log(renderTerminalReport([report], reporter.mode, { verbosity: reporter.verbosity }));
  return { stop: false };
}

/** `--json` mode: pass the raw line through unmodified for downstream tools. */
function passthroughFollowLine(line: string): { stop: boolean } {
  // One write keeps the line + newline atomic for piped consumers.
  process.stdout.write(line + '\n');
  try {
    const parsed = JSON.parse(line) as { type?: string };
    if (parsed?.type === 'summary') return { stop: true };
  } catch {
    // partial / invalid line; keep waiting for a valid summary
  }
  return { stop: false };
}

/**
 * Tail a JSONL session file, rendering each appended record live.
 * Exits 0 on summary record or Ctrl-C — never on findings; this is a
 * viewer, not a build gate.
 */
export async function runRunsFollow(
  runsOptions: RunsOptions,
  options: CLIOptions,
  reporter: Reporter,
): Promise<number> {
  const resolved = resolveLogDir();
  if (!resolved) {
    reporter.error('Not a git repository');
    return 1;
  }
  const { logDir } = resolved;

  const target = resolveFollowTarget(runsOptions.files[0], logDir);
  if (!target) {
    if (runsOptions.files[0]) {
      reporter.error(`No matching session for ${runsOptions.files[0]}`);
    } else {
      reporter.error('No active session to follow');
      reporter.tip('Start a run in another terminal, or pass an explicit run id.');
    }
    return 1;
  }

  if (!options.json) {
    reporter.dim(`Following: ${target}`);
    reporter.blank();
  }

  // Render anything already on disk and remember where we left off.
  let offset = 0;
  let buffer = '';
  let stopped = false;

  const drainFile = (): void => {
    let fd: number;
    try {
      fd = openSync(target, 'r');
    } catch {
      return;
    }
    try {
      const stat = fstatSync(fd);
      if (stat.size <= offset) return;
      const len = stat.size - offset;
      const buf = Buffer.alloc(len);
      readSync(fd, buf, 0, len, offset);
      offset = stat.size;
      buffer += buf.toString('utf-8');
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (!line.trim()) continue;
        const result = options.json
          ? passthroughFollowLine(line)
          : renderFollowLine(line, reporter);
        if (result.stop) {
          stopped = true;
          return;
        }
      }
    } finally {
      try { closeSync(fd); } catch { /* ignore */ }
    }
  };

  drainFile();
  if (stopped) return 0;

  return new Promise<number>((resolvePromise) => {
    let watcher: ReturnType<typeof watch> | undefined;

    const tick = () => {
      drainFile();
      if (stopped) finish(0);
    };

    // fs.watch is best-effort across platforms; the 1s poll below is the
    // real correctness guarantee.
    try {
      watcher = watch(target, { persistent: true }, () => tick());
      // FSWatcher 'error' would crash the process otherwise (file deleted, inotify limit, ...).
      watcher.on('error', () => {
        try { watcher?.close(); } catch { /* ignore */ }
        watcher = undefined;
      });
    } catch { /* polling alone is fine */ }
    const pollTimer = setInterval(tick, 1000);

    const finish = (code: number) => {
      if (watcher) {
        try { watcher.close(); } catch { /* ignore */ }
      }
      clearInterval(pollTimer);
      process.off('SIGINT', onSigint);
      resolvePromise(code);
    };

    const onSigint = () => finish(0);
    process.on('SIGINT', onSigint);
  });
}

/** Dispatch to the appropriate `runs` subcommand. */
export async function runRuns(
  runsOptions: RunsOptions,
  options: CLIOptions,
  reporter: Reporter,
): Promise<number> {
  switch (runsOptions.subcommand) {
    case 'list':
      return runRunsList(options, reporter, { all: runsOptions.all });
    case 'show':
      return runRunsShow(runsOptions, options, reporter);
    case 'gc':
      return runRunsGc(options, reporter);
    case 'follow':
      return runRunsFollow(runsOptions, options, reporter);
  }
}
