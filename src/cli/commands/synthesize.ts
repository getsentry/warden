import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { dirname, resolve } from 'node:path';
import chalk from 'chalk';
import { emptyToUndefined, loadWardenConfigFile } from '../../config/loader.js';
import type { SkillDefinition, WardenConfig } from '../../config/schema.js';
import type { UsageStats } from '../../types/index.js';
import type { CLIOptions } from '../args.js';
import type { Reporter } from '../output/reporter.js';
import { Verbosity } from '../output/verbosity.js';
import { formatBytes, formatCost, formatDuration, formatTokens, pluralize, truncate } from '../output/formatters.js';
import { fileSize, formatRelativePath, prepareSuperwardenArtifacts } from '../superwarden.js';
import { DEFAULT_CONCURRENCY, getAnthropicApiKey } from '../../utils/index.js';
import { aggregateUsage } from '../../sdk/usage.js';
import { resolveSkillAsync, SkillLoaderError } from '../../skills/loader.js';
import { getRepoRoot } from '../git.js';
import { promptLine, promptMultiline } from '../input.js';
import {
  CoordinatorPlanError,
  type CoordinatorPlan,
} from '../../coordinator/plan.js';
import {
  CoordinatorChildSkillError,
  type CoordinatorChildSkillArtifact,
  type WriteCoordinatorChildSkillsResult,
} from '../../coordinator/child-skills.js';
import { createSuperwardenSkill } from '../../coordinator/superwarden.js';

function renderSuperwardenHeader(args: {
  reporter: Reporter;
  skillName: string;
  skillRoot?: string;
  repoRoot: string;
  runtimeName: string;
  model?: string;
}): void {
  const {
    reporter,
    skillName,
    skillRoot,
    repoRoot,
    runtimeName,
    model,
  } = args;

  reporter.text(`  Skill    ${skillName}`);
  reporter.text(`  Source   ${formatRelativePath(skillRoot, repoRoot)}`);
  reporter.text(`  Model    ${model ?? 'default'} [${runtimeName}]`);
  reporter.blank();
}

function renderNewSuperwardenSkill(args: {
  reporter: Reporter;
  skillName: string;
  skillRoot?: string;
  repoRoot: string;
  runtimeName: string;
  model?: string;
  promptLength?: number;
}): void {
  const {
    reporter,
    skillName,
    skillRoot,
    repoRoot,
    runtimeName,
    model,
    promptLength,
  } = args;

  reporter.bold('NEW SUPERWARDEN SKILL');
  reporter.success(`Created ${skillName}`);
  renderDetail(reporter, 'Source', formatRelativePath(skillRoot, repoRoot));
  if (promptLength !== undefined) {
    renderDetail(reporter, 'Prompt', `${promptLength.toLocaleString()} chars`);
  }
  renderDetail(reporter, 'Model', `${model ?? 'default'} [${runtimeName}]`);
  reporter.blank();
}

function formatPlanStats(args: {
  bytes?: number;
  durationMs?: number;
  usage?: UsageStats;
  sources?: number;
  turns?: number;
}): string {
  const usage = args.usage
    ? formatUsageCostDetail(args.usage)
    : undefined;
  const parts = [
    args.bytes === undefined ? undefined : formatBytes(args.bytes),
    args.durationMs === undefined ? undefined : formatDuration(args.durationMs),
    usage,
    args.sources === undefined ? undefined : `${args.sources} ${args.sources === 1 ? 'source' : 'sources'}`,
    args.turns === undefined ? undefined : `${args.turns} ${args.turns === 1 ? 'turn' : 'turns'}`,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? chalk.dim(`[${parts.join(' · ')}]`) : '';
}

function renderDetail(reporter: Reporter, label: string, value: string | undefined): void {
  if (!value) return;
  reporter.dim(`  ${label.padEnd(9)} ${value}`);
}

function formatUsageDetail(usage: UsageStats | undefined): string | undefined {
  if (!usage) return undefined;
  return `${formatTokens(usage.inputTokens)} input / ${formatTokens(usage.outputTokens)} output`;
}

function formatUsageCostDetail(usage: UsageStats | undefined): string | undefined {
  if (!usage) return undefined;
  return `${formatUsageDetail(usage)} · ${formatCost(usage.costUSD)}`;
}

function formatContextDetail(args: { sources?: number; turns?: number }): string | undefined {
  const parts = [
    args.sources === undefined ? undefined : `${args.sources} ${args.sources === 1 ? 'source' : 'sources'}`,
    args.turns === undefined ? undefined : `${args.turns} ${args.turns === 1 ? 'turn' : 'turns'}`,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' / ') : undefined;
}

function renderPlanReady(
  reporter: Reporter,
  plan: CoordinatorPlan,
  source: 'cache' | 'generated',
  durationMs: number | undefined,
  bytes?: number,
  usage?: UsageStats,
  turns?: number,
): void {
  const stats = formatPlanStats({
    bytes,
    durationMs,
    usage,
    sources: plan.synthesis.externalSources?.length ?? 0,
    turns,
  });
  reporter.success(
    `${source === 'cache' ? 'Loaded' : 'Synthesized'} plan with ${plan.tasks.length} ` +
    `${plan.tasks.length === 1 ? 'task' : 'tasks'}${stats ? `  ${stats}` : ''}`
  );
}

function wrapText(
  text: string,
  width: number,
  indent: string,
  continuationIndent = indent,
): string[] {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) return [];

  const lines: string[] = [];
  let remaining = normalized;
  const availableWidth = Math.max(20, width - indent.length);
  while (remaining.length > availableWidth) {
    let breakAt = remaining.lastIndexOf(' ', availableWidth);
    if (breakAt < Math.floor(availableWidth / 2)) {
      breakAt = availableWidth;
    }
    lines.push(`${lines.length === 0 ? indent : continuationIndent}${remaining.slice(0, breakAt).trimEnd()}`);
    remaining = remaining.slice(breakAt).trimStart();
  }
  lines.push(`${lines.length === 0 ? indent : continuationIndent}${remaining}`);
  return lines;
}

