import { existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import chalk from 'chalk';
import { loadWardenConfig } from '../../config/loader.js';
import type { Severity, SkillReport } from '../../types/index.js';
import type { CLIOptions, LogsOptions } from '../args.js';
import { getRepoRoot } from '../git.js';
import { findExpiredArtifacts } from '../log-cleanup.js';
import { renderTerminalReport, filterReports } from '../terminal.js';
import type { Reporter } from '../output/reporter.js';
import {
  pluralize,
  formatDuration,
  formatCost,
  formatSeverityDot,
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

/**
 * Format a severity breakdown as colored dots with counts.
 */
function formatSeverityBreakdown(bySeverity: Partial<Record<Severity, number>>): string {
  const parts: string[] = [];
  const severities: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
  for (const sev of severities) {
    const count = bySeverity[sev] ?? 0;
    if (count > 0) {
      parts.push(`${formatSeverityDot(sev)} ${count}`);
    }
  }
  return parts.length > 0 ? parts.join('  ') : '';
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

  // Parse all logs for metadata
  const logData: { entry: string; meta: LogFileMetadata | undefined }[] = [];
  for (const entry of entries) {
    const filePath = join(logDir, entry);
    logData.push({ entry, meta: parseLogMetadata(filePath) });
  }

  if (options.json) {
    const results = logData.map(({ entry, meta }) => ({
      file: entry,
      runId: meta?.summary.run.runId,
      timestamp: meta?.summary.run.timestamp,
      findings: meta?.summary.totalFindings,
      bySeverity: meta?.summary.bySeverity,
      durationMs: meta?.summary.run.durationMs,
      costUSD: meta?.summary.usage?.costUSD,
      skills: meta?.skills,
    }));

    process.stdout.write(JSON.stringify(results, null, 2) + '\n');
    return 0;
  }

  // Aggregate totals across all runs
  const totals = {
    findings: 0,
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 } as Record<Severity, number>,
    costUSD: 0,
    durationMs: 0,
    skills: new Set<string>(),
  };

  for (const { meta } of logData) {
    if (!meta) continue;
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
  }

  // Per-run table
  for (const { entry, meta } of logData) {
    if (!meta) {
      reporter.text(`  ${entry}  ${chalk.dim('(unable to parse)')}`);
      continue;
    }

    const { summary, skills } = meta;
    const runId = chalk.bold(shortRunId(summary.run.runId));
    const date = chalk.dim(summary.run.timestamp.replace('T', ' ').replace(/\.\d+Z$/, 'Z'));
    const duration = chalk.dim(formatDuration(summary.run.durationMs));
    const skillList = chalk.dim(skills.join(', '));

    const findingCount = summary.totalFindings;
    const sevBreakdown = formatSeverityBreakdown(summary.bySeverity);
    const findingStr = findingCount === 0
      ? chalk.dim('0 findings')
      : `${findingCount} ${pluralize(findingCount, 'finding')}`;

    const costStr = summary.usage ? chalk.dim(formatCost(summary.usage.costUSD)) : '';

    reporter.text(
      `  ${runId}  ${date}  ${findingStr}${sevBreakdown ? `  ${sevBreakdown}` : ''}  ${duration}${costStr ? `  ${costStr}` : ''}`
    );
    reporter.text(`         ${skillList}`);
  }

  // Summary footer
  reporter.blank();
  const totalSev = formatSeverityBreakdown(totals.bySeverity);
  reporter.text(
    `${entries.length} ${pluralize(entries.length, 'run')}  ·  ` +
    `${totals.findings} ${pluralize(totals.findings, 'finding')}${totalSev ? `  ${totalSev}` : ''}  ·  ` +
    `${formatDuration(totals.durationMs)}  ·  ` +
    `${formatCost(totals.costUSD)}  ·  ` +
    `${totals.skills.size} ${pluralize(totals.skills.size, 'skill')}`
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
      totalDurationMs = Math.max(totalDurationMs, parsed.totalDurationMs);

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

  // Apply filtering
  const filteredReports = filterReports(allReports, options.reportOn, options.minConfidence ?? 'medium');

  // Output results
  reporter.blank();
  if (options.json) {
    const jsonlContent = renderJsonlString(filteredReports, totalDurationMs, lastRunMetadata ? {
      runId: lastRunMetadata.runId,
      traceId: lastRunMetadata.traceId,
      timestamp: new Date(lastRunMetadata.timestamp),
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
