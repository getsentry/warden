import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CLIOptions } from '../args.js';
import { Reporter } from '../output/reporter.js';
import { Verbosity } from '../output/verbosity.js';
import { runBuild, runImprove } from './build.js';
import { getRepoRoot } from '../git.js';
import {
  buildGeneratedSkillDefinition,
  createGeneratedSkillDefinition,
  generatedSkillDefinitionRootExists,
  resolveGeneratedSkillTarget,
} from '../../skill-builder/definition.js';
import {
  buildSkillOutline,
  collectSkillBuildSource,
  collectSkillImproveSource,
  type SkillBuildOutline,
} from '../../skill-builder/outline.js';
import { buildGeneratedSkill } from '../../skill-builder/skill.js';
import { getRuntime } from '../../sdk/runtimes/index.js';

vi.mock('../git.js', () => ({
  getRepoRoot: vi.fn(),
}));

vi.mock('../../skill-builder/definition.js', () => ({
  GENERATED_SKILL_DEFINITION_FILE: 'warden.yaml',
  generatedSkillDefinitionRootExists: vi.fn(),
  buildGeneratedSkillDefinition: vi.fn(),
  createGeneratedSkillDefinition: vi.fn(),
  resolveGeneratedSkillTarget: vi.fn(),
  inferGeneratedSkillDescription: vi.fn((name: string) => name),
}));

vi.mock('../../skill-builder/outline.js', () => ({
  SkillBuildOutlineError: class SkillBuildOutlineError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'SkillBuildOutlineError';
    }
  },
  collectSkillBuildSource: vi.fn(),
  collectSkillImproveSource: vi.fn(),
  buildSkillOutline: vi.fn(),
}));

vi.mock('../../skill-builder/skill.js', () => ({
  GeneratedSkillBuildError: class GeneratedSkillBuildError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'GeneratedSkillBuildError';
    }
  },
  buildGeneratedSkill: vi.fn(),
}));

vi.mock('../../sdk/runtimes/index.js', () => ({
  getRuntime: vi.fn(),
}));

function createTestReporter(): Reporter {
  return new Reporter({ isTTY: false, supportsColor: false, columns: 80 }, Verbosity.Normal);
}

function createOptions(overrides: Partial<CLIOptions> = {}): CLIOptions {
  return {
    json: false,
    traces: false,
    help: false,
    quiet: false,
    verbose: 0,
    debug: false,
    log: false,
    force: false,
    list: false,
    git: false,
    staged: false,
    offline: false,
    failFast: false,
    regenerate: false,
    skill: 'security',
    ...overrides,
  };
}

function createTestOutline(): SkillBuildOutline {
  return {
    version: 1,
    skill: 'security',
    sourceHash: 'source-hash',
    buildVersion: '1',
    scopeProfile: {
      kind: 'domain',
      subject: 'Generic security review',
      localContextUsed: false,
      observedContext: ['Generic security review'],
      unresolvedContext: [],
    },
    build: {
      phases: [{ id: 'outline', status: 'generated' }],
      externalSources: [],
    },
    tracks: [
      {
        id: 'auth-bypass',
        title: 'Authentication bypasses',
        goal: 'Find broken authentication checks.',
        rationale: 'Authentication bugs are core security issues.',
        sourceSignals: ['Auth endpoints'],
        owns: ['Missing auth checks'],
        excludes: ['Credential storage'],
        relevanceSignals: ['Session checks'],
        evidenceFocus: ['Changed auth conditions'],
        checks: ['Trace auth preconditions'],
        safeCounterpatterns: ['Explicit user verification'],
        falsePositiveTraps: ['Defense-in-depth logging'],
        researchHints: [],
      },
      {
        id: 'injection',
        title: 'Injection vulnerabilities',
        goal: 'Find unsafe interpreter boundaries.',
        rationale: 'Injection bugs are high impact.',
        sourceSignals: ['SQL and shell sinks'],
        owns: ['Command and SQL injection'],
        excludes: ['Authorization failures'],
        relevanceSignals: ['Dynamic string assembly'],
        evidenceFocus: ['Changed sink usage'],
        checks: ['Trace input into sinks'],
        safeCounterpatterns: ['Parameterized queries'],
        falsePositiveTraps: ['Static strings'],
        researchHints: [],
      },
    ],
  };
}

