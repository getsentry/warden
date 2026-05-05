import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { EventContext, SkillReport } from '../../types/index.js';
import { getFindingsOutputPath, writeFindingsOutput } from './base.js';

describe('findings output', () => {
  let tempDir: string;
  let previousGithubOutput: string | undefined;
  let previousGithubWorkspace: string | undefined;
  let previousRunnerTemp: string | undefined;

  beforeEach(() => {
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
