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
  help: z.boolean().default(false),
  /** Max concurrent trigger/skill executions (default: 4) */
  parallel: z.number().int().positive().optional(),
  // Verbosity options
  quiet: z.boolean().default(false),
  verbose: z.number().default(0),
  color: z.boolean().optional(),
  /** Automatically apply all suggested fixes */
  fix: z.boolean().default(false),
});

export type CLIOptions = z.infer<typeof CLIOptionsSchema>;

export interface ParsedArgs {
  command: 'run' | 'help';
  options: CLIOptions;
}

const HELP_TEXT = `
Usage: warden [targets...] [options]

Analyze code for security issues and code quality.

Targets:
  <files>              Analyze specific files (e.g., src/auth.ts)
  <glob>               Analyze files matching pattern (e.g., "src/**/*.ts")
  <git-ref>            Analyze changes from git ref (e.g., HEAD~3, main..feature)
  (none)               Analyze uncommitted changes using warden.toml triggers

Options:
  --skill <name>       Run only this skill (default: run all built-in skills)
  --config <path>      Path to warden.toml (default: ./warden.toml)
  --json               Output results as JSON
  --fail-on <severity> Exit with code 1 if findings >= severity
                       (critical, high, medium, low, info)
  --fix                Automatically apply all suggested fixes
  --parallel <n>       Max concurrent trigger/skill executions (default: 4)
  --quiet              Errors and final summary only
  -v, --verbose        Show real-time findings and hunk details
  -vv                  Show debug info (token counts, latencies)
  --color / --no-color Override color detection
  --help, -h           Show this help message

Examples:
  warden                                  # Run triggers from warden.toml
  warden src/auth.ts                      # Run all skills on file
  warden src/auth.ts --skill security-review
                                          # Run specific skill on file
  warden "src/**/*.ts"                    # Run all skills on glob pattern
  warden HEAD~3                           # Run all skills on git changes
  warden HEAD~3 --skill security-review   # Run specific skill on git changes
  warden --json                           # Output as JSON
  warden --fail-on high                   # Fail if high+ severity findings
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
      json: { type: 'boolean', default: false },
      'fail-on': { type: 'string' },
      fix: { type: 'boolean', default: false },
      parallel: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
      quiet: { type: 'boolean', default: false },
      color: { type: 'boolean' },
      'no-color': { type: 'boolean' },
    },
    allowPositionals: true,
  });

  if (values.help) {
    return {
      command: 'help',
      options: CLIOptionsSchema.parse({ help: true }),
    };
  }

  // Filter out 'run' and 'help' commands from positionals (for backward compat)
  const targets = positionals.filter((p) => p !== 'run' && p !== 'help');

  // Handle explicit help command
  if (positionals.includes('help')) {
    return {
      command: 'help',
      options: CLIOptionsSchema.parse({ help: true }),
    };
  }

  // Handle --color / --no-color
  let colorOption: boolean | undefined;
  if (values['no-color']) {
    colorOption = false;
  } else if (values.color) {
    colorOption = true;
  }

  const rawOptions = {
    targets: targets.length > 0 ? targets : undefined,
    skill: values.skill,
    config: values.config,
    json: values.json,
    failOn: values['fail-on'] as Severity | undefined,
    fix: values.fix,
    parallel: values.parallel ? parseInt(values.parallel, 10) : undefined,
    help: values.help,
    quiet: values.quiet,
    verbose: verboseCount,
    color: colorOption,
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
