#!/usr/bin/env tsx
import { resolve } from 'node:path';
import {
  scaffoldEvalFromGitHubPullRequest,
  type ScaffoldEvalOptions,
} from '../src/scaffold.js';

interface Args {
  url?: string;
  category: string;
  side: 'base' | 'head';
  name?: string;
  evalsDir: string;
  force: boolean;
}

function usage(exitCode = 2): never {
  const output = [
    'usage: pnpm evals:scaffold <github-pr-url> [options]',
    '',
    'Options:',
    '  -h, --help         Show this help',
    '  --category <name>   Eval category directory (default: security-review)',
    '  --side <base|head>  Which PR side to copy fixtures from (default: base)',
    '  --name <slug>       Scenario name (default: slugified PR title)',
    '  --evals-dir <path>  Evals package root (default: packages/evals)',
    '  --force             Overwrite existing generated files',
  ].join('\n');

  if (exitCode === 0) {
    console.log(output);
  } else {
    console.error(output);
  }
  process.exit(exitCode);
}

function parseArgs(argv: string[]): ScaffoldEvalOptions {
  const args: Args = {
    category: 'security-review',
    side: 'base',
    evalsDir: resolve(process.cwd()),
    force: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;

    if (arg === '--help' || arg === '-h') {
      usage(0);
    } else if (arg === '--category') {
      args.category = argv[++i] ?? usage();
    } else if (arg === '--side') {
      const side = argv[++i];
      if (side !== 'base' && side !== 'head') {
        usage();
      }
      args.side = side;
    } else if (arg === '--name') {
      args.name = argv[++i] ?? usage();
    } else if (arg === '--evals-dir') {
      args.evalsDir = resolve(process.cwd(), argv[++i] ?? usage());
    } else if (arg === '--force') {
      args.force = true;
    } else if (arg.startsWith('--')) {
      usage();
    } else if (!args.url) {
      args.url = arg;
    } else {
      usage();
    }
  }

  if (!args.url) {
    usage();
  }

  return { ...args, url: args.url };
}

const args = parseArgs(process.argv.slice(2));
const result = await scaffoldEvalFromGitHubPullRequest(args);

console.log(`Created eval: ${result.name}`);
console.log(`Source: ${result.repository}@${result.sourceRef}`);
console.log(`Scenario: ${result.scenarioPath}`);
console.log('Fixtures:');
for (const file of result.files) {
  console.log(`  ${file.fixturePath} <- ${file.sourcePath}@${file.ref}`);
}
if (result.supportingFiles.length > 0) {
  console.log('Supporting fixtures:');
  for (const file of result.supportingFiles) {
    console.log(`  ${file.fixturePath} <- ${file.sourcePath}@${file.ref}`);
  }
}
if (result.skippedFiles.length > 0) {
  console.log('Skipped:');
  for (const file of result.skippedFiles) {
    console.log(`  ${file.sourcePath} (${file.reason})`);
  }
}
console.log('');
console.log('Next: replace the TODO should_find entry with the exact expected finding.');
