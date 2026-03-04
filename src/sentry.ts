import * as Sentry from '@sentry/node';
import type { Severity, SkillReport } from './types/index.js';
import { SEVERITY_ORDER } from './types/index.js';
import { getVersion } from './utils/index.js';

export type SentryContext = 'cli' | 'action';

let initialized = false;

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
export function setGlobalAttributes(attrs: Record<string, string | number | boolean>): void {
  if (!initialized) return;
  try {
    Sentry.getGlobalScope().setAttributes(attrs);
  } catch {
    // Never break the workflow
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
 * Emit a single run count. Call once per analysis workflow execution.
 * Inherits warden.source and warden.repository from global scope.
 */
export function emitRunMetric(): void {
  safeEmit(() => {
    Sentry.metrics.count('workflow.runs', 1);
  });
}

export function emitSkillMetrics(report: SkillReport): void {
  safeEmit(() => {
    const attrs: Record<string, string> = { skill: report.skill };
    if (report.model) {
      attrs['model'] = report.model;
    }

    Sentry.metrics.distribution('skill.duration', report.durationMs ?? 0, {
      unit: 'millisecond',
      attributes: attrs,
    });

    if (report.usage) {
      Sentry.metrics.distribution('tokens.input', report.usage.inputTokens, {
        unit: 'none',
        attributes: attrs,
      });
      Sentry.metrics.distribution('tokens.output', report.usage.outputTokens, {
        unit: 'none',
        attributes: attrs,
      });
      if (report.usage.costUSD) {
        Sentry.metrics.distribution('cost.usd', report.usage.costUSD, { attributes: attrs });
      }
    }

    Sentry.metrics.count('findings.total', report.findings.length, { attributes: attrs });
    for (const severity of Object.keys(SEVERITY_ORDER) as Severity[]) {
      const count = report.findings.filter((f) => f.severity === severity).length;
      if (count > 0) {
        Sentry.metrics.count('findings', count, {
          attributes: { ...attrs, severity },
        });
      }
    }
  });
}

export function emitExtractionMetrics(skill: string, method: 'regex' | 'llm' | 'none', count: number): void {
  safeEmit(() => {
    const attrs = { skill, method };
    Sentry.metrics.count('extraction.attempts', 1, { attributes: attrs });
    Sentry.metrics.count('extraction.findings', count, { attributes: attrs });
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
    const attrs = { skill };
    Sentry.metrics.count('fix_gate.checked', checked, { attributes: attrs });
    Sentry.metrics.count('fix_gate.stripped_deterministic', strippedDeterministic, { attributes: attrs });
    Sentry.metrics.count('fix_gate.stripped_semantic', strippedSemantic, { attributes: attrs });
    Sentry.metrics.count('fix_gate.semantic_unavailable', semanticUnavailable, { attributes: attrs });
  });
}

export function emitRetryMetric(skill: string, attempt: number): void {
  safeEmit(() => {
    Sentry.metrics.count('skill.retries', 1, { attributes: { skill, attempt } });
  });
}

export function emitDedupMetrics(skill: string, total: number, unique: number): void {
  safeEmit(() => {
    const attrs = { skill };
    Sentry.metrics.distribution('dedup.total', total, { attributes: attrs });
    Sentry.metrics.distribution('dedup.unique', unique, { attributes: attrs });
    if (total > 0) {
      Sentry.metrics.distribution('dedup.removed', total - unique, { attributes: attrs });
    }
  });
}

export function emitFixEvalVerdictMetric(verdict: string, skill?: string): void {
  safeEmit(() => {
    const attrs: Record<string, string> = { verdict };
    if (skill) {
      attrs['skill'] = skill;
    }
    Sentry.metrics.count('warden.fix_eval.verdict', 1, { attributes: attrs });
  });
}

export function emitStaleResolutionMetric(count: number, skill?: string): void {
  safeEmit(() => {
    const attrs: Record<string, string> | undefined = skill ? { skill } : undefined;
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
