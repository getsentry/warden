import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { filterEntries, groupShards, loadCaseEntries, loadCaseFiles, loadCorpusEntries, type SuiteEntry } from './entries.js';

function entry(id: string, ref: string, targets: string[]): SuiteEntry {
  return { id, source: 'corpus', kind: 'bug', repository: 'getsentry/sentry', ref, targets, summary: id };
}

describe('loadCorpusEntries', () => {
  it('loads one entry per corpus finding at its pinned sha', () => {
    const entries = loadCorpusEntries();
    expect(entries).toHaveLength(86);
    expect(new Set(entries.map((e) => e.ref)).size).toBe(6);
    expect(entries[0]).toMatchObject({ id: 'sentry-vuln-001', kind: 'bug', lines: '265-275' });
  });
});

describe('loadCaseEntries', () => {
  it('names cases by owning skill and keeps clean cases separate', () => {
    const cases = loadCaseEntries();
    expect(cases.map((c) => c.id)).toContain('wrdn-dos-review/sentry-grouping-url-regex-backtracking');
    expect(cases.filter((c) => c.kind === 'clean').length).toBeGreaterThan(0);
    expect(cases.every((c) => /^[0-9a-f]{40}$/.test(c.ref) && c.targets.length > 0)).toBe(true);
  });

  it('rejects a malformed case with its path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'security-evals-cases-'));
    try {
      mkdirSync(join(dir, 'wrdn-pii'));
      writeFileSync(join(dir, 'wrdn-pii', 'leak.json'), JSON.stringify({
        kind: 'clean', summary: 's', repository: 'getsentry/sentry', ref: 'a'.repeat(40),
        targets: ['x.py'], source: 'https://github.com/getsentry/sentry/pull/1', noClean: 'why',
      }));
      expect(() => loadCaseFiles(dir)).toThrow(/wrdn-pii\/leak\.json:[\s\S]*noClean only applies to bug cases/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('filterEntries', () => {
  const entries = [entry('sentry-vuln-001', 'a', ['x.py']), entry('wrdn-authz/scim', 'b', ['y.py'])];

  it('matches exact ids and trailing-star prefixes', () => {
    expect(filterEntries(entries, ['wrdn-authz/*']).map((e) => e.id)).toEqual(['wrdn-authz/scim']);
    expect(filterEntries(entries, ['sentry-vuln-001']).map((e) => e.id)).toEqual(['sentry-vuln-001']);
    expect(filterEntries(entries, [])).toBe(entries);
  });

  it('fails when nothing matches', () => {
    expect(() => filterEntries(entries, ['nope'])).toThrow('No entries match nope');
  });
});

describe('groupShards', () => {
  it('makes one shard per ref with deduped targets', () => {
    const shards = groupShards([
      entry('one', 'b', ['x.py']),
      entry('two', 'a', ['y.py']),
      entry('three', 'b', ['x.py', 'z.py']),
    ]);
    expect(shards.map((s) => [s.ref, s.targets, s.entries.length])).toEqual([
      ['a', ['y.py'], 1],
      ['b', ['x.py', 'z.py'], 2],
    ]);
  });
});
