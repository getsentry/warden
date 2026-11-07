import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SUMMARY_TODO, loadCaseFiles } from './entries.js';
import { MATRIX_SKILLS } from './options.js';
import { createResults } from './results.js';
import { inferTargets, parseChangeUrl, scaffoldCase, type ChangedFile, type GitHubReader } from './scaffold.js';
import { validateSuite } from './validate.js';

const FIX = '57f0df6e319f9de3718e0e9804eb65ffc07aca3e';
const PARENT = 'ee57ed6a'.padEnd(40, '0');

// Shaped like getsentry/sentry#108555, which bounded recursion in _encode_value.
const FILES: ChangedFile[] = [
  { filename: 'src/sentry/eventstream/item_helpers.py', status: 'modified' },
  { filename: 'tests/sentry/eventstream/test_item_helpers.py', status: 'modified' },
];

function github(overrides: Partial<GitHubReader> = {}): GitHubReader {
  return {
    pull: async () => ({ title: 'fix(eap): Limit nesting depth in _encode_value', mergeCommit: FIX }),
    commit: async () => ({ sha: FIX, subject: 'fix(eap): Limit nesting depth (#108555)', parents: [PARENT] }),
    compare: async () => FILES,
    ...overrides,
  };
}

describe('parseChangeUrl', () => {
  it('reads pull request and commit URLs', () => {
    expect(parseChangeUrl('https://github.com/getsentry/sentry/pull/108555/files'))
      .toEqual({ owner: 'getsentry', repo: 'sentry', pull: 108555 });
    expect(parseChangeUrl(`https://github.com/getsentry/sentry/commit/${FIX}`))
      .toEqual({ owner: 'getsentry', repo: 'sentry', commit: FIX });
  });

  it('rejects anything else', () => {
    expect(() => parseChangeUrl('https://github.com/getsentry/sentry/issues/1')).toThrow('pull request or commit URL');
  });
});

describe('inferTargets', () => {
  it('keeps modified non-test .py and .ts files and says why it skipped the rest', () => {
    const { targets, skipped } = inferTargets([
      { filename: 'src/sentry/api/endpoints/system_options.py', status: 'modified' },
      { filename: 'static/app/utils/request.ts', status: 'modified' },
      { filename: 'src/sentry/new_helper.py', status: 'added' },
      { filename: 'src/sentry/old_helper.py', status: 'removed' },
      { filename: 'src/sentry/moved.py', status: 'renamed' },
      { filename: 'tests/sentry/api/test_system_options.py', status: 'modified' },
      { filename: 'src/sentry/testutils/factories.py', status: 'modified' },
      { filename: 'src/sentry/conftest.py', status: 'modified' },
      { filename: 'static/app/utils/request.spec.ts', status: 'modified' },
      { filename: 'static/app/views/page.test.ts', status: 'modified' },
      { filename: 'static/app/types/index.d.ts', status: 'modified' },
      { filename: 'CHANGES', status: 'modified' },
    ]);
    expect(targets).toEqual(['src/sentry/api/endpoints/system_options.py', 'static/app/utils/request.ts']);
    expect(Object.fromEntries(skipped.map(({ path, reason }) => [path, reason]))).toEqual({
      'src/sentry/new_helper.py': 'added by the fix, so it is missing at one of the two refs',
      'src/sentry/old_helper.py': 'removed by the fix, so it is missing at one of the two refs',
      'src/sentry/moved.py': 'renamed by the fix, so it is missing at one of the two refs',
      'tests/sentry/api/test_system_options.py': 'test file',
      'src/sentry/testutils/factories.py': 'test file',
      'src/sentry/conftest.py': 'test file',
      'static/app/utils/request.spec.ts': 'test file',
      'static/app/views/page.test.ts': 'test file',
      'static/app/types/index.d.ts': 'not a .py or .ts file',
      CHANGES: 'not a .py or .ts file',
    });
  });
});

describe('scaffoldCase', () => {
  let casesDir: string;

  beforeEach(() => {
    casesDir = mkdtempSync(join(tmpdir(), 'security-evals-cases-'));
  });

  afterEach(() => {
    rmSync(casesDir, { recursive: true, force: true });
  });

  it('writes the bug at the fix parent and the clean twin at the fix', async () => {
    const url = 'https://github.com/getsentry/sentry/pull/108555';
    const result = await scaffoldCase({ url, skill: 'wrdn-dos-review', github: github(), casesDir });

    expect(result).toMatchObject({
      bugId: 'wrdn-dos-review/fix-eap-limit-nesting-depth-in-encode-value',
      cleanId: 'wrdn-dos-review/fix-eap-limit-nesting-depth-in-encode-value-fixed',
      bugRef: PARENT,
      fixRef: FIX,
      targets: ['src/sentry/eventstream/item_helpers.py'],
    });
    expect(JSON.parse(readFileSync(result.bugPath, 'utf8'))).toEqual({
      kind: 'bug',
      summary: SUMMARY_TODO,
      repository: 'getsentry/sentry',
      targets: ['src/sentry/eventstream/item_helpers.py'],
      source: url,
      ref: PARENT,
    });
    expect(JSON.parse(readFileSync(result.cleanPath, 'utf8'))).toMatchObject({ kind: 'clean', ref: FIX, source: url });
  });

  it('writes a pair the validator rejects only for its TODO summary', async () => {
    await scaffoldCase({
      url: `https://github.com/getsentry/sentry/commit/${FIX}`,
      skill: 'wrdn-dos-review',
      name: 'eap-item-encode',
      github: github(),
      casesDir,
    });
    const problems = validateSuite({
      cases: loadCaseFiles(casesDir), corpus: [], skills: MATRIX_SKILLS, baseline: createResults([]),
    });
    expect(problems).toEqual([
      'wrdn-dos-review/eap-item-encode: summary is still the TODO placeholder',
      'wrdn-dos-review/eap-item-encode-fixed: summary is still the TODO placeholder',
    ]);
  });

  it('refuses unmerged pull requests, unknown skills, fixes with no target, and overwrites', async () => {
    const url = 'https://github.com/getsentry/sentry/pull/1';
    await expect(scaffoldCase({
      url, skill: 'wrdn-dos-review', casesDir, github: github({ pull: async () => ({ title: 't', mergeCommit: null }) }),
    })).rejects.toThrow('is not merged');
    await expect(scaffoldCase({ url, skill: 'wrdn-nope', casesDir, github: github() })).rejects.toThrow('Unknown skill');
    await expect(scaffoldCase({
      url, skill: 'wrdn-dos-review', casesDir, github: github({ compare: async () => [FILES[1]!] }),
    })).rejects.toThrow('modified no non-test .py or .ts file');

    await scaffoldCase({ url, skill: 'wrdn-dos-review', name: 'same', casesDir, github: github() });
    await expect(scaffoldCase({ url, skill: 'wrdn-dos-review', name: 'same', casesDir, github: github() }))
      .rejects.toThrow('Case already exists');
  });
});
