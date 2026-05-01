import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { emptyToUndefined, loadWardenConfigFile } from '../../config/loader.js';
import type { SkillDefinition, WardenConfig } from '../../config/schema.js';
import {
  appendCoordinatorFeedbackRecords,
  buildCoordinatorFeedbackFingerprint,
  getCoordinatorFeedbackRecordsPath,
  loadCoordinatorFeedbackRecords,
  writeCoordinatorFeedbackLessons,
  type CoordinatorFeedbackRecord,
  type CoordinatorFeedbackVerdict,
} from '../../coordinator/feedback.js';
import { CoordinatorChildSkillError } from '../../coordinator/child-skills.js';
import { CoordinatorPlanError, type CoordinatorPlan } from '../../coordinator/plan.js';
import { getSuperwardenSkillRoot, superwardenSkillExists } from '../../coordinator/superwarden.js';
import { resolveSkillAsync } from '../../skills/loader.js';
import type { Finding, Severity } from '../../types/index.js';
import { DEFAULT_CONCURRENCY, getAnthropicApiKey } from '../../utils/index.js';
import type { CLIOptions } from '../args.js';
import { getRepoRoot } from '../git.js';
import { promptLine } from '../input.js';
import { formatDuration, pluralize, truncate } from '../output/formatters.js';
import { readJsonlLog, parseJsonlReports } from '../output/jsonl.js';
import type { Reporter } from '../output/reporter.js';
import { formatRelativePath, prepareSuperwardenArtifacts } from '../superwarden.js';

interface ImportedFindingCandidate {
  finding: Finding;
  taskId: string;
  logPath: string;
  runId?: string;
  model?: string;
  headSha?: string;
}

export interface RunImproveState {
  abortController?: AbortController;
  interrupted?: { value: boolean };
}

function resolveSynthesisModel(
  config: WardenConfig | undefined,
  options: CLIOptions,
): string | undefined {
  return (
    emptyToUndefined(config?.defaults?.synthesis?.model) ??
    emptyToUndefined(config?.defaults?.auxiliary?.model) ??
    emptyToUndefined(options.model) ??
    emptyToUndefined(process.env['WARDEN_MODEL'])
  );
}

function normalizeSingleLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function findingLocationText(finding: Finding): string {
  if (!finding.location) {
    return 'unknown';
  }
  const end = finding.location.endLine ? `-${finding.location.endLine}` : '';
  return `${finding.location.path}:${finding.location.startLine}${end}`;
}

function verdictLabel(verdict: CoordinatorFeedbackVerdict): string {
  switch (verdict) {
    case 'confirmed_finding':
      return 'confirmed';
    case 'false_positive':
      return 'false-positive';
    case 'severity_wrong':
      return 'severity';
    case 'duplicate':
      return 'duplicate';
    case 'wrong_task':
      return 'wrong-task';
    case 'missed_issue':
      return 'missed-issue';
  }
}

function parseVerdict(value: string): CoordinatorFeedbackVerdict | 'skip' | undefined {
  switch (value.trim().toLowerCase()) {
    case 'c':
    case 'confirmed':
      return 'confirmed_finding';
    case 'f':
    case 'fp':
    case 'false':
    case 'false-positive':
    case 'false_positive':
      return 'false_positive';
    case 's':
    case 'severity':
      return 'severity_wrong';
    case 'd':
    case 'duplicate':
      return 'duplicate';
    case 'w':
    case 'wrong':
    case 'wrong-task':
    case 'wrong_task':
      return 'wrong_task';
    case 'k':
    case 'skip':
      return 'skip';
    default:
      return undefined;
  }
}

function parseTarget(
  value: string,
  defaultTarget: { scope: 'plan' } | { scope: 'task'; taskId: string },
  validTaskIds: Set<string>,
): { scope: 'plan' } | { scope: 'task'; taskId: string } | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return defaultTarget;
  }
  if (normalized === 'plan') {
    return { scope: 'plan' };
  }
  if (validTaskIds.has(normalized)) {
    return { scope: 'task', taskId: normalized };
  }
  return undefined;
}

function parseSeverity(value: string): Severity | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized;
  }
  return undefined;
}

async function promptVerdict(): Promise<CoordinatorFeedbackVerdict | 'skip'> {
  while (true) {
    const answer = await promptLine(
      `${chalk.cyan('>')} Verdict [c]onfirmed, [f]alse-positive, ` +
      `[s]everity, [d]uplicate, [w]rong-task, s[k]ip: `,
    );
    const verdict = parseVerdict(answer);
    if (verdict) {
      return verdict;
    }
  }
}

