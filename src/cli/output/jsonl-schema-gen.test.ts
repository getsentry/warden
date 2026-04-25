import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { renderJsonlJsonSchema } from './jsonl-schema-gen.js';

const SPEC_PATH = resolve(fileURLToPath(new URL('../../../specs/jsonl-schema.json', import.meta.url)));

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
});
