import {
  CodeRunEnvelopeSchema,
  FindingsRunEnvelopeSchema,
  MetricsRunEnvelopeSchema,
  RunProjectionSchema,
} from './protocol.js';
import type {
  CodeFindingRecord,
  FindingRecord,
  RunEnvelopeV1,
  RunProjection,
} from './protocol.js';

function findingWithoutCode(finding: CodeFindingRecord): FindingRecord {
  const {
    sourceEvidence: _sourceEvidence,
    ...record
  } = finding;
  return record;
}

function commonProjection(projection: ReturnType<typeof RunProjectionSchema.parse>) {
  const {
    dataProfile: _dataProfile,
    findings: _findings,
    observations: _observations,
    ...common
  } = projection;
  return common;
}

/** Build a strict wire envelope and remove fields forbidden by its declared data profile. */
export function redactRunProjection(input: RunProjection): RunEnvelopeV1 {
  const projection = RunProjectionSchema.parse(input);
  const common = commonProjection(projection);

  if (projection.dataProfile === 'metrics') {
    return MetricsRunEnvelopeSchema.parse({
      ...common,
      dataProfile: 'metrics',
    });
  }

  if (projection.dataProfile === 'findings') {
    return FindingsRunEnvelopeSchema.parse({
      ...common,
      dataProfile: 'findings',
      findings: projection.findings.map(findingWithoutCode),
      observations: projection.observations,
    });
  }

  return CodeRunEnvelopeSchema.parse({
    ...common,
    dataProfile: 'code',
    findings: projection.findings,
    observations: projection.observations,
  });
}
