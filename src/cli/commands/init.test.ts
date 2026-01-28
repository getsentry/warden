import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { runInit } from './init.js';
import { Reporter } from '../output/reporter.js';
import { detectOutputMode } from '../output/tty.js';
import { Verbosity } from '../output/verbosity.js';
import type { CLIOptions } from '../args.js';

function createMockReporter(): Reporter {
  return new Reporter(detectOutputMode(false), Verbosity.Normal);
}

function createOptions(overrides: Partial<CLIOptions> = {}): CLIOptions {
  return {
    json: false,
    help: false,
    quiet: false,
    verbose: 0,
    fix: false,
    force: false,
    list: false,
    ...overrides,
  };
}

describe('init command', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `warden-init-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
    originalCwd = process.cwd();
    process.chdir(tempDir);
    // Initialize git repo for tests
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('file creation', () => {
    it('creates warden.toml and workflow in fresh repo', async () => {
      const reporter = createMockReporter();
      const exitCode = await runInit(createOptions(), reporter);

      expect(exitCode).toBe(0);
      expect(existsSync(join(tempDir, 'warden.toml'))).toBe(true);
      expect(existsSync(join(tempDir, '.github', 'workflows', 'warden.yml'))).toBe(true);
    });

    it('creates warden.toml with correct content', async () => {
      const reporter = createMockReporter();
      await runInit(createOptions(), reporter);

      const content = readFileSync(join(tempDir, 'warden.toml'), 'utf-8');
      expect(content).toContain('version = 1');
    });

    it('creates workflow with correct content', async () => {
      const reporter = createMockReporter();
      await runInit(createOptions(), reporter);

      const content = readFileSync(join(tempDir, '.github', 'workflows', 'warden.yml'), 'utf-8');
      expect(content).toContain('name: Warden');
      expect(content).toContain('pull_request');
      expect(content).toContain('ANTHROPIC_API_KEY');
      expect(content).toContain('getsentry/warden@main');
    });
  });

  describe('existing files', () => {
    it('skips existing files without --force', async () => {
      // Create existing files
      writeFileSync(join(tempDir, 'warden.toml'), 'existing content');
      mkdirSync(join(tempDir, '.github', 'workflows'), { recursive: true });
      writeFileSync(join(tempDir, '.github', 'workflows', 'warden.yml'), 'existing workflow');

      const reporter = createMockReporter();
      await runInit(createOptions(), reporter);

      // Files should not be overwritten
      expect(readFileSync(join(tempDir, 'warden.toml'), 'utf-8')).toBe('existing content');
      expect(readFileSync(join(tempDir, '.github', 'workflows', 'warden.yml'), 'utf-8')).toBe('existing workflow');
    });

    it('overwrites existing files with --force', async () => {
      // Create existing files
      writeFileSync(join(tempDir, 'warden.toml'), 'existing content');
      mkdirSync(join(tempDir, '.github', 'workflows'), { recursive: true });
      writeFileSync(join(tempDir, '.github', 'workflows', 'warden.yml'), 'existing workflow');

      const reporter = createMockReporter();
      await runInit(createOptions({ force: true }), reporter);

      // Files should be overwritten with new content
      const tomlContent = readFileSync(join(tempDir, 'warden.toml'), 'utf-8');
      expect(tomlContent).toContain('version = 1');
      expect(tomlContent).not.toBe('existing content');

      const workflowContent = readFileSync(join(tempDir, '.github', 'workflows', 'warden.yml'), 'utf-8');
      expect(workflowContent).toContain('name: Warden');
      expect(workflowContent).not.toBe('existing workflow');
    });
  });

  describe('error handling', () => {
    it('fails when not in a git repository', async () => {
      // Create a non-git directory
      const nonGitDir = join(tmpdir(), `warden-non-git-${Date.now()}`);
      mkdirSync(nonGitDir, { recursive: true });
      process.chdir(nonGitDir);

      try {
        const reporter = createMockReporter();
        const exitCode = await runInit(createOptions(), reporter);

        expect(exitCode).toBe(1);
        expect(existsSync(join(nonGitDir, 'warden.toml'))).toBe(false);
      } finally {
        process.chdir(originalCwd);
        rmSync(nonGitDir, { recursive: true, force: true });
      }
    });
  });
});
