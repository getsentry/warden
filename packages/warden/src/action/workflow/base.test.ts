import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { EventContext, SkillReport } from '../../types/index.js';
import type { ActionInputs } from '../inputs.js';

vi.mock('../../utils/exec.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    execFileNonInteractive: vi.fn(),
    execNonInteractive: vi.fn(),
  };
});

import { execFileNonInteractive, execNonInteractive } from '../../utils/exec.js';
import {
  clearStaleDoneMarker,
  clearStaleFindingsOutput,
  getFindingsOutputPath,
  prepareRuntimeEnvironment,
  writeFindingsOutput,
  writeFindingsOutputLive,
} from './base.js';
import { FindingsOutputSchema } from '../../reporting/output.js';

const mockExecFile = vi.mocked(execFileNonInteractive);
const mockExec = vi.mocked(execNonInteractive);

describe('findings output', () => {
  let tempDir: string;
  let previousGithubOutput: string | undefined;
  let previousGithubWorkspace: string | undefined;
  let previousRunnerTemp: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = mkdtempSync(join(tmpdir(), 'warden-findings-output-'));
    previousGithubOutput = process.env['GITHUB_OUTPUT'];
    previousGithubWorkspace = process.env['GITHUB_WORKSPACE'];
    previousRunnerTemp = process.env['RUNNER_TEMP'];
    process.env['GITHUB_OUTPUT'] = join(tempDir, 'github-output');
    delete process.env['RUNNER_TEMP'];
  });

  afterEach(() => {
    if (previousGithubOutput === undefined) {
      delete process.env['GITHUB_OUTPUT'];
    } else {
      process.env['GITHUB_OUTPUT'] = previousGithubOutput;
    }

    if (previousGithubWorkspace === undefined) {
      delete process.env['GITHUB_WORKSPACE'];
    } else {
      process.env['GITHUB_WORKSPACE'] = previousGithubWorkspace;
    }

    if (previousRunnerTemp === undefined) {
      delete process.env['RUNNER_TEMP'];
    } else {
      process.env['RUNNER_TEMP'] = previousRunnerTemp;
    }

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes findings to the workspace and exposes a repo-relative output path', () => {
    process.env['GITHUB_WORKSPACE'] = tempDir;

    const filePath = writeFindingsOutput(
      [createReport()],
      createContext(tempDir),
      [{
        outcome: 'posted',
        skill: 'test-skill',
        finding: createReport().findings[0]!,
      }],
    );

    expect(filePath).toBe(join(tempDir, 'warden-findings.json'));
    expect(existsSync(filePath)).toBe(true);
    expect(existsSync(`${filePath}.done`)).toBe(true);
    expect(readFileSync(process.env['GITHUB_OUTPUT']!, 'utf-8')).toBe(
      'findings-file=warden-findings.json\n'
    );

    const payload = FindingsOutputSchema.parse(JSON.parse(readFileSync(filePath, 'utf-8')));
    expect(payload.summary.totalFindings).toBe(1);
    expect(payload.skills[0]?.findings[0]?.sourceSnippet).toEqual({
      path: 'src/index.ts',
      startLine: 1,
      endLine: 3,
      targetStartLine: 1,
      targetEndLine: 1,
      lines: [
        { line: 1, content: 'const value = input;', highlighted: true },
        { line: 2, content: 'return value;' },
        { line: 3, content: '}' },
      ],
    });
    expect(payload.findingObservations).toHaveLength(1);
  });

  it('falls back to RUNNER_TEMP when no repo path is provided', () => {
    const runnerTemp = join(tempDir, 'runner-temp');
    mkdirSync(runnerTemp);
    process.env['RUNNER_TEMP'] = runnerTemp;

    expect(getFindingsOutputPath()).toBe(join(runnerTemp, 'warden-findings.json'));
  });
});

