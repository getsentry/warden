import { existsSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseCliArgs, CLIOptionsSchema, detectTargetType, classifyTargets } from './args.js';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(() => false),
  };
});

describe('parseCliArgs', () => {
  const originalExit = process.exit;
  const originalError = console.error;

  beforeEach(() => {
    process.exit = vi.fn() as never;
    console.error = vi.fn();
  });

  afterEach(() => {
    process.exit = originalExit;
    console.error = originalError;
  });

  it('parses with no arguments', () => {
    const result = parseCliArgs([]);
    expect(result.command).toBe('run');
    expect(result.options.targets).toBeUndefined();
  });

  it('parses file target with skill', () => {
    const result = parseCliArgs(['src/auth.ts', '--skill', 'security-review']);
    expect(result.options.targets).toEqual(['src/auth.ts']);
    expect(result.options.skill).toBe('security-review');
  });

  it('parses multiple file targets', () => {
    const result = parseCliArgs(['file1.ts', 'file2.ts', '--skill', 'security-review']);
    expect(result.options.targets).toEqual(['file1.ts', 'file2.ts']);
  });

  it('parses glob pattern', () => {
    const result = parseCliArgs(['src/**/*.ts', '--skill', 'security-review']);
    expect(result.options.targets).toEqual(['src/**/*.ts']);
  });

  it('parses git ref target', () => {
    const result = parseCliArgs(['HEAD~3', '--skill', 'security-review']);
    expect(result.options.targets).toEqual(['HEAD~3']);
  });

  it('parses git range target', () => {
    const result = parseCliArgs(['main..feature', '--skill', 'security-review']);
    expect(result.options.targets).toEqual(['main..feature']);
  });

  it('parses --skill option', () => {
    const result = parseCliArgs(['--skill', 'security-review']);
    expect(result.options.skill).toBe('security-review');
  });

  it('parses --config option', () => {
    const result = parseCliArgs(['--config', './custom.toml']);
    expect(result.options.config).toBe('./custom.toml');
  });

  it('parses --json flag', () => {
    const result = parseCliArgs(['--json']);
    expect(result.options.json).toBe(true);
  });

  it('parses --fail-on option', () => {
    const result = parseCliArgs(['--fail-on', 'high']);
    expect(result.options.failOn).toBe('high');
  });

  it('parses help command', () => {
    const result = parseCliArgs(['help']);
    expect(result.command).toBe('help');
  });

  it('parses --help flag', () => {
    const result = parseCliArgs(['--help']);
    expect(result.command).toBe('help');
  });

  it('parses -h flag', () => {
    const result = parseCliArgs(['-h']);
    expect(result.command).toBe('help');
  });

  it('ignores run command for backward compat', () => {
    const result = parseCliArgs(['run', '--skill', 'security-review']);
    expect(result.options.targets).toBeUndefined();
    expect(result.options.skill).toBe('security-review');
  });

  it('allows targets without --skill (runs all skills)', () => {
    const result = parseCliArgs(['src/auth.ts']);
    expect(result.options.targets).toEqual(['src/auth.ts']);
    expect(result.options.skill).toBeUndefined();
  });

  it('parses --parallel option', () => {
    const result = parseCliArgs(['--parallel', '8']);
    expect(result.options.parallel).toBe(8);
  });

  it('does not set parallel when not provided', () => {
    const result = parseCliArgs([]);
    expect(result.options.parallel).toBeUndefined();
  });

  it('parses --quiet flag', () => {
    const result = parseCliArgs(['--quiet']);
    expect(result.options.quiet).toBe(true);
  });

  it('parses single -v flag', () => {
    const result = parseCliArgs(['-v']);
    expect(result.options.verbose).toBe(1);
  });

  it('parses multiple -v flags', () => {
    const result = parseCliArgs(['-v', '-v']);
    expect(result.options.verbose).toBe(2);
  });

  it('parses -vv flag', () => {
    const result = parseCliArgs(['-vv']);
    expect(result.options.verbose).toBe(2);
  });

  it('parses --verbose flag', () => {
    const result = parseCliArgs(['--verbose']);
    expect(result.options.verbose).toBe(1);
  });

  it('parses --color flag', () => {
    const result = parseCliArgs(['--color']);
    expect(result.options.color).toBe(true);
  });

  it('parses --no-color flag', () => {
    const result = parseCliArgs(['--no-color']);
    expect(result.options.color).toBe(false);
  });

  it('--no-color overrides --color when both specified', () => {
    const result = parseCliArgs(['--color', '--no-color']);
    expect(result.options.color).toBe(false);
  });

  it('defaults quiet to false', () => {
    const result = parseCliArgs([]);
    expect(result.options.quiet).toBe(false);
  });

  it('defaults verbose to 0', () => {
    const result = parseCliArgs([]);
    expect(result.options.verbose).toBe(0);
  });

  it('color is undefined by default (auto-detect)', () => {
    const result = parseCliArgs([]);
    expect(result.options.color).toBeUndefined();
  });

  it('parses --fix flag', () => {
    const result = parseCliArgs(['--fix']);
    expect(result.options.fix).toBe(true);
  });

  it('defaults fix to false', () => {
    const result = parseCliArgs([]);
    expect(result.options.fix).toBe(false);
  });

  it('parses add command', () => {
    const result = parseCliArgs(['add']);
    expect(result.command).toBe('add');
  });

  it('parses add command with skill argument', () => {
    const result = parseCliArgs(['add', 'security-review']);
    expect(result.command).toBe('add');
    expect(result.options.skill).toBe('security-review');
  });

  it('parses add --list flag', () => {
    const result = parseCliArgs(['add', '--list']);
    expect(result.command).toBe('add');
    expect(result.options.list).toBe(true);
  });

  it('parses add -l flag', () => {
    const result = parseCliArgs(['add', '-l']);
    expect(result.command).toBe('add');
    expect(result.options.list).toBe(true);
  });

  it('defaults list to false', () => {
    const result = parseCliArgs([]);
    expect(result.options.list).toBe(false);
  });

  it('parses --git flag', () => {
    const result = parseCliArgs(['feature', '--git']);
    expect(result.options.git).toBe(true);
  });

  it('defaults git to false', () => {
    const result = parseCliArgs([]);
    expect(result.options.git).toBe(false);
  });

  it('parses setup-app command', () => {
    const result = parseCliArgs(['setup-app']);
    expect(result.command).toBe('setup-app');
    expect(result.setupAppOptions).toBeDefined();
    expect(result.setupAppOptions?.port).toBe(3000);
    expect(result.setupAppOptions?.timeout).toBe(300);
    expect(result.setupAppOptions?.open).toBe(true);
  });

  it('parses setup-app --org option', () => {
    const result = parseCliArgs(['setup-app', '--org', 'myorg']);
    expect(result.command).toBe('setup-app');
    expect(result.setupAppOptions?.org).toBe('myorg');
  });

  it('parses setup-app --port option', () => {
    const result = parseCliArgs(['setup-app', '--port', '8080']);
    expect(result.command).toBe('setup-app');
    expect(result.setupAppOptions?.port).toBe(8080);
  });

  it('parses setup-app --timeout option', () => {
    const result = parseCliArgs(['setup-app', '--timeout', '60']);
    expect(result.command).toBe('setup-app');
    expect(result.setupAppOptions?.timeout).toBe(60);
  });

  it('parses setup-app --name option', () => {
    const result = parseCliArgs(['setup-app', '--name', 'My Custom App']);
    expect(result.command).toBe('setup-app');
    expect(result.setupAppOptions?.name).toBe('My Custom App');
  });

  it('parses setup-app --no-open flag', () => {
    const result = parseCliArgs(['setup-app', '--no-open']);
    expect(result.command).toBe('setup-app');
    expect(result.setupAppOptions?.open).toBe(false);
  });

  it('parses add command with --repo flag', () => {
    const result = parseCliArgs(['add', '--repo', 'getsentry/skills', '--skill', 'security-review']);
    expect(result.command).toBe('add');
    expect(result.options.repo).toBe('getsentry/skills');
    expect(result.options.skill).toBe('security-review');
  });

  it('parses add command with pinned --repo', () => {
    const result = parseCliArgs(['add', '--repo', 'getsentry/skills@abc123', '--skill', 'security-review']);
    expect(result.command).toBe('add');
    expect(result.options.repo).toBe('getsentry/skills@abc123');
  });

  it('parses add command with --repo and --list', () => {
    const result = parseCliArgs(['add', '--repo', 'getsentry/skills', '--list']);
    expect(result.command).toBe('add');
    expect(result.options.repo).toBe('getsentry/skills');
    expect(result.options.list).toBe(true);
  });

  it('parses --offline flag', () => {
    const result = parseCliArgs(['--offline']);
    expect(result.options.offline).toBe(true);
  });

  it('defaults offline to false', () => {
    const result = parseCliArgs([]);
    expect(result.options.offline).toBe(false);
  });

  it('parses sync command', () => {
    const result = parseCliArgs(['sync']);
    expect(result.command).toBe('sync');
  });

  it('parses sync command with repo argument', () => {
    const result = parseCliArgs(['sync', 'getsentry/skills']);
    expect(result.command).toBe('sync');
    expect(result.options.repo).toBe('getsentry/skills');
  });

  it('parses sync command with --repo flag', () => {
    const result = parseCliArgs(['sync', '--repo', 'getsentry/skills']);
    expect(result.command).toBe('sync');
    expect(result.options.repo).toBe('getsentry/skills');
  });

  it('--repo flag takes precedence over positional in sync', () => {
    const result = parseCliArgs(['sync', 'other/repo', '--repo', 'getsentry/skills']);
    expect(result.command).toBe('sync');
    expect(result.options.repo).toBe('getsentry/skills');
  });
});

