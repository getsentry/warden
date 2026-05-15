import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { SeverityThresholdSchema, ConfidenceThresholdSchema } from '../types/index.js';
import type { SeverityThreshold, ConfidenceThreshold } from '../types/index.js';
import { getVersion } from '../utils/index.js';
import type { HelpTarget } from './help.js';

export const CLIOptionsSchema = z.object({
  targets: z.array(z.string()).optional(),
  skill: z.string().optional(),
  cwd: z.string().optional(),
  config: z.string().optional(),
  json: z.boolean().default(false),
  /** Write full run output to a JSONL file */
  output: z.string().optional(),
  failOn: SeverityThresholdSchema.optional(),
  /** Only show findings at or above this severity in output */
  reportOn: SeverityThresholdSchema.optional(),
  /** Only show findings at or above this confidence in output */
  minConfidence: ConfidenceThresholdSchema.optional(),
  help: z.boolean().default(false),
  /** Max concurrent file analyses across running skills (default depends on command) */
  parallel: z.number().int().positive().optional(),
  /** Model to use for analysis (fallback when not set in config) */
  model: z.string().optional(),
  // Verbosity options
  quiet: z.boolean().default(false),
  verbose: z.number().default(0),
  debug: z.boolean().default(false),
  /** Use log output mode (no animations, timestamped) */
  log: z.boolean().default(false),
  color: z.boolean().optional(),
  /** Automatically apply all suggested fixes */
  fix: z.boolean().default(false),
  /** Overwrite existing files (for init command) */
  force: z.boolean().default(false),
  /** List available skills (for add command) */
  list: z.boolean().default(false),
  /** Force interpretation of ambiguous targets as git refs */
  git: z.boolean().default(false),
  /** Analyze only staged changes (git diff --cached) */
  staged: z.boolean().default(false),
  /** Remote repository reference for skills (e.g., "owner/repo" or "owner/repo@sha") */
  remote: z.string().optional(),
  /** Skip network operations - only use cached remote skills */
  offline: z.boolean().default(false),
  /** Stop after first finding */
  failFast: z.boolean().default(false),
  /** Regenerate generated skill artifacts even when a cached outline exists */
  regenerate: z.boolean().default(false),
  /** Prompt for creating a new generated skill. Prefix with @ to load from a file. */
  prompt: z.string().optional(),
});

export type CLIOptions = z.infer<typeof CLIOptionsSchema>;

export interface SetupAppOptions {
  org?: string;
  port: number;
  timeout: number;
  name?: string;
  open: boolean;
}

export type RunsSubcommand = 'list' | 'show' | 'gc' | 'follow';

export interface RunsOptions {
  subcommand: RunsSubcommand;
  files: string[];
  /** Include sessions with zero analyzed files in `list` output. */
  all?: boolean;
}

export interface ParsedArgs {
  command: 'run' | 'help' | 'init' | 'add' | 'version' | 'setup-app' | 'sync' | 'runs' | 'build' | 'improve';
  options: CLIOptions;
  helpTarget?: HelpTarget;
  setupAppOptions?: SetupAppOptions;
  runsOptions?: RunsOptions;
}

export function showVersion(): void {
  console.log(`warden ${getVersion()}`);
}

type ParsedOptionValues = ReturnType<typeof parseArgs>['values'];

function parseCliOptions(rawOptions: Record<string, unknown>): CLIOptions {
  const result = CLIOptionsSchema.safeParse(rawOptions);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    console.error('Invalid options:');
    console.error(issues.join('\n'));
    process.exit(1);
  }
  return result.data;
}

function sharedOptions(values: ParsedOptionValues, verboseCount: number): Partial<CLIOptions> {
  return {
    cwd: typeof values['cwd'] === 'string' ? values['cwd'] : undefined,
    quiet: Boolean(values['quiet']),
    verbose: verboseCount,
    debug: Boolean(values['debug']),
    log: Boolean(values['log']),
    color: resolveColorOption(values),
  };
}

