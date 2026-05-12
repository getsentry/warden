type HelpOptionId =
  | 'cwd'
  | 'help'
  | 'version'
  | 'skill'
  | 'config'
  | 'model'
  | 'json'
  | 'output'
  | 'failOn'
  | 'reportOn'
  | 'minConfidence'
  | 'fix'
  | 'parallel'
  | 'failFast'
  | 'staged'
  | 'git'
  | 'offline'
  | 'quiet'
  | 'verbose'
  | 'debug'
  | 'log'
  | 'color'
  | 'force'
  | 'list'
  | 'remote'
  | 'regenerate'
  | 'prompt'
  | 'org'
  | 'port'
  | 'timeout'
  | 'name'
  | 'noOpen'
  | 'follow'
  | 'all';

export type HelpTarget =
  | 'run'
  | 'init'
  | 'add'
  | 'sync'
  | 'build'
  | 'improve'
  | 'setup-app'
  | 'runs'
  | 'runs:list'
  | 'runs:show'
  | 'runs:follow'
  | 'runs:gc';

interface HelpOptionSpec {
  label: string;
  description: string;
  continuation?: string;
}

interface HelpArgumentSpec {
  label: string;
  description: string;
}

interface HelpCommandSpec {
  summary: string;
  description: string;
  usage: string[];
  aliases?: string[];
  arguments?: HelpArgumentSpec[];
  options?: HelpOptionId[];
  examples?: string[];
  subcommands?: { label: string; summary: string }[];
}

const HELP_OPTIONS: Record<HelpOptionId, HelpOptionSpec> = {
  cwd: {
    label: '-C, --cwd <path>',
    description: 'Run as if invoked from this directory',
  },
  help: {
    label: '-h, --help',
    description: 'Show help for this command',
  },
  version: {
    label: '-V, --version',
    description: 'Show version number',
  },
  skill: {
    label: '--skill <name|path>',
    description: 'Run only this skill by name or path; names fall back to built-ins',
  },
  config: {
    label: '--config <path>',
    description: 'Path to warden.toml',
  },
  model: {
    label: '-m, --model <model>',
    description: 'Model fallback when config does not specify one',
  },
  json: {
    label: '--json',
    description: 'Output results as JSON',
  },
  output: {
    label: '-o, --output <path>',
    description: 'Write full run output to a JSONL file',
  },
  failOn: {
    label: '--fail-on <severity>',
    description: 'Exit with code 1 if findings meet this severity',
  },
  reportOn: {
    label: '--report-on <severity>',
    description: 'Only show findings at or above this severity',
  },
  minConfidence: {
    label: '--min-confidence <level>',
    description: 'Only show findings at or above this confidence',
  },
  fix: {
    label: '--fix',
    description: 'Automatically apply all suggested fixes',
  },
  parallel: {
    label: '--parallel <n>',
    description: 'Max concurrent task or skill executions',
  },
  failFast: {
    label: '-x, --fail-fast',
    description: 'Stop after the first finding',
  },
  staged: {
    label: '--staged',
    description: 'Analyze only staged changes',
  },
  git: {
    label: '--git',
    description: 'Force ambiguous targets to be treated as git refs',
  },
  offline: {
    label: '--offline',
    description: 'Use cached remote skills without network access',
  },
  quiet: {
    label: '--quiet',
    description: 'Errors and final summary only',
  },
  verbose: {
    label: '-v, --verbose',
    description: 'Increase verbosity',
    continuation: 'Repeat as -vv or combine with --debug for more detail',
  },
  debug: {
    label: '--debug',
    description: 'Enable debug output',
  },
  log: {
    label: '--log',
    description: 'Use log output mode',
  },
  color: {
    label: '--color / --no-color',
    description: 'Override color detection',
  },
  force: {
    label: '-f, --force',
    description: 'Overwrite existing files or bypass caches',
  },
  list: {
    label: '--list',
    description: 'List available skills',
  },
  remote: {
    label: '--remote <ref>',
    description: 'Remote repository reference',
  },
  regenerate: {
    label: '--regenerate',
    description: 'Ignore cached generated skill artifacts and build again',
  },
  prompt: {
    label: '-p, --prompt <value>',
    description: 'Generated skill prompt or improvement brief',
    continuation: 'Prefix with @ to read the prompt from a file',
  },
  org: {
    label: '--org <name>',
    description: 'Create under an organization instead of a personal account',
  },
  port: {
    label: '--port <number>',
    description: 'Local server port',
  },
  timeout: {
    label: '--timeout <seconds>',
    description: 'Callback timeout in seconds',
  },
  name: {
    label: '--name <string>',
    description: 'Custom GitHub App name',
  },
  noOpen: {
    label: '--no-open',
    description: 'Print the URL instead of opening a browser',
  },
  follow: {
    label: '--follow',
    description: 'Follow a run instead of showing it once',
  },
  all: {
    label: '--all',
    description: 'Include zero-file sessions in runs list output',
  },
};