describe('CLIOptionsSchema', () => {
  it('validates valid severity levels', () => {
    const severities = ['critical', 'high', 'medium', 'low', 'info'];
    for (const severity of severities) {
      const result = CLIOptionsSchema.safeParse({ failOn: severity });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid severity levels', () => {
    const result = CLIOptionsSchema.safeParse({ failOn: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('defaults json to false', () => {
    const result = CLIOptionsSchema.parse({});
    expect(result.json).toBe(false);
  });

  it('validates positive integer for parallel', () => {
    const result = CLIOptionsSchema.safeParse({ parallel: 4 });
    expect(result.success).toBe(true);
  });

  it('rejects non-positive parallel values', () => {
    const result = CLIOptionsSchema.safeParse({ parallel: 0 });
    expect(result.success).toBe(false);

    const result2 = CLIOptionsSchema.safeParse({ parallel: -1 });
    expect(result2.success).toBe(false);
  });

  it('rejects non-integer parallel values', () => {
    const result = CLIOptionsSchema.safeParse({ parallel: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe('detectTargetType', () => {
  const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockExistsSync.mockReturnValue(false);
  });

  afterEach(() => {
    mockExistsSync.mockReset();
  });

  it('detects git range syntax', () => {
    expect(detectTargetType('main..feature')).toBe('git');
    expect(detectTargetType('HEAD~3..HEAD')).toBe('git');
    expect(detectTargetType('abc123..def456')).toBe('git');
  });

  it('detects relative refs', () => {
    expect(detectTargetType('HEAD~3')).toBe('git');
    expect(detectTargetType('main^2')).toBe('git');
    expect(detectTargetType('feature~')).toBe('git');
  });

  it('detects common git refs', () => {
    expect(detectTargetType('HEAD')).toBe('git');
    expect(detectTargetType('FETCH_HEAD')).toBe('git');
    expect(detectTargetType('ORIG_HEAD')).toBe('git');
  });

  it('detects file paths', () => {
    expect(detectTargetType('src/auth.ts')).toBe('file');
    expect(detectTargetType('./file.ts')).toBe('file');
    expect(detectTargetType('path/to/file.js')).toBe('file');
  });

  it('detects file extensions', () => {
    expect(detectTargetType('file.ts')).toBe('file');
    expect(detectTargetType('file.js')).toBe('file');
    expect(detectTargetType('README.md')).toBe('file');
  });

  it('detects glob patterns', () => {
    expect(detectTargetType('*.ts')).toBe('file');
    expect(detectTargetType('src/**/*.ts')).toBe('file');
    expect(detectTargetType('file?.ts')).toBe('file');
  });

  it('defaults to git for ambiguous targets when path does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    expect(detectTargetType('main')).toBe('git');
    expect(detectTargetType('feature')).toBe('git');
  });

  it('prefers file when ambiguous target exists as file/directory', () => {
    mockExistsSync.mockReturnValue(true);
    expect(detectTargetType('feature')).toBe('file');
    expect(detectTargetType('docs')).toBe('file');
  });

  it('uses cwd option for filesystem check', () => {
    mockExistsSync.mockImplementation((path: string) => path === '/custom/path/feature');
    expect(detectTargetType('feature', { cwd: '/custom/path' })).toBe('file');
    expect(mockExistsSync).toHaveBeenCalledWith('/custom/path/feature');
  });

  it('forceGit option overrides filesystem check', () => {
    mockExistsSync.mockReturnValue(true);
    expect(detectTargetType('feature', { forceGit: true })).toBe('git');
  });

  it('forceGit does not affect unambiguous targets', () => {
    // Git range syntax is still git
    expect(detectTargetType('main..feature', { forceGit: true })).toBe('git');
    // File paths are still file
    expect(detectTargetType('src/auth.ts', { forceGit: true })).toBe('file');
  });
});

describe('classifyTargets', () => {
  const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockExistsSync.mockReturnValue(false);
  });

  afterEach(() => {
    mockExistsSync.mockReset();
  });

  it('classifies file targets', () => {
    const { gitRefs, filePatterns } = classifyTargets(['src/auth.ts', 'file.js']);
    expect(gitRefs).toEqual([]);
    expect(filePatterns).toEqual(['src/auth.ts', 'file.js']);
  });

  it('classifies git targets', () => {
    const { gitRefs, filePatterns } = classifyTargets(['HEAD~3', 'main..feature']);
    expect(gitRefs).toEqual(['HEAD~3', 'main..feature']);
    expect(filePatterns).toEqual([]);
  });

  it('classifies mixed targets', () => {
    const { gitRefs, filePatterns } = classifyTargets(['HEAD~3', 'src/auth.ts']);
    expect(gitRefs).toEqual(['HEAD~3']);
    expect(filePatterns).toEqual(['src/auth.ts']);
  });

  it('classifies ambiguous target as file when path exists', () => {
    mockExistsSync.mockReturnValue(true);
    const { gitRefs, filePatterns } = classifyTargets(['feature']);
    expect(gitRefs).toEqual([]);
    expect(filePatterns).toEqual(['feature']);
  });

  it('forceGit option forces ambiguous targets to git', () => {
    mockExistsSync.mockReturnValue(true);
    const { gitRefs, filePatterns } = classifyTargets(['feature'], { forceGit: true });
    expect(gitRefs).toEqual(['feature']);
    expect(filePatterns).toEqual([]);
  });
});
