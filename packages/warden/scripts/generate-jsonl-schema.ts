/**
 * Regenerate specs/jsonl-schema.json from the Zod source.
 *
 * Usage: pnpm generate:jsonl-schema
 */

import { writeFileSync } from 'node:fs';
import { renderJsonlJsonSchema } from '../src/cli/output/jsonl-schema-gen.js';

const OUTPUT_PATH = new URL('../../../specs/jsonl-schema.json', import.meta.url);

writeFileSync(OUTPUT_PATH, renderJsonlJsonSchema());
console.log(`Wrote ${OUTPUT_PATH.pathname}`);
