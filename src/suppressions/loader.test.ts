import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadSuppressions } from './loader.js';

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'warden-test-'));
}

function writeSuppressionsFile(repoPath: string, content: string): void {
  const dir = join(repoPath, '.agents', 'warden');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'suppressions.yaml'), content);
}

describe('loadSuppressions', () => {
  it('returns empty array when file does not exist', () => {
    const repoPath = makeTempDir();
    expect(loadSuppressions(repoPath)).toEqual([]);
  });

  it('loads valid suppressions file', () => {
    const repoPath = makeTempDir();
    writeSuppressionsFile(repoPath, `
suppressions:
  - skill: "security-audit"
    paths: ["src/legacy/**"]
    reason: "Legacy code"
  - skill: "security-audit"
    paths: ["src/admin/query.ts"]
    title: "SQL injection"
    reason: "Uses parameterized queries"
`);

    const rules = loadSuppressions(repoPath);
    expect(rules).toHaveLength(2);
    expect(rules[0]).toEqual({
      skill: 'security-audit',
      paths: ['src/legacy/**'],
      reason: 'Legacy code',
    });
    expect(rules[1]).toEqual({
      skill: 'security-audit',
      paths: ['src/admin/query.ts'],
      title: 'SQL injection',
      reason: 'Uses parameterized queries',
    });
  });

  it('returns empty array for file with empty suppressions list', () => {
    const repoPath = makeTempDir();
    writeSuppressionsFile(repoPath, 'suppressions: []\n');

    expect(loadSuppressions(repoPath)).toEqual([]);
  });

  it('throws on malformed YAML', () => {
    const repoPath = makeTempDir();
    writeSuppressionsFile(repoPath, '{{not: yaml');

    expect(() => loadSuppressions(repoPath)).toThrow();
  });

  it('throws on invalid schema (missing required fields)', () => {
    const repoPath = makeTempDir();
    writeSuppressionsFile(repoPath, `
suppressions:
  - skill: "test"
`);

    expect(() => loadSuppressions(repoPath)).toThrow(/Invalid suppressions file/);
  });

  it('throws when paths is empty', () => {
    const repoPath = makeTempDir();
    writeSuppressionsFile(repoPath, `
suppressions:
  - skill: "test"
    paths: []
    reason: "no paths"
`);

    expect(() => loadSuppressions(repoPath)).toThrow(/Invalid suppressions file/);
  });
});
