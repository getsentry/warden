#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importBenchmarkResults } from '../src/baseline.js';
import { loadCorpusEntries } from '../src/entries.js';
import { DEFAULT_BASELINE } from '../src/options.js';
import { serializeResults } from '../src/results.js';

// usage: pnpm -C packages/security-evals import-benchmark <result.json>...
// Writes baseline/results.json from scored corpus benchmark results.
const cwd = process.env['INIT_CWD'] ?? process.cwd();
const files = process.argv.slice(2).map((path) => JSON.parse(readFileSync(resolve(cwd, path), 'utf8')) as unknown);
if (files.length === 0) {
  console.error('usage: import-benchmark <packages/docs/src/data/benchmarking/results/*.json>...');
  process.exit(2);
}
const results = importBenchmarkResults(loadCorpusEntries(), files);
writeFileSync(DEFAULT_BASELINE, serializeResults(results));
console.log(`Wrote ${DEFAULT_BASELINE}`);
