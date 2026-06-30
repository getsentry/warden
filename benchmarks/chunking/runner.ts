#!/usr/bin/env tsx
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';

const DEFAULT_CASES = [
  'sentry-dashboard-axis-range-existing-widget',
  'sentry-cursor-service-account-api-key',
  'sentry-fixability-missing-issue-summary',
  'sentry-workflow-status-missing-foreign-key',
];

const PERFORMANCE_CASES = [
  {
    name: 'sentry-mcp-search-issues-period-30d',
    repository: 'getsentry/sentry-mcp',
    base: 'df680f28fa705c447679bb8e0afa3f24e72387e0',
    head: 'd4dbb32e7e05cd61024ec2adf06e53c358e77599',
  },
  {
    name: 'sentry-mcp-openrouter-provider',
    repository: 'getsentry/sentry-mcp',
    base: '032e7f6f28cd513699755920748bd10e9f429df5',
    head: 'c42ef54a1de9e3640fc74f3e209c15704d094329',
  },
  {
    name: 'sentry-mcp-ai-conversation-search',
    repository: 'getsentry/sentry-mcp',
    base: '3bcaf5fd1db4ab1b13270606cc8808c8fa3fffea',
    head: 'c11f3b9386ab33c4c85a90e8b9604bffafa14939',
  },
  {
    name: 'sentry-mcp-node-pnpm-baseline',
    repository: 'getsentry/sentry-mcp',
    base: '6e63abecbc732f61536f6df88a47a1fcde9d4c3e',
    head: '7567694fcd28c36a0ffd7312eb0fd746cabb97fe',
  },
  {
    name: 'sentry-mcp-issue-search-project-period-endpoint',
    repository: 'getsentry/sentry-mcp',
    base: 'df680f28fa705c447679bb8e0afa3f24e72387e0',
    head: '609a52120e0356da333280f301e9a41fcb55256e',
  },
  {
    name: 'sentry-mcp-ai-conversation-period-schema-default',
    repository: 'getsentry/sentry-mcp',
    base: 'df680f28fa705c447679bb8e0afa3f24e72387e0',
    head: 'd4c8ec34cb1643d9a569ad7dd85a3ab653353511',
  },
  {
    name: 'sentry-mcp-ai-conversation-absolute-range-period-conflict',
    repository: 'getsentry/sentry-mcp',
    base: 'df680f28fa705c447679bb8e0afa3f24e72387e0',
    head: 'e5df63d64bef3140deb88c8c80701f0583348afc',
  },
  {
    name: 'warden-split-pr-workflow',
    repository: 'getsentry/warden',
    base: '86699d45ec2ba2743f0a0c13dba46628ddaeeeb9',
    head: 'df091dd43664d40ab9cf55c4407d5749c1ecc295',
  },
  {
    name: 'warden-global-scan-policy-limits',
    repository: 'getsentry/warden',
    base: '60bb7855a42922d5e36fbc30509ed5787caa9861',
    head: 'ecf3162593bf019328b400c40500070c5f6af933',
  },
  {
    name: 'warden-remove-suggested-fix',
    repository: 'getsentry/warden',
    base: '876e1689996a6f599e5c64d81cb039fa4fbdf726',
    head: 'bd8a4134197734cd843432ca9a349d16565467cc',
  },
  {
    name: 'warden-hoist-skills',
    repository: 'getsentry/warden',
    base: '7849f77b36c2ec3e024702007f39a7676a879d6d',
    head: '36fcd770e9f9200961614043fcd0c76c62869ed4',
  },
] as const;

const DEFAULT_MODEL = 'openrouter/anthropic/claude-sonnet-4.6';
const DEFAULT_RUNTIME = 'pi';

const BenchmarkFindingSchema = z.object({
  title: z.string().optional(),
  severity: z.string().optional(),
  confidence: z.string().optional(),
  location: z.object({
    path: z.string(),
    startLine: z.number().optional(),
    endLine: z.number().optional(),
  }).optional(),
}).passthrough();

