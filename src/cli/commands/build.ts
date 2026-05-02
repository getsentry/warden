import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
  getGeneratedSkillRoot,
  inferGeneratedSkillDescription,
  generatedSkillDefinitionExists,
} from '../../skill-builder/definition.js';
import {
  collectSkillBuildSource,
  type SkillBuildOutline,
  SkillBuildOutlineError,
  buildSkillOutline,
} from '../../skill-builder/outline.js';
import {
  GeneratedSkillBuildError,
  buildGeneratedSkill,
} from '../../skill-builder/skill.js';
import { getRuntime } from '../../sdk/runtimes/index.js';

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
    args.sources === undefined ? undefined : `${args.sources} ${args.sources === 1 ? 'source' : 'sources'}`,
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
    args.sources === undefined ? undefined : `${args.sources} ${args.sources === 1 ? 'source' : 'sources'}`,
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

function skillStatusMessage(skill: SkillDefinition): string {
  return `Generate ${skill.name}`;
}

function skillStatusDetail(): string {
  return 'Plan, write, and validate skill artifacts with the authoring provider.';
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

async function resolvePrompt(options: CLIOptions, skillName: string): Promise<string | undefined> {
  if (options.prompt?.trim()) {
    return resolvePromptValue(options.prompt);
  }
  if (!process.stdin.isTTY) {
    return undefined;
  }
  return promptMultiline(
    `${chalk.bold('SKILL PROMPT')}\n` +
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
}): Promise<{ skill: SkillDefinition; created: boolean; promptLength?: number }> {
  const { skillName, repoRoot, options, reporter } = args;
  if (generatedSkillDefinitionExists(repoRoot, skillName)) {
    const rootDir = getGeneratedSkillRoot(repoRoot, skillName);
    return { skill: buildGeneratedSkillDefinition(rootDir), created: false };
  }

  const prompt = await resolvePrompt(options, skillName);
  if (!prompt) {
    reporter.error(`Generated skill not found: ${skillName}`);
    reporter.tip(`Run interactively, or pass --prompt/-p to create .warden/skills/${skillName}`);
    throw new SkillBuildOutlineError(`Missing prompt for new generated skill: ${skillName}`);
  }

  const skill = createGeneratedSkillDefinition({
    repoRoot,
    name: skillName,
    prompt,
  });
  return { skill, created: true, promptLength: prompt.length };
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

export async function runBuild(
  options: CLIOptions,
  reporter: Reporter,
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
      reporter.error('Missing skill name. Usage: warden build <skill>');
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

  const resolved = await ensureSynthesizedSkill({
    skillName,
    repoRoot,
    options,
    reporter,
  });
  const { skill } = resolved;

  const runtimeName = config?.defaults?.runtime ?? 'claude';
  const runtime = getRuntime(runtimeName);
  const model = resolveSynthesisModel(config, options);
  const repairModel = emptyToUndefined(config?.defaults?.auxiliary?.model);
  const maxRetries = config?.defaults?.auxiliary?.maxRetries ?? config?.defaults?.auxiliaryMaxRetries;

  try {
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
        regenerate: options.regenerate,
        abortController: state?.abortController,
        repoPath: repoRoot,
        repairModel,
        repairMaxRetries: maxRetries,
        onStatus: setDetail,
      }),
    });

    const outlineStats = formatStats({
      durationMs: outlineResult.source === 'generated' ? outlineResult.durationMs : undefined,
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
      message: skillStatusMessage(skill),
      detail: skillStatusDetail(),
      task: ({ setDetail }) => buildGeneratedSkill({
        outline: outlineResult.outline,
        source: collectSkillBuildSource(skill),
        rootDir: (() => {
          if (!skill.rootDir) {
            throw new GeneratedSkillBuildError(`Generated skill ${skill.name} is missing a root directory`);
          }
          return skill.rootDir;
        })(),
        runtime,
        repoPath: repoRoot,
        model,
        apiKey: getAnthropicApiKey(),
        repairModel,
        repairMaxRetries: maxRetries,
        abortController: state?.abortController,
        regenerate: options.regenerate || outlineResult.source === 'generated',
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
      renderTryIt(reporter, skill.name);
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