function renderPlanList(lines: string[], items: string[], width: number, indent: string): void {
  if (items.length === 0) return;
  for (const item of items) {
    const wrapped = wrapText(item, width, `${indent}- `, `${indent}  `);
    lines.push(...wrapped);
  }
}

function formatSectionCountHeading(label: string, count: number, noun: string): string {
  return chalk.bold(label) + chalk.cyan(`  ${count} ${pluralize(count, noun)}`);
}

function renderPlanInspection(args: {
  plan: CoordinatorPlan;
  source: 'cache' | 'generated';
  cachePath: string;
  repoRoot: string;
  bytes?: number;
  durationMs?: number;
  usage?: UsageStats;
  turns?: number;
  reporter: Reporter;
}): string {
  const {
    plan,
    source,
    cachePath,
    repoRoot,
    bytes,
    durationMs,
    usage,
    turns,
    reporter,
  } = args;
  const width = Math.min(Math.max(reporter.mode.columns || 100, 72), 120);
  const verbose = reporter.verbosity >= Verbosity.Verbose;
  const debug = reporter.verbosity >= Verbosity.Debug;
  const lines: string[] = [];
  const phaseLabelWidth = Math.max(
    9,
    ...plan.synthesis.phases.map((phase) => phase.id.length),
  );
  const sourceCount = plan.synthesis.externalSources?.length ?? 0;
  const stats = formatPlanStats({
    bytes,
    durationMs,
    usage,
    sources: sourceCount,
    turns,
  });

  lines.push(chalk.bold('SUPERWARDEN PLAN'));
  lines.push(`  Skill    ${plan.skill}`);
  lines.push(`  Tasks    ${plan.tasks.length}`);
  lines.push(`  Source   ${source}`);
  lines.push(`  Plan     ${formatRelativePath(cachePath, repoRoot)}`);
  lines.push(`  Hash     ${truncate(plan.sourceHash, 16)}`);
  lines.push(`  Version  ${plan.coordinatorVersion}${stats ? `  ${stats}` : ''}`);
  lines.push('');

  if (plan.synthesis.phases.length > 0) {
    lines.push(chalk.bold('SYNTHESIS'));
    for (const phase of plan.synthesis.phases) {
      lines.push(`  ${phase.id.padEnd(phaseLabelWidth)}  ${chalk.dim(phase.status)}`);
    }
    lines.push('');
  }

  lines.push(chalk.bold('SCOPE'));
  lines.push(`  Kind      ${plan.scopeProfile.kind}`);
  lines.push(`  Subject   ${plan.scopeProfile.subject}`);
  lines.push(`  Context   ${plan.scopeProfile.observedContext.length} observed`);
  if (plan.scopeProfile.unresolvedContext.length > 0) {
    lines.push(`  Open      ${plan.scopeProfile.unresolvedContext.length} unresolved`);
  }
  if (verbose) {
    lines.push('');
    lines.push('  Observed context');
    renderPlanList(lines, plan.scopeProfile.observedContext, width, '    ');
    if (plan.scopeProfile.unresolvedContext.length > 0) {
      lines.push('');
      lines.push('  Unresolved context');
      renderPlanList(lines, plan.scopeProfile.unresolvedContext, width, '    ');
    }
  }
  lines.push('');

  lines.push(formatSectionCountHeading('TASKS', plan.tasks.length, 'task'));
  for (const [index, task] of plan.tasks.entries()) {
    if (index > 0) lines.push('');
    lines.push(`  ${index + 1}. ${chalk.bold(task.id)}`);
    lines.push(`     ${task.title}`);
    lines.push(...wrapText(task.goal, width, '     '));
    lines.push('');
    lines.push(
      `     Owns      ${task.owns.length} ` +
      `${task.owns.length === 1 ? 'concern' : 'concerns'}`
    );
    lines.push(
      `     Excludes  ${task.excludes.length} ` +
      `${task.excludes.length === 1 ? 'boundary' : 'boundaries'}`
    );
    lines.push(
      `     Evidence  ${task.evidenceFocus.length} ` +
      `${task.evidenceFocus.length === 1 ? 'focus' : 'focus areas'}`
    );
    if (verbose) {
      lines.push('');
      lines.push('     Rationale');
      lines.push(...wrapText(task.rationale, width, '       '));
      lines.push('');
      lines.push('     Source signals');
      renderPlanList(lines, task.sourceSignals, width, '       ');
      lines.push('');
      lines.push('     Owns');
      renderPlanList(lines, task.owns, width, '       ');
      if (task.excludes.length > 0) {
        lines.push('');
        lines.push('     Excludes');
        renderPlanList(lines, task.excludes, width, '       ');
      }
      lines.push('');
      lines.push('     Evidence focus');
      renderPlanList(lines, task.evidenceFocus, width, '       ');
      if (task.childResearchHints.length > 0) {
        lines.push('');
        lines.push('     Child research hints');
        renderPlanList(lines, task.childResearchHints, width, '       ');
      }
    }
    if (debug) {
      lines.push('');
      lines.push(
        `     Scope kind  ${plan.scopeProfile.kind} · ` +
        `${plan.scopeProfile.localContextUsed ? 'local context used' : 'no local context'}`
      );
    }
  }

  const sources = plan.synthesis.externalSources ?? [];
  if (sources.length > 0) {
    lines.push('');
    lines.push(chalk.bold('SOURCES'));
    for (const sourceItem of sources) {
      lines.push(`  - ${sourceItem.title}`);
      lines.push(`    ${chalk.dim(sourceItem.url)}`);
      lines.push(...wrapText(sourceItem.reason, width, '    '));
    }
  }

  return lines.join('\n');
}

