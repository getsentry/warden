#!/usr/bin/env tsx
import { relative } from 'node:path';
import { parseArgs } from 'node:util';
import { createGitHubReader, scaffoldCase } from '../src/scaffold.js';

const USAGE = `usage: pnpm evals:security:add <github PR or commit URL> --skill <skill> [--name <slug>] [--force]

Writes cases/<skill>/<slug>.json (bug, at the fix's parent) and
cases/<skill>/<slug>-fixed.json (clean, at the fix). Targets are the non-test
.py/.ts files the fix modified.`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    skill: { type: 'string' },
    name: { type: 'string' },
    force: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
});
const [url] = positionals;
if (values.help || !url || !values.skill || positionals.length > 1) {
  console.log(USAGE);
  process.exit(values.help ? 0 : 2);
}

const result = await scaffoldCase({
  url,
  skill: values.skill,
  name: values.name,
  force: values.force,
  github: createGitHubReader(),
});
const cwd = process.env['INIT_CWD'] ?? process.cwd();
console.log(`Bug:   ${relative(cwd, result.bugPath)} @ ${result.bugRef}`);
console.log(`Clean: ${relative(cwd, result.cleanPath)} @ ${result.fixRef}`);
console.log(`Targets:\n${result.targets.map((target) => `  ${target}`).join('\n')}`);
if (result.skipped.length > 0) {
  console.log(`Skipped:\n${result.skipped.map((file) => `  ${file.path} (${file.reason})`).join('\n')}`);
}
console.log(`
Next:
  1. Replace the TODO summary in both files with the same sentence: the bug, where it lives, what an attacker gets.
  2. pnpm -C packages/security-evals test   (free; checks the pair, ids, and summary)
  3. pnpm evals:security --repo ${result.repository}=<clone> --skills-repo <warden-skills clone> \\
       --skills security-review,${values.skill} --entries ${result.bugId},${result.cleanId} --repeats 3`);
