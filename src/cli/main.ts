import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { config as dotenvConfig } from 'dotenv';
import { Sentry, flushSentry, setGlobalAttributes, emitRunMetric, getTraceId } from '../sentry.js';
import { emptyToUndefined, loadWardenConfig, resolveSkillConfigs } from '../config/loader.js';
import type { SkillDefinition, WardenConfig } from '../config/schema.js';
import { verifyAuth, type WardenAuthenticationError, type SkillRunnerOptions, type ChunkAnalysisResult } from '../sdk/runner.js';
import { mapExtractionErrorCode } from '../sdk/errors.js';
import { mergeAuxiliaryUsage } from '../sdk/usage.js';
import { resolveSkillAsync, SkillLoaderError } from '../skills/loader.js';
import { matchTrigger, filterContextByPaths, shouldFail, countFindingsAtOrAbove } from '../triggers/matcher.js';
import type { SkillReport, SeverityThreshold, ConfidenceThreshold, SkillError, Finding } from '../types/index.js';
import { filterFindings } from '../types/index.js';
import { DEFAULT_CONCURRENCY, getAnthropicApiKey } from '../utils/index.js';
import { parseCliArgs, showVersion, classifyTargets, type CLIOptions } from './args.js';
import { showHelp } from './help.js';
import { buildLocalEventContext, buildFileEventContext } from './context.js';
import { getRepoRoot, getHeadSha, refExists, getDefaultBranch } from './git.js';
import { renderTerminalReport, filterReports } from './terminal.js';
import {
  Reporter,
  detectOutputMode,
  parseVerbosity,
  Verbosity,
  runSkillTasks,
  runSkillTasksWithInk,
  pluralize,
  MODEL_DEFAULT_SENTINEL,
  writeJsonlContent,
  renderJsonlString,
  renderJsonlChunkLine,
  renderJsonlChunkRecords,
  initJsonlFile,
  appendJsonlLine,
  getRepoLogPath,
  generateRunId,
  type JsonlChunkRecord,
  type JsonlRunMetadata,
  type SkillTaskOptions,
} from './output/index.js';
import { cleanupArtifacts } from './log-cleanup.js';
import {
  collectFixableFindings,
  applyAllFixes,
  runInteractiveFixFlow,
  renderFixSummary,
} from './fix.js';
import { UserAbortError } from './input.js';
import { runInit } from './commands/init.js';
import { runAdd } from './commands/add.js';
import { runSetupApp } from './commands/setup-app.js';
import { runSync } from './commands/sync.js';
import { runRuns } from './commands/runs.js';
import { runBuild, runImprove } from './commands/build.js';
import {
  generatedSkillDefinitionRootExists,
  resolveGeneratedSkillTarget,
} from '../skill-builder/definition.js';

/**
 * Global abort controller for graceful shutdown on SIGINT.
 * Used to cancel in-progress SDK queries.
 */
export const abortController = new AbortController();

/**
 * Track whether SIGINT was received so the main flow can
 * render partial results and exit with code 130.
 */
export const interrupted = { value: false };

/**
 * Fail-fast abort controller. Created once and shared across run modes.
 * Signals when the first finding is detected (if --fail-fast is active).
 */
let failFastController: AbortController | undefined;

/**
 * Load environment variables from .env files in the given directory.
 * Loads .env first, then .env.local for local overrides.
 */
function loadEnvFiles(dir: string): void {
  // Load .env first (base config)
  const envPath = join(dir, '.env');
  if (existsSync(envPath)) {
    dotenvConfig({ path: envPath, quiet: true });
  }

  // Load .env.local second (local overrides, typically gitignored)
  const envLocalPath = join(dir, '.env.local');
  if (existsSync(envLocalPath)) {
    dotenvConfig({ path: envLocalPath, override: true, quiet: true });
  }
}

function createReporter(options: CLIOptions): Reporter {
  const detected = detectOutputMode(options.color);
  const outputMode = options.log ? { ...detected, isTTY: false } : detected;
  const verbosity = parseVerbosity(options.quiet, options.verbose, options.debug);
  return new Reporter(outputMode, verbosity);
}

/** Resolve the directory Warden should treat as the invocation root. */
export function resolveInvocationCwd(baseCwd: string, cliCwd: string | undefined): string {
  return cliCwd ? resolve(baseCwd, cliCwd) : baseCwd;
}

function resolveConfigPath(options: CLIOptions, repoPath: string): string {
  const cwd = process.cwd();
  return options.config ? resolve(cwd, options.config) : resolve(repoPath, 'warden.toml');
}

function resolveLocalReviewBase(configDefaultBranch: string | undefined, repoPath: string): {
  defaultBranch: string;
  base: string;
} {
  const defaultBranch = configDefaultBranch ?? getDefaultBranch(repoPath);
  if (defaultBranch.includes('/')) {
    return { defaultBranch, base: defaultBranch };
  }

  const remoteTrackingRef = `origin/${defaultBranch}`;
  return {
    defaultBranch,
    base: refExists(remoteTrackingRef, repoPath) ? remoteTrackingRef : defaultBranch,
  };
}

/**
 * Emit a minimal JSONL log (summary-only, 0 findings) for early-exit paths.
 *
 * Behavior:
 * - `--json`: writes to stdout (the API contract for piping consumers).
 * - `--output <path>`: writes to that explicit path (CI artifacts).
 * - Default `.warden/logs/`: written only when `error` is set. Real
 *   failures (auth, config load, etc.) belong in the on-disk audit trail;
 *   pure no-ops (no files, no skills) would just clutter it.
 */
