import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import chalk from 'chalk';
import { emptyToUndefined, loadWardenConfigFile } from '../../config/loader.js';
import type { SkillDefinition, WardenConfig } from '../../config/schema.js';
import type { UsageStats } from '../../types/index.js';
import type { CLIOptions } from '../args.js';
import type { Reporter } from '../output/reporter.js';
import { formatBytes, formatCost, formatDuration, formatTokens } from '../output/formatters.js';
import { runWithLiveStatus } from '../output/live-status.js';
import { getAnthropicApiKey } from '../../utils/index.js';
import { promptLine, promptMultiline } from '../input.js';
import { getRepoRoot } from '../git.js';
import {
  buildGeneratedSkillDefinition,
  createGeneratedSkillDefinition,
  inferGeneratedSkillDescription,
  generatedSkillDefinitionRootExists,
  resolveGeneratedSkillTarget,
} from '../../skill-builder/definition.js';
import {
  collectSkillBuildSource,
  collectSkillImproveSource,
  type SkillBuildOutline,
  SkillBuildOutlineError,
  buildSkillOutline,
} from '../../skill-builder/outline.js';
import {
  GeneratedSkillBuildError,
  buildGeneratedSkill,
} from '../../skill-builder/skill.js';
import { getRuntime } from '../../sdk/runtimes/index.js';
import {
  findInvalidPiModelSelector,
  invalidPiModelSelectorMessage,
  type InvalidPiModelSelector,
} from '../../sdk/runtimes/model-selectors.js';

function renderHeader(args: {
  reporter: Reporter;
  skill: SkillDefinition;
  repoRoot: string;
  runtimeName: string;
  model?: string;
}): void {
  args.reporter.text(`  Skill    ${args.skill.name}`);
  args.reporter.text(`  Source   ${relativeSkillPath(args.skill.rootDir, args.repoRoot)}`);
  args.reporter.text(`  Model    ${args.model ?? 'default'} [${args.runtimeName}]`);
  args.reporter.blank();
}

function relativeSkillPath(path: string | undefined, repoRoot: string): string {
  if (!path) {
    return 'unknown';
  }
  if (!path.startsWith(repoRoot)) {
    return path;
  }
  return path.slice(repoRoot.length + 1);
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
    args.sources === undefined || args.sources === 0
      ? undefined
      : `${args.sources} external ${args.sources === 1 ? 'source' : 'sources'}`,
    args.turns === undefined ? undefined : `${args.turns} ${args.turns === 1 ? 'turn' : 'turns'}`,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' / ') : undefined;
}

