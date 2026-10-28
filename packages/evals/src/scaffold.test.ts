import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const octokitMocks = vi.hoisted(() => ({
  getPull: vi.fn(),
  listFiles: vi.fn(),
  getContent: vi.fn(),
}));

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(function () {
    return {
      rest: {
        pulls: {
          get: octokitMocks.getPull,
          listFiles: 'listFiles',
        },
        repos: {
          getContent: octokitMocks.getContent,
        },
      },
      paginate: octokitMocks.listFiles,
    };
  }),
}));

import { loadEvalScenarioFile } from './index.js';
import {
  parseGitHubPullRequestUrl,
  scaffoldEvalFromGitHubPullRequest,
  slugifyEvalName,
} from './scaffold.js';

describe('parseGitHubPullRequestUrl', () => {
  it('parses GitHub pull request URLs', () => {
    expect(parseGitHubPullRequestUrl('https://github.com/getsentry/sentry/pull/12345')).toEqual({
      owner: 'getsentry',
      repo: 'sentry',
      pullNumber: 12345,
    });
  });

  it('rejects non-pull-request URLs', () => {
    expect(() => parseGitHubPullRequestUrl('https://github.com/getsentry/sentry/issues/12345'))
      .toThrow('Expected GitHub pull request URL');
  });
});

describe('slugifyEvalName', () => {
  it('creates stable eval slugs', () => {
    expect(slugifyEvalName('Fix: Project access bypass in API endpoint!'))
      .toBe('fix-project-access-bypass-in-api-endpoint');
  });
});

