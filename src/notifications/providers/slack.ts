import type { Severity } from '../../types/index.js';
import { SEVERITY_ORDER } from '../../types/index.js';
import type { SlackNotificationConfig } from '../../config/schema.js';
import type { NotificationProvider, NotificationContext, NotificationResult } from '../types.js';

const MAX_FINDINGS_IN_MESSAGE = 10;

const SEVERITY_EMOJI: Record<Severity, string> = {
  critical: ':rotating_light:',
  high: ':warning:',
  medium: ':large_orange_diamond:',
  low: ':large_blue_diamond:',
  info: ':information_source:',
};

/**
 * Build Slack Block Kit payload for findings.
 */
export function buildSlackPayload(context: NotificationContext): Record<string, unknown> {
  const { findings, repository, commitSha, skillName } = context;
  const shortSha = commitSha.slice(0, 7);
  const repoName = `${repository.owner}/${repository.name}`;

  // Count by severity
  const counts: Partial<Record<Severity, number>> = {};
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  }

  const severitySummary = (Object.keys(SEVERITY_ORDER) as Severity[])
    .filter((s) => (counts[s] ?? 0) > 0)
    .map((s) => `${SEVERITY_EMOJI[s]} ${counts[s]} ${s}`)
    .join('  ');

  const blocks: Record<string, unknown>[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `Warden: ${findings.length} finding${findings.length === 1 ? '' : 's'}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Repo:* ${repoName}` },
        { type: 'mrkdwn', text: `*Commit:* \`${shortSha}\`` },
        { type: 'mrkdwn', text: `*Skill:* ${skillName}` },
        { type: 'mrkdwn', text: `*Summary:* ${severitySummary}` },
      ],
    },
    { type: 'divider' },
  ];

  // Add finding details (capped)
  const displayed = findings.slice(0, MAX_FINDINGS_IN_MESSAGE);
  for (const finding of displayed) {
    const loc = finding.location
      ? `\`${finding.location.path}:${finding.location.startLine}\``
      : '_no location_';

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${SEVERITY_EMOJI[finding.severity]} *${finding.title}*\n${loc}\n${finding.description.slice(0, 200)}`,
      },
    });
  }

  if (findings.length > MAX_FINDINGS_IN_MESSAGE) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `_...and ${findings.length - MAX_FINDINGS_IN_MESSAGE} more finding${findings.length - MAX_FINDINGS_IN_MESSAGE === 1 ? '' : 's'}_`,
        },
      ],
    });
  }

  return { blocks };
}

export class SlackProvider implements NotificationProvider {
  readonly name = 'slack';
  private readonly webhookUrl: string;

  constructor(config: SlackNotificationConfig) {
    this.webhookUrl = config.webhookUrl;
  }

  async notify(context: NotificationContext): Promise<NotificationResult> {
    const result: NotificationResult = {
      provider: this.name,
      sent: 0,
      skipped: 0,
      errors: [],
    };

    if (context.findings.length === 0) {
      return result;
    }

    const payload = buildSlackPayload(context);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        result.errors.push(`Slack webhook returned ${response.status}: ${text}`);
      } else {
        result.sent = context.findings.length;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Slack webhook failed: ${message}`);
    }

    return result;
  }
}