function formatStats(args: {
  bytes?: number;
  durationMs?: number;
  usage?: UsageStats;
  sources?: number;
  turns?: number;
}): string {
  const parts = [
    args.bytes === undefined ? undefined : formatBytes(args.bytes),
    args.durationMs === undefined ? undefined : formatDuration(args.durationMs),
    formatUsageCostDetail(args.usage),
    args.sources === undefined || args.sources === 0
      ? undefined
      : `${args.sources} external ${args.sources === 1 ? 'source' : 'sources'}`,
    args.turns === undefined ? undefined : `${args.turns} ${args.turns === 1 ? 'turn' : 'turns'}`,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? chalk.dim(`[${parts.join(' · ')}]`) : '';
}

function renderTryIt(reporter: Reporter, skillName: string): void {
  reporter.blank();
  reporter.bold('TRY IT');
  reporter.text(`  warden src/file.ts --skill ${skillName}`);
}

function renderTracks(reporter: Reporter, outline: SkillBuildOutline): void {
  const count = outline.tracks.length;
  const heading = reporter.mode.isTTY
    ? `${chalk.bold('TRACKS')}${chalk.cyan(`  ${count} ${count === 1 ? 'track' : 'tracks'}`)}`
    : `TRACKS  ${count} ${count === 1 ? 'track' : 'tracks'}`;
  reporter.text(heading);
  for (const track of outline.tracks) {
    if (reporter.mode.isTTY) {
      reporter.text(`  ${track.title}${chalk.dim(` (${track.id})`)}`);
    } else {
      reporter.text(`  ${track.title} (${track.id})`);
    }
  }
}

function outlineStatusMessage(skill: SkillDefinition): string {
  return skill.description || `Shape ${skill.name}`;
}

function outlineStatusDetail(): string {
  return 'Build the internal outline and track split.';
}

function skillStatusMessageForMode(skill: SkillDefinition, mode: GeneratedSkillCommandMode): string {
  return `${mode === 'improve' ? 'Improve' : 'Generate'} ${skill.name}`;
}

function skillStatusDetail(mode: GeneratedSkillCommandMode): string {
  return mode === 'improve'
    ? 'Plan, revise, and review skill artifacts with the authoring provider.'
    : 'Plan, write, and validate skill artifacts with the authoring provider.';
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

type GeneratedSkillCommandMode = 'build' | 'improve';

function reportInvalidPiModelSelector(reporter: Reporter, invalid: InvalidPiModelSelector): void {
  reporter.error(invalidPiModelSelectorMessage(invalid));
  reporter.tip('Set a Pi model selector such as anthropic/claude-sonnet-4-6.');
}

async function resolvePrompt(
  options: CLIOptions,
  skillName: string,
  mode: GeneratedSkillCommandMode,
): Promise<string | undefined> {
  if (options.prompt?.trim()) {
    return resolvePromptValue(options.prompt);
  }
  if (!process.stdin.isTTY) {
    return undefined;
  }
  const label = mode === 'improve' ? 'IMPROVEMENT BRIEF' : 'SKILL PROMPT';
  return promptMultiline(
    `${chalk.bold(label)}\n` +
    `  Skill    ${chalk.cyan(skillName)}`,
    {
      hint: chalk.dim('  Finish with an empty line.'),
      prompt: `${chalk.cyan('>')} `,
    },
  );
}

async function ensureSynthesizedSkill(args: {
  skillName: string;
  repoRoot: string;
  options: CLIOptions;
  reporter: Reporter;
  mode: GeneratedSkillCommandMode;
}): Promise<{
  skill: SkillDefinition;
  created: boolean;
  promptLength?: number;
  improvementPrompt?: string;
  tryItSkillName: string;
}> {
  const { skillName, repoRoot, options, reporter, mode } = args;
  const target = resolveGeneratedSkillTarget(repoRoot, skillName);
  const definitionExists = generatedSkillDefinitionRootExists(target.rootDir);

  if (definitionExists) {
    const skill = buildGeneratedSkillDefinition(target.rootDir);
    const improvementPrompt = mode === 'improve'
      ? await resolvePrompt(options, target.displayName, mode)
      : undefined;
    if (mode === 'improve' && !improvementPrompt?.trim()) {
      reporter.error(`Missing improvement brief for ${target.displayName}`);
      reporter.tip('Pass --prompt/-p, prefix with @ to read from a file, or run interactively.');
      throw new SkillBuildOutlineError(`Missing improvement brief for generated skill: ${skillName}`);
    }
    return {
      skill,
      created: false,
      improvementPrompt,
      promptLength: improvementPrompt?.length,
      tryItSkillName: target.isPath ? target.displayName : skill.name,
    };
  }

  if (mode === 'improve') {
    reporter.error(`Generated skill not found: ${target.displayName}`);
    reporter.tip(`Run warden build ${target.displayName} --prompt <prompt> first`);
    throw new SkillBuildOutlineError(`Missing generated skill for improvement: ${skillName}`);
  }

  const prompt = await resolvePrompt(options, skillName, mode);
  if (!prompt) {
    reporter.error(`Generated skill not found: ${target.displayName}`);
    const createTarget = target.isPath ? target.displayName : `.warden/skills/${skillName}`;
    reporter.tip(`Run interactively, or pass --prompt/-p to create ${createTarget}`);
    throw new SkillBuildOutlineError(`Missing prompt for new generated skill: ${skillName}`);
  }

  const skill = createGeneratedSkillDefinition({
    repoRoot,
    name: target.isPath ? basename(target.rootDir) : skillName,
    prompt,
    rootDir: target.rootDir,
  });
  return {
    skill,
    created: true,
    promptLength: prompt.length,
    tryItSkillName: target.isPath ? target.displayName : skill.name,
  };
}

interface RunBuildState {
  abortController?: AbortController;
  interrupted?: { value: boolean };
}

function isInterrupted(error: unknown, state: RunBuildState | undefined): boolean {
  if (state?.interrupted?.value || state?.abortController?.signal.aborted) {
    return true;
  }
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === 'AbortError' || /\b(aborted|cancelled|canceled|interrupted)\b/i.test(error.message);
}

async function runGeneratedSkillCommand(
  options: CLIOptions,
  reporter: Reporter,
  mode: GeneratedSkillCommandMode,
  state?: RunBuildState,
): Promise<number> {
  let skillName = options.skill;
  if (!skillName) {
    if (process.stdin.isTTY) {
      skillName = await promptLine(
        `${chalk.bold('SKILL NAME')}\n` +
        `${chalk.dim('  Name for the generated skill.')}\n` +
        `${chalk.cyan('>')} `
      );
    }
    if (!skillName) {
      reporter.error(`Missing skill name. Usage: warden ${mode} <skill>`);
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

  try {
    const resolved = await ensureSynthesizedSkill({
      skillName,
      repoRoot,
      options,
      reporter,
      mode,
    });
    const { skill } = resolved;
    const source = mode === 'improve' && resolved.improvementPrompt
      ? collectSkillImproveSource(skill, resolved.improvementPrompt)
      : collectSkillBuildSource(skill);

    const runtimeName = config?.defaults?.runtime ?? 'pi';
    const model = resolveSynthesisModel(config, options);
    const repairModel = emptyToUndefined(config?.defaults?.auxiliary?.model);
    const maxRetries = config?.defaults?.auxiliary?.maxRetries ?? config?.defaults?.auxiliaryMaxRetries;
    const invalidModelSelector = findInvalidPiModelSelector([{
      runtime: runtimeName,
      model,
      auxiliaryModel: repairModel,
    }]);
    if (invalidModelSelector) {
      reportInvalidPiModelSelector(reporter, invalidModelSelector);
      return 1;
    }
    const runtime = getRuntime(runtimeName);

    if (!options.json) {
      renderHeader({
        reporter,
        skill,
        repoRoot,
        runtimeName,
        model,
      });
      if (resolved.created) {
        reporter.bold('NEW SKILL');
        reporter.success(`Created ${skill.name}`);
        renderDetail(reporter, 'Source', relativeSkillPath(skill.rootDir, repoRoot));
        if (resolved.promptLength !== undefined) {
          renderDetail(reporter, 'Prompt', `${resolved.promptLength.toLocaleString()} chars`);
        }
        renderDetail(reporter, 'Model', `${model ?? 'default'} [${runtimeName}]`);
        reporter.blank();
      } else if (mode === 'improve') {
        reporter.bold('IMPROVE');
        renderDetail(reporter, 'Brief', `${resolved.promptLength?.toLocaleString() ?? 0} chars`);
        reporter.blank();
      }
      reporter.bold('OUTLINE');
    }

    const outlineResult = await runWithLiveStatus({
      mode: reporter.mode,
      verbosity: reporter.verbosity,
      message: outlineStatusMessage(skill),
      detail: outlineStatusDetail(),
      task: ({ setDetail }) => buildSkillOutline({
        skill,
        runtime,
        apiKey: getAnthropicApiKey(),
        model,
        previousOutline: undefined,
        regenerate: options.regenerate || mode === 'improve',
        abortController: state?.abortController,
        repoPath: repoRoot,
        source,
        repairModel,
        repairMaxRetries: maxRetries,
        onStatus: setDetail,
      }),
    });

    const outlineStats = outlineResult.source === 'cache'
      ? chalk.dim('[cached]')
      : formatStats({
        durationMs: outlineResult.durationMs,
        usage: outlineResult.usage,
        sources: outlineResult.outline.build.externalSources?.length ?? 0,
        turns: outlineResult.numTurns,
      });

    if (!options.json) {
      reporter.success(
        `${outlineResult.source === 'cache' ? 'Loaded' : 'Synthesized'} outline with ${outlineResult.outline.tracks.length} ` +
        `${outlineResult.outline.tracks.length === 1 ? 'track' : 'tracks'}${outlineStats ? `  ${outlineStats}` : ''}`,
      );
      reporter.blank();
      renderTracks(reporter, outlineResult.outline);
      reporter.blank();
      reporter.bold('SKILL');
    }

    const artifact = await runWithLiveStatus({
      mode: reporter.mode,
      verbosity: reporter.verbosity,
      message: skillStatusMessageForMode(skill, mode),
      detail: skillStatusDetail(mode),
      task: ({ setDetail }) => buildGeneratedSkill({
        outline: outlineResult.outline,
        source,
        rootDir: (() => {
          if (!skill.rootDir) {
            throw new GeneratedSkillBuildError(`Generated skill ${skill.name} is missing a root directory`);
          }
          return skill.rootDir;
        })(),
        runtime,
        repoPath: repoRoot,
        mode,
        improvementPrompt: resolved.improvementPrompt,
        model,
        apiKey: getAnthropicApiKey(),
        repairModel,
        repairMaxRetries: maxRetries,
        abortController: state?.abortController,
        regenerate: options.regenerate || outlineResult.source === 'generated' || mode === 'improve',
        onStatus: setDetail,
      }),
    });

    if (!options.json) {
      reporter.success(
        artifact.source === 'cache'
          ? `${artifact.name}  ${chalk.dim('[cached]')}`
          : artifact.name,
      );
      if (artifact.source !== 'cache') {
        renderDetail(reporter, 'Artifact', formatBytes(artifact.bytes));
        renderDetail(reporter, 'Synthesis', formatDuration(artifact.durationMs));
        renderDetail(reporter, 'Usage', formatUsageCostDetail(artifact.usage));
        renderDetail(reporter, 'Context', formatContextDetail({
          sources: artifact.externalSources.length,
          turns: artifact.numTurns,
        }));
      }
      for (const warning of artifact.warnings) {
        reporter.warning(warning);
      }
      renderTryIt(reporter, resolved.tryItSkillName);
    } else {
      process.stdout.write(`${JSON.stringify({
        skill: {
          name: skill.name,
          description: inferGeneratedSkillDescription(skill.name, skill.prompt),
          rootDir: skill.rootDir,
        },
        outline: outlineResult.outline,
        artifact: {
          source: artifact.source,
          path: artifact.path,
          bytes: artifact.bytes,
          usage: artifact.usage,
          externalSources: artifact.externalSources,
          missingInputs: artifact.missingInputs,
          warnings: artifact.warnings,
          responseModel: artifact.responseModel,
          numTurns: artifact.numTurns,
        },
      }, null, 2)}\n`);
    }

    return 0;
  } catch (error) {
    if (isInterrupted(error, state)) {
      reporter.warning('Interrupted');
      return 130;
    }
    if (error instanceof SkillBuildOutlineError || error instanceof GeneratedSkillBuildError) {
      reporter.error(error.message);
      return 1;
    }
    throw error;
  }
}

export async function runBuild(
  options: CLIOptions,
  reporter: Reporter,
  state?: RunBuildState,
): Promise<number> {
  return runGeneratedSkillCommand(options, reporter, 'build', state);
}

/** Run the generated skill improvement command through the shared builder. */
export async function runImprove(
  options: CLIOptions,
  reporter: Reporter,
  state?: RunBuildState,
): Promise<number> {
  return runGeneratedSkillCommand(options, reporter, 'improve', state);
}
