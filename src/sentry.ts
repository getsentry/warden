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
    ],
  });

  Sentry.setTag('deployment.context', context);
  Sentry.setTag('service.version', getVersion());
}

export { Sentry };
export const { logger } = Sentry;

export function emitSkillMetrics(report: SkillReport): void {
  if (!initialized) return;

  try {
    Sentry.metrics.distribution('skill.duration', report.durationMs ?? 0, {
      unit: 'millisecond',
      attributes: { skill: report.skill },
    });

    if (report.usage) {
      Sentry.metrics.distribution('tokens.input', report.usage.inputTokens, {
        unit: 'none',
        attributes: { skill: report.skill },
      });
      Sentry.metrics.distribution('tokens.output', report.usage.outputTokens, {
        unit: 'none',
        attributes: { skill: report.skill },
      });
      if (report.usage.costUSD) {
        Sentry.metrics.distribution('cost.usd', report.usage.costUSD, {
          attributes: { skill: report.skill },
        });
      }
    }

    Sentry.metrics.count('findings.total', report.findings.length, {
      attributes: { skill: report.skill },
    });
    for (const severity of Object.keys(SEVERITY_ORDER) as Severity[]) {
      const count = report.findings.filter((f) => f.severity === severity).length;
      if (count > 0) {
        Sentry.metrics.count('findings', count, {
          attributes: { skill: report.skill, severity },
        });
      }
    }
  } catch {
    // Metrics emission should never break the main workflow
  }
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
