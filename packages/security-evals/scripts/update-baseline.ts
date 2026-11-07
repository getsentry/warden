#!/usr/bin/env tsx
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadResultsFile, updateBaseline } from '../src/baseline.js';
import { DEFAULT_BASELINE } from '../src/options.js';
import { serializeResults } from '../src/results.js';

// usage: pnpm -C packages/security-evals baseline:update <results.json>
// Folds the lanes a run executed into baseline/results.json.
const [path] = process.argv.slice(2);
if (!path) {
  console.error('usage: baseline:update <results.json>');
  process.exit(2);
}
const run = loadResultsFile(resolve(process.env['INIT_CWD'] ?? process.cwd(), path));
const baseline = updateBaseline(loadResultsFile(DEFAULT_BASELINE), run);
writeFileSync(DEFAULT_BASELINE, serializeResults(baseline));
const lanes = Object.entries(run.lanes).filter(([, lane]) => !lane.fromBaseline).map(([skill]) => skill);
console.log(`Updated ${lanes.join(', ')} in ${DEFAULT_BASELINE}`);
