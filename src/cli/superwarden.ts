import { existsSync, statSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { relative } from 'node:path';
import type { SkillDefinition } from '../config/schema.js';
import {
  buildCoordinatorChildSkillsResult,
  ensureCoordinatorChildSkillsRoot,
  resetCoordinatorChildSkillsRoot,
  synthesizeCoordinatorChildSkill,
  type CoordinatorChildSkillArtifact,
  type WriteCoordinatorChildSkillsResult,
} from '../coordinator/child-skills.js';
import {
  collectCoordinatorSource,
  getCoordinatorPlanCachePath,
  synthesizeCoordinatorPlan,
  type CoordinatorPlan,
  type CoordinatorSource,
  type CoordinatorSynthesisResult,
} from '../coordinator/plan.js';
import { getSuperwardenCacheDir } from '../coordinator/superwarden.js';
import { getRuntime } from '../sdk/runtimes/index.js';
import type { RuntimeName } from '../sdk/runtimes/index.js';
import { runWithLiveStatus } from './output/live-status.js';
import type { OutputMode } from './output/tty.js';
import type { Verbosity } from './output/verbosity.js';

/** Render a repo-local path when possible, and fall back to the absolute path otherwise. */
export function formatRelativePath(path: string | undefined, repoRoot: string): string {
  if (!path) return 'unknown';
  const rel = relative(repoRoot, path);
  if (!rel || rel.startsWith('..')) return path;
  return rel;
}

/** Return a file size when the artifact exists, or `undefined` when it does not. */
export function fileSize(path: string): number | undefined {
  try {
    return statSync(path).size;
  } catch {
    return undefined;
  }
}

/** Describe whether a Superwarden plan run is validating cache or synthesizing fresh artifacts. */
export function superwardenPlanStatusDetail(cacheHit: boolean, regenerate: boolean | undefined): string {
  return cacheHit && !regenerate
    ? 'Validating cached Superwarden plan...'
    : 'Synthesizing Superwarden plan...';
}

export interface PreparedSuperwardenArtifacts {
  skill: SkillDefinition;
  source: CoordinatorSource;
  cacheDir: string;
  planCachePath: string;
  planCacheHit: boolean;
  planResult: CoordinatorSynthesisResult;
  planBytes?: number;
  planDurationMs: number;
  childRoot?: string;
  childArtifacts: CoordinatorChildSkillArtifact[];
  childSkills?: WriteCoordinatorChildSkillsResult;
}

export interface PrepareSuperwardenArtifactsArgs {
  skill: SkillDefinition;
  repoPath: string;
  mode: OutputMode;
  verbosity: Verbosity;
  json: boolean;
  runtimeName?: RuntimeName;
  model?: string;
  apiKey?: string;
  repairModel?: string;
  repairMaxRetries?: number;
  regenerate?: boolean;
  abortController?: AbortController;
  showPlanOnly?: boolean;
  planMessage?: string;
  childMessage?: (args: {
    task: CoordinatorPlan['tasks'][number];
    index: number;
    total: number;
  }) => string;
  onNonTTYPlanStep?: (message: string) => void;
  onPlanReady?: (args: {
    planResult: CoordinatorSynthesisResult;
    planBytes?: number;
    planDurationMs: number;
    planCacheHit: boolean;
  }) => void;
  onBeforeChildTasks?: (args: {
    planResult: CoordinatorSynthesisResult;
  }) => void;
  onNonTTYChildStep?: (message: string) => void;
  onChildArtifact?: (args: {
    artifact: CoordinatorChildSkillArtifact;
    task: CoordinatorPlan['tasks'][number];
    index: number;
    total: number;
  }) => void;
}

/**
 * Build the parent plan and child task artifacts for a Superwarden skill.
 *
 * This is the shared orchestration path used by both `warden synth` and
 * normal Superwarden task expansion during `warden run`.
 */
export async function prepareSuperwardenArtifacts(
  args: PrepareSuperwardenArtifactsArgs,
): Promise<PreparedSuperwardenArtifacts> {
  const source = collectCoordinatorSource(args.skill);
  const runtimeName: RuntimeName = args.runtimeName ?? 'claude';
  const runtime = getRuntime(runtimeName);
  const cacheDir = getSuperwardenCacheDir(args.repoPath, args.skill.name);
  const planCachePath = getCoordinatorPlanCachePath({
    skillName: args.skill.name,
    sourceHash: source.hash,
    model: args.model,
    cacheDir,
  });
  const planCacheHit = existsSync(planCachePath);
  const planMessage = args.planMessage ?? args.skill.description ?? args.skill.name;

  if (!args.json && !args.mode.isTTY) {
    args.onNonTTYPlanStep?.(planMessage);
  }

  const planStartedAt = performance.now();
  const runPlanSynthesis = () => synthesizeCoordinatorPlan({
    skill: args.skill,
    runtime,
    apiKey: args.apiKey,
    model: args.model,
    maxRetries: args.repairMaxRetries,
    regenerate: args.regenerate,
    abortController: args.abortController,
    cacheDir,
    repoPath: args.repoPath,
    repairModel: args.repairModel,
    repairMaxRetries: args.repairMaxRetries,
  });
  const planResult = args.json
    ? await runPlanSynthesis()
    : await runWithLiveStatus({
      mode: args.mode,
      verbosity: args.verbosity,
      message: planMessage,
      detail: [
        superwardenPlanStatusDetail(planCacheHit, args.regenerate),
        !planCacheHit || args.regenerate
          ? 'This can take a minute. Warden will cache the validated plan and tasks.'
          : undefined,
      ].filter((value): value is string => Boolean(value)).join(' '),
      task: runPlanSynthesis,
    });
  const planDurationMs = performance.now() - planStartedAt;
  const planBytes = fileSize(planResult.cachePath);

  args.onPlanReady?.({
    planResult,
    planBytes,
    planDurationMs,
    planCacheHit,
  });

  if (args.showPlanOnly) {
    return {
      skill: args.skill,
      source,
      cacheDir,
      planCachePath,
      planCacheHit,
      planResult,
      planBytes,
      planDurationMs,
      childArtifacts: [],
    };
  }

  args.onBeforeChildTasks?.({ planResult });

  const regenerateChildSkills = args.regenerate || planResult.source === 'generated';
  const childRoot = regenerateChildSkills
    ? resetCoordinatorChildSkillsRoot(planResult.cachePath)
    : ensureCoordinatorChildSkillsRoot(planResult.cachePath);
  const childStartedAt = performance.now();
  const childArtifacts: CoordinatorChildSkillArtifact[] = [];

  for (const [index, task] of planResult.plan.tasks.entries()) {
    const childMessage = args.childMessage?.({
      task,
      index,
      total: planResult.plan.tasks.length,
    }) ?? `${task.id} [${index + 1}/${planResult.plan.tasks.length}]`;
    if (!args.json && !args.mode.isTTY) {
      args.onNonTTYChildStep?.(childMessage);
    }

    const runChildSynthesis = () => synthesizeCoordinatorChildSkill({
      plan: planResult.plan,
      task,
      source,
      cachePath: planResult.cachePath,
      rootDir: childRoot,
      runtime,
      repoPath: args.repoPath,
      model: args.model,
      apiKey: args.apiKey,
      repairModel: args.repairModel,
      repairMaxRetries: args.repairMaxRetries,
      abortController: args.abortController,
      regenerate: regenerateChildSkills,
    });
    const artifact = args.json
      ? await runChildSynthesis()
      : await runWithLiveStatus({
        mode: args.mode,
        verbosity: args.verbosity,
        message: childMessage,
        task: runChildSynthesis,
      });
    childArtifacts.push(artifact);
    args.onChildArtifact?.({
      artifact,
      task,
      index,
      total: planResult.plan.tasks.length,
    });
  }

  return {
    skill: args.skill,
    source,
    cacheDir,
    planCachePath,
    planCacheHit,
    planResult,
    planBytes,
    planDurationMs,
    childRoot,
    childArtifacts,
    childSkills: buildCoordinatorChildSkillsResult(
      childRoot,
      childArtifacts,
      performance.now() - childStartedAt,
    ),
  };
}
