/**
 * Generator for specs/jsonl-schema.json.
 *
 * The formal JSON Schema for Warden's JSONL output is derived from the Zod
 * schemas (single source of truth). Running this produces a JSON string that
 * matches specs/jsonl-schema.json; a test asserts they stay in sync.
 */

import { z } from 'zod';
import {
  ErrorCodeSchema,
  SkillErrorSchema,
  HunkFailureSchema,
  FindingSchema,
  LocationSchema,
  SuggestedFixSchema,
  UsageStatsSchema,
  AuxiliaryUsageMapSchema,
  SkippedFileSchema,
  FileReportSchema,
  TraceSpanSchema,
  HunkTraceSchema,
} from '../../types/index.js';
import {
  JsonlRecordSchema,
  JsonlChunkRecordSchema,
  JsonlSummaryRecordSchema,
  JsonlFixEvaluationRecordSchema,
  JsonlRunMetadataSchema,
  JsonlFixEvalDetailSchema,
} from './jsonl.js';

/**
 * Build the full JSON Schema for Warden's JSONL output as a plain object.
 * Shared Zod schemas are registered by ID so they surface as `$defs` entries
 * with stable names instead of auto-numbered refs.
 */
export function buildJsonlJsonSchema(): Record<string, unknown> {
  const registry = z.registry<{ id: string }>();
  registry.add(ErrorCodeSchema, { id: 'ErrorCode' });
  registry.add(SkillErrorSchema, { id: 'SkillError' });
  registry.add(HunkFailureSchema, { id: 'HunkFailure' });
  registry.add(FindingSchema, { id: 'Finding' });
  registry.add(LocationSchema, { id: 'Location' });
  registry.add(SuggestedFixSchema, { id: 'SuggestedFix' });
  registry.add(UsageStatsSchema, { id: 'UsageStats' });
  registry.add(AuxiliaryUsageMapSchema, { id: 'AuxiliaryUsage' });
  registry.add(SkippedFileSchema, { id: 'SkippedFile' });
  registry.add(FileReportSchema, { id: 'FileRecord' });
  registry.add(TraceSpanSchema, { id: 'TraceSpan' });
  registry.add(HunkTraceSchema, { id: 'HunkTrace' });
  registry.add(JsonlRunMetadataSchema, { id: 'RunMetadata' });
  registry.add(JsonlFixEvalDetailSchema, { id: 'FixEvalDetail' });
  registry.add(JsonlChunkRecordSchema, { id: 'ChunkRecord' });
  registry.add(JsonlRecordSchema, { id: 'SkillRecord' });
  registry.add(JsonlSummaryRecordSchema, { id: 'SummaryRecord' });
  registry.add(JsonlFixEvaluationRecordSchema, { id: 'FixEvaluationRecord' });

  const union = z.union([
    JsonlChunkRecordSchema,
    JsonlRecordSchema,
    JsonlSummaryRecordSchema,
    JsonlFixEvaluationRecordSchema,
  ]);

  const generated = z.toJSONSchema(union, {
    metadata: registry,
    reused: 'ref',
    io: 'output',
  }) as Record<string, unknown>;

  // Strip the inline `id` property that z.toJSONSchema copies into each def
  // alongside the $defs key (redundant once keyed by id).
  const defs = (generated as { $defs?: Record<string, Record<string, unknown>> }).$defs;
  if (defs) {
    for (const def of Object.values(defs)) {
      delete def['id'];
    }
  }

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://warden.dev/schemas/jsonl-v1.json',
    title: 'Warden JSONL Output',
    description:
      'Schema for a single line in Warden\'s JSONL output. New run logs are homogeneous chunk records; legacy skill, summary, and fix-evaluation records remain parseable. Generated from packages/warden/src/cli/output/jsonl-schema-gen.ts — do not edit by hand.',
    ...generated,
  };
}

/** Render the JSON Schema as a stable, newline-terminated string. */
export function renderJsonlJsonSchema(): string {
  return JSON.stringify(buildJsonlJsonSchema(), null, 2) + '\n';
}
