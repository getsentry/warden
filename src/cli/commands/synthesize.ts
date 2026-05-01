import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { dirname, relative, resolve } from 'node:path';
import chalk from 'chalk';
import { emptyToUndefined, loadWardenConfigFile } from '../../config/loader.js';
import type { SkillDefinition, WardenConfig } from '../../config/schema.js';
import type { UsageStats } from '../../types/index.js';
import type { CLIOptions } from '../args.js';
import type { Reporter } from '../output/reporter.js';
import { Verbosity } from '../output/verbosity.js';
import { formatBytes, formatCost, formatDuration, formatTokens, truncate } from '../output/formatters.js';
import { runWithLiveStatus } from '../output/live-status.js';
import { getAnthropicApiKey } from '../../utils/index.js';
import { aggregateUsage } from '../../sdk/usage.js';
import { getRuntime } from '../../sdk/runtimes/index.js';
import { resolveSkillAsync, SkillLoaderError } from '../../skills/loader.js';
import { getRepoRoot } from '../git.js';
import { promptLine, promptMultiline } from '../input.js';
import {
  CoordinatorPlanError,
  collectCoordinatorSource,
  getCoordinatorPlanCachePath,
  synthesizeCoordinatorPlan,
  type CoordinatorPlan,
} from '../../coordinator/plan.js';
import {
  buildCoordinatorChildSkillsResult,
  CoordinatorChildSkillError,
  ensureCoordinatorChildSkillsRoot,
  resetCoordinatorChildSkillsRoot,
  synthesizeCoordinatorChildSkill,
  type CoordinatorChildSkillArtifact,
  type WriteCoordinatorChildSkillsResult,
} from '../../coordinator/child-skills.js';
import {
  createSuperwardenSkill,
  getSuperwardenCacheDir,
} from '../../coordinator/superwarden.js';

function formatRelativePath(path: string | undefined, repoRoot: string): string {
  if (!path) return 'unknown';
  const rel = relative(repoRoot, path);
  if (!rel || rel.startsWith('..')) return path;
  return rel;
}

function fileSize(path: string): number | undefined {
  try {
    return statSync(path).size;
  } catch {
    return undefined;
  }
}

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

function wrapMultilineText(text: string, width: number, indent: string): string[] {
  const lines: string[] = [];
  for (const paragraph of text.trim().split(/\n{2,}/)) {
    if (lines.length > 0) lines.push('');
    const paragraphLines = paragraph.split('\n');
    for (const line of paragraphLines) {
      lines.push(...wrapText(line, width, indent));
    }
  }
  return lines;
}