const ChunkRecordSchema = z.object({
  run: z.object({
    durationMs: z.number().optional(),
  }).optional(),
  chunk: z.object({
    lineRange: z.string().optional(),
  }).optional(),
  status: z.string().optional(),
  findings: z.array(BenchmarkFindingSchema).optional(),
  usageBreakdown: z.object({
    scan: z.object({
      usage: z.object({
        inputTokens: z.number().optional(),
        outputTokens: z.number().optional(),
        costUSD: z.number().optional(),
      }).optional(),
    }).optional(),
  }).optional(),
}).passthrough();

const HistoricalScenarioSchema = z.object({
  notes: z.object({
    repository: z.string().optional(),
    source: z.string().optional(),
    source_ref: z.string().optional(),
  }).optional(),
  should_find: z.array(z.object({
    finding: z.string(),
  })),
}).passthrough();

interface Args {
  suite: 'historical' | 'performance';
  mode: 'nonsemantic' | 'semantic' | 'both';
  sentryRepo?: string;
  sentryMcpRepo: string;
  wardenRepo: string;
  cases: string[];
  output: string;
  artifactsDir: string;
  model: string;
  runtime: string;
  keepWorktrees: boolean;
}

interface BenchmarkCase {
  name: string;
  repository: string;
  fixCommit: string;
  vulnerableCommit: string;
  expectedFindings: string[];
}

interface PerformanceCase {
  name: string;
  repository: string;
  base: string;
  head: string;
}

interface RunSummary {
  semantic: boolean;
  complete: boolean;
  outputPath: string;
  exitCode: number;
  expectedFindingMatched: boolean | null;
  scannerChunks: number;
  completedScannerChunks: number;
  skippedScannerChunks: number;
  failedScannerChunks: number;
  findings: z.infer<typeof BenchmarkFindingSchema>[];
  durationMs: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
  };
}

function usage(exitCode = 2): never {
  const text = [
    'usage: pnpm exec tsx benchmarks/chunking/runner.ts [options]',
    '',
    'Options:',
    '  --suite <name>          historical or performance (default: historical)',
    '  --mode <name>           nonsemantic, semantic, or both (default: both)',
    '  --sentry-repo <path>    Existing getsentry/sentry checkout for historical cases',
    '  --sentry-mcp-repo <path> Existing getsentry/sentry-mcp checkout for performance cases',
    '  --warden-repo <path>    Existing getsentry/warden checkout for performance cases',
    '  --case <name>           Run one case; repeatable (default: initial four cases)',
    '  --output <path>         Summary JSON path (default: /tmp/warden-chunking-benchmark.json)',
    '  --artifacts-dir <path>  Raw JSONL artifact directory (default: /tmp/warden-chunking-benchmark-artifacts)',
    '  --model <model>         Model override',
    '  --runtime <runtime>     Runtime override',
    '  --keep-worktrees        Keep temporary synthetic worktrees',
    '  -h, --help              Show this help',
  ].join('\n');
  if (exitCode === 0) console.log(text);
  else console.error(text);
  process.exit(exitCode);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    suite: 'historical',
    mode: 'both',
    cases: [],
    sentryMcpRepo: '/home/dcramer/src/sentry-mcp',
    wardenRepo: resolve(import.meta.dirname, '../..'),
    output: '/tmp/warden-chunking-benchmark.json',
    artifactsDir: '/tmp/warden-chunking-benchmark-artifacts',
    model: process.env['WARDEN_BENCHMARK_MODEL'] ?? DEFAULT_MODEL,
    runtime: process.env['WARDEN_BENCHMARK_RUNTIME'] ?? DEFAULT_RUNTIME,
    keepWorktrees: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;

    if (arg === '-h' || arg === '--help') usage(0);
    else if (arg === '--suite') {
      const suite = argv[++i];
      if (suite !== 'historical' && suite !== 'performance') usage();
      args.suite = suite;
    } else if (arg === '--mode') {
      const mode = argv[++i];
      if (mode !== 'nonsemantic' && mode !== 'semantic' && mode !== 'both') usage();
      args.mode = mode;
    } else if (arg === '--sentry-repo') args.sentryRepo = resolve(argv[++i] ?? usage());
    else if (arg === '--sentry-mcp-repo') args.sentryMcpRepo = resolve(argv[++i] ?? usage());
    else if (arg === '--warden-repo') args.wardenRepo = resolve(argv[++i] ?? usage());
    else if (arg === '--case') args.cases.push(argv[++i] ?? usage());
    else if (arg === '--output') args.output = resolve(argv[++i] ?? usage());
    else if (arg === '--artifacts-dir') args.artifactsDir = resolve(argv[++i] ?? usage());
    else if (arg === '--model') args.model = argv[++i] ?? usage();
    else if (arg === '--runtime') args.runtime = argv[++i] ?? usage();
    else if (arg === '--keep-worktrees') args.keepWorktrees = true;
    else usage();
  }

  if (args.suite === 'historical' && !args.sentryRepo) usage();
  if (args.cases.length === 0) {
    args.cases = args.suite === 'historical'
      ? [...DEFAULT_CASES]
      : PERFORMANCE_CASES.map((benchmarkCase) => benchmarkCase.name);
  }
  return args;
}

