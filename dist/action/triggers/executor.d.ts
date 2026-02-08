/**
 * Trigger Executor
 *
 * Executes a single trigger and manages associated GitHub check runs.
 * Extracted from main.ts to enable isolated testing and clearer dependencies.
 */
import type { Octokit } from '@octokit/rest';
import type { ResolvedTrigger } from '../../config/loader.js';
import type { WardenConfig } from '../../config/schema.js';
import type { EventContext, SkillReport, SeverityThreshold } from '../../types/index.js';
import type { RenderResult, ReviewState } from '../../output/types.js';
/**
 * Dependencies required for trigger execution.
 * Making these explicit enables testing with mock implementations.
 */
export interface TriggerExecutorDeps {
    octokit: Octokit;
    context: EventContext;
    config: WardenConfig;
    anthropicApiKey: string;
    claudePath: string;
    previousReviewState: ReviewState | null;
    /** Global fail-on from action inputs (trigger-specific takes precedence) */
    globalFailOn?: SeverityThreshold;
    /** Global report-on from action inputs (trigger-specific takes precedence) */
    globalReportOn?: SeverityThreshold;
    /** Global max-findings from action inputs (trigger-specific takes precedence) */
    globalMaxFindings: number;
}
/**
 * Result from executing a single trigger.
 */
export interface TriggerResult {
    triggerName: string;
    report?: SkillReport;
    renderResult?: RenderResult;
    failOn?: SeverityThreshold;
    reportOn?: SeverityThreshold;
    reportOnSuccess?: boolean;
    checkRunUrl?: string;
    maxFindings?: number;
    previousReviewState?: ReviewState | null;
    error?: unknown;
}
/**
 * Execute a single trigger and return results.
 *
 * Handles:
 * - Creating/updating GitHub check runs
 * - Running the skill via Claude Code SDK
 * - Rendering results for GitHub review
 */
export declare function executeTrigger(trigger: ResolvedTrigger, deps: TriggerExecutorDeps): Promise<TriggerResult>;
//# sourceMappingURL=executor.d.ts.map