const SHARED_COMMAND_OPTIONS: HelpOptionId[] = [
  'quiet',
  'verbose',
  'debug',
  'log',
  'color',
  'help',
];

const HELP_COMMANDS: Record<HelpTarget, HelpCommandSpec> = {
  run: {
    summary: 'Analyze files, git refs, or current branch changes',
    description: 'Run Warden analysis against explicit targets or the current branch by default.',
    usage: [
      'warden [targets...] [options]',
      'warden run [targets...] [options]',
    ],
    arguments: [
      { label: 'targets...', description: 'Files, globs, git refs, or @files containing target lists' },
    ],
    options: [
      'cwd',
      'skill',
      'config',
      'model',
      'json',
      'output',
      'failOn',
      'reportOn',
      'minConfidence',
      'fix',
      'parallel',
      'failFast',
      'staged',
      'git',
      'offline',
      ...SHARED_COMMAND_OPTIONS,
    ],
    examples: [
      'warden src/auth.ts',
      'warden @targets.txt --skill security-review',
      'warden "src/**/*.ts" --skill security-review',
      'warden HEAD~3',
      'warden --staged --fix',
    ],
  },
  init: {
    summary: 'Initialize Warden configuration',
    description: 'Create a starter warden.toml and GitHub workflow in the current repository.',
    usage: ['warden init [options]'],
    options: ['cwd', 'force', ...SHARED_COMMAND_OPTIONS],
    examples: [
      'warden init',
      'warden init --force',
    ],
  },
  add: {
    summary: 'Add a skill trigger to warden.toml',
    description: 'Add a skill trigger to the repository configuration.',
    usage: ['warden add [skill] [options]'],
    arguments: [
      { label: 'skill', description: 'Skill name to add' },
    ],
    options: ['cwd', 'list', 'remote', 'force', ...SHARED_COMMAND_OPTIONS],
    examples: [
      'warden add',
      'warden add security-review',
      'warden add code-review',
      'warden add --remote your-org/warden-skills --skill api-review',
    ],
  },
  sync: {
    summary: 'Update cached remote skills',
    description: 'Refresh cached remote skill repositories to their latest revision.',
    usage: ['warden sync [remote] [options]'],
    arguments: [
      { label: 'remote', description: 'Remote repository reference to sync' },
    ],
    options: ['cwd', 'remote', ...SHARED_COMMAND_OPTIONS],
    examples: [
      'warden sync',
      'warden sync getsentry/skills',
    ],
  },
  build: {
    summary: 'Build a repo-local generated skill',
    description: 'Create or refresh one generated skill. A name resolves through .warden/skills, .agents/skills, then .claude/skills; use a path for other roots.',
    usage: [
      'warden build <skill> [options]',
    ],
    arguments: [
      { label: 'skill', description: 'Generated skill name or skill root path' },
    ],
    options: [
      'cwd',
      'config',
      'model',
      'json',
      'regenerate',
      'prompt',
      ...SHARED_COMMAND_OPTIONS,
    ],
    examples: [
      'warden build security --regenerate',
      'warden build security -p @prompt.md',
      'warden build ./skills/security -p @prompt.md',
      'warden build sentry-security --json',
    ],
  },
  improve: {
    summary: 'Improve a repo-local generated skill',
    description: 'Revise an existing generated skill from an improvement brief using the generated-skill reviewer loop.',
    usage: [
      'warden improve <skill> [options]',
    ],
    arguments: [
      { label: 'skill', description: 'Generated skill name or skill root path' },
    ],
    options: [
      'cwd',
      'config',
      'model',
      'json',
      'prompt',
      ...SHARED_COMMAND_OPTIONS,
    ],
    examples: [
      'warden improve security -p "Deepen source provenance and reference routing"',
      'warden improve security -p @feedback.md',
      'warden improve ./skills/security -p @feedback.md',
    ],
  },
  'setup-app': {
    summary: 'Create a GitHub App via manifest flow',
    description: 'Walk through the GitHub App manifest flow and print the credentials to install.',
    usage: ['warden setup-app [options]'],
    options: ['cwd', 'org', 'port', 'timeout', 'name', 'noOpen', ...SHARED_COMMAND_OPTIONS],
    examples: [
      'warden setup-app',
      'warden setup-app --org my-org --port 8080',
    ],
  },
  runs: {
    summary: 'Inspect saved sessions and run logs',
    description: 'Browse, show, follow, and clean up saved Warden run logs.',
    usage: [
      'warden runs [list] [options]',
      'warden runs show <files...> [options]',
      'warden runs follow [run] [options]',
      'warden runs gc [options]',
    ],
    options: ['cwd', 'follow', 'all', 'json', ...SHARED_COMMAND_OPTIONS],
    subcommands: [
      { label: 'list', summary: 'List saved runs' },
      { label: 'show <files...>', summary: 'Show results from saved logs or run IDs' },
      { label: 'follow [run]', summary: 'Tail a live or completed session' },
      { label: 'gc', summary: 'Remove expired session logs' },
    ],
    examples: [
      'warden runs',
      'warden runs show deadbeef',
      'warden runs follow',
    ],
  },
  'runs:list': {
    summary: 'List saved runs',
    description: 'List saved run logs in reverse chronological order.',
    usage: ['warden runs [list] [options]'],
    options: ['cwd', 'all', 'json', ...SHARED_COMMAND_OPTIONS],
    examples: [
      'warden runs',
      'warden runs list --all',
    ],
  },
  'runs:show': {
    summary: 'Show results from saved logs or run IDs',
    description: 'Render findings from one or more saved JSONL logs or short run IDs.',
    usage: ['warden runs show <files...> [options]'],
    arguments: [
      { label: 'files...', description: 'JSONL paths or short run IDs' },
    ],
    options: ['cwd', 'json', 'reportOn', 'minConfidence', ...SHARED_COMMAND_OPTIONS],
    examples: [
      'warden runs show deadbeef',
      'warden runs show .warden/logs/a1b2c3d4-2026-04-25T13-00-00-000Z.jsonl',
    ],
  },
  'runs:follow': {
    summary: 'Tail a live or completed session',
    description: 'Follow a session as skill records arrive, or replay the latest completed run.',
    usage: [
      'warden runs follow [run] [options]',
      'warden runs --follow [run] [options]',
    ],
    arguments: [
      { label: 'run', description: 'Optional short run ID or JSONL path' },
    ],
    options: ['cwd', 'json', ...SHARED_COMMAND_OPTIONS],
    examples: [
      'warden runs follow',
      'warden runs --follow deadbeef',
    ],
  },
  'runs:gc': {
    summary: 'Remove expired session logs',
    description: 'Delete saved run logs that are older than the configured retention window.',
    usage: ['warden runs gc [options]'],
    options: ['cwd', 'json', ...SHARED_COMMAND_OPTIONS],
    examples: [
      'warden runs gc',
    ],
  },
};