function resolveHelpTarget(tokens: string[], values: ParsedOptionValues): HelpTarget | undefined {
  if (tokens.length === 0) {
    return undefined;
  }

  const [command, subcommand] = tokens;
  switch (command) {
    case 'run':
      return 'run';
    case 'init':
      return 'init';
    case 'add':
      return 'add';
    case 'sync':
      return 'sync';
    case 'build':
      return 'build';
    case 'improve':
      return 'improve';
    case 'setup-app':
      return 'setup-app';
    case 'runs':
      if (subcommand === 'list') return 'runs:list';
      if (subcommand === 'show') return 'runs:show';
      if (subcommand === 'follow') return 'runs:follow';
      if (subcommand === 'gc') return 'runs:gc';
      if (values['follow']) return 'runs:follow';
      if (values['all']) return 'runs:list';
      if (subcommand) return 'runs:show';
      return 'runs';
    case 'help':
    case 'version':
      return undefined;
    default:
      return 'run';
  }
}

function parseSetupAppNumber(value: string | undefined, option: '--port' | '--timeout', fallback: number): number {
  if (value === undefined) {
    return fallback;
  }
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    console.error(`Invalid ${option} value: ${value}`);
    process.exit(1);
  }
  return parsed;
}

export interface DetectTargetTypeOptions {
  /** Current working directory for filesystem checks */
  cwd?: string;
  /** Force git ref interpretation for ambiguous targets */
  forceGit?: boolean;
}

/**
 * Detect if a target looks like a git ref vs a file path.
 * Returns 'git' for git refs, 'file' for file paths.
 *
 * For ambiguous targets (no path separators, no extension), checks
 * if a file/directory exists at that path before defaulting to git ref.
 */
export function detectTargetType(target: string, options: DetectTargetTypeOptions = {}): 'git' | 'file' {
  const { cwd = process.cwd(), forceGit = false } = options;

  // Git range syntax (e.g., main..feature, HEAD~3..HEAD)
  if (target.includes('..')) {
    return 'git';
  }

  // Relative ref syntax (e.g., HEAD~3, main^2)
  if (/[~^]\d*$/.test(target)) {
    return 'git';
  }

  // Common git refs
  if (/^(HEAD|FETCH_HEAD|ORIG_HEAD|MERGE_HEAD)$/i.test(target)) {
    return 'git';
  }

  // Contains path separators or glob characters → file
  if (target.includes('/') || target.includes('*') || target.includes('?')) {
    return 'file';
  }

  // Has a file extension → file
  if (/\.\w+$/.test(target)) {
    return 'file';
  }

  // Ambiguous target (no path separators, no extension)
  // If --git flag is set, force git ref interpretation
  if (forceGit) {
    return 'git';
  }

  // Check if file/directory exists at this path
  const fullPath = `${cwd}/${target}`;
  if (existsSync(fullPath)) {
    return 'file';
  }

  // Default to git ref (will be validated later)
  return 'git';
}

/**
 * Classify targets into git refs and file patterns.
 */
export function classifyTargets(targets: string[], options: DetectTargetTypeOptions = {}): { gitRefs: string[]; filePatterns: string[] } {
  const gitRefs: string[] = [];
  const filePatterns: string[] = [];

  for (const target of targets) {
    if (detectTargetType(target, options) === 'git') {
      gitRefs.push(target);
    } else {
      filePatterns.push(target);
    }
  }

  return { gitRefs, filePatterns };
}

/**
 * Expand @file target references into newline-delimited target lists.
 */