function emitEmptyRunLog(
  repoPath: string,
  options: CLIOptions,
  error?: SkillError,
): void {
  const runId = generateRunId();
  const timestamp = new Date();
  let headSha: string | undefined;
  try {
    headSha = getHeadSha(repoPath);
  } catch {
    // Not in a git repo or HEAD is unborn
  }
  const content = renderJsonlString([], 0, {
    runId,
    traceId: getTraceId(),
    timestamp,
    headSha,
    error,
  });
  if (error) {
    const logPath = getRepoLogPath(repoPath, runId, timestamp);
    try {
      writeJsonlContent(logPath, content);
    } catch (err) {
      console.warn(`Warning: Failed to write run log: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (options.output) {
    try {
      writeJsonlContent(options.output, content);
    } catch (err) {
      console.warn(`Warning: Failed to write output file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (options.json) {
    process.stdout.write(content);
  }
}

/**
 * In-flight JSONL log state for a run. Skill records are appended as
 * each skill finishes; the summary is appended at finalize. A path is
 * dropped from `paths` if its initial write failed.
 */
interface RunLog {
  paths: string[];
  primaryLogPath: string;
  primaryLogWritten: boolean;
  outputPath: string | undefined;
  startTime: number;
  baseRun: Omit<JsonlRunMetadata, 'durationMs'>;
  chunks: JsonlChunkRecord[];
}

function initializeRunLog(args: {
  repoPath: string;
  runId: string;
  timestamp: Date;
  traceId: string | undefined;
  headSha: string | undefined;
  model: string | undefined;
  outputPath: string | undefined;
  reporter: Reporter;
  startTime: number;
}): RunLog {
  const { repoPath, runId, timestamp, traceId, headSha, model, outputPath, reporter, startTime } = args;

  const baseRun: Omit<JsonlRunMetadata, 'durationMs'> = {
    timestamp: timestamp.toISOString(),
    cwd: process.cwd(),
    runId,
    traceId,
    model,
    headSha,
  };

  const primaryLogPath = getRepoLogPath(repoPath, runId, timestamp);
  let primaryLogWritten = false;
  try {
    initJsonlFile(primaryLogPath);
    primaryLogWritten = true;
  } catch (err) {
    reporter.warning(`Failed to write run log: ${err instanceof Error ? err.message : String(err)}`);
  }

  let resolvedOutputPath: string | undefined;
  if (outputPath) {
    try {
      initJsonlFile(outputPath);
      resolvedOutputPath = outputPath;
    } catch (err) {
      reporter.warning(`Failed to write output file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const paths: string[] = [];
  const seenPaths = new Set<string>();
  const addPath = (path: string): void => {
    const key = resolve(process.cwd(), path);
    if (seenPaths.has(key)) return;
    seenPaths.add(key);
    paths.push(path);
  };
  if (primaryLogWritten) addPath(primaryLogPath);
  if (resolvedOutputPath) addPath(resolvedOutputPath);

  return { paths, primaryLogPath, primaryLogWritten, outputPath: resolvedOutputPath, startTime, baseRun, chunks: [] };
}

function appendChunkToRunLog(log: RunLog, skillName: string, chunk: ChunkAnalysisResult): void {
  if (log.paths.length === 0) return;
  const auxiliaryUsage = chunk.auxiliaryUsage?.reduce(
    (acc, entry) => mergeAuxiliaryUsage(acc, { [entry.agent]: entry.usage }),
    undefined as JsonlChunkRecord['auxiliaryUsage'],
  );
  const error: SkillError | undefined = chunk.failed
    ? {
        code: chunk.failureCode ?? 'unknown',
        message: chunk.failureMessage ?? 'unknown error',
        timestamp: new Date().toISOString(),
      }
    : chunk.extractionFailed
      ? {
          code: mapExtractionErrorCode(chunk.extractionError),
          message: chunk.extractionError ?? 'unknown extraction error',
          timestamp: new Date().toISOString(),
        }
      : undefined;
  const record: JsonlChunkRecord = {
    schemaVersion: 1,
    run: { ...log.baseRun, durationMs: Date.now() - log.startTime },
    skill: skillName,
    model: chunk.model,
    chunk: {
      file: chunk.filename,
      index: chunk.index,
      total: chunk.total,
      lineRange: chunk.lineRange,
    },
    status: error ? 'error' : 'ok',
    findings: chunk.findings,
    usage: chunk.usage,
    durationMs: chunk.durationMs,
    auxiliaryUsage,
    error,
  };
  let line: string;
  try {
    line = renderJsonlChunkLine(record);
  } catch {
    return;
  }
  log.chunks.push(record);
  for (const p of log.paths) {
    try { appendJsonlLine(p, line); } catch { /* best-effort */ }
  }
}

function buildReportChunkRecord(
  log: RunLog,
  report: SkillReport,
  runDurationMs: number,
  index = 1,
  total = 1,
  error?: SkillError,
): JsonlChunkRecord {
  const reportError = report.error ?? error;
  return {
    schemaVersion: 1,
    run: { ...log.baseRun, durationMs: runDurationMs },
    skill: report.skill,
    model: report.model,
    chunk: {
      file: report.skippedFiles?.[0]?.filename ?? '',
      index,
      total,
      lineRange: '',
    },
    status: reportError ? 'error' : report.skippedFiles?.length ? 'skipped' : 'ok',
    findings: report.findings,
    usage: report.usage,
    durationMs: report.durationMs ?? runDurationMs,
    auxiliaryUsage: report.auxiliaryUsage,
    error: reportError,
    skippedFiles: report.skippedFiles,
  };
}

function buildRunErrorChunkRecord(
  log: RunLog,
  runDurationMs: number,
  error: SkillError,
): JsonlChunkRecord {
  return {
    schemaVersion: 1,
    run: { ...log.baseRun, durationMs: runDurationMs },
    skill: 'run',
    chunk: {
      file: '',
      index: 1,
      total: 1,
      lineRange: '',
    },
    status: 'error',
    findings: [],
    durationMs: runDurationMs,
    error,
  };
}

function hasReportRecord(log: RunLog, report: SkillReport): boolean {
  return log.chunks.some((chunk) => {
    if (chunk.skill !== report.skill) return false;
    if (report.error) {
      return chunk.error?.code === report.error.code && chunk.error.message === report.error.message;
    }
    if (report.skippedFiles?.length) {
      return (chunk.skippedFiles?.length ?? 0) > 0;
    }
    return true;
  });
}

function shouldStreamReportRecord(log: RunLog, report: SkillReport): boolean {
  if (hasReportRecord(log, report)) return false;
  return Boolean(report.error || report.skippedFiles?.length || !log.chunks.some((chunk) => chunk.skill === report.skill));
}

function appendReportToRunLog(log: RunLog, report: SkillReport): void {
  if (!shouldStreamReportRecord(log, report)) return;
  const record = buildReportChunkRecord(log, report, Date.now() - log.startTime);
  let line: string;
  try {
    line = renderJsonlChunkLine(record);
  } catch {
    return;
  }
  log.chunks.push(record);
  for (const p of log.paths) {
    try { appendJsonlLine(p, line); } catch { /* best-effort */ }
  }
}

function lineRangeIncludes(lineRange: string, line: number): boolean {
  if (!lineRange) return false;
  const [startText, endText] = lineRange.split('-');
  const start = Number(startText);
  const end = endText ? Number(endText) : start;
  return Number.isFinite(start) && Number.isFinite(end) && line >= start && line <= end;
}

function findChunkForFinding(chunks: JsonlChunkRecord[], skill: string, finding: Finding): JsonlChunkRecord | undefined {
  const sameSkill = chunks.filter((chunk) => chunk.skill === skill && chunk.chunk.file);
  const location = finding.location;
  if (!location) return sameSkill[0];
  return sameSkill.find((chunk) =>
    chunk.chunk.file === location.path && lineRangeIncludes(chunk.chunk.lineRange, location.startLine)
  ) ?? sameSkill.find((chunk) => chunk.chunk.file === location.path) ?? sameSkill[0];
}

function buildFinalChunkRecords(
  log: RunLog,
  reports: SkillReport[],
  totalDurationMs: number,
  error?: SkillError,
): JsonlChunkRecord[] {
  const finalRun: JsonlRunMetadata = { ...log.baseRun, durationMs: totalDurationMs };
  if (log.chunks.length === 0) {
    if (reports.length === 0 && error) {
      return [buildRunErrorChunkRecord(log, totalDurationMs, error)];
    }
    return reports.map((report) => buildReportChunkRecord(log, report, totalDurationMs, undefined, undefined, error));
  }

  const findingsByChunk = new Map<JsonlChunkRecord, Finding[]>();
  for (const report of reports) {
    for (const finding of report.findings) {
      const chunk = findChunkForFinding(log.chunks, report.skill, finding);
      if (!chunk) continue;
      const findings = findingsByChunk.get(chunk) ?? [];
      findings.push(finding);
      findingsByChunk.set(chunk, findings);
    }
  }

  const chunkRecords = log.chunks.map((chunk) => ({
    ...chunk,
    run: { ...finalRun },
    findings: findingsByChunk.get(chunk) ?? [],
  }));

  const finalLog = { ...log, chunks: chunkRecords };
  const missingReports = reports.filter((report) => shouldStreamReportRecord(finalLog, report));
  return [
    ...chunkRecords,
    ...missingReports.map((report) => buildReportChunkRecord(log, report, totalDurationMs, undefined, undefined, error)),
  ];
}

/**
 * Rewrite the run log with final chunk records. Returns the set of paths that
 * accepted the write, so the caller can decide whether to claim
 * "wrote JSONL output to X" (only true when the final log actually landed).
 */
function finalizeRunLog(
  log: RunLog,
  reports: SkillReport[],
  totalDurationMs: number,
  error?: SkillError
): Set<string> {
  const wrote = new Set<string>();
  if (log.paths.length === 0) return wrote;
  let content: string;
  try {
    const records = buildFinalChunkRecords(log, reports, totalDurationMs, error);
    content = renderJsonlChunkRecords(records);
  } catch {
    return wrote;
  }
  for (const p of log.paths) {
    const targetPath = resolve(process.cwd(), p);
    const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
    const tempDonePath = `${tempPath}.done`;
    try {
      writeJsonlContent(tempPath, content);
      writeFileSync(tempDonePath, '');
      renameSync(tempPath, targetPath);
      renameSync(tempDonePath, `${targetPath}.done`);
      wrote.add(p);
    } catch {
      try { unlinkSync(tempPath); } catch { /* ignore */ }
      try { unlinkSync(tempDonePath); } catch { /* ignore */ }
      // best-effort
    }
  }
  return wrote;
}

interface SkillToRun {
  skill: string;
  remote?: string;
  filters: { paths?: string[]; ignorePaths?: string[] };
  model?: string;
  maxTurns?: number;
  runtime?: SkillRunnerOptions['runtime'];
  auxiliaryModel?: string;
  synthesisModel?: string;
  auxiliaryMaxRetries?: number;
  verifyFindings?: boolean;
}

export interface RunSkillSpec {
  name: string;
  displayName?: string;
  skill: string;
  remote?: string;
  failOn?: SeverityThreshold;
  minConfidence?: ConfidenceThreshold;
  context: Awaited<ReturnType<typeof buildLocalEventContext>>;
  runnerOptions: SkillRunnerOptions;
}

interface ProcessedResults {
  reports: SkillReport[];
  filteredReports: SkillReport[];
  hasFailure: boolean;
  failureReasons: string[];
}

type SkillRunnerOptionOverrides = Pick<
  SkillRunnerOptions,
  'model' | 'maxTurns' | 'runtime' | 'auxiliaryModel' | 'synthesisModel' | 'auxiliaryMaxRetries' | 'verifyFindings'
>;

/** Apply per-skill runner overrides on top of the shared execution defaults. */
export function mergeSkillRunnerOptions(
  base: SkillRunnerOptions,
  overrides: SkillRunnerOptionOverrides
): SkillRunnerOptions {
  const merged = { ...base };

  if (overrides.model !== undefined) merged.model = overrides.model;
  if (overrides.maxTurns !== undefined) merged.maxTurns = overrides.maxTurns;
  if (overrides.runtime !== undefined) merged.runtime = overrides.runtime;
  if (overrides.auxiliaryModel !== undefined) merged.auxiliaryModel = overrides.auxiliaryModel;
  if (overrides.synthesisModel !== undefined) merged.synthesisModel = overrides.synthesisModel;
  if (overrides.auxiliaryMaxRetries !== undefined) {
    merged.auxiliaryMaxRetries = overrides.auxiliaryMaxRetries;
  }
  if (overrides.verifyFindings !== undefined) merged.verifyFindings = overrides.verifyFindings;

  return merged;
}

function renderSkillRunHeader(args: {
  reporter: Reporter;
  skill: SkillDefinition;
  repoPath?: string;
  runtimeName: string;
  model?: string;
}): void {
  const { reporter, skill, repoPath, runtimeName, model } = args;
  const source = skill.rootDir && repoPath && skill.rootDir.startsWith(repoPath)
    ? skill.rootDir.slice(repoPath.length + 1)
    : skill.rootDir;

  reporter.blank();
  reporter.text(`  Skill    ${skill.name}`);
  if (source) {
    reporter.text(`  Source   ${source}`);
  }
  reporter.text(`  Model    ${model ?? 'default'} [${runtimeName}]`);
  reporter.blank();
}

async function createDirectSkillTask(args: {
  spec: RunSkillSpec;
  repoPath?: string;
  options: CLIOptions;
  reporter: Reporter;
  renderHeader?: boolean;
}): Promise<SkillTaskOptions> {
  const { spec, repoPath, options, reporter, renderHeader } = args;
  let skill: SkillDefinition;
  try {
    skill = await resolveSkillAsync(spec.skill, repoPath, {
      remote: spec.remote,
      offline: options.offline,
    });
  } catch (error) {
    if (
      error instanceof SkillLoaderError &&
      repoPath &&
      generatedSkillDefinitionRootExists(resolveGeneratedSkillTarget(repoPath, spec.skill).rootDir)
    ) {
      throw new Error(
        `Generated skill ${spec.skill} is missing generated artifacts. Run "warden build ${spec.skill}" first.`,
      );
    }
    throw error;
  }
  if (renderHeader && !options.json) {
    renderSkillRunHeader({
      reporter,
      skill,
      repoPath,
      runtimeName: spec.runnerOptions.runtime ?? 'claude',
      model: spec.runnerOptions.model,
    });
  }
  return {
    name: spec.name,
    displayName: spec.displayName,
    failOn: spec.failOn,
    minConfidence: spec.minConfidence,
    resolveSkill: async () => skill,
    context: spec.context,
    runnerOptions: spec.runnerOptions,
  };
}
/** Expand configured skills into runnable direct tasks. */
export async function createSkillTasks(args: {
  specs: RunSkillSpec[];
  repoPath?: string;
  options: CLIOptions;
  parallel: number;
  reporter: Reporter;
}): Promise<SkillTaskOptions[]> {
  const tasks: SkillTaskOptions[] = [];
  const singleDirectSkill = args.specs.length === 1;
  for (const spec of args.specs) {
    tasks.push(await createDirectSkillTask({
      spec,
      repoPath: args.repoPath,
      options: args.options,
      reporter: args.reporter,
      renderHeader: singleDirectSkill,
    }));
  }
  return tasks;
}

/** Resolve the default analysis model from config, CLI overrides, or environment. */
export function resolveCliDefaultModel(
  config: Pick<WardenConfig, 'defaults'> | null | undefined,
  cliModel?: string
): string | undefined {
  return (
    emptyToUndefined(config?.defaults?.agent?.model) ??
    emptyToUndefined(config?.defaults?.model) ??
    emptyToUndefined(cliModel) ??
    emptyToUndefined(process.env['WARDEN_MODEL'])
  );
}

/** Resolve the default auxiliary model used for helper and repair passes. */
export function resolveCliDefaultAuxiliaryModel(
  config: Pick<WardenConfig, 'defaults'> | null | undefined
): string | undefined {
  return emptyToUndefined(config?.defaults?.auxiliary?.model);
}

/** Resolve the default synthesis model, falling back to the auxiliary lane when unset. */
export function resolveCliDefaultSynthesisModel(
  config: Pick<WardenConfig, 'defaults'> | null | undefined
): string | undefined {
  return (
    emptyToUndefined(config?.defaults?.synthesis?.model) ??
    resolveCliDefaultAuxiliaryModel(config)
  );
}

/** Resolve the model label recorded in JSONL output, including the default sentinel. */
export function resolveCliLogModel(
  config: Pick<WardenConfig, 'defaults'> | null | undefined,
  cliModel?: string
): string {
  return resolveCliDefaultModel(config, cliModel) ?? MODEL_DEFAULT_SENTINEL;
}

/**
 * Process skill task results into reports and check for failures.
 * Exported for testing; callers inside main.ts use it directly.
 */
export function processTaskResults(
  results: Awaited<ReturnType<typeof runSkillTasks>>,
  reportOn: CLIOptions['reportOn'],
  minConfidence?: ConfidenceThreshold
): ProcessedResults {
  const reports: SkillReport[] = [];
  let hasFailure = false;
  const failureReasons: string[] = [];

  for (const result of results) {
    if (!result.report) continue;
    reports.push(result.report);

    // Skill-level errors always fail the run, independent of failOn thresholds.
    if (result.report.error) {
      hasFailure = true;
      failureReasons.push(`${result.name}: ${result.report.error.code}: ${result.report.error.message}`);
      continue;
    }

    // Apply confidence filtering before failOn evaluation so low-confidence findings
    // don't cause exit code 1. Per-result minConfidence (from trigger config) takes
    // precedence over the global default.
    const effectiveConfidence = result.minConfidence ?? minConfidence;
    const reportForFail = { ...result.report, findings: filterFindings(result.report.findings, undefined, effectiveConfidence) };
    if (result.failOn && shouldFail(reportForFail, result.failOn)) {
      hasFailure = true;
      const count = countFindingsAtOrAbove(reportForFail, result.failOn);
      failureReasons.push(`${result.name}: ${count} ${result.failOn}+ severity ${pluralize(count, 'issue')}`);
    }
  }

  const filteredReports = filterReports(reports, reportOn, minConfidence);
  return { reports, filteredReports, hasFailure, failureReasons };
}

async function outputResultsAndHandleFixes(
  processed: ProcessedResults,
  options: CLIOptions,
  reporter: Reporter,
  runLog: RunLog,
  totalDuration: number,
  failFastAborted?: boolean,
): Promise<number> {
  const { reports, filteredReports, hasFailure, failureReasons } = processed;

  const traceId = runLog.baseRun.traceId;

  const finalizedPaths = finalizeRunLog(runLog, reports, totalDuration);

  // Only claim --output succeeded if the summary actually landed there.
  if (runLog.outputPath) {
    if (finalizedPaths.has(runLog.outputPath)) {
      reporter.success(`Wrote JSONL output to ${runLog.outputPath}`);
    } else {
      reporter.warning(`Failed to write output file: ${runLog.outputPath}`);
    }
  }

  // Collect fixable findings early so we know whether to suppress diffs in the report
  const fixableFindings = collectFixableFindings(filteredReports);
  const willStepThrough = fixableFindings.length > 0
    && !interrupted.value
    && !failFastAborted
    && !options.json
    && !options.fix
    && reporter.verbosity !== Verbosity.Quiet
    && reporter.mode.isTTY
    && process.stdin.isTTY;

  reporter.blank();
  if (options.json) {
    // Prefer reading the on-disk log (per-skill durationMs is a snapshot).
    // Only read it back if finalize actually landed the summary there;
    // a half-written file should fall through to the in-memory render.
    // The fallback renders the same chunk-record shape in memory.
    let jsonlContent: string | undefined;
    if (finalizedPaths.has(runLog.primaryLogPath)) {
      try { jsonlContent = readFileSync(runLog.primaryLogPath, 'utf-8'); } catch { /* fall through */ }
    }
    if (!jsonlContent) {
      try {
        jsonlContent = renderJsonlChunkRecords(buildFinalChunkRecords(runLog, reports, totalDuration));
      } catch (err) {
        reporter.error(`Failed to render JSONL output: ${err instanceof Error ? err.message : String(err)}`);
        return 1;
      }
    }
    process.stdout.write(jsonlContent);
  } else {
    console.log(renderTerminalReport(filteredReports, reporter.mode, { suppressFixDiffs: willStepThrough, verbosity: reporter.verbosity }));
  }

  // Show interrupted / fail-fast banner before summary
  if (failFastAborted) {
    reporter.blank();
    reporter.warning('Stopped after first finding (--fail-fast)');
  } else if (interrupted.value) {
    reporter.blank();
    reporter.warning('Interrupted \u2014 showing partial results');
  }

  // Show summary (uses filtered reports for display)
  reporter.blank();
  reporter.renderSummary(filteredReports, totalDuration, { traceId });

  // Show log file path after summary (only if write succeeded)
  if (!options.json && runLog.primaryLogWritten) {
    reporter.dim(`Log: ${runLog.primaryLogPath}`);
  }

  // Handle fixes: --fix (automatic) always runs, interactive step-through in TTY mode
  if (fixableFindings.length > 0) {
    if (options.fix) {
      const fixSummary = applyAllFixes(fixableFindings);
      renderFixSummary(fixSummary, reporter);
    } else if (willStepThrough && !interrupted.value) {
      const fixSummary = await runInteractiveFixFlow(fixableFindings, reporter);
      renderFixSummary(fixSummary, reporter);
    }
  }

  // Interrupted takes precedence for exit code
  if (interrupted.value) {
    return 130;
  }

  // Determine exit code (based on original reports, not filtered)
  if (hasFailure) {
    reporter.blank();
    reporter.error(`Failing due to: ${failureReasons.join(', ')}`);
    return 1;
  }

  return 0;
}

/** Run one or more skills against an already constructed review context. */
export async function runSkills(
  context: Awaited<ReturnType<typeof buildLocalEventContext>>,
  options: CLIOptions,
  reporter: Reporter
): Promise<number> {
  const cwd = process.cwd();
  const startTime = Date.now();

  // Get API key (optional - SDK can use Claude Code subscription auth)
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    reporter.debug('No API key found. Using Claude Code subscription auth.');
  }

  // Try to find repo root for config loading
  let repoPath: string | undefined;
  try {
    repoPath = getRepoRoot(cwd);
  } catch {
    // Not in a git repo - that's fine for file mode
  }

  // Pre-flight: verify auth will work before starting analysis
  try {
    verifyAuth({ apiKey });
  } catch (error: unknown) {
    const message = (error as WardenAuthenticationError).message;
    reporter.error(message);
    emitEmptyRunLog(repoPath ?? cwd, options, {
      code: 'auth_failed',
      message,
      timestamp: new Date().toISOString(),
    });
    return 1;
  }

  // Resolve config path
  let configPath: string | null = null;
  if (options.config) {
    configPath = resolve(cwd, options.config);
  } else if (repoPath) {
    configPath = resolve(repoPath, 'warden.toml');
  }

  // Load config if available
  const config = configPath && existsSync(configPath)
    ? loadWardenConfig(dirname(configPath))
    : null;
  const defaultModel = resolveCliDefaultModel(config, options.model);
  const defaultAuxiliaryModel = resolveCliDefaultAuxiliaryModel(config);
  const defaultSynthesisModel = resolveCliDefaultSynthesisModel(config);

  // Determine which triggers/skills to run
  let skillsToRun: SkillToRun[];
  if (options.skill) {
    // Explicit skill specified via CLI — check config for remote/filters if available
    const match = config
      ? resolveSkillConfigs(config, options.model).find((t) => t.skill === options.skill)
      : undefined;
    // Fall back to global defaults when the skill isn't in the config
    const defaultIgnorePaths = config?.defaults?.ignorePaths;
    const fallbackFilters = defaultIgnorePaths?.length
      ? { ignorePaths: defaultIgnorePaths }
      : {};
    skillsToRun = [{
      skill: options.skill,
      remote: match?.remote,
      filters: match?.filters ?? fallbackFilters,
      model: match?.model ?? defaultModel,
      maxTurns: match?.maxTurns ?? config?.defaults?.agent?.maxTurns ?? config?.defaults?.maxTurns,
      runtime: match?.runtime ?? config?.defaults?.runtime ?? 'claude',
      auxiliaryModel: match?.auxiliaryModel ?? defaultAuxiliaryModel,
      synthesisModel: match?.synthesisModel ?? defaultSynthesisModel,
      auxiliaryMaxRetries:
        match?.auxiliaryMaxRetries ??
        config?.defaults?.auxiliary?.maxRetries ??
        config?.defaults?.auxiliaryMaxRetries,
      verifyFindings: match?.verifyFindings ?? (config?.defaults?.verification?.enabled !== false),
    }];
  } else if (config) {
    // Get skills from matched triggers, preserving remote property and filters
    const resolvedTriggers = resolveSkillConfigs(config, options.model);
    const matchedTriggers = resolvedTriggers.filter((t) => matchTrigger(t, context, 'local'));
    // Dedupe by skill name but keep first occurrence (with its remote property and filters)
    const seen = new Set<string>();
    skillsToRun = matchedTriggers
      .filter((t) => {
        if (seen.has(t.skill)) return false;
        seen.add(t.skill);
        return true;
      })
      .map((t) => ({
        skill: t.skill,
        remote: t.remote,
        filters: t.filters,
        model: t.model,
        maxTurns: t.maxTurns,
        runtime: t.runtime,
        auxiliaryModel: t.auxiliaryModel,
        synthesisModel: t.synthesisModel,
        auxiliaryMaxRetries: t.auxiliaryMaxRetries,
        verifyFindings: t.verifyFindings,
      }));
  } else {
    skillsToRun = [];
  }

  // Set global telemetry context and emit run metric
  setGlobalAttributes({ 'warden.repository': context.repository.fullName });
  emitRunMetric();

  // Handle case where no skills to run
  if (skillsToRun.length === 0) {
    emitEmptyRunLog(repoPath ?? cwd, options);
    if (!options.json) {
      reporter.warning('No triggers matched for the changed files');
      reporter.tip('Specify a skill explicitly: warden <target> --skill <name>');
    }
    return 0;
  }

  // Build skill tasks
  // Model precedence: defaults.agent.model > defaults.model > CLI flag > WARDEN_MODEL env var > SDK default
  // sdkModel is undefined when no model is explicitly configured (lets SDK use its default).
  // logModel records what was used for JSONL logs (sentinel when no explicit model).
  const sdkModel = defaultModel;
  const logModel = resolveCliLogModel(config, options.model);
  const runnerOptions: SkillRunnerOptions = {
    apiKey,
    model: sdkModel,
    runtime: config?.defaults?.runtime ?? 'claude',
    auxiliaryModel: defaultAuxiliaryModel,
    synthesisModel: defaultSynthesisModel,
    abortController,
    maxTurns: config?.defaults?.agent?.maxTurns ?? config?.defaults?.maxTurns,
    batchDelayMs: config?.defaults?.batchDelayMs,
    maxContextFiles: config?.defaults?.chunking?.maxContextFiles,
    auxiliaryMaxRetries:
      config?.defaults?.auxiliary?.maxRetries ??
      config?.defaults?.auxiliaryMaxRetries,
    verifyFindings: config?.defaults?.verification?.enabled !== false,
  };
  const specs: RunSkillSpec[] = skillsToRun.map(({ skill, remote, filters, ...skillOptions }) => ({
    name: skill,
    skill,
    remote,
    failOn: options.failOn,
    context: filterContextByPaths(context, filters),
    runnerOptions: mergeSkillRunnerOptions(runnerOptions, skillOptions),
  }));
  let tasks: SkillTaskOptions[];
  const concurrency = options.parallel ?? DEFAULT_CONCURRENCY;
  try {
    tasks = await createSkillTasks({
      specs,
      repoPath,
      options,
      parallel: concurrency,
      reporter,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reporter.error(message);
    emitEmptyRunLog(repoPath ?? cwd, options, {
      code: 'unknown',
      message,
      timestamp: new Date().toISOString(),
    });
    return 1;
  }

  // Open the run's JSONL log before launching skills so `warden runs
  // follow <runId>` works from a second terminal while the run is live.
  const runId = generateRunId();
  const timestamp = new Date();
  const traceId = getTraceId();
  let headSha: string | undefined;
  try {
    headSha = getHeadSha(repoPath ?? cwd);
  } catch {
    // Not a git repo or HEAD is unborn — non-fatal
  }
  const runLog = initializeRunLog({
    repoPath: repoPath ?? cwd,
    runId,
    timestamp,
    traceId,
    headSha,
    model: logModel,
    outputPath: options.output,
    reporter,
    startTime,
  });

  // Run skills with Ink UI (TTY) or simple console output (non-TTY)
  failFastController = options.failFast ? new AbortController() : undefined;
  const taskOptions = {
    mode: reporter.mode,
    verbosity: reporter.verbosity,
    concurrency,
    failFastController,
    onChunkComplete: (skillName: string, chunk: ChunkAnalysisResult) => appendChunkToRunLog(runLog, skillName, chunk),
    onSkillComplete: (report: SkillReport) => appendReportToRunLog(runLog, report),
  };
  const results = reporter.mode.isTTY
    ? await runSkillTasksWithInk(tasks, taskOptions)
    : await runSkillTasks(tasks, taskOptions);

  // Process results and output
  const totalDuration = Date.now() - startTime;
  const effectiveMinConfidence = options.minConfidence ?? config?.defaults?.minConfidence ?? 'medium';
  const processed = processTaskResults(results, options.reportOn, effectiveMinConfidence);
  return outputResultsAndHandleFixes(processed, options, reporter, runLog, totalDuration, failFastController?.signal.aborted);
}

async function runFileMode(filePatterns: string[], options: CLIOptions, reporter: Reporter): Promise<number> {
  const cwd = process.cwd();

  // Build context from files
  reporter.step('Building context from files...');
  const context = await buildFileEventContext({
    patterns: filePatterns,
    cwd,
  });

  const pullRequest = context.pullRequest;
  if (!pullRequest) {
    reporter.error('Failed to build context');
    return 1;
  }

  if (pullRequest.files.length === 0) {
    emitEmptyRunLog(cwd, options);
    if (!options.json) {
      reporter.blank();
      reporter.warning('No files matched the given patterns');
    }
    return 0;
  }

  reporter.success(`Found ${pullRequest.files.length} ${pluralize(pullRequest.files.length, 'file')}`);
  reporter.contextFiles(pullRequest.files);

  return runSkills(context, options, reporter);
}

/**
 * Parse git ref target into base and head refs.
 * Supports formats: "base..head", "base" (defaults head to HEAD)
 * Special case: "HEAD" alone means the HEAD commit (HEAD^..HEAD)
 */
function parseGitRef(ref: string): { base: string; head: string } {
  if (ref.includes('..')) {
    const [base, head] = ref.split('..');
    return { base: base || 'HEAD', head: head || 'HEAD' };
  }
  // Single ref: diff from that ref to HEAD
  // Special case: if ref is HEAD, diff from HEAD^ to see the current commit
  if (ref.toUpperCase() === 'HEAD') {
    return { base: 'HEAD^', head: 'HEAD' };
  }
  return { base: ref, head: 'HEAD' };
}

async function runGitRefMode(gitRef: string, options: CLIOptions, reporter: Reporter): Promise<number> {
  const cwd = process.cwd();
  let repoPath: string;

  // Find repo root
  try {
    repoPath = getRepoRoot(cwd);
  } catch {
    reporter.error('Not a git repository');
    return 1;
  }

  const { base, head } = parseGitRef(gitRef);

  // Validate base ref
  if (!refExists(base, repoPath)) {
    reporter.error(`Git ref does not exist: ${base}`);
    return 1;
  }

  // Validate head ref if specified
  if (head && !refExists(head, repoPath)) {
    reporter.error(`Git ref does not exist: ${head}`);
    return 1;
  }

  // Load config to get defaultBranch if available
  const configPath = resolveConfigPath(options, repoPath);
  const config = existsSync(configPath) ? loadWardenConfig(dirname(configPath)) : null;

  // Build context from local git
  reporter.startContext(`Analyzing changes from ${gitRef}...`);
  const context = buildLocalEventContext({
    base,
    head,
    cwd: repoPath,
    defaultBranch: config?.defaults?.defaultBranch,
  });

  const pullRequest = context.pullRequest;
  if (!pullRequest) {
    reporter.error('Failed to build context');
    return 1;
  }

  if (pullRequest.files.length === 0) {
    emitEmptyRunLog(repoPath, options);
    if (!options.json) {
      reporter.renderEmptyState('No changes found');
      reporter.blank();
    }
    return 0;
  }

  reporter.contextFiles(pullRequest.files);

  return runSkills(context, options, reporter);
}

async function runConfigMode(options: CLIOptions, reporter: Reporter): Promise<number> {
  const cwd = process.cwd();
  let repoPath: string;
  const startTime = Date.now();

  // Find repo root
  try {
    repoPath = getRepoRoot(cwd);
  } catch {
    reporter.error('Not a git repository');
    return 1;
  }

  // Resolve config path
  const configPath = resolveConfigPath(options, repoPath);

  if (!existsSync(configPath)) {
    reporter.error(`Configuration file not found: ${configPath}`);
    reporter.tip('Create a warden.toml or specify targets: warden <files> --skill <name>');
    return 1;
  }

  // Load config
  const config = loadWardenConfig(dirname(configPath));

  // Build context from local git. By default, mirror PR-style analysis:
  // compare the configured/default branch merge base to HEAD.
  const localReviewBase = resolveLocalReviewBase(config.defaults?.defaultBranch, repoPath);
  const statusMessage = options.staged
    ? 'Analyzing staged changes...'
    : `Analyzing changes from ${localReviewBase.base} to HEAD...`;
  reporter.startContext(statusMessage);
  const context = buildLocalEventContext({
    base: options.staged ? 'HEAD' : localReviewBase.base,
    head: options.staged ? undefined : 'HEAD',
    cwd: repoPath,
    defaultBranch: localReviewBase.defaultBranch,
    staged: options.staged,
  });

  const pullRequest = context.pullRequest;
  if (!pullRequest) {
    reporter.error('Failed to build context');
    return 1;
  }

  if (pullRequest.files.length === 0) {
    emitEmptyRunLog(repoPath, options);
    if (!options.json) {
      if (options.staged) {
        reporter.renderEmptyState('No staged changes found');
      } else {
        reporter.renderEmptyState(
          `No changes found from ${pullRequest.baseBranch} to HEAD`,
          'Use --staged to analyze staged changes'
        );
      }
      reporter.blank();
    }
    return 0;
  }

  reporter.contextFiles(pullRequest.files);

  // Set global telemetry context and emit run metric
  setGlobalAttributes({ 'warden.repository': context.repository.fullName });
  emitRunMetric();

  // Resolve skills into triggers and match
  const resolvedTriggers = resolveSkillConfigs(config, options.model);
  const matchedTriggers = resolvedTriggers.filter((t) => matchTrigger(t, context, 'local'));

  // Filter by skill if specified
  const filtered = options.skill
    ? matchedTriggers.filter((t) => t.skill === options.skill)
    : matchedTriggers;

  // Deduplicate by skill name — prefer 'local' triggers (may have local-specific overrides)
  const seen = new Map<string, typeof filtered[number]>();
  for (const t of filtered) {
    const existing = seen.get(t.skill);
    if (!existing || (t.type === 'local' && existing.type !== 'local')) {
      seen.set(t.skill, t);
    }
  }
  const triggersToRun = [...seen.values()];

  if (triggersToRun.length === 0) {
    emitEmptyRunLog(repoPath, options);
    if (!options.json) {
      reporter.blank();
      if (options.skill) {
        reporter.warning(`No triggers matched for skill: ${options.skill}`);
      } else {
        reporter.warning('No triggers matched for the changed files');
      }
    }
    return 0;
  }

  // Display configuration section
  reporter.configTriggers(
    config.skills.length,
    triggersToRun.length,
    triggersToRun.map((t) => ({ name: t.name, skill: t.skill }))
  );

  // Get API key (optional - SDK can use Claude Code subscription auth)
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    reporter.debug('No API key found. Using Claude Code subscription auth.');
  }

  try {
    verifyAuth({ apiKey });
  } catch (error: unknown) {
    const message = (error as WardenAuthenticationError).message;
    reporter.error(message);
    emitEmptyRunLog(repoPath, options, {
      code: 'auth_failed',
      message,
      timestamp: new Date().toISOString(),
    });
    return 1;
  }

  // Build trigger tasks
  const effectiveMinConfidence = options.minConfidence ?? config.defaults?.minConfidence ?? 'medium';
  const specs: RunSkillSpec[] = triggersToRun.map((trigger) => ({
    name: trigger.name,
    displayName: trigger.skill,
    skill: trigger.skill,
    remote: trigger.remote,
    failOn: trigger.failOn ?? options.failOn,
    minConfidence: trigger.minConfidence ?? effectiveMinConfidence,
    context: filterContextByPaths(context, trigger.filters),
    runnerOptions: {
      apiKey,
      model: trigger.model,
      runtime: trigger.runtime,
      auxiliaryModel: trigger.auxiliaryModel,
      synthesisModel: trigger.synthesisModel,
      abortController,
      maxTurns: trigger.maxTurns,
      maxContextFiles: config.defaults?.chunking?.maxContextFiles,
      auxiliaryMaxRetries: trigger.auxiliaryMaxRetries,
      verifyFindings: trigger.verifyFindings,
    },
  }));
  let tasks: SkillTaskOptions[];
  const concurrency = options.parallel ?? config.runner?.concurrency ?? DEFAULT_CONCURRENCY;
  try {
    tasks = await createSkillTasks({
      specs,
      repoPath,
      options,
      parallel: concurrency,
      reporter,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reporter.error(message);
    emitEmptyRunLog(repoPath, options, {
      code: 'unknown',
      message,
      timestamp: new Date().toISOString(),
    });
    return 1;
  }

  // Initialize the run's JSONL log up front so a second terminal can
  // `warden runs follow <runId>` while skills are still running.
  // Skill records are appended on each completion; the trailing summary
  // is appended in `outputResultsAndHandleFixes`.
  // Run-level model is the default (ignoring per-trigger overrides); per-skill models are on each report.
  const defaultModel = resolveCliLogModel(config, options.model);
  const runId = generateRunId();
  const timestamp = new Date();
  const traceId = getTraceId();
  let headSha: string | undefined;
  try {
    headSha = getHeadSha(repoPath);
  } catch {
    // Not a git repo or HEAD is unborn — non-fatal
  }
  const runLog = initializeRunLog({
    repoPath,
    runId,
    timestamp,
    traceId,
    headSha,
    model: defaultModel,
    outputPath: options.output,
    reporter,
    startTime,
  });

  // Run triggers with Ink UI (TTY) or simple console output (non-TTY)
  failFastController = options.failFast ? new AbortController() : undefined;
  const taskOptions = {
    mode: reporter.mode,
    verbosity: reporter.verbosity,
    concurrency,
    failFastController,
    onChunkComplete: (skillName: string, chunk: ChunkAnalysisResult) => appendChunkToRunLog(runLog, skillName, chunk),
    onSkillComplete: (report: SkillReport) => appendReportToRunLog(runLog, report),
  };
  const results = reporter.mode.isTTY
    ? await runSkillTasksWithInk(tasks, taskOptions)
    : await runSkillTasks(tasks, taskOptions);

  // Process results and output
  const totalDuration = Date.now() - startTime;
  const processed = processTaskResults(results, options.reportOn, effectiveMinConfidence);
  return outputResultsAndHandleFixes(processed, options, reporter, runLog, totalDuration, failFastController?.signal.aborted);
}

async function runDirectSkillMode(options: CLIOptions, reporter: Reporter): Promise<number> {
  const cwd = process.cwd();
  let repoPath: string;

  // Find repo root
  try {
    repoPath = getRepoRoot(cwd);
  } catch {
    reporter.error('Not a git repository');
    return 1;
  }

  // Load config to get defaultBranch if available
  const configPath = resolveConfigPath(options, repoPath);
  const config = existsSync(configPath) ? loadWardenConfig(dirname(configPath)) : null;

  // Build context from local git. By default, mirror PR-style analysis:
  // compare the configured/default branch merge base to HEAD.
  const localReviewBase = resolveLocalReviewBase(config?.defaults?.defaultBranch, repoPath);
  const statusMessage = options.staged
    ? 'Analyzing staged changes...'
    : `Analyzing changes from ${localReviewBase.base} to HEAD...`;
  reporter.startContext(statusMessage);
  const context = buildLocalEventContext({
    base: options.staged ? 'HEAD' : localReviewBase.base,
    head: options.staged ? undefined : 'HEAD',
    cwd: repoPath,
    defaultBranch: localReviewBase.defaultBranch,
    staged: options.staged,
  });

  const pullRequest = context.pullRequest;
  if (!pullRequest) {
    reporter.error('Failed to build context');
    return 1;
  }

  if (pullRequest.files.length === 0) {
    emitEmptyRunLog(repoPath, options);
    if (!options.json) {
      if (options.staged) {
        reporter.renderEmptyState('No staged changes found');
      } else {
        reporter.renderEmptyState(
          `No changes found from ${pullRequest.baseBranch} to HEAD`,
          'Use --staged to analyze staged changes'
        );
      }
      reporter.blank();
    }
    return 0;
  }

  reporter.contextFiles(pullRequest.files);

  return runSkills(context, options, reporter);
}

async function runCommand(options: CLIOptions, reporter: Reporter): Promise<number> {
  const targets = options.targets ?? [];

  // --staged is only meaningful without explicit targets
  if (options.staged && targets.length > 0) {
    reporter.warning('--staged is ignored when targets are specified');
  }

  // No targets with --skill → run skill directly on current branch changes
  if (targets.length === 0 && options.skill) {
    return runDirectSkillMode(options, reporter);
  }

  // No targets → config mode (use triggers)
  if (targets.length === 0) {
    return runConfigMode(options, reporter);
  }

  // Classify targets
  const { gitRefs, filePatterns } = classifyTargets(targets, { forceGit: options.git });

  // Can't mix git refs and file patterns
  if (gitRefs.length > 0 && filePatterns.length > 0) {
    reporter.error('Cannot mix git refs and file patterns');
    reporter.debug(`Git refs: ${gitRefs.join(', ')}`);
    reporter.debug(`Files: ${filePatterns.join(', ')}`);
    return 1;
  }

  // Multiple git refs not supported (yet)
  if (gitRefs.length > 1) {
    reporter.error('Only one git ref can be specified');
    return 1;
  }

  // Git ref mode
  const gitRef = gitRefs[0];
  if (gitRef) {
    return runGitRefMode(gitRef, options, reporter);
  }

  // File mode
  return runFileMode(filePatterns, options, reporter);
}

/** Parse CLI input, dispatch the selected command, and perform shutdown cleanup. */
export async function main(): Promise<void> {
  const { command, options, helpTarget, setupAppOptions, runsOptions } = parseCliArgs();

  if (command === 'help') {
    showHelp(helpTarget);
    process.exit(0);
  }

  if (command === 'version') {
    showVersion();
    process.exit(0);
  }

  const reporter = createReporter(options);
  const originalCwd = process.cwd();
  const invocationCwd = resolveInvocationCwd(originalCwd, options.cwd);
  if (invocationCwd !== originalCwd) {
    try {
      process.chdir(invocationCwd);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      reporter.error(`Unable to change to ${invocationCwd}: ${message}`);
      process.exit(1);
      return;
    }
  }

  // Load environment variables from .env files at CLI entry point.
  // Try repo root first, fall back to cwd if not in a git repo.
  const cwd = process.cwd();
  let envDir = cwd;
  try {
    envDir = getRepoRoot(cwd);
  } catch {
    // Not in a git repo - use cwd
  }
  loadEnvFiles(envDir);

  // Show header (unless JSON output or quiet)
  if (!options.json) {
    reporter.header();
  }

  const exitCode = await Sentry.startSpan(
    { op: 'cli.command', name: `run ${command}` },
    async (span) => {
      span.setAttribute('cli.command', command);

      const traceId = getTraceId();
      if (traceId) {
        reporter.debug(`Trace ID: ${traceId}`);
      }

      switch (command) {
        case 'init':
          return runInit(options, reporter);
        case 'add':
          return runAdd(options, reporter);
        case 'setup-app':
          if (!setupAppOptions) {
            reporter.error('Missing setup-app options');
            process.exit(1);
          }
          return runSetupApp(setupAppOptions, reporter);
        case 'sync':
          return runSync(options, reporter);
        case 'runs':
          if (!runsOptions) {
            reporter.error('Missing runs options');
            process.exit(1);
          }
          return runRuns(runsOptions, options, reporter);
        case 'build':
          return runBuild(options, reporter, { abortController, interrupted });
        case 'improve':
          return runImprove(options, reporter, { abortController, interrupted });
        default:
          return runCommand(options, reporter);
      }
    },
  );

  // Run log and session cleanup after all output is complete (covers all exit paths)
  try {
    let cleanupRoot: string;
    try {
      cleanupRoot = getRepoRoot(cwd);
    } catch {
      cleanupRoot = cwd;
    }
    const cfgPath = resolve(cleanupRoot, 'warden.toml');
    const cfg = existsSync(cfgPath) ? loadWardenConfig(dirname(cfgPath)) : undefined;
    await cleanupArtifacts({
      dir: join(cleanupRoot, '.warden', 'logs'),
      retentionDays: cfg?.logs?.retentionDays ?? 30,
      mode: cfg?.logs?.cleanup ?? 'ask',
      isTTY: reporter.mode.isTTY,
      reporter,
    });
  } catch (err) {
    // Re-throw user abort so it propagates to the top-level handler for cleanup
    if (err instanceof UserAbortError) throw err;
    // Config load or cleanup failed — skip silently
  }

  await flushSentry();
  process.exit(exitCode);
}
