#!/usr/bin/env tsx
import { resolve } from 'node:path';
import { scaffoldEvalFromGitHubPullRequest } from '../src/evals/scaffold.js';

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
    '  --evals-dir <path>  Evals directory (default: ./evals)',
    '  --force             Overwrite existing generated files',
  ].join('\n');

  if (exitCode === 0) {
    console.log(output);
  } else {
    console.error(output);
  }
  process.exit(exitCode);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    category: 'security-review',
    side: 'base',
    evalsDir: resolve(process.cwd(), 'evals'),
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

  return args;
}

const args = parseArgs(process.argv.slice(2));
const result = await scaffoldEvalFromGitHubPullRequest(args);

console.log(`Created eval: ${result.name}`);
console.log(`Scenario: ${result.scenarioPath}`);
console.log('Fixtures:');
for (const file of result.files) {
  console.log(`  ${file.fixturePath} <- ${file.sourcePath}@${file.ref}`);
}
console.log('');
console.log('Next: replace the TODO should_find entry with the exact expected finding.');
