import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
  getFindingsOutputPath,
  prepareRuntimeEnvironment,
  writeFindingsOutput,
} from './base.js';

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

    const filePath = writeFindingsOutput([createReport()], createContext(tempDir));

    expect(filePath).toBe(join(tempDir, 'warden-findings.json'));
    expect(existsSync(filePath)).toBe(true);
    expect(readFileSync(process.env['GITHUB_OUTPUT']!, 'utf-8')).toBe(
      'findings-file=warden-findings.json\n'
    );

    const payload = JSON.parse(readFileSync(filePath, 'utf-8')) as {
      summary: { totalFindings: number };
    };
    expect(payload.summary.totalFindings).toBe(1);
  });

  it('falls back to RUNNER_TEMP when no repo path is provided', () => {
    const runnerTemp = join(tempDir, 'runner-temp');
    mkdirSync(runnerTemp);
    process.env['RUNNER_TEMP'] = runnerTemp;

    expect(getFindingsOutputPath()).toBe(join(runnerTemp, 'warden-findings.json'));
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
    configPath: 'warden.toml',
    maxFindings: 50,
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
      },
    ],
  };
}