const ROOT_COMMANDS: { label: string; summary: string }[] = [
  { label: 'run [targets...]', summary: 'Analyze files, git refs, or current branch changes' },
  { label: 'init', summary: 'Initialize Warden configuration' },
  { label: 'add [skill]', summary: 'Add a skill trigger to warden.toml' },
  { label: 'sync [remote]', summary: 'Update cached remote skills to latest' },
  { label: 'build <skill>', summary: 'Build a repo-local generated skill' },
  { label: 'runs', summary: 'Inspect saved sessions and run logs' },
  { label: 'setup-app', summary: 'Create a GitHub App via manifest flow' },
  { label: 'help [command]', summary: 'Show help for a command' },
];

function renderTable(
  items: { label: string; description: string; continuation?: string }[],
): string[] {
  if (items.length === 0) return [];
  const width = Math.max(...items.map((item) => item.label.length));
  const lines: string[] = [];
  for (const item of items) {
    lines.push(`  ${item.label.padEnd(width)}  ${item.description}`);
    if (item.continuation) {
      lines.push(`  ${' '.repeat(width)}  ${item.continuation}`);
    }
  }
  return lines;
}

function renderSection(title: string, lines: string[]): string[] {
  if (lines.length === 0) return [];
  return [title, ...lines, ''];
}