export function expandTargetFileReferences(
  targets: string[],
  cwd = process.cwd()
): string[] {
  const expanded: string[] = [];

  for (const target of targets) {
    if (!target.startsWith('@')) {
      expanded.push(target);
      continue;
    }

    const listPath = target.slice(1);
    if (!listPath) {
      throw new Error('Target list path is empty: @');
    }

    try {
      const content = readFileSync(resolve(cwd, listPath), 'utf-8');
      for (const line of content.split(/\r?\n/)) {
        const value = line.trim();
        if (value && !value.startsWith('#')) {
          expanded.push(value);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read target list ${listPath}: ${message}`, { cause: error });
    }
  }

  return expanded;
}

/**
 * Resolve color option from --color / --no-color flags.
 * Returns undefined for auto-detect, true for forced color, false for no color.
 */
function resolveColorOption(values: { color?: boolean; 'no-color'?: boolean }): boolean | undefined {
  if (values['no-color']) {
    return false;
  }
  if (values.color) {
    return true;
  }
  return undefined;
}

export function parseCliArgs(argv: string[] = process.argv.slice(2)): ParsedArgs {
  const args = argv[0] === '--' ? argv.slice(1) : argv;

  // Count -v flags before parsing (parseArgs doesn't handle multiple -v well)
  let verboseCount = 0;
  const filteredArgv = args.filter((arg) => {
    if (/^-v+$/.test(arg)) {
      verboseCount += arg.length - 1;
      return false;
    }
    if (arg === '--verbose') {
      verboseCount++;
      return false;
    }
    return true;
  });

  const { values, positionals } = parseArgs({
    args: filteredArgv,
    options: {
      cwd: { type: 'string', short: 'C' },
      skill: { type: 'string' },
      config: { type: 'string' },
      model: { type: 'string', short: 'm' },
      json: { type: 'boolean', default: false },
      output: { type: 'string', short: 'o' },
      'fail-on': { type: 'string' },
      'report-on': { type: 'string' },
      'min-confidence': { type: 'string' },
      fix: { type: 'boolean', default: false },
      force: { type: 'boolean', short: 'f', default: false },
      list: { type: 'boolean', short: 'l', default: false },
      remote: { type: 'string' },
      offline: { type: 'boolean', default: false },
      'fail-fast': { type: 'boolean', short: 'x', default: false },
      regenerate: { type: 'boolean', default: false },
      prompt: { type: 'string', short: 'p' },
      parallel: { type: 'string' },
      git: { type: 'boolean', default: false },
      staged: { type: 'boolean', default: false },
      log: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'V', default: false },
      quiet: { type: 'boolean', default: false },
      debug: { type: 'boolean', default: false },
      color: { type: 'boolean' },
      'no-color': { type: 'boolean' },
      // setup-app options
      org: { type: 'string' },
      port: { type: 'string' },
      timeout: { type: 'string' },
      name: { type: 'string' },
      open: { type: 'boolean', default: true },
      'no-open': { type: 'boolean' },
      // logs/runs follow + list options
      // (no short alias for --follow: -f already maps to --force on init/add)
      follow: { type: 'boolean', default: false },
      all: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  if (values.version) {
    return {
      command: 'version',
      options: parseCliOptions({}),
    };
  }

  if (values.help) {
    const helpTokens = positionals[0] === 'help' ? positionals.slice(1) : positionals;
    return {
      command: 'help',
      options: parseCliOptions({ ...sharedOptions(values, verboseCount), help: true }),
      helpTarget: resolveHelpTarget(helpTokens, values),
    };
  }

  const [command, ...rest] = positionals;

  if (command === 'help') {
    return {
      command: 'help',
      options: parseCliOptions({ ...sharedOptions(values, verboseCount), help: true }),
      helpTarget: resolveHelpTarget(rest, values),
    };
  }

  if (command === 'version') {
    return {
      command: 'version',
      options: parseCliOptions({}),
    };
  }

  if (command === 'init') {
    return {
      command: 'init',
      options: parseCliOptions({
        ...sharedOptions(values, verboseCount),
        force: Boolean(values.force),
      }),
    };
  }

  if (command === 'add') {
    return {
      command: 'add',
      options: parseCliOptions({
        ...sharedOptions(values, verboseCount),
        skill: typeof values.skill === 'string' ? values.skill : rest[0],
        list: Boolean(values.list),
        remote: typeof values.remote === 'string' ? values.remote : undefined,
        force: Boolean(values.force),
      }),
    };
  }

  if (command === 'sync') {
    return {
      command: 'sync',
      options: parseCliOptions({
        ...sharedOptions(values, verboseCount),
        remote: typeof values.remote === 'string' ? values.remote : rest[0],
      }),
    };
  }

  if (command === 'build') {
    return {
      command: 'build',
      options: parseCliOptions({
        ...sharedOptions(values, verboseCount),
        skill: typeof values.skill === 'string' ? values.skill : rest[0],
        config: typeof values.config === 'string' ? values.config : undefined,
        model: typeof values.model === 'string' ? values.model : undefined,
        json: Boolean(values.json),
        regenerate: Boolean(values.regenerate),
        prompt: typeof values.prompt === 'string' ? values.prompt : undefined,
        remote: typeof values.remote === 'string' ? values.remote : undefined,
        offline: Boolean(values.offline),
      }),
    };
  }

  if (command === 'improve') {
    return {
      command: 'improve',
      options: parseCliOptions({
        ...sharedOptions(values, verboseCount),
        skill: typeof values.skill === 'string' ? values.skill : rest[0],
        config: typeof values.config === 'string' ? values.config : undefined,
        model: typeof values.model === 'string' ? values.model : undefined,
        json: Boolean(values.json),
        regenerate: true,
        prompt: typeof values.prompt === 'string' ? values.prompt : undefined,
        remote: typeof values.remote === 'string' ? values.remote : undefined,
        offline: Boolean(values.offline),
      }),
    };
  }

  if (command === 'setup-app') {
    return {
      command: 'setup-app',
      options: parseCliOptions(sharedOptions(values, verboseCount)),
      setupAppOptions: {
        org: typeof values.org === 'string' ? values.org : undefined,
        port: parseSetupAppNumber(typeof values.port === 'string' ? values.port : undefined, '--port', 3000),
        timeout: parseSetupAppNumber(typeof values.timeout === 'string' ? values.timeout : undefined, '--timeout', 300),
        name: typeof values.name === 'string' ? values.name : undefined,
        open: !values['no-open'],
      },
    };
  }

  if (command === 'runs') {
    const subcommandArg = rest[0];
    let files: string[] = [];
    let subcommand: RunsSubcommand;

    if (subcommandArg === 'list' || subcommandArg === 'show' || subcommandArg === 'gc' || subcommandArg === 'follow') {
      subcommand = subcommandArg;
      if (subcommand === 'show' || subcommand === 'follow') {
        files = rest.slice(1);
      }
    } else if (values.follow) {
      subcommand = 'follow';
      files = subcommandArg ? rest : [];
    } else if (subcommandArg) {
      subcommand = 'show';
      files = rest;
    } else {
      subcommand = 'list';
    }

    return {
      command: 'runs',
      options: parseCliOptions({
        ...sharedOptions(values, verboseCount),
        json: Boolean(values.json),
        reportOn: values['report-on'] as SeverityThreshold | undefined,
        minConfidence: values['min-confidence'] as ConfidenceThreshold | undefined,
      }),
      runsOptions: {
        subcommand,
        files,
        all: Boolean(values.all),
      },
    };
  }

  const targets = command === 'run' ? rest : positionals;
  return {
    command: 'run',
    options: parseCliOptions({
      ...sharedOptions(values, verboseCount),
      targets: targets.length > 0 ? targets : undefined,
      skill: typeof values.skill === 'string' ? values.skill : undefined,
      config: typeof values.config === 'string' ? values.config : undefined,
      model: typeof values.model === 'string' ? values.model : undefined,
      json: Boolean(values.json),
      output: typeof values.output === 'string' ? values.output : undefined,
      failOn: values['fail-on'] as SeverityThreshold | undefined,
      reportOn: values['report-on'] as SeverityThreshold | undefined,
      minConfidence: values['min-confidence'] as ConfidenceThreshold | undefined,
      fix: Boolean(values.fix),
      force: Boolean(values.force),
      parallel: typeof values.parallel === 'string' ? parseInt(values.parallel, 10) : undefined,
      git: Boolean(values.git),
      staged: Boolean(values.staged),
      offline: Boolean(values.offline),
      failFast: Boolean(values['fail-fast']),
    }),
  };
}