function renderChildSkillArtifact(args: {
  reporter: Reporter;
  artifact: CoordinatorChildSkillArtifact;
  task: CoordinatorPlan['tasks'][number];
}): void {
  const { reporter, artifact, task } = args;
  reporter.success(
    artifact.source === 'cache'
      ? `${artifact.taskId}  ${chalk.dim('[cached]')}`
      : artifact.taskId,
  );
  reporter.dim(`  ${truncate(task.goal, 100)}`);
  if (artifact.source === 'cache') {
    return;
  }
  renderDetail(reporter, 'Artifact', formatBytes(artifact.bytes));
  renderDetail(reporter, 'Synthesis', formatDuration(artifact.durationMs));
  renderDetail(reporter, 'Usage', formatUsageCostDetail(artifact.usage));
  renderDetail(reporter, 'Context', formatContextDetail({
    sources: artifact.externalSources.length,
    turns: artifact.numTurns,
  }));
}

function renderChildSkillSummary(args: {
  reporter: Reporter;
  childSkills: WriteCoordinatorChildSkillsResult;
  durationMs?: number;
}): void {
  const { reporter, childSkills, durationMs } = args;
  const generated = childSkills.artifacts.filter((artifact) => artifact.source === 'generated').length;
  const generatedArtifacts = childSkills.artifacts.filter((artifact) => artifact.source === 'generated');
  const generatedUsage = generatedArtifacts.length > 0
    ? aggregateUsage(generatedArtifacts.map((artifact) => artifact.usage))
    : undefined;
  if (generated > 0) {
    reporter.success(`Generated ${generated} ${generated === 1 ? 'task' : 'tasks'}`);
  }
  renderDetail(
    reporter,
    'Artifacts',
    generatedArtifacts.length > 0
      ? formatBytes(generatedArtifacts.reduce((sum, artifact) => sum + artifact.bytes, 0))
      : undefined,
  );
  renderDetail(
    reporter,
    'Synthesis',
    generatedArtifacts.length > 0
      ? formatDuration(durationMs ?? generatedArtifacts.reduce((sum, artifact) => sum + artifact.durationMs, 0))
      : undefined,
  );
  renderDetail(
    reporter,
    'Usage',
    formatUsageCostDetail(generatedUsage),
  );
  renderDetail(reporter, 'Context', formatContextDetail({
    sources: generatedArtifacts.length > 0
      ? generatedArtifacts.reduce((sum, artifact) => sum + artifact.externalSources.length, 0)
      : undefined,
    turns: generatedArtifacts.reduce((sum, artifact) => sum + (artifact.numTurns ?? 0), 0) || undefined,
  }));
}

