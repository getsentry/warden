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
import { prepareFiles } from '../../packages/warden/src/sdk/prepare.js';
import type { EventContext, FileChange } from '../../packages/warden/src/types/index.js';

const DEFAULT_CASES = [
  'sentry-dashboard-axis-range-existing-widget',
  'sentry-cursor-service-account-api-key',
  'sentry-fixability-missing-issue-summary',
  'sentry-workflow-status-missing-foreign-key',
];

const RECALL_CASES = [
  {
    name: 'warden-error-cause-chain-regression',
    repository: 'getsentry/warden',
    skill: 'code-review',
    fixCommit: '9bf777889e554ac30216ebfbd1f15a68abf92529',
    vulnerableCommit: '9273d82be6582d78c4809c3b4317dba09bf1b58b',
    expectedFindings: [
      'Removing Error cause propagation loses original error details when git and runtime errors are rethrown.',
    ],
  },
  {
    name: 'sentry-slack-options-load-unscoped-group',
    repository: 'getsentry/sentry',
    skill: 'security-review',
    fixCommit: '0f09491755f71a95343285cbe17c93bf272a0d62',
    vulnerableCommit: 'c1bc01ad419ac251e153c81f212628221f8c0628',
    expectedFindings: [
      'Slack options-load resolves a Group by caller-controlled id without binding it to the requesting Slack integration organization.',
    ],
  },
  {
    name: 'sentry-preprod-snapshot-project-access',
    repository: 'getsentry/sentry',
    skill: 'security-review',
    fixCommit: '8fac324d82c903c8022b99dcd4329f3944e57196',
    vulnerableCommit: 'c1bc01ad419ac251e153c81f212628221f8c0628',
    expectedFindings: [
      'Preprod snapshot GET and DELETE load artifacts by organization only and do not check project access.',
    ],
  },
  {
    name: 'sentry-release-threshold-empty-project-filter',
    repository: 'getsentry/sentry',
    skill: 'security-review',
    fixCommit: '8a93913509441a0c8e7d035f9c4bc24dabed2d86',
    vulnerableCommit: '8f9fe309854228051dabac985fb813476a2a5b24',
    expectedFindings: [
      'ReleaseThreshold query omits project and organization scoping when accessible projects is empty.',
    ],
  },
  {
    name: 'sentry-replay-delete-read-scope',
    repository: 'getsentry/sentry',
    skill: 'security-review',
    fixCommit: '9bf0ea738cd7847438d4a2cfb1fbdbb326426e01',
    vulnerableCommit: 'c1bc01ad419ac251e153c81f212628221f8c0628',
    expectedFindings: [
      'Replay DELETE accepts project:read, allowing read-only project users to delete replay data.',
    ],
  },
] as const;

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
  type: z.string().optional(),
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
    total: z.object({
      usage: z.object({
        inputTokens: z.number().optional(),
        outputTokens: z.number().optional(),
        costUSD: z.number().optional(),
      }),
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
  effort?: string;
  keepWorktrees: boolean;
  profile: boolean;
  traces: boolean;
}

interface BenchmarkCase {
  name: string;
  repository: string;
  skill: string;
  fixCommit: string;
  vulnerableCommit: string;
  expectedFindings: string[];
}

interface PerformanceCase {
  name: string;
  repository: string;
  skill?: string;
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

function addUsage(
  target: RunSummary['usage'],
  usage: Partial<RunSummary['usage']> | undefined
): void {
  target.inputTokens += usage?.inputTokens ?? 0;
  target.outputTokens += usage?.outputTokens ?? 0;
  target.costUSD += usage?.costUSD ?? 0;
}

function normalizedTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[`'"]/g, '')
      .split(/[^a-z0-9:_-]+/)
      .filter((token) => token.length >= 4)
  );
}

function findingText(finding: z.infer<typeof BenchmarkFindingSchema>): string {
  const record = finding as Record<string, unknown>;
  return [
    finding.title,
    record['description'],
    record['verification'],
    finding.location?.path,
  ].filter((value): value is string => typeof value === 'string').join(' ');
}

function findingMatchesExpectation(
  finding: z.infer<typeof BenchmarkFindingSchema>,
  expected: string
): boolean {
  const expectedText = expected.toLowerCase();
  const actualText = findingText(finding).toLowerCase();
  if (actualText.includes(expectedText)) return true;

  const expectedTokens = normalizedTokens(expected);
  if (expectedTokens.size === 0) return false;
  const actualTokens = normalizedTokens(actualText);
  let matched = 0;
  for (const token of expectedTokens) {
    if (actualTokens.has(token)) matched += 1;
  }
  return matched / expectedTokens.size >= 0.45;
}

function expectedFindingsMatched(
  findings: z.infer<typeof BenchmarkFindingSchema>[],
  expectedFindings: string[]
): boolean | null {
  if (expectedFindings.length === 0) return null;
  return expectedFindings.every((expected) =>
    findings.some((finding) => findingMatchesExpectation(finding, expected))
  );
}

interface ChunkProfile {
  fileCount: number;
  skippedFileCount: number;
  scannerChunks: number;
  changedRanges: number;
  contentChars: number;
  files: {
    filename: string;
    chunks: number;
    changedRanges: number;
    contentChars: number;
    lineRanges: string[];
    contentModes: string[];
  }[];
  skippedFiles: {
    filename: string;
    reason: string;
    pattern?: string;
  }[];
}

function usage(exitCode = 2): never {
  const text = [
    'usage: pnpm exec tsx benchmarks/chunking/runner.ts [options]',
    '',
    'Options:',
    '  --suite <name>          historical or performance (default: historical)',
    '  --mode <name>           nonsemantic, semantic, or both (default: nonsemantic)',
    '  --sentry-repo <path>    Existing getsentry/sentry checkout for historical cases',
    '  --sentry-mcp-repo <path> Existing getsentry/sentry-mcp checkout for performance cases',
    '  --warden-repo <path>    Existing getsentry/warden checkout for performance cases',
    '  --case <name>           Run one case; repeatable (default: initial four cases)',
    '  --output <path>         Summary JSON path (default: /tmp/warden-chunking-benchmark.json)',
    '  --artifacts-dir <path>  Raw JSONL artifact directory (default: /tmp/warden-chunking-benchmark-artifacts)',
    '  --model <model>         Model override',
    '  --runtime <runtime>     Runtime override',
    '  --effort <level>        Effort override for scanner runs',
    '  --profile               Only prepare and summarize scanner chunks; do not run Warden',
    '  --traces                Capture per-chunk runtime traces in JSONL artifacts',
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
    mode: 'nonsemantic',
    cases: [],
    sentryMcpRepo: '/home/dcramer/src/sentry-mcp',
    wardenRepo: resolve(import.meta.dirname, '../..'),
    output: '/tmp/warden-chunking-benchmark.json',
    artifactsDir: '/tmp/warden-chunking-benchmark-artifacts',
    model: process.env['WARDEN_BENCHMARK_MODEL'] ?? DEFAULT_MODEL,
    runtime: process.env['WARDEN_BENCHMARK_RUNTIME'] ?? DEFAULT_RUNTIME,
    keepWorktrees: false,
    profile: false,
    traces: false,
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
    else if (arg === '--effort') args.effort = argv[++i] ?? usage();
    else if (arg === '--profile') args.profile = true;
    else if (arg === '--traces') args.traces = true;
    else if (arg === '--keep-worktrees') args.keepWorktrees = true;
    else usage();
  }

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
  const recallCase = RECALL_CASES.find((item) => item.name === name);
  if (recallCase) return { ...recallCase };

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
    skill: 'code-review',
    fixCommit,
    vulnerableCommit,
    expectedFindings: scenario.should_find.map((item) => item.finding),
  };
}

function createBenchmarkWorktree(sourceRepo: string, benchmarkCase: BenchmarkCase): string {
  const worktree = mkdtempSync(join(tmpdir(), `warden-chunking-${benchmarkCase.name}-`));
  execGit(sourceRepo, ['worktree', 'add', '--detach', worktree, benchmarkCase.fixCommit]);
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
  execGit(worktree, [
    '-c',
    'commit.gpgsign=false',
    '-c',
    'user.name=Warden Benchmark',
    '-c',
    'user.email=warden-benchmark@example.com',
    'commit',
    '--no-verify',
    '-m',
    `benchmark: reintroduce ${benchmarkCase.name}`,
  ]);
  return worktree;
}

function writeBenchmarkConfig(path: string, semantic: boolean, model: string, runtime: string, skill: string): string {
  const configPath = join(path, semantic ? 'warden.semantic.toml' : 'warden.nonsemantic.toml');
  const findingThreshold = skill === 'security-review' ? 'low' : 'medium';
  writeFileSync(configPath, [
    'version = 1',
    '',
    '[defaults]',
    `runtime = "${runtime}"`,
    `model = "${model}"`,
    'failOn = "off"',
    `reportOn = "${findingThreshold}"`,
    `minConfidence = "${findingThreshold}"`,
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
    '',
    '[[skills]]',
    `name = "${skill}"`,
    'paths = ["**/*"]',
    '',
  ].join('\n'));
  return configPath;
}

function summarizeJsonl(path: string, exitCode: number, expectedFindings: string[] = []): RunSummary {
  const findings: z.infer<typeof BenchmarkFindingSchema>[] = [];
  const usage = { inputTokens: 0, outputTokens: 0, costUSD: 0 };
  let summaryUsage: RunSummary['usage'] | undefined;
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
      expectedFindingMatched: expectedFindings.length > 0 ? false : null,
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
    if (record.type === 'summary') {
      const totalUsage = record.usageBreakdown?.total?.usage;
      if (totalUsage) {
        summaryUsage = {
          inputTokens: totalUsage.inputTokens ?? 0,
          outputTokens: totalUsage.outputTokens ?? 0,
          costUSD: totalUsage.costUSD ?? 0,
        };
      }
      continue;
    }

    addUsage(usage, record.usageBreakdown?.total?.usage);
    if (!record.chunk || record.chunk.lineRange === 'post-processing') continue;

    scannerChunks += 1;
    if (record.status === 'ok') completedScannerChunks += 1;
    else if (record.status === 'skipped') skippedScannerChunks += 1;
    else failedScannerChunks += 1;
    findings.push(...(record.findings ?? []));
  }

  return {
    semantic: false,
    complete: exitCode === 0 && failedScannerChunks === 0,
    outputPath: path,
    exitCode,
    expectedFindingMatched: expectedFindingsMatched(findings, expectedFindings),
    scannerChunks,
    completedScannerChunks,
    skippedScannerChunks,
    failedScannerChunks,
    findings,
    durationMs,
    usage: summaryUsage ?? usage,
  };
}

function runWarden(
  args: Args,
  worktree: string,
  benchmarkCase: { name: string; base: string; skill: string; expectedFindings?: string[] },
  semantic: boolean,
): RunSummary {
  const config = writeBenchmarkConfig(worktree, semantic, args.model, args.runtime, benchmarkCase.skill);
  const outputPath = join(args.artifactsDir, `${benchmarkCase.name}.${semantic ? 'semantic' : 'nonsemantic'}.jsonl`);
  const cliArgs = [
    'cli',
    '--',
    'run',
    `${benchmarkCase.base}..HEAD`,
    '-C',
    worktree,
    '--skill',
    benchmarkCase.skill,
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
  if (args.traces) {
    cliArgs.push('--traces');
  }
  if (args.effort) {
    cliArgs.push('--effort', args.effort);
  }
  const result = spawnSync('pnpm', cliArgs, {
    cwd: resolve(import.meta.dirname, '../..'),
    encoding: 'utf8',
    stdio: 'inherit',
  });

  const summary = summarizeJsonl(outputPath, result.status ?? 1, benchmarkCase.expectedFindings);
  summary.semantic = semantic;
  return summary;
}

function selectedModes(args: Args): boolean[] {
  if (args.mode === 'nonsemantic') return [false];
  if (args.mode === 'semantic') return [true];
  return [false, true];
}

function sourceRepoForPerformanceCase(args: Args, benchmarkCase: PerformanceCase): string {
  return sourceRepoForRepository(args, benchmarkCase.repository);
}

function sourceRepoForRepository(args: Args, repository: string): string {
  if (repository === 'getsentry/sentry') {
    if (!args.sentryRepo) throw new Error('Missing --sentry-repo for getsentry/sentry benchmark case');
    return args.sentryRepo;
  }
  if (repository === 'getsentry/sentry-mcp') return args.sentryMcpRepo;
  if (repository === 'getsentry/warden') return args.wardenRepo;
  throw new Error(`No source repo configured for ${repository}`);
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

function parseNumstat(repo: string, base: string): Map<string, { additions: number; deletions: number }> {
  const stats = new Map<string, { additions: number; deletions: number }>();
  const output = execGit(repo, ['diff', '--numstat', '--find-renames', `${base}..HEAD`]);
  if (!output) return stats;

  for (const line of output.split('\n')) {
    const [additionsRaw, deletionsRaw, ...pathParts] = line.split('\t');
    const filename = pathParts.at(-1);
    if (!filename) continue;
    stats.set(filename, {
      additions: Number.parseInt(additionsRaw ?? '0', 10) || 0,
      deletions: Number.parseInt(deletionsRaw ?? '0', 10) || 0,
    });
  }
  return stats;
}

function fileChangeStatus(rawStatus: string): FileChange['status'] {
  const status = rawStatus[0];
  if (status === 'A') return 'added';
  if (status === 'D') return 'removed';
  if (status === 'R') return 'renamed';
  if (status === 'C') return 'copied';
  return 'modified';
}

function readDiffFiles(repo: string, base: string): FileChange[] {
  const nameStatus = execGit(repo, ['diff', '--name-status', '--find-renames', `${base}..HEAD`]);
  if (!nameStatus) return [];

  const stats = parseNumstat(repo, base);
  return nameStatus.split('\n').flatMap((line): FileChange[] => {
    const parts = line.split('\t');
    const statusRaw = parts[0];
    if (!statusRaw) return [];
    const filename = statusRaw.startsWith('R') || statusRaw.startsWith('C') ? parts[2] : parts[1];
    if (!filename) return [];
    const patch = execGit(repo, ['diff', '--unified=3', `${base}..HEAD`, '--', filename]);
    const fileStats = stats.get(filename) ?? { additions: 0, deletions: 0 };
    return [{
      filename,
      status: fileChangeStatus(statusRaw),
      additions: fileStats.additions,
      deletions: fileStats.deletions,
      patch,
    }];
  });
}

function makeProfileContext(
  worktree: string,
  repository: string,
  base: string,
  files: FileChange[],
): EventContext {
  const [owner = 'getsentry', name = repository] = repository.split('/');
  return {
    eventType: 'pull_request',
    action: 'opened',
    repository: {
      owner,
      name,
      fullName: repository,
      defaultBranch: 'main',
    },
    pullRequest: {
      number: 1,
      title: 'Chunking benchmark profile',
      body: null,
      author: 'warden-benchmark',
      baseBranch: 'main',
      headBranch: 'benchmark',
      headSha: execGit(worktree, ['rev-parse', 'HEAD']),
      baseSha: base,
      files,
    },
    repoPath: worktree,
    diffContextSource: { type: 'working-tree' },
  };
}

function lineRangeForChunk(chunk: { changedLineMap: { start: number; end: number }[] }): string {
  return chunk.changedLineMap
    .map((range) => range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`)
    .join(',');
}

function profileChunks(worktree: string, repository: string, base: string): ChunkProfile {
  const files = readDiffFiles(worktree, base);
  const context = makeProfileContext(worktree, repository, base, files);
  const prepared = prepareFiles(context);
  const profileFiles = prepared.files.map((file) => {
    const contentChars = file.chunks.reduce(
      (total, chunk) => total + chunk.files.reduce((sum, chunkFile) => sum + chunkFile.content.length, 0),
      0,
    );
    return {
      filename: file.filename,
      chunks: file.chunks.length,
      changedRanges: file.chunks.reduce((total, chunk) => total + chunk.changedLineMap.length, 0),
      contentChars,
      lineRanges: file.chunks.map(lineRangeForChunk),
      contentModes: [...new Set(file.chunks.flatMap((chunk) => chunk.files.map((chunkFile) => chunkFile.contentMode)))],
    };
  });

  return {
    fileCount: profileFiles.length,
    skippedFileCount: prepared.skippedFiles.length,
    scannerChunks: profileFiles.reduce((total, file) => total + file.chunks, 0),
    changedRanges: profileFiles.reduce((total, file) => total + file.changedRanges, 0),
    contentChars: profileFiles.reduce((total, file) => total + file.contentChars, 0),
    files: profileFiles.sort((a, b) => b.chunks - a.chunks || b.contentChars - a.contentChars),
    skippedFiles: prepared.skippedFiles,
  };
}

function printProfile(profile: ChunkProfile): void {
  console.log([
    `Prepared files: ${profile.fileCount}`,
    `Scanner chunks: ${profile.scannerChunks}`,
    `Changed ranges: ${profile.changedRanges}`,
    `Content chars: ${profile.contentChars}`,
    `Skipped files: ${profile.skippedFileCount}`,
  ].join('\n'));
  for (const file of profile.files.slice(0, 10)) {
    console.log(`- ${file.filename}: ${file.chunks} chunks, ${file.changedRanges} ranges, ${file.contentChars} chars`);
  }
}

const args = parseArgs(process.argv.slice(2));
mkdirSync(args.artifactsDir, { recursive: true });

const results = [];
if (args.suite === 'historical') {
  const cases = args.cases.map(loadBenchmarkCase);
  for (const benchmarkCase of cases) {
    console.log(`\n=== ${benchmarkCase.name} ===`);
    const sourceRepo = sourceRepoForRepository(args, benchmarkCase.repository);
    const worktree = createBenchmarkWorktree(sourceRepo, benchmarkCase);
    console.log(`Worktree: ${worktree}`);
    if (args.profile) {
      const profile = profileChunks(worktree, benchmarkCase.repository, benchmarkCase.fixCommit);
      printProfile(profile);
      results.push({
        case: benchmarkCase.name,
        repository: benchmarkCase.repository,
        skill: benchmarkCase.skill,
        base: benchmarkCase.fixCommit,
        head: benchmarkCase.vulnerableCommit,
        expectedFindings: benchmarkCase.expectedFindings,
        profile,
        worktree: args.keepWorktrees ? worktree : undefined,
      });
    } else {
      const runs: Record<string, RunSummary> = {};
      for (const semantic of selectedModes(args)) {
        runs[semantic ? 'semantic' : 'nonsemantic'] = runWarden(
          args,
          worktree,
          {
            name: benchmarkCase.name,
            base: benchmarkCase.fixCommit,
            skill: benchmarkCase.skill,
            expectedFindings: benchmarkCase.expectedFindings,
          },
          semantic,
        );
      }
      results.push({
        case: benchmarkCase.name,
        repository: benchmarkCase.repository,
        skill: benchmarkCase.skill,
        base: benchmarkCase.fixCommit,
        head: benchmarkCase.vulnerableCommit,
        expectedFindings: benchmarkCase.expectedFindings,
        runs,
        worktree: args.keepWorktrees ? worktree : undefined,
      });
    }
    if (!args.keepWorktrees) {
      execGit(sourceRepo, ['worktree', 'remove', '--force', worktree]);
    }
  }
} else {
  const cases = args.cases.map(loadPerformanceCase);
  for (const benchmarkCase of cases) {
    console.log(`\n=== ${benchmarkCase.name} ===`);
    const sourceRepo = sourceRepoForPerformanceCase(args, benchmarkCase);
    const worktree = createPerformanceWorktree(sourceRepo, benchmarkCase);
    console.log(`Worktree: ${worktree}`);
    if (args.profile) {
      const profile = profileChunks(worktree, benchmarkCase.repository, benchmarkCase.base);
      printProfile(profile);
      results.push({
        case: benchmarkCase.name,
        repository: benchmarkCase.repository,
        skill: benchmarkCase.skill ?? 'code-review',
        base: benchmarkCase.base,
        head: benchmarkCase.head,
        expectedFindings: [],
        profile,
        worktree: args.keepWorktrees ? worktree : undefined,
      });
    } else {
      const runs: Record<string, RunSummary> = {};
      for (const semantic of selectedModes(args)) {
        runs[semantic ? 'semantic' : 'nonsemantic'] = runWarden(
          args,
          worktree,
          { name: benchmarkCase.name, base: benchmarkCase.base, skill: benchmarkCase.skill ?? 'code-review' },
          semantic,
        );
      }
      results.push({
        case: benchmarkCase.name,
        repository: benchmarkCase.repository,
        skill: benchmarkCase.skill ?? 'code-review',
        base: benchmarkCase.base,
        head: benchmarkCase.head,
        expectedFindings: [],
        runs,
        worktree: args.keepWorktrees ? worktree : undefined,
      });
    }
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
