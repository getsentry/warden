import { parseArgs } from 'node:util';
import { z } from 'zod';
import { SeveritySchema } from '../types/index.js';
import type { Severity } from '../types/index.js';

export const CLIOptionsSchema = z.object({
  targets: z.array(z.string()).optional(),
  skill: z.string().optional(),
  config: z.string().optional(),
  json: z.boolean().default(false),
  failOn: SeveritySchema.optional(),
  /** Only show findings at or above this severity in output */
  commentOn: SeveritySchema.optional(),
  help: z.boolean().default(false),
  /** Max concurrent trigger/skill executions (default: 4) */
  parallel: z.number().int().positive().optional(),
  /** Model to use for analysis (overrides config and WARDEN_MODEL env var) */
  model: z.string().optional(),
  // Verbosity options
  quiet: z.boolean().default(false),
  verbose: z.number().default(0),
  color: z.boolean().optional(),
  /** Automatically apply all suggested fixes */
  fix: z.boolean().default(false),
  /** Overwrite existing files (for init command) */
  force: z.boolean().default(false),
  /** List available skills (for add command) */
  list: z.boolean().default(false),
});

export type CLIOptions = z.infer<typeof CLIOptionsSchema>;

export interface SetupAppOptions {
  org?: string;
  port: number;
  timeout: number;
  name?: string;
  open: boolean;
}

export interface ParsedArgs {
  command: 'run' | 'help' | 'init' | 'add' | 'version' | 'setup-app';
  options: CLIOptions;
  setupAppOptions?: SetupAppOptions;
}

const VERSION = '0.1.0';

export function showVersion(): void {
  console.log(`warden ${VERSION}`);
}

const HELP_TEXT = `
Usage: warden [command] [targets...] [options]

Analyze code for security issues and code quality.

Commands:
  init                 Initialize warden.toml and GitHub workflow
  add [skill]          Add a skill trigger to warden.toml
  setup-app            Create a GitHub App for Warden via manifest flow
  (default)            Run analysis on targets or using warden.toml triggers

Targets:
  <files>              Analyze specific files (e.g., src/auth.ts)
  <glob>               Analyze files matching pattern (e.g., "src/**/*.ts")
  <git-ref>            Analyze changes from git ref (e.g., HEAD~3, main..feature)
  (none)               Analyze uncommitted changes using warden.toml triggers

Options:
  --skill <name>       Run only this skill (default: run all built-in skills)
  --config <path>      Path to warden.toml (default: ./warden.toml)
  -m, --model <model>  Model to use (overrides config and WARDEN_MODEL env var)
  --json               Output results as JSON
  --fail-on <severity> Exit with code 1 if findings >= severity
                       (critical, high, medium, low, info)
  --comment-on <sev>   Only show findings >= severity in output
                       (critical, high, medium, low, info)
  --fix                Automatically apply all suggested fixes
  --parallel <n>       Max concurrent trigger/skill executions (default: 4)
  --quiet              Errors and final summary only
  -v, --verbose        Show real-time findings and hunk details
  -vv                  Show debug info (token counts, latencies)
  --color / --no-color Override color detection
  --help, -h           Show this help message
  --version, -V        Show version number

Init Options:
  -f, --force          Overwrite existing files

Add Options:
  --list               List available skills

Setup-app Options:
  --org <name>         Create under organization (default: personal)
  --port <number>      Local server port (default: 3000)
  --timeout <sec>      Callback timeout in seconds (default: 300)
  --name <string>      Custom app name (default: Warden)
  --no-open            Print URL instead of opening browser

Examples:
  warden init                             # Initialize warden configuration
  warden add                              # Interactive skill selection
  warden add security-review              # Add specific skill trigger
  warden add --list                       # List available skills
  warden                                  # Run triggers from warden.toml
  warden src/auth.ts                      # Run all skills on file
  warden src/auth.ts --skill security-review
                                          # Run specific skill on file
  warden "src/**/*.ts"                    # Run all skills on glob pattern
  warden HEAD~3                           # Run all skills on git changes
  warden HEAD~3 --skill security-review   # Run specific skill on git changes
  warden --json                           # Output as JSON
  warden --fail-on high                   # Fail if high+ severity findings
  warden setup-app                        # Create GitHub App interactively
  warden setup-app --org myorg            # Create app under organization
`;

export function showHelp(): void {
  console.log(HELP_TEXT.trim());
}

/**
 * Detect if a target looks like a git ref vs a file path.
 * Returns 'git' for git refs, 'file' for file paths.
 */
