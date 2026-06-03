import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { renderJsonlJsonSchema } from './jsonl-schema-gen.js';

const SPEC_PATH = resolve(fileURLToPath(new URL('../../../../../specs/jsonl-schema.json', import.meta.url)));

describe('jsonl-schema-gen', () => {
  it('committed specs/jsonl-schema.json matches generator output', () => {
    const committed = readFileSync(SPEC_PATH, 'utf-8');
    const regenerated = renderJsonlJsonSchema();
    if (committed !== regenerated) {
      throw new Error(
        'specs/jsonl-schema.json is out of sync with Zod schemas. ' +
          'Run `pnpm generate:jsonl-schema` and commit the result.',
      );
    }
    expect(regenerated).toBe(committed);
  });

  it('keeps usage breakdown totals strict in the generated schema', () => {
    const schema = JSON.parse(renderJsonlJsonSchema()) as {
      $defs?: Record<string, {
        properties?: Record<string, unknown>;
        required?: string[];
        anyOf?: { required?: string[] }[];
      }>;
    };
    const usageBreakdown = schema.$defs?.['UsageBreakdown'];
    const usageBreakdownEntry = schema.$defs?.['UsageBreakdownEntry'];
    const chunkRecord = schema.$defs?.['ChunkRecord'];
    const summaryRecord = schema.$defs?.['SummaryRecord'];

    expect(usageBreakdownEntry?.required).toContain('usage');
    expect(usageBreakdown?.required).toContain('total');
    expect(usageBreakdown?.anyOf).toEqual([
      { required: ['scan'] },
      { required: ['auxiliary'] },
    ]);
    expect(chunkRecord?.properties).toHaveProperty('usageBreakdown');
    expect(chunkRecord?.properties).not.toHaveProperty('usage');
    expect(chunkRecord?.properties).not.toHaveProperty('auxiliaryUsage');
    expect(summaryRecord?.properties).toHaveProperty('usageBreakdown');
    expect(summaryRecord?.properties).not.toHaveProperty('usage');
    expect(summaryRecord?.properties).not.toHaveProperty('auxiliaryUsage');
  });
});
