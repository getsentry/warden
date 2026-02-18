import { applySuppression } from '../suppressions/matcher.js';
import type { SuppressionRule } from '../suppressions/types.js';
import type { NotificationProvider, NotificationContext, NotificationResult } from './types.js';
import type { Finding, SkillReport } from '../types/index.js';

export interface DispatchContext {
  findings: Finding[];
  reports: SkillReport[];
  repository: { owner: string; name: string };
  commitSha: string;
  skillName: string;
}

export interface DispatchResult {
  suppressed: number;
  results: NotificationResult[];
}

/**
 * Orchestrates suppression filtering and sequential provider execution.
 */
export class NotificationDispatcher {
  constructor(
    private readonly providers: NotificationProvider[],
    private readonly suppressions: SuppressionRule[]
  ) {}

  async dispatch(context: DispatchContext): Promise<DispatchResult> {
    // Apply suppressions
    const filtered = applySuppression(
      context.findings,
      this.suppressions,
      context.skillName
    );
    const suppressed = context.findings.length - filtered.length;

    if (suppressed > 0) {
      console.log(`Suppressed ${suppressed} finding${suppressed === 1 ? '' : 's'} via rules`);
    }

    // Build the notification context with filtered findings
    const notificationContext: NotificationContext = {
      findings: filtered,
      reports: context.reports,
      repository: context.repository,
      commitSha: context.commitSha,
      skillName: context.skillName,
    };

    // Execute providers sequentially
    const results: NotificationResult[] = [];
    for (const provider of this.providers) {
      try {
        const result = await provider.notify(notificationContext);
        results.push(result);

        if (result.sent > 0) {
          console.log(`${provider.name}: sent ${result.sent} notification${result.sent === 1 ? '' : 's'}`);
        }
        if (result.skipped > 0) {
          console.log(`${provider.name}: skipped ${result.skipped} (already tracked)`);
        }
        for (const error of result.errors) {
          console.error(`${provider.name}: ${error}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`${provider.name}: unexpected error: ${message}`);
        results.push({
          provider: provider.name,
          sent: 0,
          skipped: 0,
          errors: [message],
        });
      }
    }

    return { suppressed, results };
  }
}