export function detectTargetType(target: string): 'git' | 'file' {
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

  // Default to git ref (will be validated later)
  return 'git';
}

/**
 * Classify targets into git refs and file patterns.
 */
export function classifyTargets(targets: string[]): { gitRefs: string[]; filePatterns: string[] } {
  const gitRefs: string[] = [];
  const filePatterns: string[] = [];

  for (const target of targets) {
    if (detectTargetType(target) === 'git') {
      gitRefs.push(target);
    } else {
      filePatterns.push(target);
    }
  }

  return { gitRefs, filePatterns };
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
  // Count -v flags before parsing (parseArgs doesn't handle multiple -v well)
  let verboseCount = 0;
  const filteredArgv = argv.filter((arg) => {
    if (arg === '-v' || arg === '--verbose') {
      verboseCount++;
      return false;
    }
    if (arg === '-vv') {
      verboseCount += 2;
      return false;
    }
    return true;
  });

  const { values, positionals } = parseArgs({
    args: filteredArgv,
    options: {
      skill: { type: 'string' },
      config: { type: 'string' },
      model: { type: 'string', short: 'm' },
      json: { type: 'boolean', default: false },
      'fail-on': { type: 'string' },
      'comment-on': { type: 'string' },
      fix: { type: 'boolean', default: false },
      force: { type: 'boolean', short: 'f', default: false },
      list: { type: 'boolean', short: 'l', default: false },
      parallel: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'V', default: false },
      quiet: { type: 'boolean', default: false },
      color: { type: 'boolean' },
      'no-color': { type: 'boolean' },
      // setup-app options
      org: { type: 'string' },
      port: { type: 'string' },
      timeout: { type: 'string' },
      name: { type: 'string' },
      open: { type: 'boolean', default: true },
      'no-open': { type: 'boolean' },
    },
    allowPositionals: true,
  });

  if (values.version) {
    return {
      command: 'version',
      options: CLIOptionsSchema.parse({}),
    };
  }

  if (values.help) {
    return {
      command: 'help',
      options: CLIOptionsSchema.parse({ help: true }),
    };
  }

  // Filter out known commands from positionals
  const targets = positionals.filter(
    (p) => p !== 'run' && p !== 'help' && p !== 'init' && p !== 'add' && p !== 'version' && p !== 'setup-app'
  );

  // Handle explicit help command
  if (positionals.includes('help')) {
    return {
      command: 'help',
      options: CLIOptionsSchema.parse({ help: true }),
    };
  }

  // Handle explicit version command
  if (positionals.includes('version')) {
    return {
      command: 'version',
      options: CLIOptionsSchema.parse({}),
    };
  }

  // Handle init command
  if (positionals.includes('init')) {
    return {
      command: 'init',
      options: CLIOptionsSchema.parse({
        force: values.force,
        quiet: values.quiet,
        color: resolveColorOption(values),
      }),
    };
  }

  // Handle add command
  if (positionals.includes('add')) {
    // First positional after 'add' is the skill name
    const addIndex = positionals.indexOf('add');
    const skillArg = positionals[addIndex + 1];

    return {
      command: 'add',
      options: CLIOptionsSchema.parse({
        skill: skillArg,
        list: values.list,
        quiet: values.quiet,
        color: resolveColorOption(values),
      }),
    };
  }

  // Handle setup-app command
  if (positionals.includes('setup-app')) {
    return {
      command: 'setup-app',
      options: CLIOptionsSchema.parse({
        quiet: values.quiet,
        color: resolveColorOption(values),
      }),
      setupAppOptions: {
        org: values.org as string | undefined,
        port: values.port ? parseInt(values.port as string, 10) : 3000,
        timeout: values.timeout ? parseInt(values.timeout as string, 10) : 300,
        name: values.name as string | undefined,
        open: !values['no-open'],
      },
    };
  }

  const rawOptions = {
    targets: targets.length > 0 ? targets : undefined,
    skill: values.skill,
    config: values.config,
    model: values.model,
    json: values.json,
    failOn: values['fail-on'] as Severity | undefined,
    commentOn: values['comment-on'] as Severity | undefined,
    fix: values.fix,
    force: values.force,
    parallel: values.parallel ? parseInt(values.parallel, 10) : undefined,
    help: values.help,
    quiet: values.quiet,
    verbose: verboseCount,
    color: resolveColorOption(values),
  };

  const result = CLIOptionsSchema.safeParse(rawOptions);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    console.error('Invalid options:');
    console.error(issues.join('\n'));
    process.exit(1);
  }

  return {
    command: 'run',
    options: result.data,
  };
}