describe('runBuild', () => {
  const getRepoRootMock = vi.mocked(getRepoRoot);
  const buildGeneratedSkillDefinitionMock = vi.mocked(buildGeneratedSkillDefinition);
  const createGeneratedSkillDefinitionMock = vi.mocked(createGeneratedSkillDefinition);
  const generatedSkillDefinitionRootExistsMock = vi.mocked(generatedSkillDefinitionRootExists);
  const resolveGeneratedSkillTargetMock = vi.mocked(resolveGeneratedSkillTarget);
  const buildSkillOutlineMock = vi.mocked(buildSkillOutline);
  const collectSkillBuildSourceMock = vi.mocked(collectSkillBuildSource);
  const collectSkillImproveSourceMock = vi.mocked(collectSkillImproveSource);
  const buildGeneratedSkillMock = vi.mocked(buildGeneratedSkill);
  const getRuntimeMock = vi.mocked(getRuntime);

  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = mkdtempSync(join(tmpdir(), 'warden-build-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    getRepoRootMock.mockReturnValue(tempDir);
    resolveGeneratedSkillTargetMock.mockReturnValue({
      displayName: 'security',
      isPath: false,
      rootDir: join(tempDir, '.warden', 'skills', 'security'),
    });
    generatedSkillDefinitionRootExistsMock.mockReturnValue(true);
    buildGeneratedSkillDefinitionMock.mockReturnValue({
      name: 'security',
      description: 'Generated security skill',
      prompt: 'Find security issues.',
      rootDir: join(tempDir, '.warden', 'skills', 'security'),
    });
    createGeneratedSkillDefinitionMock.mockReturnValue({
      name: 'security',
      description: 'security',
      prompt: 'Find security issues.',
      rootDir: join(tempDir, '.warden', 'skills', 'security'),
    });
    getRuntimeMock.mockReturnValue({} as never);
    collectSkillBuildSourceMock.mockReturnValue({
      hash: 'build-source-hash',
      files: [{ path: 'warden.yaml', content: 'version: 1\n' }],
    });
    collectSkillImproveSourceMock.mockReturnValue({
      hash: 'improve-source-hash',
      files: [
        { path: 'warden.yaml', content: 'version: 1\n' },
        { path: 'improvement-brief.md', content: 'Improve the skill.' },
      ],
    });
    buildSkillOutlineMock.mockResolvedValue({
      outline: createTestOutline(),
      source: 'generated',
      statePath: join(tempDir, '.warden', 'skills', 'security', 'build-state.json'),
      durationMs: 1_000,
      usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      numTurns: 1,
    });
    buildGeneratedSkillMock.mockResolvedValue({
      kind: 'generated-skill',
      source: 'generated',
      name: 'security',
      path: join(tempDir, '.warden', 'skills', 'security', 'SKILL.md'),
      bytes: 2_048,
      durationMs: 2_000,
      usage: { inputTokens: 200, outputTokens: 100, costUSD: 0.02 },
      externalSources: [],
      missingInputs: [],
      warnings: [],
      numTurns: 2,
    });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('shows the outline tracks before the generated skill summary', async () => {
    const reporter = createTestReporter();
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const exitCode = await runBuild(createOptions(), reporter);

    expect(exitCode).toBe(0);

    const output = stderrSpy.mock.calls
      .map((call) => call.map((part) => String(part)).join(' '))
      .join('\n');

    expect(output).toContain('OUTLINE');
    expect(output).toContain('TRACKS  2 tracks');
    expect(output).toContain('Authentication bypasses (auth-bypass)');
    expect(output).toContain('Injection vulnerabilities (injection)');
    expect(output).toContain('SKILL');
    expect(output.indexOf('TRACKS  2 tracks')).toBeGreaterThan(output.indexOf('OUTLINE'));
    expect(output.indexOf('TRACKS  2 tracks')).toBeLessThan(output.indexOf('SKILL'));
    expect(output).toContain('Context   2 turns');
    expect(output).not.toContain('0 sources');
  });

  it('does not report historical usage for cached outline loads', async () => {
    const reporter = createTestReporter();
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    buildSkillOutlineMock.mockResolvedValueOnce({
      outline: createTestOutline(),
      source: 'cache',
      statePath: join(tempDir, '.warden', 'skills', 'security', 'build-state.json'),
      durationMs: 1_000,
      usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      numTurns: 1,
    });
    buildGeneratedSkillMock.mockResolvedValueOnce({
      kind: 'generated-skill',
      source: 'cache',
      name: 'security',
      path: join(tempDir, '.warden', 'skills', 'security', 'SKILL.md'),
      bytes: 2_048,
      durationMs: 2_000,
      usage: { inputTokens: 200, outputTokens: 100, costUSD: 0.02 },
      externalSources: [],
      missingInputs: [],
      warnings: [],
      numTurns: 2,
    });

    const exitCode = await runBuild(createOptions(), reporter);

    expect(exitCode).toBe(0);

    const output = stderrSpy.mock.calls
      .map((call) => call.map((part) => String(part)).join(' '))
      .join('\n');

    expect(output).toContain('Loaded outline with 2 tracks  [cached]');
    expect(output).not.toContain('100 input');
    expect(output).not.toContain('$0.01');
    expect(output).not.toContain('0 sources');
    expect(output).not.toContain('1 turn');
  });

  it('prints generated skill authoring warnings', async () => {
    const reporter = createTestReporter();
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    buildGeneratedSkillMock.mockResolvedValueOnce({
      kind: 'generated-skill',
      source: 'generated',
      name: 'security',
      path: join(tempDir, '.warden', 'skills', 'security', 'SKILL.md'),
      bytes: 2_048,
      durationMs: 2_000,
      usage: { inputTokens: 200, outputTokens: 100, costUSD: 0.02 },
      externalSources: [],
      missingInputs: [],
      warnings: ['Authoring reviewer still requested changes after 3 revision passes; using the latest writer draft.'],
      numTurns: 2,
    });

    const exitCode = await runBuild(createOptions(), reporter);

    expect(exitCode).toBe(0);
    const output = stderrSpy.mock.calls
      .map((call) => call.map((part) => String(part)).join(' '))
      .join('\n');
    expect(output).toContain('Authoring reviewer still requested changes after 3 revision passes');
  });

  it('rejects bare model names for the Pi build runtime', async () => {
    const reporter = createTestReporter();
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    writeFileSync(join(tempDir, 'warden.toml'), `version = 1

[defaults]

[defaults.synthesis]
model = "claude-sonnet-4-5"
`, 'utf-8');

    const exitCode = await runBuild(createOptions(), reporter);

    expect(exitCode).toBe(1);
    expect(getRuntimeMock).not.toHaveBeenCalled();
    expect(buildSkillOutlineMock).not.toHaveBeenCalled();
    const output = stderrSpy.mock.calls
      .map((call) => call.map((part) => String(part)).join(' '))
      .join('\n');
    expect(output).toContain(
      'Pi runtime model must use provider/model format: claude-sonnet-4-5'
    );
  });

  it('loads an existing generated skill from an explicit root path', async () => {
    const reporter = createTestReporter();
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const rootDir = join(tempDir, 'skills', 'security');
    resolveGeneratedSkillTargetMock.mockReturnValueOnce({
      displayName: './skills/security',
      isPath: true,
      rootDir,
    });
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), `version: 1
kind: generated-skill
name: security
prompt: |-
  Find security issues.
`, 'utf-8');
    buildGeneratedSkillDefinitionMock.mockReturnValueOnce({
      name: 'security',
      description: 'Generated security skill',
      prompt: 'Find security issues.',
      rootDir,
    });

    const exitCode = await runBuild(createOptions({ skill: './skills/security' }), reporter);

    expect(exitCode).toBe(0);
    expect(generatedSkillDefinitionRootExistsMock).toHaveBeenCalledWith(rootDir);
    expect(buildGeneratedSkillDefinitionMock).toHaveBeenCalledWith(rootDir);
    expect(buildGeneratedSkillMock).toHaveBeenCalledWith(expect.objectContaining({
      rootDir,
    }));
    const output = stderrSpy.mock.calls
      .map((call) => call.map((part) => String(part)).join(' '))
      .join('\n');
    expect(output).toContain('warden src/file.ts --skill ./skills/security');
  });

  it('loads an existing generated skill by name from the resolved root', async () => {
    const reporter = createTestReporter();
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const rootDir = join(tempDir, '.agents', 'skills', 'security');
    resolveGeneratedSkillTargetMock.mockReturnValueOnce({
      displayName: 'security',
      isPath: false,
      rootDir,
    });
    buildGeneratedSkillDefinitionMock.mockReturnValueOnce({
      name: 'actual-security',
      description: 'Generated security skill',
      prompt: 'Find security issues.',
      rootDir,
    });

    const exitCode = await runBuild(createOptions({ skill: 'security' }), reporter);

    expect(exitCode).toBe(0);
    expect(resolveGeneratedSkillTargetMock).toHaveBeenCalledWith(tempDir, 'security');
    expect(buildGeneratedSkillDefinitionMock).toHaveBeenCalledWith(rootDir);
    expect(buildGeneratedSkillMock).toHaveBeenCalledWith(expect.objectContaining({
      rootDir,
    }));
    const output = stderrSpy.mock.calls
      .map((call) => call.map((part) => String(part)).join(' '))
      .join('\n');
    expect(output).toContain('warden src/file.ts --skill actual-security');
  });

  it('creates a generated skill at an explicit root path from the prompt', async () => {
    const reporter = createTestReporter();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const rootDir = join(tempDir, 'skills', 'security');
    resolveGeneratedSkillTargetMock.mockReturnValueOnce({
      displayName: './skills/security',
      isPath: true,
      rootDir,
    });
    generatedSkillDefinitionRootExistsMock.mockReturnValueOnce(false);
    createGeneratedSkillDefinitionMock.mockReturnValueOnce({
      name: 'security',
      description: 'security',
      prompt: 'Find security issues.',
      rootDir,
    });

    const exitCode = await runBuild(createOptions({
      skill: './skills/security',
      prompt: 'Find security issues.',
    }), reporter);

    expect(exitCode).toBe(0);
    expect(generatedSkillDefinitionRootExistsMock).toHaveBeenCalledWith(rootDir);
    expect(createGeneratedSkillDefinitionMock).toHaveBeenCalledWith({
      repoRoot: tempDir,
      name: 'security',
      prompt: 'Find security issues.',
      rootDir,
    });
  });

  it('improves an existing generated skill through the shared builder pipeline', async () => {
    const reporter = createTestReporter();
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const exitCode = await runImprove(createOptions({
      prompt: 'Tighten source provenance and reference navigation.',
    }), reporter);

    expect(exitCode).toBe(0);
    expect(createGeneratedSkillDefinitionMock).not.toHaveBeenCalled();
    expect(collectSkillImproveSourceMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'security' }),
      'Tighten source provenance and reference navigation.',
    );
    expect(buildSkillOutlineMock).toHaveBeenCalledWith(expect.objectContaining({
      regenerate: true,
      source: {
        hash: 'improve-source-hash',
        files: [
          { path: 'warden.yaml', content: 'version: 1\n' },
          { path: 'improvement-brief.md', content: 'Improve the skill.' },
        ],
      },
    }));
    expect(buildGeneratedSkillMock).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'improve',
      improvementPrompt: 'Tighten source provenance and reference navigation.',
      regenerate: true,
      source: {
        hash: 'improve-source-hash',
        files: [
          { path: 'warden.yaml', content: 'version: 1\n' },
          { path: 'improvement-brief.md', content: 'Improve the skill.' },
        ],
      },
    }));
    const output = stderrSpy.mock.calls
      .map((call) => call.map((part) => String(part)).join(' '))
      .join('\n');
    expect(output).toContain('IMPROVE');
    expect(output).toContain('Brief');
  });

  it('does not create missing generated skills from improve', async () => {
    const reporter = createTestReporter();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    generatedSkillDefinitionRootExistsMock.mockReturnValueOnce(false);

    const exitCode = await runImprove(createOptions({
      prompt: 'Improve the skill.',
    }), reporter);

    expect(exitCode).toBe(1);
    expect(createGeneratedSkillDefinitionMock).not.toHaveBeenCalled();
    expect(buildSkillOutlineMock).not.toHaveBeenCalled();
    expect(buildGeneratedSkillMock).not.toHaveBeenCalled();
  });
});
