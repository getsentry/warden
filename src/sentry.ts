import * as Sentry from '@sentry/node';
import type { Severity, SkillReport } from './types/index.js';
import { SEVERITY_ORDER } from './types/index.js';
import { getVersion } from './utils/index.js';

export type SentryContext = 'cli' | 'action';

let initialized = false;

type TelemetryAttributes = Record<string, string | number | boolean>;

function getGitHubServerUrl(): string {
  const serverUrl = process.env['GITHUB_SERVER_URL'] || 'https://github.com';
  return serverUrl.replace(/\/+$/, '');
}

export function initSentry(context: SentryContext): void {
  const dsn = process.env['WARDEN_SENTRY_DSN'];
  if (!dsn || initialized) return;
  initialized = true;

  Sentry.init({
    dsn,
    release: `warden@${getVersion()}`,
    environment: context === 'action' ? 'github-action' : 'cli',
    tracesSampleRate: 1.0,
    enableLogs: true,
    integrations: [
      Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
      Sentry.anthropicAIIntegration({ recordInputs: true, recordOutputs: true }),
      Sentry.httpIntegration(),
    ],
  });

  Sentry.setTag('service.version', getVersion());
  Sentry.getGlobalScope().setAttributes({
    'warden.source': context === 'action' ? 'github-action' : 'cli',
  });
}

export { Sentry };
export const { logger } = Sentry;

/**
 * Set attributes on the global Sentry scope.
 * These automatically apply to ALL metrics and spans.
 */
export function setGlobalAttributes(attrs: TelemetryAttributes): void {
  if (!initialized) return;
  try {
    Sentry.getGlobalScope().setAttributes(attrs);
  } catch {
    // Never break the workflow
  }
}

/**
 * Set repository metadata on the global Sentry scope.
 */
export function setRepositoryScope(repository: string | undefined): void {
  if (!repository || !initialized) return;
  const [owner, name] = repository.split('/');
  const attrs: TelemetryAttributes = name
    ? {
        'vcs.owner.name': owner ?? '',
        'vcs.repository.name': name,
      }
    : {
        'vcs.repository.name': repository,
      };

  if (owner && name && owner !== 'local') {
    const serverUrl = getGitHubServerUrl();
    attrs['vcs.provider.name'] = 'github';
    attrs['vcs.repository.url.full'] = `${serverUrl}/${owner}/${name}`;
  }

  setGlobalAttributes(attrs);
}

/**
 * Set GitHub Actions metadata on the global Sentry scope.
 */
export function setGitHubActionScope(eventName: string | undefined): void {
  if (!initialized) return;

  const repository = process.env['GITHUB_REPOSITORY'];
  const runId = process.env['GITHUB_RUN_ID'];
  const serverUrl = getGitHubServerUrl();
  const attrs: TelemetryAttributes = {};

  if (eventName) {
    attrs['github.event.name'] = eventName;
  }
  if (process.env['GITHUB_WORKFLOW']) {
    attrs['cicd.pipeline.name'] = process.env['GITHUB_WORKFLOW'];
  }
  if (runId) {
    attrs['cicd.pipeline.run.id'] = runId;
  }
  if (repository && runId) {
    attrs['cicd.pipeline.run.url.full'] = `${serverUrl}/${repository}/actions/runs/${runId}`;
  }
  if (process.env['GITHUB_JOB']) {
    attrs['cicd.pipeline.task.name'] = process.env['GITHUB_JOB'];
  }

  if (Object.keys(attrs).length > 0) {
    setGlobalAttributes(attrs);
  }
}

/**
 * Get the trace ID from the active span, if available.
 * Useful for correlating runs to Sentry traces in logs and output.
 */
export function getTraceId(): string | undefined {
  if (!initialized) return undefined;
  try {
    return Sentry.getActiveSpan()?.spanContext().traceId;
  } catch {
    return undefined;
  }
}

/**
 * Run a metrics callback only when Sentry is initialized.
 * Swallows errors so metrics never break the main workflow.
 */
function safeEmit(fn: () => void): void {
  if (!initialized) return;
  try {
    fn();
  } catch {
    // Metrics emission should never break the main workflow
  }
}

/**
 * Build agent-scoped metric attributes that match span attribute names.
 */
function agentMetricAttributes(skill: string, model?: string): TelemetryAttributes {
  const attrs: TelemetryAttributes = { 'gen_ai.agent.name': skill };
  if (model) {
    attrs['gen_ai.request.model'] = model;
  }
  return attrs;
}

/**
 * Emit a single run count. Call once per analysis workflow execution.
 * Inherits warden.source, repository, and GitHub Actions attributes from global scope.
 */
export function emitRunMetric(): void {
  safeEmit(() => {
    Sentry.metrics.count('warden.workflow.runs', 1);
  });
}