function renderPlanList(lines: string[], items: string[], width: number, indent: string): void {
  if (items.length === 0) return;
  for (const item of items) {
    const wrapped = wrapText(item, width, `${indent}- `, `${indent}  `);
    lines.push(...wrapped);
  }
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
  const missingInputs = plan.synthesis.missingInputs ?? [];
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
  lines.push(`  Cache    ${formatRelativePath(cachePath, repoRoot)}`);
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

  lines.push(chalk.bold('TASKS'));
  for (const [index, task] of plan.tasks.entries()) {
    if (index > 0) lines.push('');
    lines.push(`  ${index + 1}. ${chalk.bold(task.id)}`);
    lines.push(`     ${task.title}`);
    lines.push(...wrapText(task.scope, width, '     '));
    lines.push('');
    lines.push(
      `     Evidence  ${task.evidenceRequirements.length} ` +
      `${task.evidenceRequirements.length === 1 ? 'requirement' : 'requirements'}`
    );
    lines.push(
      `     Excludes  ${task.outOfScope.length} ` +
      `${task.outOfScope.length === 1 ? 'rule' : 'rules'}`
    );
    if (verbose && task.evidenceRequirements.length > 0) {
      lines.push('');
      lines.push('     Evidence requirements');
      renderPlanList(lines, task.evidenceRequirements, width, '       ');
    }
    if (verbose && task.outOfScope.length > 0) {
      lines.push('');
      lines.push('     Out of scope');
      renderPlanList(lines, task.outOfScope, width, '       ');
    }
    if (debug && task.prompt.trim()) {
      lines.push('');
      lines.push('     Prompt');
      lines.push(...wrapMultilineText(task.prompt, width, '       '));
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

  if (missingInputs.length > 0) {
    lines.push('');
    lines.push(chalk.bold('MISSING INPUTS'));
    renderPlanList(lines, missingInputs, width, '  ');
  }

  return lines.join('\n');
}

function renderChildSkillArtifact(args: {
  reporter: Reporter;
  artifact: CoordinatorChildSkillArtifact;
  task: CoordinatorPlan['tasks'][number];
}): void {
  const { reporter, artifact, task } = args;
  const sourceLabel = artifact.source === 'cache' ? 'cached' : 'generated';
  reporter.success(`${artifact.taskId}  ${chalk.dim(`[${sourceLabel}]`)}`);
  reporter.dim(`  ${truncate(task.scope, 100)}`);
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
  skillName: string;
}): void {
  const { reporter, childSkills, skillName } = args;
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
      ? formatDuration(generatedArtifacts.reduce((sum, artifact) => sum + artifact.durationMs, 0))
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

  reporter.blank();
  reporter.bold('TRY IT');
  reporter.text(`  pnpm cli src/file.ts --skill ${skillName}`);
}

function inferDescription(skillName: string, initialPrompt: string): string {
  const firstLine = initialPrompt.trim().split('\n').find((line) => line.trim())?.trim();
  if (!firstLine) return `Superwarden skill for ${skillName}.`;
  return firstLine.length > 160 ? `${firstLine.slice(0, 157)}...` : firstLine;
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

  const description = options.description?.trim()
    || (process.stdin.isTTY
      ? await promptLine(
        `${chalk.bold('DESCRIPTION')}\n` +
        `${chalk.dim('  Optional. Press Enter to use an inferred description.')}\n` +
        `${chalk.cyan('>')} `
      )
      : undefined)
    || inferDescription(skillName, initialPrompt);

  const skill = createSuperwardenSkill({
    repoRoot,
    name: skillName,
    initialPrompt,
    description,
  });
  return { skill, created: true, initialPromptLength: initialPrompt.length };
}

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
  const runtime = getRuntime(runtimeName);
  const model = resolveSynthesisModel(config, options);
  const repairModel = emptyToUndefined(config?.defaults?.auxiliary?.model);
  const maxRetries = config?.defaults?.auxiliary?.maxRetries ?? config?.defaults?.auxiliaryMaxRetries;

  try {
    const source = collectCoordinatorSource(skill);
    const cachePath = getCoordinatorPlanCachePath({
      skillName: skill.name,
      sourceHash: source.hash,
      model,
      cacheDir: getSuperwardenCacheDir(repoRoot, skill.name),
    });
    const cacheHit = existsSync(cachePath);

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
      if (!reporter.mode.isTTY) {
        reporter.step(cacheHit && !options.regenerate
          ? 'Validating cached Superwarden plan...'
          : 'Synthesizing Superwarden plan...');
      }
    }

    const synthesisMessage = cacheHit && !options.regenerate
      ? 'Validating cached Superwarden plan...'
      : 'Synthesizing Superwarden plan...';
    const synthesisStartedAt = performance.now();
    const runSynthesis = () => synthesizeCoordinatorPlan({
      skill,
      runtime,
      apiKey,
      model,
      maxRetries,
      regenerate: options.regenerate,
      abortController: state?.abortController,
      cacheDir: getSuperwardenCacheDir(repoRoot, skill.name),
      repoPath: repoRoot,
      repairModel,
      repairMaxRetries: maxRetries,
    });
    const result = options.json
      ? await runSynthesis()
      : await runWithLiveStatus({
        mode: reporter.mode,
        verbosity: reporter.verbosity,
        message: synthesisMessage,
        detail: !cacheHit || options.regenerate
          ? 'This can take a minute. Warden will cache the validated plan and tasks.'
          : undefined,
        task: runSynthesis,
    });
    const synthesisDurationMs = performance.now() - synthesisStartedAt;
    const planBytes = fileSize(result.cachePath);

    if (options.exportPath) {
      const exportPath = resolve(process.cwd(), options.exportPath);
      const exportStartedAt = performance.now();
      mkdirSync(dirname(exportPath), { recursive: true });
      writeFileSync(exportPath, `${JSON.stringify(result.plan, null, 2)}\n`, 'utf-8');
      const exportDurationMs = performance.now() - exportStartedAt;
      const exportBytes = fileSize(exportPath);
      reporter.success(
        `Exported Superwarden plan to ${exportPath}` +
        `${exportBytes === undefined ? '' : `  ${formatBytes(exportBytes)}`}  ${formatDuration(exportDurationMs)}`
      );
    }

    if (!options.json) {
      renderPlanReady(
        reporter,
        result.plan,
        result.source,
        result.source === 'cache' ? undefined : result.durationMs ?? synthesisDurationMs,
        planBytes,
        result.usage,
        result.numTurns,
      );
    }

    if (options.showPlan && !options.json) {
      reporter.blank();
      process.stdout.write(`${renderPlanInspection({
        plan: result.plan,
        source: result.source,
        cachePath: result.cachePath,
        repoRoot,
        bytes: planBytes,
        durationMs: result.source === 'cache' ? undefined : result.durationMs ?? synthesisDurationMs,
        usage: result.usage,
        turns: result.numTurns,
        reporter,
      })}\n`);
      return 0;
    }

    const childStartedAt = performance.now();
    const regenerateChildSkills = options.regenerate || result.source === 'generated';
    const childRoot = regenerateChildSkills
      ? resetCoordinatorChildSkillsRoot(result.cachePath)
      : ensureCoordinatorChildSkillsRoot(result.cachePath);
    const childArtifacts: CoordinatorChildSkillArtifact[] = [];
    if (!options.json) {
      reporter.blank();
      reporter.bold('TASKS');
    }
    for (const [index, task] of result.plan.tasks.entries()) {
      const childMessage = `${task.id} ${chalk.dim(`[${index + 1}/${result.plan.tasks.length}]`)}`;
      if (!options.json && !reporter.mode.isTTY) {
        reporter.step(childMessage);
      }
      const artifact = options.json
        ? await synthesizeCoordinatorChildSkill({
          plan: result.plan,
          task,
          source,
          cachePath: result.cachePath,
          rootDir: childRoot,
          runtime,
          repoPath: repoRoot,
          model,
          apiKey,
          repairModel,
          repairMaxRetries: maxRetries,
          abortController: state?.abortController,
          regenerate: regenerateChildSkills,
        })
        : await runWithLiveStatus({
          mode: reporter.mode,
          verbosity: reporter.verbosity,
          message: childMessage,
          task: () => synthesizeCoordinatorChildSkill({
            plan: result.plan,
            task,
            source,
            cachePath: result.cachePath,
            rootDir: childRoot,
            runtime,
            repoPath: repoRoot,
            model,
            apiKey,
            repairModel,
            repairMaxRetries: maxRetries,
            abortController: state?.abortController,
            regenerate: regenerateChildSkills,
          }),
        });
      childArtifacts.push(artifact);
      if (!options.json) {
        renderChildSkillArtifact({ reporter, artifact, task });
      }
    }
    const childSkills = buildCoordinatorChildSkillsResult(
      childRoot,
      childArtifacts,
      performance.now() - childStartedAt,
    );

    if (!options.json) {
      renderChildSkillSummary({ reporter, childSkills, skillName: skill.name });
    }

    if (options.json) {
      process.stdout.write(`${JSON.stringify(result.plan, null, 2)}\n`);
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
