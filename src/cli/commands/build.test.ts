import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CLIOptions } from '../args.js';
import { Reporter } from '../output/reporter.js';
import { Verbosity } from '../output/verbosity.js';
import { runBuild } from './build.js';
import { getRepoRoot } from '../git.js';
import {
  buildGeneratedSkillDefinition,
  generatedSkillDefinitionExists,
} from '../../skill-builder/definition.js';
import { buildSkillOutline } from '../../skill-builder/outline.js';
import { buildGeneratedSkill } from '../../skill-builder/skill.js';
import { getRuntime } from '../../sdk/runtimes/index.js';

vi.mock('../git.js', () => ({
  getRepoRoot: vi.fn(),
}));

vi.mock('../../skill-builder/definition.js', () => ({
  generatedSkillDefinitionExists: vi.fn(),
  buildGeneratedSkillDefinition: vi.fn(),
  createGeneratedSkillDefinition: vi.fn(),
  getGeneratedSkillRoot: vi.fn(),
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
    help: false,
    quiet: false,
    verbose: 0,
    debug: false,
    log: false,
    fix: false,
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

describe('runBuild', () => {
  const getRepoRootMock = vi.mocked(getRepoRoot);
  const generatedSkillDefinitionExistsMock = vi.mocked(generatedSkillDefinitionExists);
  const buildGeneratedSkillDefinitionMock = vi.mocked(buildGeneratedSkillDefinition);
  const buildSkillOutlineMock = vi.mocked(buildSkillOutline);
  const buildGeneratedSkillMock = vi.mocked(buildGeneratedSkill);
  const getRuntimeMock = vi.mocked(getRuntime);

  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-build-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    getRepoRootMock.mockReturnValue(tempDir);
    generatedSkillDefinitionExistsMock.mockReturnValue(true);
    buildGeneratedSkillDefinitionMock.mockReturnValue({
      name: 'security',
      description: 'Generated security skill',
      prompt: 'Find security issues.',
      rootDir: join(tempDir, '.warden', 'skills', 'security'),
    });
    getRuntimeMock.mockReturnValue({} as never);
    buildSkillOutlineMock.mockResolvedValue({
      outline: {
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
      },
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
  });
});