export function emitSkillMetrics(report: SkillReport): void {
  safeEmit(() => {
    const attrs = agentMetricAttributes(report.skill, report.model);

    Sentry.metrics.distribution('warden.skill.duration', report.durationMs ?? 0, {
      unit: 'millisecond',
      attributes: attrs,
    });

    if (report.usage) {
      const tokenAttrs = {
        ...attrs,
        'gen_ai.operation.name': 'invoke_agent',
        'gen_ai.provider.name': 'anthropic',
      };
      Sentry.metrics.distribution('gen_ai.client.token.usage', report.usage.inputTokens, {
        unit: '{token}',
        attributes: { ...tokenAttrs, 'gen_ai.token.type': 'input' },
      });
      Sentry.metrics.distribution('gen_ai.client.token.usage', report.usage.outputTokens, {
        unit: '{token}',
        attributes: { ...tokenAttrs, 'gen_ai.token.type': 'output' },
      });
      if (report.usage.costUSD) {
        Sentry.metrics.distribution('warden.gen_ai.cost.usd', report.usage.costUSD, { attributes: attrs });
      }
    }

    for (const severity of Object.keys(SEVERITY_ORDER) as Severity[]) {
      const count = report.findings.filter((f) => f.severity === severity).length;
      if (count > 0) {
        Sentry.metrics.count('warden.findings', count, {
          attributes: { ...attrs, 'warden.finding.severity': severity },
        });
      }
    }
  });
}

export function emitExtractionMetrics(skill: string, method: 'regex' | 'llm' | 'none', count: number): void {
  safeEmit(() => {
    const attrs = { ...agentMetricAttributes(skill), 'warden.extraction.method': method };
    Sentry.metrics.count('warden.extraction.attempts', 1, { attributes: attrs });
    Sentry.metrics.count('warden.extraction.findings', count, { attributes: attrs });
  });
}

export function emitFixEvalMetrics(
  evaluated: number,
  resolved: number,
  failed: number,
  skipped: number,
  uniqueFindingsEvaluated: number,
  uniqueFindingsCodeChanged: number,
  uniqueFindingsResolved: number
): void {
  safeEmit(() => {
    Sentry.metrics.count('warden.fix_eval.evaluated', evaluated);
    Sentry.metrics.count('warden.fix_eval.resolved', resolved);
    Sentry.metrics.count('warden.fix_eval.failed', failed);
    Sentry.metrics.count('warden.fix_eval.skipped', skipped);
    Sentry.metrics.count('warden.fix_eval.unique_findings.evaluated', uniqueFindingsEvaluated);
    Sentry.metrics.count('warden.fix_eval.unique_findings.code_changed', uniqueFindingsCodeChanged);
    Sentry.metrics.count('warden.fix_eval.unique_findings.resolved', uniqueFindingsResolved);
  });
}

export function emitFixGateMetrics(
  skill: string,
  checked: number,
  strippedDeterministic: number,
  strippedSemantic: number,
  semanticUnavailable: number
): void {
  safeEmit(() => {
    const attrs = agentMetricAttributes(skill);
    Sentry.metrics.count('warden.fix_gate.checked', checked, { attributes: attrs });
    Sentry.metrics.count('warden.fix_gate.stripped_deterministic', strippedDeterministic, { attributes: attrs });
    Sentry.metrics.count('warden.fix_gate.stripped_semantic', strippedSemantic, { attributes: attrs });
    Sentry.metrics.count('warden.fix_gate.semantic_unavailable', semanticUnavailable, { attributes: attrs });
  });
}

export function emitRetryMetric(skill: string, attempt: number): void {
  safeEmit(() => {
    Sentry.metrics.count('warden.skill.retries', 1, {
      attributes: { ...agentMetricAttributes(skill), 'warden.retry.attempt': attempt },
    });
  });
}

export function emitDedupMetrics(skill: string, total: number, unique: number): void {
  safeEmit(() => {
    const attrs = agentMetricAttributes(skill);
    Sentry.metrics.distribution('warden.dedup.total', total, { attributes: attrs });
    Sentry.metrics.distribution('warden.dedup.unique', unique, { attributes: attrs });
    if (total > 0) {
      Sentry.metrics.distribution('warden.dedup.removed', total - unique, { attributes: attrs });
    }
  });
}

export function emitFixEvalVerdictMetric(verdict: string, skill?: string): void {
  safeEmit(() => {
    const attrs: TelemetryAttributes = { 'warden.fix_eval.verdict': verdict };
    if (skill) {
      Object.assign(attrs, agentMetricAttributes(skill));
    }
    Sentry.metrics.count('warden.fix_eval.verdict', 1, { attributes: attrs });
  });
}

export function emitStaleResolutionMetric(count: number, skill?: string): void {
  safeEmit(() => {
    const attrs = skill ? agentMetricAttributes(skill) : undefined;
    Sentry.metrics.count('warden.stale.resolved', count, attrs ? { attributes: attrs } : undefined);
  });
}

/**
 * Flush pending Sentry events. Safe to call even if Sentry is not initialized.
 */
export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (!initialized) return;
  try {
    await Sentry.flush(timeoutMs);
  } catch {
    // Sentry flush failure should not prevent normal operation
  }
}
