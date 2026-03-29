import { createHash } from 'node:crypto';
import type { Finding } from '../types/index.js';

export type FindingTelemetryStage =
  | 'initial'
  | 'report_deduped'
  | 'report_merged'
  | 'report_final'
  | 'review_filtered'
  | 'review_consolidated'
  | 'review_deduped'
  | 'review_posted';

type SpanAttributeValue =
  | string
  | number
  | boolean
  | (string | null | undefined)[]
  | (number | null | undefined)[]
  | (boolean | null | undefined)[];

export type SpanAttributes = Record<string, SpanAttributeValue | undefined>;

export interface ActiveSpanIds {
  traceId: string;
  spanId: string;
}

export interface FindingTelemetryContext {
  skill?: string;
  triggerName?: string;
  parentTraceId?: string;
  parentSpanId?: string;
}

type FindingTelemetryMode = 'full' | 'references';

const FINDING_TELEMETRY_MODE: Record<FindingTelemetryStage, FindingTelemetryMode> = {
  initial: 'full',
  report_deduped: 'references',
  report_merged: 'references',
  report_final: 'full',
  review_filtered: 'references',
  review_consolidated: 'references',
  review_deduped: 'references',
  review_posted: 'full',
};

export function getFindingFingerprint(finding: Finding): string {
  const location = finding.location
    ? `${finding.location.path}:${finding.location.startLine}:${finding.location.endLine ?? ''}`
    : 'general';
  return createHash('sha1')
    .update([
      location,
      finding.severity,
      finding.confidence ?? '',
      finding.title,
      finding.description,
    ].join('\n'))
    .digest('hex');
}

export function buildFindingStageAttributes(
  stage: FindingTelemetryStage,
  findings: Finding[],
  context: FindingTelemetryContext = {},
  spanIds?: ActiveSpanIds
): SpanAttributes {
  const mode = FINDING_TELEMETRY_MODE[stage];
  const attrs: SpanAttributes = {
    'warden.findings.stage': stage,
    'warden.findings.count': findings.length,
    'warden.findings.trace_id': spanIds?.traceId,
    'warden.findings.span_id': spanIds?.spanId,
    'warden.findings.parent_trace_id': context.parentTraceId,
    'warden.findings.parent_span_id': context.parentSpanId,
    'warden.findings.skill': context.skill,
    'warden.findings.trigger_name': context.triggerName,
    'warden.findings.ids': findings.map((finding) => finding.id),
    'warden.findings.fingerprints': findings.map((finding) => getFindingFingerprint(finding)),
  };

  if (mode !== 'full') {
    return attrs;
  }

  findings.forEach((finding, index) => {
    const prefix = `warden.findings.${index}`;
    attrs[`${prefix}.id`] = finding.id;
    attrs[`${prefix}.fingerprint`] = getFindingFingerprint(finding);
    attrs[`${prefix}.severity`] = finding.severity;
    attrs[`${prefix}.confidence`] = finding.confidence;
    attrs[`${prefix}.title`] = finding.title;
    attrs[`${prefix}.elapsed_ms`] = finding.elapsedMs;
    attrs[`${prefix}.location.path`] = finding.location?.path;
    attrs[`${prefix}.location.start_line`] = finding.location?.startLine;
    attrs[`${prefix}.location.end_line`] = finding.location?.endLine;
    attrs[`${prefix}.has_suggested_fix`] = finding.suggestedFix !== undefined;
    attrs[`${prefix}.additional_locations.count`] = finding.additionalLocations?.length ?? 0;

    finding.additionalLocations?.forEach((location, locationIndex) => {
      const locationPrefix = `${prefix}.additional_locations.${locationIndex}`;
      attrs[`${locationPrefix}.path`] = location.path;
      attrs[`${locationPrefix}.start_line`] = location.startLine;
      attrs[`${locationPrefix}.end_line`] = location.endLine;
    });
  });

  return attrs;
}