function execGit(repo: string, gitArgs: string[]): string {
  return execFileSync('git', gitArgs, {
    cwd: repo,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function fixCommitFromSource(source?: string): string | undefined {
  return source?.match(/[0-9a-f]{40}/i)?.[0];
}

function loadBenchmarkCase(name: string): BenchmarkCase {
  const scenarioDir = resolve(import.meta.dirname, '../../packages/evals/code-review');
  const filePath = readdirSync(scenarioDir)
    .map((file) => join(scenarioDir, file))
    .find((file) => file.endsWith(`/${name}.json`));
  if (!filePath) {
    throw new Error(`Unknown code-review eval case: ${name}`);
  }

  const scenario = HistoricalScenarioSchema.parse(JSON.parse(readFileSync(filePath, 'utf8')));
  const fixCommit = fixCommitFromSource(scenario.notes?.source);
  const vulnerableCommit = scenario.notes?.source_ref;
  const repository = scenario.notes?.repository;

  if (!fixCommit || !vulnerableCommit || repository !== 'getsentry/sentry') {
    throw new Error(`Case ${name} does not have getsentry/sentry fix/source refs`);
  }

  return {
    name,
    repository,
    fixCommit,
    vulnerableCommit,
    expectedFindings: scenario.should_find.map((item) => item.finding),
  };
}

function createBenchmarkWorktree(sourceRepo: string, benchmarkCase: BenchmarkCase): string {
  const worktree = mkdtempSync(join(tmpdir(), `warden-chunking-${benchmarkCase.name}-`));
  execGit(sourceRepo, ['worktree', 'add', '--detach', worktree, benchmarkCase.fixCommit]);
  execGit(worktree, ['config', 'commit.gpgsign', 'false']);
  execGit(worktree, ['config', 'tag.gpgsign', 'false']);
  execGit(worktree, ['config', 'user.name', 'Warden Benchmark']);
  execGit(worktree, ['config', 'user.email', 'warden-benchmark@example.com']);
  const reverse = spawnSync('git', ['diff', `${benchmarkCase.vulnerableCommit}..${benchmarkCase.fixCommit}`, '--binary'], {
    cwd: worktree,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (reverse.status !== 0) {
    throw new Error(`Failed to create reverse diff for ${benchmarkCase.name}: ${reverse.stderr}`);
  }
  const apply = spawnSync('git', ['apply', '--reverse', '--index'], {
    cwd: worktree,
    input: reverse.stdout,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (apply.status !== 0) {
    throw new Error(`Failed to apply reverse diff for ${benchmarkCase.name}: ${apply.stderr}`);
  }
  execGit(worktree, ['commit', '--no-verify', '-m', `benchmark: reintroduce ${benchmarkCase.name}`]);
  return worktree;
}

function writeBenchmarkConfig(path: string, semantic: boolean, model: string, runtime: string): string {
  const configPath = join(path, semantic ? 'warden.semantic.toml' : 'warden.nonsemantic.toml');
  writeFileSync(configPath, [
    'version = 1',
    '',
    '[defaults]',
    `runtime = "${runtime}"`,
    `model = "${model}"`,
    'failOn = "off"',
    'reportOn = "medium"',
    'minConfidence = "medium"',
    '',
    '[defaults.verification]',
    'enabled = false',
    '',
    '[defaults.chunking.semantic]',
    `enabled = ${semantic ? 'true' : 'false'}`,
    'maxChunks = 20',
    'maxChunkChars = 20000',
    'maxHunksPerChunk = 4',
    'maxChangedRangesPerChunk = 4',
    'maxEmbeddedDiffChars = 8000',
    'maxEmbeddedDiffChunks = 12',
    'maxEmbeddedDiffRanges = 12',
    'preferWholeFileBelowLines = 800',
    '',
    '[[skills]]',
    'name = "code-review"',
    'paths = ["**/*"]',
    '',
  ].join('\n'));
  return configPath;
}

function summarizeJsonl(path: string, exitCode: number): RunSummary {
  const findings: z.infer<typeof BenchmarkFindingSchema>[] = [];
  const usage = { inputTokens: 0, outputTokens: 0, costUSD: 0 };
  let scannerChunks = 0;
  let completedScannerChunks = 0;
  let skippedScannerChunks = 0;
  let failedScannerChunks = 0;
  let durationMs = 0;

  const content = existsSync(path) ? readFileSync(path, 'utf8').trim() : '';
  if (!content) {
    return {
      semantic: false,
      complete: exitCode === 0,
      outputPath: path,
      exitCode,
      expectedFindingMatched: null,
      scannerChunks,
      completedScannerChunks,
      skippedScannerChunks,
      failedScannerChunks,
      findings,
      durationMs,
      usage,
    };
  }

  for (const line of content.split('\n')) {
    const parsed = ChunkRecordSchema.safeParse(JSON.parse(line));
    if (!parsed.success) continue;
    const record = parsed.data;
    if (record.run?.durationMs) durationMs = Math.max(durationMs, record.run.durationMs);
    if (!record.chunk || record.chunk.lineRange === 'post-processing') continue;

    scannerChunks += 1;
    if (record.status === 'ok') completedScannerChunks += 1;
    else if (record.status === 'skipped') skippedScannerChunks += 1;
    else failedScannerChunks += 1;
    findings.push(...(record.findings ?? []));

    const scanUsage = record.usageBreakdown?.scan?.usage;
    usage.inputTokens += scanUsage?.inputTokens ?? 0;
    usage.outputTokens += scanUsage?.outputTokens ?? 0;
    usage.costUSD += scanUsage?.costUSD ?? 0;
  }

  return {
    semantic: false,
    complete: exitCode === 0 && failedScannerChunks === 0,
    outputPath: path,
    exitCode,
    expectedFindingMatched: null,
    scannerChunks,
    completedScannerChunks,
    skippedScannerChunks,
    failedScannerChunks,
    findings,
    durationMs,
    usage,
  };
}

function runWarden(args: Args, worktree: string, benchmarkCase: { name: string; base: string }, semantic: boolean): RunSummary {
  const config = writeBenchmarkConfig(worktree, semantic, args.model, args.runtime);
  const outputPath = join(args.artifactsDir, `${benchmarkCase.name}.${semantic ? 'semantic' : 'nonsemantic'}.jsonl`);
  const cliArgs = [
    'cli',
    '--',
    'run',
    `${benchmarkCase.base}..HEAD`,
    '-C',
    worktree,
    '--skill',
    'code-review',
    '-c',
    config,
    '--runtime',
    args.runtime,
    '--model',
    args.model,
    '--output',
    outputPath,
    '--log',
    '--no-color',
  ];
  const result = spawnSync('pnpm', cliArgs, {
    cwd: resolve(import.meta.dirname, '../..'),
    encoding: 'utf8',
    stdio: 'inherit',
  });

  const summary = summarizeJsonl(outputPath, result.status ?? 1);
  summary.semantic = semantic;
  return summary;
}

function selectedModes(args: Args): boolean[] {
  if (args.mode === 'nonsemantic') return [false];
  if (args.mode === 'semantic') return [true];
  return [false, true];
}

function sourceRepoForPerformanceCase(args: Args, benchmarkCase: PerformanceCase): string {
  if (benchmarkCase.repository === 'getsentry/sentry-mcp') return args.sentryMcpRepo;
  if (benchmarkCase.repository === 'getsentry/warden') return args.wardenRepo;
  throw new Error(`No source repo configured for ${benchmarkCase.repository}`);
}

function loadPerformanceCase(name: string): PerformanceCase {
  const benchmarkCase = PERFORMANCE_CASES.find((item) => item.name === name);
  if (!benchmarkCase) throw new Error(`Unknown performance case: ${name}`);
  return benchmarkCase;
}

function createPerformanceWorktree(sourceRepo: string, benchmarkCase: PerformanceCase): string {
  const worktree = mkdtempSync(join(tmpdir(), `warden-performance-${benchmarkCase.name}-`));
  execGit(sourceRepo, ['worktree', 'add', '--detach', worktree, benchmarkCase.head]);
  return worktree;
}

const args = parseArgs(process.argv.slice(2));
mkdirSync(args.artifactsDir, { recursive: true });

const results = [];
if (args.suite === 'historical') {
  const sentryRepo = args.sentryRepo;
  if (!sentryRepo) usage();
  const cases = args.cases.map(loadBenchmarkCase);
  for (const benchmarkCase of cases) {
    console.log(`\n=== ${benchmarkCase.name} ===`);
    const worktree = createBenchmarkWorktree(sentryRepo, benchmarkCase);
    console.log(`Worktree: ${worktree}`);
    const runs: Record<string, RunSummary> = {};
    for (const semantic of selectedModes(args)) {
      runs[semantic ? 'semantic' : 'nonsemantic'] = runWarden(
        args,
        worktree,
        { name: benchmarkCase.name, base: benchmarkCase.fixCommit },
        semantic,
      );
    }
    results.push({
      case: benchmarkCase.name,
      repository: benchmarkCase.repository,
      base: benchmarkCase.fixCommit,
      head: benchmarkCase.vulnerableCommit,
      expectedFindings: benchmarkCase.expectedFindings,
      runs,
      worktree: args.keepWorktrees ? worktree : undefined,
    });
    if (!args.keepWorktrees) {
      execGit(sentryRepo, ['worktree', 'remove', '--force', worktree]);
    }
  }
} else {
  const cases = args.cases.map(loadPerformanceCase);
  for (const benchmarkCase of cases) {
    console.log(`\n=== ${benchmarkCase.name} ===`);
    const sourceRepo = sourceRepoForPerformanceCase(args, benchmarkCase);
    const worktree = createPerformanceWorktree(sourceRepo, benchmarkCase);
    console.log(`Worktree: ${worktree}`);
    const runs: Record<string, RunSummary> = {};
    for (const semantic of selectedModes(args)) {
      runs[semantic ? 'semantic' : 'nonsemantic'] = runWarden(
        args,
        worktree,
        { name: benchmarkCase.name, base: benchmarkCase.base },
        semantic,
      );
    }
    results.push({
      case: benchmarkCase.name,
      repository: benchmarkCase.repository,
      base: benchmarkCase.base,
      head: benchmarkCase.head,
      expectedFindings: [],
      runs,
      worktree: args.keepWorktrees ? worktree : undefined,
    });
    if (!args.keepWorktrees) {
      execGit(sourceRepo, ['worktree', 'remove', '--force', worktree]);
    }
  }
}

writeFileSync(args.output, JSON.stringify({
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  suite: args.suite,
  mode: args.mode,
  model: args.model,
  runtime: args.runtime,
  cases: results,
}, null, 2));

console.log(`\nWrote ${args.output}`);