async function promptTarget(
  taskId: string,
  verdict: CoordinatorFeedbackVerdict,
  validTaskIds: Set<string>,
): Promise<{ scope: 'plan' } | { scope: 'task'; taskId: string }> {
  const defaultTarget = verdict === 'duplicate' || verdict === 'wrong_task'
    ? { scope: 'plan' as const }
    : { scope: 'task' as const, taskId };

  while (true) {
    const answer = await promptLine(
      `${chalk.cyan('>')} Target [${defaultTarget.scope === 'plan' ? 'plan' : defaultTarget.taskId}` +
      ` | plan | <task-id>]: `,
    );
    const parsed = parseTarget(answer, defaultTarget, validTaskIds);
    if (parsed) {
      return parsed;
    }
  }
}

async function promptExpectedSeverity(current: Severity): Promise<Severity> {
  while (true) {
    const answer = await promptLine(
      `${chalk.cyan('>')} Expected severity [high|medium|low] (reported ${current}): `,
    );
    const parsed = parseSeverity(answer);
    if (parsed) {
      return parsed;
    }
  }
}

async function promptNote(): Promise<string> {
  while (true) {
    const answer = await promptLine(`${chalk.cyan('>')} Note: `);
    if (answer.trim()) {
      return answer.trim();
    }
  }
}

function collectImportedFindings(args: {
  plan: CoordinatorPlan;
  repoRoot: string;
  from: string[];
}): ImportedFindingCandidate[] {
  const taskIds = new Set(args.plan.tasks.map((task) => task.id));
  const imported: ImportedFindingCandidate[] = [];

  for (const value of args.from) {
    const absolutePath = resolve(process.cwd(), value);
    const content = readJsonlLog(absolutePath);
    const parsed = parseJsonlReports(content);
    const displayPath = formatRelativePath(absolutePath, args.repoRoot);

    for (const report of parsed.reports) {
      if (!taskIds.has(report.skill) || report.findings.length === 0) {
        continue;
      }
      for (const finding of report.findings) {
        imported.push({
          finding,
          taskId: report.skill,
          logPath: displayPath,
          runId: parsed.runMetadata?.runId,
          model: report.model ?? parsed.runMetadata?.model,
          headSha: parsed.runMetadata?.headSha,
        });
      }
    }
  }

  return imported;
}

function renderSuperwardenHeader(args: {
  reporter: Reporter;
  skill: SkillDefinition;
  repoRoot: string;
  runtimeName: string;
  model?: string;
}): void {
  args.reporter.text(`  Skill    ${args.skill.name}`);
  args.reporter.text(`  Source   ${formatRelativePath(args.skill.rootDir, args.repoRoot)}`);
  args.reporter.text(`  Model    ${args.model ?? 'default'} [${args.runtimeName}]`);
  args.reporter.blank();
}

function renderCandidate(
  reporter: Reporter,
  candidate: ImportedFindingCandidate,
  index: number,
  total: number,
): void {
  reporter.bold(`FINDING  ${index + 1}/${total}`);
  reporter.text(`  Task      ${candidate.taskId}`);
  reporter.text(`  Severity  ${candidate.finding.severity}`);
  reporter.text(`  Location  ${findingLocationText(candidate.finding)}`);
  reporter.text(`  Source    ${candidate.logPath}`);
  reporter.text(`  Title     ${truncate(candidate.finding.title, 96)}`);
  const detail = normalizeSingleLine(candidate.finding.description);
  if (detail) {
    reporter.dim(`  ${truncate(detail, 120)}`);
  }
}

function isInterrupted(
  error: unknown,
  state: RunImproveState | undefined,
): boolean {
  if (!state?.interrupted?.value) {
    return false;
  }
  if (!error) {
    return true;
  }
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === 'AbortError' || /\b(aborted|cancelled|canceled|interrupted)\b/i.test(error.message);
}