describe('clearStaleDoneMarker', () => {
  let tempDir: string;
  let previousGithubWorkspace: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-clear-done-'));
    previousGithubWorkspace = process.env['GITHUB_WORKSPACE'];
    process.env['GITHUB_WORKSPACE'] = tempDir;
  });

  afterEach(() => {
    if (previousGithubWorkspace === undefined) {
      delete process.env['GITHUB_WORKSPACE'];
    } else {
      process.env['GITHUB_WORKSPACE'] = previousGithubWorkspace;
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('removes a .done marker left over from a previous run at the same path', () => {
    const filePath = getFindingsOutputPath(tempDir);
    mkdirSync(tempDir, { recursive: true });
    writeFileSync(`${filePath}.done`, '');

    clearStaleDoneMarker(tempDir);

    expect(existsSync(`${filePath}.done`)).toBe(false);
  });

  it('is a no-op when no .done marker exists', () => {
    expect(() => clearStaleDoneMarker(tempDir)).not.toThrow();
  });
});

describe('clearStaleFindingsOutput', () => {
  let tempDir: string;
  let previousGithubWorkspace: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-clear-findings-'));
    previousGithubWorkspace = process.env['GITHUB_WORKSPACE'];
    process.env['GITHUB_WORKSPACE'] = tempDir;
  });

  afterEach(() => {
    if (previousGithubWorkspace === undefined) {
      delete process.env['GITHUB_WORKSPACE'];
    } else {
      process.env['GITHUB_WORKSPACE'] = previousGithubWorkspace;
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('removes stale findings and their completion marker before a new run', () => {
    const filePath = getFindingsOutputPath(tempDir);
    writeFileSync(filePath, '{"stale":true}');
    writeFileSync(`${filePath}.done`, '');

    clearStaleFindingsOutput(tempDir);

    expect(existsSync(filePath)).toBe(false);
    expect(existsSync(`${filePath}.done`)).toBe(false);
  });

  it('preserves a report input while marking it in progress', () => {
    const filePath = getFindingsOutputPath(tempDir);
    writeFileSync(filePath, '{"replay":true}');
    writeFileSync(`${filePath}.done`, '');

    clearStaleFindingsOutput(tempDir, { preservePayload: true });

    expect(readFileSync(filePath, 'utf-8')).toBe('{"replay":true}');
    expect(existsSync(`${filePath}.done`)).toBe(false);
  });
});

describe('writeFindingsOutputLive', () => {
  let tempDir: string;
  let previousGithubOutput: string | undefined;
  let previousGithubWorkspace: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-findings-live-'));
    previousGithubOutput = process.env['GITHUB_OUTPUT'];
    previousGithubWorkspace = process.env['GITHUB_WORKSPACE'];
    process.env['GITHUB_OUTPUT'] = join(tempDir, 'github-output');
    process.env['GITHUB_WORKSPACE'] = tempDir;
  });

  afterEach(() => {
    if (previousGithubOutput === undefined) {
      delete process.env['GITHUB_OUTPUT'];
    } else {
      process.env['GITHUB_OUTPUT'] = previousGithubOutput;
    }
    if (previousGithubWorkspace === undefined) {
      delete process.env['GITHUB_WORKSPACE'];
    } else {
      process.env['GITHUB_WORKSPACE'] = previousGithubWorkspace;
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes an in-progress snapshot without a .done marker or the findings-file output', () => {
    const filePath = getFindingsOutputPath(tempDir);

    writeFindingsOutputLive([createReport()], createContext(tempDir), []);

    expect(existsSync(filePath)).toBe(true);
    expect(existsSync(`${filePath}.done`)).toBe(false);
    expect(existsSync(process.env['GITHUB_OUTPUT']!)).toBe(false);

    const payload = FindingsOutputSchema.parse(JSON.parse(readFileSync(filePath, 'utf-8')));
    expect(payload.summary.totalFindings).toBe(1);
  });

  it('removes a stale .done marker left over from a previous run at the same path', () => {
    const filePath = getFindingsOutputPath(tempDir);
    mkdirSync(join(tempDir), { recursive: true });
    writeFileSync(`${filePath}.done`, '');

    writeFindingsOutputLive([createReport()], createContext(tempDir), []);

    expect(existsSync(`${filePath}.done`)).toBe(false);
  });

  it('never throws when the write fails', () => {
    const context = createContext(tempDir);
    context.repoPath = '/nonexistent-parent/that-cannot-be-created\0invalid';

    expect(() => writeFindingsOutputLive([createReport()], context, [])).not.toThrow();
  });
});

describe('runtime setup', () => {
  let previousClaudeCodePath: string | undefined;
  let previousHome: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    previousClaudeCodePath = process.env['CLAUDE_CODE_PATH'];
    previousHome = process.env['HOME'];
    delete process.env['CLAUDE_CODE_PATH'];
    process.env['HOME'] = '/tmp/warden-home';
  });

  afterEach(() => {
    if (previousClaudeCodePath === undefined) {
      delete process.env['CLAUDE_CODE_PATH'];
    } else {
      process.env['CLAUDE_CODE_PATH'] = previousClaudeCodePath;
    }

    if (previousHome === undefined) {
      delete process.env['HOME'];
    } else {
      process.env['HOME'] = previousHome;
    }
  });

  it('does not install anything for Pi-only triggers', async () => {
    const env = await prepareRuntimeEnvironment([{ runtime: 'pi' }], createInputs());

    expect(env).toEqual({});
    expect(mockExec).not.toHaveBeenCalled();
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it('installs Claude Code when any matched trigger uses the Claude runtime', async () => {
    let installed = false;
    const homeClaudePath = '/tmp/warden-home/.local/bin/claude';
    mockExecFile.mockImplementation((file, args) => {
      if (file === 'test' && args[1] === homeClaudePath && installed) {
        return '';
      }
      throw new Error('not executable');
    });
    mockExec.mockImplementation(() => {
      installed = true;
      return 'install output';
    });

    await expect(
      prepareRuntimeEnvironment([{ runtime: 'pi' }, { runtime: 'claude' }], createInputs())
    ).resolves.toEqual({ pathToClaudeCodeExecutable: homeClaudePath });
    expect(mockExec).toHaveBeenCalledWith(
      'curl -fsSL https://claude.ai/install.sh | bash -s -- "2.1.32"',
      { timeout: 120_000 }
    );
  });
});

function createInputs(overrides: Partial<ActionInputs> = {}): ActionInputs {
  return {
    anthropicApiKey: 'test-key',
    oauthToken: '',
    githubToken: 'github-token',
    mode: 'run',
    configPath: 'warden.toml',
    maxFindings: 50,
    postChecks: true,
    parallel: 4,
    ...overrides,
  };
}

function createContext(repoPath: string): EventContext {
  return {
    eventType: 'schedule',
    action: 'scheduled',
    repository: {
      owner: 'getsentry',
      name: 'example',
      fullName: 'getsentry/example',
      defaultBranch: 'main',
    },
    pullRequest: {
      number: 1,
      title: 'Scheduled Analysis',
      body: null,
      author: 'warden',
      baseBranch: 'main',
      headBranch: 'main',
      headSha: 'abc123',
      baseSha: 'abc123',
      files: [],
    },
    repoPath,
  };
}

function createReport(): SkillReport {
  return {
    skill: 'test-skill',
    summary: 'Found one issue',
    findings: [
      {
        id: 'finding-1',
        severity: 'high',
        title: 'Example finding',
        description: 'A test finding',
        location: { path: 'src/index.ts', startLine: 1 },
        sourceSnippet: {
          path: 'src/index.ts',
          startLine: 1,
          endLine: 3,
          targetStartLine: 1,
          targetEndLine: 1,
          lines: [
            { line: 1, content: 'const value = input;', highlighted: true },
            { line: 2, content: 'return value;' },
            { line: 3, content: '}' },
          ],
        },
      },
    ],
  };
}
