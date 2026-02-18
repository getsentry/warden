import type { Finding, SkillReport } from '../types/index.js';

/**
 * Context passed to each notification provider.
 */
export interface NotificationContext {
  findings: Finding[];
  reports: SkillReport[];
  repository: { owner: string; name: string };
  commitSha: string;
  skillName: string;
}

/**
 * Result from a notification provider.
 */
export interface NotificationResult {
  provider: string;
  /** Number of notifications sent (e.g., issues created, messages posted) */
  sent: number;
  /** Number of findings skipped (e.g., already tracked, deduped) */
  skipped: number;
  errors: string[];
}

/**
 * Interface that all notification providers implement.
 */
export interface NotificationProvider {
  readonly name: string;
  notify(context: NotificationContext): Promise<NotificationResult>;
}