/** Import validated feedback records and regenerate affected Superwarden artifacts. */
export async function runImprove(
  options: CLIOptions,
  reporter: Reporter,
  state?: RunImproveState,
): Promise<number> {
  const skillName = options.skill;
  if (!skillName) {
    reporter.error('Missing skill name. Usage: warden improve <skill> --from <run.jsonl>');
    return 1;
  }
  if (!options.from || options.from.length === 0) {
    reporter.error('Missing --from <run.jsonl>. Importing ad hoc feedback is not implemented yet.');
    return 1;
  }
  if (!process.stdin.isTTY) {
    reporter.error('warden improve currently requires interactive stdin.');
    return 1;
  }

  let repoRoot: string;
  try {
    repoRoot = getRepoRoot(process.cwd());
  } catch {
    reporter.error('Not a git repository');
    return 1;
  }

  const skillRoot = getSuperwardenSkillRoot(repoRoot, skillName);
  if (!superwardenSkillExists(repoRoot, skillName)) {
    reporter.error(`Superwarden skill not found: ${skillName}`);
    reporter.tip(`Expected ${formatRelativePath(skillRoot, repoRoot)}`);
    return 1;
  }

  const configPath = options.config
    ? resolve(process.cwd(), options.config)
    : resolve(repoRoot, 'warden.toml');
  let config: WardenConfig | undefined;
  if (existsSync(configPath)) {
    config = loadWardenConfigFile(configPath);
  } else if (options.config) {
    reporter.error(`Configuration file not found: ${configPath}`);
    return 1;
  }

  const skill = await resolveSkillAsync(skillRoot, repoRoot);
  if (skill.rootDir !== skillRoot) {
    reporter.error(`Resolved the wrong skill root for ${skillName}`);
    return 1;
  }

  const runtimeName = config?.defaults?.runtime ?? 'claude';
  const model = resolveSynthesisModel(config, options);
  const repairModel = emptyToUndefined(config?.defaults?.auxiliary?.model);
  const maxRetries = config?.defaults?.auxiliary?.maxRetries ?? config?.defaults?.auxiliaryMaxRetries;
  const parallel = options.parallel ?? config?.runner?.concurrency ?? DEFAULT_CONCURRENCY;
  const apiKey = getAnthropicApiKey();

  try {
    renderSuperwardenHeader({ reporter, skill, repoRoot, runtimeName, model });
    reporter.step('Loading current plan...');
    const current = await prepareSuperwardenArtifacts({
      skill,
      repoPath: repoRoot,
      mode: reporter.mode,
      verbosity: reporter.verbosity,
      json: true,
      runtimeName,
      model,
      apiKey,
      repairModel,
      repairMaxRetries: maxRetries,
      parallel,
      abortController: state?.abortController,
      showPlanOnly: true,
    });
    reporter.success(`Loaded plan with ${current.planResult.plan.tasks.length} ${pluralize(current.planResult.plan.tasks.length, 'task')}`);
    reporter.blank();

    const candidates = collectImportedFindings({
      plan: current.planResult.plan,
      repoRoot,
      from: options.from,
    });
    if (candidates.length === 0) {
      reporter.error(`No findings from Superwarden task skills for ${skillName} were found in the provided logs.`);
      return 1;
    }

    reporter.bold('FEEDBACK');
    reporter.dim(`  Tasks    ${current.planResult.plan.tasks.map((task) => task.id).join(', ')}`);
    reporter.dim(`  Source   ${options.from.length} ${pluralize(options.from.length, 'log')}`);
    reporter.blank();

    const existingRecords = loadCoordinatorFeedbackRecords(skillRoot);
    const seenFingerprints = new Set(existingRecords.map((record) => record.fingerprint));
    const importedRecords: CoordinatorFeedbackRecord[] = [];
    const validTaskIds = new Set(current.planResult.plan.tasks.map((task) => task.id));
    let skipped = 0;
    let duplicates = 0;

    for (const [index, candidate] of candidates.entries()) {
      renderCandidate(reporter, candidate, index, candidates.length);
      const verdict = await promptVerdict();
      if (verdict === 'skip') {
        skipped++;
        reporter.blank();
        continue;
      }

      const target = await promptTarget(candidate.taskId, verdict, validTaskIds);
      const expectedSeverity = verdict === 'severity_wrong'
        ? await promptExpectedSeverity(candidate.finding.severity)
        : undefined;
      const note = await promptNote();
      const record: CoordinatorFeedbackRecord = {
        version: 1,
        fingerprint: buildCoordinatorFeedbackFingerprint({
          skill: skill.name,
          finding: candidate.finding,
          reportedBySkill: candidate.taskId,
          runId: candidate.runId,
          verdict,
          target,
        }),
        createdAt: new Date().toISOString(),
        skill: skill.name,
        taskId: candidate.taskId,
        verdict,
        target,
        note,
        expectedSeverity,
        finding: candidate.finding,
        source: {
          logPath: candidate.logPath,
          runId: candidate.runId,
          reportedBySkill: candidate.taskId,
          model: candidate.model,
          headSha: candidate.headSha,
        },
      };

      if (seenFingerprints.has(record.fingerprint)) {
        duplicates++;
      } else {
        seenFingerprints.add(record.fingerprint);
        importedRecords.push(record);
      }
      reporter.dim(`  saved as ${verdictLabel(verdict)}`);
      reporter.blank();
    }

    if (importedRecords.length === 0) {
      reporter.warning(
        `No new feedback records were added (${skipped} skipped, ${duplicates} duplicate ` +
        `${pluralize(duplicates, 'record')}).`,
      );
      return 0;
    }

    appendCoordinatorFeedbackRecords(skillRoot, importedRecords);
    const allRecords = [...existingRecords, ...importedRecords];
    const lessonWrite = writeCoordinatorFeedbackLessons({
      skillRoot,
      skillName: skill.name,
      plan: current.planResult.plan,
      records: allRecords,
    });
    const feedbackPath = getCoordinatorFeedbackRecordsPath(skillRoot);
    reporter.success(
      `Recorded ${importedRecords.length} feedback ${pluralize(importedRecords.length, 'item')} ` +
      `to ${formatRelativePath(feedbackPath, repoRoot)}`,
    );
    if (duplicates > 0 || skipped > 0) {
      reporter.dim(
        `  ${skipped} skipped · ${duplicates} duplicate ${pluralize(duplicates, 'record')}`,
      );
    }

    if (!lessonWrite.planChanged && lessonWrite.changedTaskIds.length === 0) {
      reporter.success('Feedback did not change any distilled lessons.');
      return 0;
    }

    reporter.blank();
    if (lessonWrite.planChanged) {
      reporter.bold('PLAN');
      const prepared = await prepareSuperwardenArtifacts({
        skill,
        repoPath: repoRoot,
        mode: reporter.mode,
        verbosity: reporter.verbosity,
        json: false,
        runtimeName,
        model,
        apiKey,
        repairModel,
        repairMaxRetries: maxRetries,
        parallel,
        previousPlan: current.planResult.plan,
        regenerate: true,
        abortController: state?.abortController,
        planMessage: skill.description || skill.name,
        onNonTTYPlanStep: (message) => reporter.step(message),
        onPlanReady: ({ planResult }) => {
          reporter.success(
            `Synthesized plan with ${planResult.plan.tasks.length} ` +
            `${pluralize(planResult.plan.tasks.length, 'task')}` +
            `${planResult.durationMs === undefined ? '' : `  [${formatDuration(planResult.durationMs)}]`}`,
          );
        },
        onBeforeChildTasks: ({ selectedTaskCount }) => {
          reporter.blank();
          reporter.bold(`TASKS  ${selectedTaskCount} ${pluralize(selectedTaskCount, 'task')}`);
        },
        childMessage: ({ task }) => task.id,
        onNonTTYChildStep: (message) => reporter.step(message),
        onChildArtifact: ({ artifact }) => {
          reporter.success(
            `${artifact.taskId}${artifact.source === 'cache' ? '  [cached]' : `  [${formatDuration(artifact.durationMs)}]`}`,
          );
        },
      });
      writeCoordinatorFeedbackLessons({
        skillRoot,
        skillName: skill.name,
        plan: prepared.planResult.plan,
        records: allRecords,
      });
      reporter.blank();
      reporter.success(
        `Updated ${prepared.childArtifacts.length} ${pluralize(prepared.childArtifacts.length, 'task')} ` +
        `after plan changes.`,
      );
      return 0;
    }

    reporter.bold('PLAN');
    const prepared = await prepareSuperwardenArtifacts({
      skill,
      repoPath: repoRoot,
      mode: reporter.mode,
      verbosity: reporter.verbosity,
      json: false,
      runtimeName,
      model,
      apiKey,
      repairModel,
      repairMaxRetries: maxRetries,
      parallel,
      taskIds: lessonWrite.changedTaskIds,
      regenerateChildTasks: true,
      abortController: state?.abortController,
      planMessage: skill.description || skill.name,
      onNonTTYPlanStep: (message) => reporter.step(message),
      onPlanReady: ({ planResult }) => {
        reporter.success(`Loaded plan with ${planResult.plan.tasks.length} ${pluralize(planResult.plan.tasks.length, 'task')}`);
      },
      onBeforeChildTasks: ({ selectedTaskCount }) => {
        reporter.blank();
        reporter.bold(`TASKS  ${selectedTaskCount} ${pluralize(selectedTaskCount, 'task')}`);
      },
      childMessage: ({ task }) => task.id,
      onNonTTYChildStep: (message) => reporter.step(message),
      onChildArtifact: ({ artifact }) => {
        reporter.success(
          `${artifact.taskId}${artifact.source === 'cache' ? '  [cached]' : `  [${formatDuration(artifact.durationMs)}]`}`,
        );
      },
    });
    reporter.blank();
    reporter.success(
      `Updated ${prepared.childArtifacts.length} ${pluralize(prepared.childArtifacts.length, 'task')} ` +
      `from task-local lessons.`,
    );
    return 0;
  } catch (error) {
    if (isInterrupted(error, state)) {
      reporter.warning('Interrupted');
      return 130;
    }
    if (error instanceof CoordinatorPlanError || error instanceof CoordinatorChildSkillError) {
      reporter.error(error.message);
      return 1;
    }
    throw error;
  }
}