function renderTasksHeading(reporter: Reporter, taskCount: number): void {
  reporter.text(formatSectionCountHeading('TASKS', taskCount, 'task'));
}

function renderTryIt(reporter: Reporter, skillName: string): void {
  reporter.blank();
  reporter.bold('TRY IT');
  reporter.text(`  warden src/file.ts --skill ${skillName}`);
}

function readPromptFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf-8').trim();
}

function resolvePromptValue(prompt: string): string {
  if (prompt.startsWith('@@')) {
    return prompt.slice(1).trim();
  }
  if (prompt.startsWith('@')) {
    return readPromptFile(prompt.slice(1));
  }
  return prompt.trim();
}

interface RunSynthesizeState {
  abortController?: AbortController;
  interrupted?: { value: boolean };
}

function isInterrupted(error: unknown, state: RunSynthesizeState | undefined): boolean {
  if (state?.interrupted?.value || state?.abortController?.signal.aborted) {
    return true;
  }
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === 'AbortError' || /\b(aborted|cancelled|canceled|interrupted)\b/i.test(error.message);
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

async function resolveInitialPrompt(options: CLIOptions, skillName: string): Promise<string | undefined> {
  if (options.prompt?.trim()) {
    return resolvePromptValue(options.prompt);
  }
  if (process.stdin.isTTY) {
    return promptMultiline(
      `${chalk.bold('INITIAL PROMPT')}\n` +
      `  Skill    ${chalk.cyan(skillName)}`,
      {
        hint: chalk.dim('  Finish with an empty line.'),
        prompt: `${chalk.cyan('>')} `,
      },
    );
  }
  return undefined;
}

async function resolveSkillOrCreateSuperwarden(args: {
  skillName: string;
  repoRoot: string;
  options: CLIOptions;
  skillRemote?: string;
  reporter: Reporter;
}): Promise<{ skill: SkillDefinition; created: boolean; initialPromptLength?: number }> {
  const { skillName, repoRoot, options, skillRemote, reporter } = args;
  try {
    const skill = await resolveSkillAsync(skillName, repoRoot, {
      remote: options.remote ?? skillRemote,
      offline: options.offline,
    });
    return { skill, created: false };
  } catch (error) {
    if (options.remote || skillRemote || !(error instanceof SkillLoaderError)) {
      throw error;
    }
  }

  const initialPrompt = await resolveInitialPrompt(options, skillName);
  if (!initialPrompt) {
    reporter.error(`Superwarden skill not found: ${skillName}`);
    reporter.tip(`Run interactively, or pass --prompt/-p to create .warden/superwarden/${skillName}`);
    throw new CoordinatorPlanError(`Missing initial prompt for new Superwarden skill: ${skillName}`);
  }

  const skill = createSuperwardenSkill({
    repoRoot,
    name: skillName,
    initialPrompt,
  });
  return { skill, created: true, initialPromptLength: initialPrompt.length };
}

/** Synthesize or inspect a repo-local Superwarden parent skill and its task artifacts. */
export async function runSynthesize(
  options: CLIOptions,
  reporter: Reporter,
  state?: RunSynthesizeState,
): Promise<number> {
  let skillName = options.skill;
  if (!skillName) {
    if (process.stdin.isTTY) {
      skillName = await promptLine(
        `${chalk.bold('SUPERWARDEN SKILL')}\n` +
        `${chalk.dim('  Name for the Superwarden skill.')}\n` +
        `${chalk.cyan('>')} `
      );
    }
    if (!skillName) {
      reporter.error('Missing skill name. Usage: warden synth <skill>');
      return 1;
    }
  }

  let repoRoot: string;
  try {
    repoRoot = getRepoRoot(process.cwd());
  } catch {
    reporter.error('Not a git repository');
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

  const skillConfig = config?.skills.find((skill) => skill.name === skillName);
  if (skillConfig && skillConfig.mode !== 'coordinator') {
    reporter.warning(`Skill ${skillName} is not configured as a Superwarden skill (mode = "coordinator"); synthesizing for inspection.`);
  }

  const resolved = await resolveSkillOrCreateSuperwarden({
    skillName,
    repoRoot,
    options,
    skillRemote: skillConfig?.remote,
    reporter,
  });
  const { skill } = resolved;

  const apiKey = getAnthropicApiKey();
  const runtimeName = config?.defaults?.runtime ?? 'claude';
  const model = resolveSynthesisModel(config, options);
  const repairModel = emptyToUndefined(config?.defaults?.auxiliary?.model);
  const maxRetries = config?.defaults?.auxiliary?.maxRetries ?? config?.defaults?.auxiliaryMaxRetries;
  const parallel = options.parallel ?? config?.runner?.concurrency ?? DEFAULT_CONCURRENCY;

  try {
    if (!options.json) {
      if (resolved.created) {
        reporter.blank();
        renderNewSuperwardenSkill({
          reporter,
          skillName: skill.name,
          skillRoot: skill.rootDir,
          repoRoot,
          runtimeName,
          model,
          promptLength: resolved.initialPromptLength,
        });
      } else {
        renderSuperwardenHeader({
          reporter,
          skillName: skill.name,
          skillRoot: skill.rootDir,
          repoRoot,
          runtimeName,
          model,
        });
      }
      reporter.bold('PLAN');
    }

    const prepared = await prepareSuperwardenArtifacts({
      skill,
      repoPath: repoRoot,
      mode: reporter.mode,
      verbosity: reporter.verbosity,
      json: options.json,
      runtimeName,
      model,
      apiKey,
      repairModel,
      repairMaxRetries: maxRetries,
      parallel,
      regenerate: options.regenerate,
      abortController: state?.abortController,
      showPlanOnly: options.showPlan,
      planMessage: skill.description || skill.name,
      onNonTTYPlanStep: (message) => reporter.step(message),
      onPlanReady: ({ planResult, planBytes, planDurationMs }) => {
        if (options.json) {
          return;
        }
        renderPlanReady(
          reporter,
          planResult.plan,
          planResult.source,
          planResult.source === 'cache' ? undefined : planResult.durationMs ?? planDurationMs,
          planBytes,
          planResult.usage,
          planResult.numTurns,
        );
      },
      onBeforeChildTasks: ({ planResult }) => {
        if (options.json) {
          return;
        }
        reporter.blank();
        renderTasksHeading(reporter, planResult.plan.tasks.length);
      },
      childMessage: ({ task }) => task.id,
      onNonTTYChildStep: (message) => reporter.step(message),
      onChildArtifact: ({ artifact, task }) => {
        if (options.json) {
          return;
        }
        renderChildSkillArtifact({ reporter, artifact, task });
      },
    });
    const preparedChildSkills = prepared.childSkills;

    if (options.exportPath) {
      const exportPath = resolve(process.cwd(), options.exportPath);
      const exportStartedAt = performance.now();
      mkdirSync(dirname(exportPath), { recursive: true });
      writeFileSync(exportPath, `${JSON.stringify(prepared.planResult.plan, null, 2)}\n`, 'utf-8');
      const exportDurationMs = performance.now() - exportStartedAt;
      const exportBytes = fileSize(exportPath);
      reporter.success(
        `Exported Superwarden plan to ${exportPath}` +
        `${exportBytes === undefined ? '' : `  ${formatBytes(exportBytes)}`}  ${formatDuration(exportDurationMs)}`
      );
    }

    if (options.showPlan) {
      if (!options.json) {
        reporter.blank();
        process.stdout.write(`${renderPlanInspection({
          plan: prepared.planResult.plan,
          source: prepared.planResult.source,
          cachePath: prepared.planResult.cachePath,
          repoRoot,
          bytes: prepared.planBytes,
          durationMs: prepared.planResult.source === 'cache'
            ? undefined
            : prepared.planResult.durationMs ?? prepared.planDurationMs,
          usage: prepared.planResult.usage,
          turns: prepared.planResult.numTurns,
          reporter,
        })}\n`);
      } else {
        process.stdout.write(`${JSON.stringify(prepared.planResult.plan, null, 2)}\n`);
      }
      return 0;
    }

    if (!options.json) {
      if (!prepared.childRoot || !preparedChildSkills) {
        throw new CoordinatorPlanError(`Missing child skill artifacts for ${skill.name}`);
      }
      renderChildSkillSummary({
        reporter,
        childSkills: preparedChildSkills,
        durationMs: prepared.childDurationMs,
      });
      renderTryIt(reporter, skill.name);
    }

    if (options.json) {
      process.stdout.write(`${JSON.stringify(prepared.planResult.plan, null, 2)}\n`);
      return 0;
    }

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
