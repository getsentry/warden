import type { Effort, SkillDefinition } from '../config/schema.js';
import { emitDedupMetrics } from '../sentry.js';
import type { Finding } from '../types/index.js';
import { deduplicateFindings, mergeCrossLocationFindings } from './extract.js';
import type { PromptPRContext } from './prompt-sections.js';
import type { RuntimeName } from './runtimes/index.js';
import type { AuxiliaryUsageEntry, FindingProcessingEvent } from './types.js';
import { verifyFindings } from './verify.js';

export interface PostProcessFindingsOptions {
  skill: SkillDefinition;
  repoPath: string;
  apiKey?: string;
  runtime?: RuntimeName;
  auxiliaryModel?: string;
  synthesisModel?: string;
  auxiliaryMaxRetries?: number;
  verifyFindings?: boolean;
  maxTurns?: number;
  effort?: Effort;
  abortController?: AbortController;
  pathToClaudeCodeExecutable?: string;
  prContext?: PromptPRContext;
  onFindingProcessing?: (event: FindingProcessingEvent) => void;
}

export interface PostProcessFindingsResult {
  findings: Finding[];
  auxiliaryUsage: AuxiliaryUsageEntry[];
}

/**
 * Run the shared post-analysis finding pipeline.
 */
export async function postProcessFindings(
  findings: Finding[],
  options: PostProcessFindingsOptions
): Promise<PostProcessFindingsResult> {
  const auxiliaryUsage: AuxiliaryUsageEntry[] = [];

  const uniqueFindings = deduplicateFindings(findings, options.onFindingProcessing);
  emitDedupMetrics(options.skill.name, findings.length, uniqueFindings.length);

  let currentFindings = uniqueFindings;
  if (options.verifyFindings !== false) {
    const verification = await verifyFindings(currentFindings, {
      repoPath: options.repoPath,
      skill: options.skill,
      apiKey: options.apiKey,
      runtime: options.runtime,
      model: options.auxiliaryModel,
      maxTurns: options.maxTurns,
      effort: options.effort,
      abortController: options.abortController,
      pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
      prContext: options.prContext,
      onFindingProcessing: options.onFindingProcessing,
    });
    currentFindings = verification.findings;
    if (verification.usage) {
      auxiliaryUsage.push({
        agent: 'verification',
        usage: verification.usage,
        model: options.auxiliaryModel,
        runtime: options.runtime,
      });
    }
  }

  const mergeResult = await mergeCrossLocationFindings(currentFindings, {
    apiKey: options.apiKey,
    repoPath: options.repoPath,
    runtime: options.runtime,
    model: options.synthesisModel,
    maxRetries: options.auxiliaryMaxRetries,
    agentName: options.skill.name,
    onFindingProcessing: options.onFindingProcessing,
  });
  currentFindings = mergeResult.findings;
  if (mergeResult.usage) {
    auxiliaryUsage.push({
      agent: 'merge',
      usage: mergeResult.usage,
      model: options.synthesisModel,
      runtime: options.runtime,
    });
  }

  return { findings: currentFindings, auxiliaryUsage };
}