function renderRootHelp(): string {
  const lines: string[] = [
    'Usage:',
    '  warden [targets...] [options]',
    '  warden <command> [options]',
    '',
    'Warden watches over your code.',
    '',
    ...renderSection('Commands:', renderTable(ROOT_COMMANDS.map((command) => ({
      label: command.label,
      description: command.summary,
    })))),
    ...renderSection('Global Options:', renderTable([
      { label: HELP_OPTIONS.cwd.label, description: HELP_OPTIONS.cwd.description },
      { label: HELP_OPTIONS.help.label, description: HELP_OPTIONS.help.description },
      { label: HELP_OPTIONS.version.label, description: HELP_OPTIONS.version.description },
    ])),
    ...renderSection('Examples:', [
      '  warden src/auth.ts',
      '  warden HEAD~3 --skill security-review',
      '  warden build security --regenerate',
      '  warden help runs show',
    ]),
  ];

  return lines.join('\n').trimEnd();
}

function renderCommandHelp(target: HelpTarget): string {
  const spec = HELP_COMMANDS[target];
  const lines: string[] = [
    'Usage:',
    ...spec.usage.map((usage) => `  ${usage}`),
    '',
    spec.description,
    '',
  ];

  if (spec.aliases && spec.aliases.length > 0) {
    lines.push(`Aliases: ${spec.aliases.join(', ')}`);
    lines.push('');
  }

  if (spec.arguments && spec.arguments.length > 0) {
    lines.push(...renderSection('Arguments:', renderTable(spec.arguments.map((argument) => ({
      label: argument.label,
      description: argument.description,
    })))));
  }

  if (spec.subcommands && spec.subcommands.length > 0) {
    lines.push(...renderSection('Subcommands:', renderTable(spec.subcommands.map((command) => ({
      label: command.label,
      description: command.summary,
    })))));
  }

  if (spec.options && spec.options.length > 0) {
    lines.push(...renderSection('Options:', renderTable(spec.options.map((option) => ({
      label: HELP_OPTIONS[option].label,
      description: HELP_OPTIONS[option].description,
      continuation: HELP_OPTIONS[option].continuation,
    })))));
  }

  if (spec.examples && spec.examples.length > 0) {
    lines.push(...renderSection('Examples:', spec.examples.map((example) => `  ${example}`)));
  }

  return lines.join('\n').trimEnd();
}

export function renderHelp(target?: HelpTarget): string {
  return target ? renderCommandHelp(target) : renderRootHelp();
}

export function showHelp(target?: HelpTarget): void {
  console.log(renderHelp(target));
}