describe('scaffoldEvalFromGitHubPullRequest', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-eval-scaffold-'));
    octokitMocks.getPull.mockResolvedValue({
      data: {
        title: 'Fix project access bypass',
        body: 'Fixes a project access issue.',
        base: { sha: 'base-sha' },
        head: { sha: 'head-sha' },
      },
    });
    octokitMocks.listFiles.mockResolvedValue([
      { filename: 'src/api.py', status: 'modified' },
      { filename: 'src/new.py', status: 'added' },
      { filename: 'src/renamed.py', previous_filename: 'src/previous.py', status: 'renamed' },
    ]);
    octokitMocks.getContent.mockImplementation(async ({ path, ref }: { path: string; ref: string }) => ({
      data: {
        type: 'file',
        content: Buffer.from(`${path}@${ref}\n`).toString('base64'),
      },
    }));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('writes base-side fixtures and a JSON scenario stub', async () => {
    const result = await scaffoldEvalFromGitHubPullRequest({
      url: 'https://github.com/getsentry/sentry/pull/12345',
      category: 'security-review',
      evalsDir: tempDir,
    });

    expect(result.name).toBe('fix-project-access-bypass');
    expect(result.repository).toBe('getsentry/sentry');
    expect(result.sourceRef).toBe('base-sha');
    expect(result.files.map((file) => file.sourcePath)).toEqual([
      'src/api.py',
      'src/previous.py',
    ]);
    expect(result.skippedFiles).toEqual([{
      sourcePath: 'src/new.py',
      reason: 'added file has no base-side content',
    }]);
    expect(result.files.map((file) => file.fixturePath)).toEqual([
      'fixtures/fix-project-access-bypass/github/getsentry/sentry/src/api.py',
      'fixtures/fix-project-access-bypass/github/getsentry/sentry/src/previous.py',
    ]);
    expect(result.supportingFiles.map((file) => file.fixturePath)).toEqual([
      'fixtures/fix-project-access-bypass/github/getsentry/sentry/LICENSE',
    ]);

    expect(readFileSync(join(tempDir, 'fixtures/fix-project-access-bypass/github/getsentry/sentry/src/api.py'), 'utf-8'))
      .toBe('src/api.py@base-sha\n');
    expect(readFileSync(join(tempDir, 'fixtures/fix-project-access-bypass/github/getsentry/sentry/src/previous.py'), 'utf-8'))
      .toBe('src/previous.py@base-sha\n');
    expect(readFileSync(join(tempDir, 'fixtures/fix-project-access-bypass/github/getsentry/sentry/LICENSE'), 'utf-8'))
      .toBe('LICENSE@base-sha\n');

    const scenario = JSON.parse(
      readFileSync(join(tempDir, 'security-review/fix-project-access-bypass.json'), 'utf-8')
    );
    expect(scenario).toMatchObject({
      given: 'Fix project access bypass',
      files: [
        'fixtures/fix-project-access-bypass/github/getsentry/sentry/src/api.py',
        'fixtures/fix-project-access-bypass/github/getsentry/sentry/src/previous.py',
      ],
      supporting_files: [
        'fixtures/fix-project-access-bypass/github/getsentry/sentry/LICENSE',
      ],
      should_find: [{
        finding: 'TODO: describe the vulnerability fixed by https://github.com/getsentry/sentry/pull/12345',
      }],
      notes: {
        source: 'https://github.com/getsentry/sentry/pull/12345',
        repository: 'getsentry/sentry',
        source_ref: 'base-sha',
        source_files: [
          {
            fixturePath: 'fixtures/fix-project-access-bypass/github/getsentry/sentry/src/api.py',
            sourcePath: 'src/api.py',
            ref: 'base-sha',
          },
          {
            fixturePath: 'fixtures/fix-project-access-bypass/github/getsentry/sentry/src/previous.py',
            sourcePath: 'src/previous.py',
            ref: 'base-sha',
          },
        ],
        side: 'base',
        skipped_files: [{
          sourcePath: 'src/new.py',
          reason: 'added file has no base-side content',
        }],
      },
    });

    const validatedScenario = loadEvalScenarioFile(
      join(tempDir, 'security-review/fix-project-access-bypass.json')
    );
    expect(validatedScenario.notes?.source).toBe('https://github.com/getsentry/sentry/pull/12345');
    expect(validatedScenario.notes?.source_ref).toBe('base-sha');
    expect(validatedScenario.notes?.source_files).toEqual([
      {
        fixturePath: 'fixtures/fix-project-access-bypass/github/getsentry/sentry/src/api.py',
        sourcePath: 'src/api.py',
        ref: 'base-sha',
      },
      {
        fixturePath: 'fixtures/fix-project-access-bypass/github/getsentry/sentry/src/previous.py',
        sourcePath: 'src/previous.py',
        ref: 'base-sha',
      },
    ]);
    expect(validatedScenario.notes?.side).toBe('base');
    expect(validatedScenario.notes?.skipped_files).toEqual([{
      sourcePath: 'src/new.py',
      reason: 'added file has no base-side content',
    }]);
    expect(validatedScenario.supporting_files).toEqual([
      'fixtures/fix-project-access-bypass/github/getsentry/sentry/LICENSE',
    ]);
  });

  it('requires a source repository license when scaffolding fixtures', async () => {
    const missingLicense = new Error('not found') as Error & { status: number };
    missingLicense.status = 404;
    octokitMocks.getContent.mockImplementation(async ({ path, ref }: { path: string; ref: string }) => {
      if (['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md', 'COPYING', 'COPYING.md'].includes(path)) {
        throw missingLicense;
      }
      return {
        data: {
          type: 'file',
          content: Buffer.from(`${path}@${ref}\n`).toString('base64'),
        },
      };
    });

    await expect(scaffoldEvalFromGitHubPullRequest({
      url: 'https://github.com/getsentry/sentry/pull/12345',
      category: 'security-review',
      evalsDir: tempDir,
    })).rejects.toThrow('No root LICENSE file could be scaffolded');
  });

  it('rejects unsafe category and scenario names', async () => {
    await expect(scaffoldEvalFromGitHubPullRequest({
      url: 'https://github.com/getsentry/sentry/pull/12345',
      category: '../security-review',
      evalsDir: tempDir,
    })).rejects.toThrow('Invalid eval category');

    await expect(scaffoldEvalFromGitHubPullRequest({
      url: 'https://github.com/getsentry/sentry/pull/12345',
      category: 'security-review',
      name: '../escape',
      evalsDir: tempDir,
    })).rejects.toThrow('Invalid eval name');
  });

  it('rejects invalid pull request sides', async () => {
    await expect(scaffoldEvalFromGitHubPullRequest({
      url: 'https://github.com/getsentry/sentry/pull/12345',
      category: 'security-review',
      side: 'merge' as 'base',
      evalsDir: tempDir,
    })).rejects.toThrow('Invalid pull request side');
  });
});
