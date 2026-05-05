import type { SkillDefinition } from '../config/schema.js';
import { emitDedupMetrics, emitFixGateMetrics, logger } from '../sentry.js';
import type { Finding } from '../types/index.js';
import { deduplicateFindings, mergeCrossLocationFindings } from './extract.js';
import { sanitizeFindingsSuggestedFixes } from './fix-quality.js';
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
      runtime: options.runtime,
      model: options.auxiliaryModel,
      maxTurns: options.maxTurns,
      abortController: options.abortController,
      pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
      prContext: options.prContext,
      onFindingProcessing: options.onFindingProcessing,
    });
    currentFindings = verification.findings;
    if (verification.usage) {
      auxiliaryUsage.push({ agent: 'verification', usage: verification.usage });
    }
  }

  const mergeResult = await mergeCrossLocationFindings(currentFindings, {
    apiKey: options.apiKey,
    repoPath: options.repoPath,
    runtime: options.runtime,
    model: options.synthesisModel,
    maxRetries: options.auxiliaryMaxRetries,
    onFindingProcessing: options.onFindingProcessing,
  });
  currentFindings = mergeResult.findings;
  if (mergeResult.usage) {
    auxiliaryUsage.push({ agent: 'merge', usage: mergeResult.usage });
  }

  const sanitized = await sanitizeFindingsSuggestedFixes(currentFindings, {
    repoPath: options.repoPath,
    apiKey: options.apiKey,
    runtime: options.runtime,
    model: options.auxiliaryModel,
    maxRetries: options.auxiliaryMaxRetries,
    onFindingProcessing: options.onFindingProcessing,
  });
  currentFindings = sanitized.findings;
  if (sanitized.usage) {
    auxiliaryUsage.push({ agent: 'fix_gate', usage: sanitized.usage });
  }

  emitFixGateMetrics(
    options.skill.name,
    sanitized.stats.checked,
    sanitized.stats.strippedDeterministic,
    sanitized.stats.strippedSemantic,
    sanitized.stats.semanticUnavailable
  );
  if (sanitized.stats.checked > 0) {
    logger.info('Suggested fix quality gate', {
      'fix_gate.checked': sanitized.stats.checked,
      'fix_gate.stripped_deterministic': sanitized.stats.strippedDeterministic,
      'fix_gate.stripped_semantic': sanitized.stats.strippedSemantic,
      'fix_gate.semantic_unavailable': sanitized.stats.semanticUnavailable,
    });
  }

  return { findings: currentFindings, auxiliaryUsage };
}
