import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync, readlinkSync, lstatSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { runInit } from './init.js';
import { Reporter } from '../output/reporter.js';
import { detectOutputMode } from '../output/tty.js';
import { Verbosity } from '../output/verbosity.js';
import type { CLIOptions } from '../args.js';
import { getMajorVersion } from '../../utils/index.js';

function createMockReporter(): Reporter {
  return new Reporter(detectOutputMode(false), Verbosity.Normal);
}

function createOptions(overrides: Partial<CLIOptions> = {}): CLIOptions {
  return {
    json: false,
    help: false,
    quiet: false,
    verbose: 0,
    debug: false,
    log: false,
    fix: false,
    force: false,
    list: false,
    git: false,
    offline: false,
    failFast: false,
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
      expect(content).toContain('permissions:');
      expect(content).toContain('pull-requests: write');
      expect(content).toContain('checks: write');
      expect(content).toContain('WARDEN_ANTHROPIC_API_KEY');
      expect(content).toContain(`getsentry/warden@v${getMajorVersion()}`);
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

  describe('bundled skill installation', () => {
    it('installs warden and warden-sweep skills with --force', async () => {
      const reporter = createMockReporter();
      await runInit(createOptions({ force: true }), reporter);

      expect(existsSync(join(tempDir, '.agents', 'skills', 'warden', 'SKILL.md'))).toBe(true);
      expect(existsSync(join(tempDir, '.agents', 'skills', 'warden-sweep', 'SKILL.md'))).toBe(true);
    });

    it('copies warden skill references with --force', async () => {
      const reporter = createMockReporter();
      await runInit(createOptions({ force: true }), reporter);

      const refsDir = join(tempDir, '.agents', 'skills', 'warden', 'references');
      expect(existsSync(join(refsDir, 'cli-reference.md'))).toBe(true);
      expect(existsSync(join(refsDir, 'configuration.md'))).toBe(true);
    });

    it('copies warden-sweep scripts with --force', async () => {
      const reporter = createMockReporter();
      await runInit(createOptions({ force: true }), reporter);

      const scriptsDir = join(tempDir, '.agents', 'skills', 'warden-sweep', 'scripts');
      expect(existsSync(join(scriptsDir, 'extract_findings.py'))).toBe(true);
      expect(existsSync(join(scriptsDir, 'generate_report.py'))).toBe(true);
      expect(existsSync(join(scriptsDir, 'find_reviewers.py'))).toBe(true);
    });

    it('skips bundled skills that already exist without --force', async () => {
      // Pre-create all skill directories so allSkillsInstalled returns true
      const skillDir = join(tempDir, '.agents', 'skills', 'warden');
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, 'SKILL.md'), 'custom content');
      const sweepDir = join(tempDir, '.agents', 'skills', 'warden-sweep');
      mkdirSync(sweepDir, { recursive: true });
      writeFileSync(join(sweepDir, 'SKILL.md'), 'custom sweep');

      const reporter = createMockReporter();
      await runInit(createOptions(), reporter);

      // Custom content should be preserved
      expect(readFileSync(join(skillDir, 'SKILL.md'), 'utf-8')).toBe('custom content');
    });

    it('overwrites bundled skills with --force', async () => {
      // Pre-create the skill directory with custom content
      const skillDir = join(tempDir, '.agents', 'skills', 'warden');
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, 'SKILL.md'), 'custom content');

      const reporter = createMockReporter();
      await runInit(createOptions({ force: true }), reporter);

      // Should be replaced with bundled content
      const content = readFileSync(join(skillDir, 'SKILL.md'), 'utf-8');
      expect(content).not.toBe('custom content');
      expect(content).toContain('name: warden');
    });

    it('does not register bundled skills in warden.toml', async () => {
      const reporter = createMockReporter();
      await runInit(createOptions({ force: true }), reporter);

      const toml = readFileSync(join(tempDir, 'warden.toml'), 'utf-8');
      expect(toml).not.toContain('name = "warden"');
      expect(toml).not.toContain('name = "warden-sweep"');
    });

    it('skips skills in non-TTY mode without --force', async () => {
      const reporter = createMockReporter();
      await runInit(createOptions(), reporter);

      // Skills should not be installed in non-TTY mode without --force
      expect(existsSync(join(tempDir, '.agents', 'skills', 'warden', 'SKILL.md'))).toBe(false);
    });
  });

  describe('claude symlink', () => {
    it('creates .claude/skills symlink when .claude/ directory exists', async () => {
      mkdirSync(join(tempDir, '.claude'), { recursive: true });

      const reporter = createMockReporter();
      await runInit(createOptions({ force: true }), reporter);

      const skillsLink = join(tempDir, '.claude', 'skills');
      expect(lstatSync(skillsLink).isSymbolicLink()).toBe(true);
      expect(readlinkSync(skillsLink)).toBe('../.agents/skills');
    });

    it('does not create symlink when .claude/ does not exist', async () => {
      const reporter = createMockReporter();
      await runInit(createOptions({ force: true }), reporter);

      expect(existsSync(join(tempDir, '.claude', 'skills'))).toBe(false);
    });

    it('replaces existing .claude/skills directory with symlink using --force', async () => {
      mkdirSync(join(tempDir, '.claude', 'skills'), { recursive: true });

      const reporter = createMockReporter();
      await runInit(createOptions({ force: true }), reporter);

      // With --force, should replace directory with symlink
      expect(lstatSync(join(tempDir, '.claude', 'skills')).isSymbolicLink()).toBe(true);
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
