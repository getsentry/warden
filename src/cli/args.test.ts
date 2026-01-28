import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseCliArgs, CLIOptionsSchema, detectTargetType, classifyTargets } from './args.js';

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

  it('defaults to git for ambiguous targets', () => {
    expect(detectTargetType('main')).toBe('git');
    expect(detectTargetType('feature')).toBe('git');
  });
});

describe('classifyTargets', () => {
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
});
