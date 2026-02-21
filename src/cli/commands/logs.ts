import { existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import chalk from 'chalk';
import { loadWardenConfig } from '../../config/loader.js';
import type { ConfidenceThreshold, Severity, SkillReport } from '../../types/index.js';
import type { CLIOptions, LogsOptions } from '../args.js';
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
 * List all JSONL log files in .warden/logs/.
 */
export async function runLogsList(options: CLIOptions, reporter: Reporter): Promise<number> {
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
    reporter.warning('No log files found');
    reporter.tip('Run warden to generate logs in .warden/logs/');
    return 0;
  }

  // Parse all logs for metadata and sort by timestamp (newest first)
  const logData: { entry: string; meta: LogFileMetadata | undefined }[] = [];
  for (const entry of entries) {
    const filePath = join(logDir, entry);
    logData.push({ entry, meta: parseLogMetadata(filePath) });
  }
  logData.sort((a, b) => {
    const tsA = a.meta?.summary.run.timestamp ?? '';
    const tsB = b.meta?.summary.run.timestamp ?? '';
    return tsB.localeCompare(tsA);
  });

  if (options.json) {
    const results = logData.map(({ entry, meta }) => ({
      file: entry,
      runId: meta?.summary.run.runId,
      timestamp: meta?.summary.run.timestamp,
      model: meta?.model,
      headSha: meta?.headSha,
      files: meta?.totalFiles,
      findings: meta?.summary.totalFindings,
      bySeverity: meta?.summary.bySeverity,
      durationMs: meta?.summary.run.durationMs,
      costUSD: meta?.summary.usage?.costUSD,
      skills: meta?.skills,
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

    const { summary, skills } = meta;
    totals.findings += summary.totalFindings;
    totals.durationMs += summary.run.durationMs;
    if (summary.usage) {
      totals.costUSD += summary.usage.costUSD;
    }
    for (const [sev, count] of Object.entries(summary.bySeverity)) {
      totals.bySeverity[sev as Severity] += count;
    }
    for (const skill of skills) {
      totals.skills.add(skill);
    }

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
  const widths = {
    runId: Math.max(headers.runId.length, ...rows.map((r) => visualWidth(r.runId))),
    date: Math.max(headers.date.length, ...rows.map((r) => visualWidth(r.date))),
    files: Math.max(headers.files.length, ...rows.map((r) => visualWidth(r.files))),
    findings: Math.max(headers.findings.length, ...rows.map((r) => visualWidth(r.findings))),
    time: Math.max(headers.time.length, ...rows.map((r) => visualWidth(r.time))),
    cost: Math.max(headers.cost.length, ...rows.map((r) => visualWidth(r.cost))),
    sha: Math.max(headers.sha.length, ...rows.map((r) => visualWidth(r.sha))),
    model: Math.max(headers.model.length, ...rows.map((r) => visualWidth(r.model))),
    skills: Math.max(headers.skills.length, ...rows.map((r) => visualWidth(r.skills))),
  };

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
      `${entries.length} ${pluralize(entries.length, 'run')}  ·  ` +
      `${totals.findings} ${pluralize(totals.findings, 'finding')}  `
    ) +
    formatSeverityBreakdown(totals.bySeverity) +
    chalk.dim(
      `  ·  ${formatDuration(totals.durationMs)}` +
      `  ·  ${formatCost(totals.costUSD)}` +
      `  ·  ${totals.skills.size} ${pluralize(totals.skills.size, 'skill')}`
    )
  );

  return 0;
}

/**
 * Show results from JSONL log files (replaces `warden replay`).
 */
export async function runLogsShow(
  logsOptions: LogsOptions,
  options: CLIOptions,
  reporter: Reporter,
): Promise<number> {
  const { files: fileArgs } = logsOptions;

  if (fileArgs.length === 0) {
    reporter.error('No log files specified');
    reporter.tip('Usage: warden logs show <file.jsonl> [file2.jsonl ...]');
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
export async function runLogsGc(options: CLIOptions, reporter: Reporter): Promise<number> {
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
 * Dispatch to the appropriate logs subcommand.
 */
export async function runLogs(
  logsOptions: LogsOptions,
  options: CLIOptions,
  reporter: Reporter,
): Promise<number> {
  switch (logsOptions.subcommand) {
    case 'list':
      return runLogsList(options, reporter);
    case 'show':
      return runLogsShow(logsOptions, options, reporter);
    case 'gc':
      return runLogsGc(options, reporter);
  }
}
