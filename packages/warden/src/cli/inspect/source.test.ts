import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Finding } from '../../types/index.js';
import { resolveSource } from './source.js';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'f1',
    severity: 'high',
    title: 'Test finding',
    description: 'A test',
    ...overrides,
  };
}

describe('resolveSource', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `warden-source-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns kind=snippet when finding has sourceSnippet (ISC-6)', () => {
    const snippet = {
      path: 'src/foo.ts',
      language: 'typescript',
      startLine: 1,
      endLine: 5,
      targetStartLine: 2,
      targetEndLine: 3,
      lines: [
        { line: 1, content: 'const x = 1;', highlighted: false },
        { line: 2, content: 'const y = 2;', highlighted: true },
        { line: 3, content: 'const z = 3;', highlighted: true },
        { line: 4, content: 'export { x };', highlighted: false },
        { line: 5, content: 'export { y };', highlighted: false },
      ],
    };
    const finding = makeFinding({ sourceSnippet: snippet });
    const result = resolveSource(finding);

    expect(result.kind).toBe('snippet');
    if (result.kind !== 'snippet') throw new Error('unreachable');
    expect(result.title).toBe('Source - Snippet');
    expect(result.snippet).toBe(snippet);
  });

  it('hydrates from the working tree when no snippet but location exists (ISC-11)', () => {
    writeFileSync(
      join(tempDir, 'foo.ts'),
      'line one\nline two\nline three\n',
    );
    const finding = makeFinding({
      location: { path: 'foo.ts', startLine: 2, endLine: 2 },
    });
    const result = resolveSource(finding, { repoRoot: tempDir });

    expect(result.kind).toBe('file');
    if (result.kind !== 'file') throw new Error('unreachable');
    expect(result.title).toBe('Source - File: foo.ts');
    expect(result.lines).toEqual(['line one', 'line two', 'line three']);
    expect(result.startLine).toBe(2);
    expect(result.endLine).toBe(2);
  });

  it('infers language from file extension', () => {
    writeFileSync(join(tempDir, 'code.py'), 'print("hello")\n');
    const finding = makeFinding({
      location: { path: 'code.py', startLine: 1 },
    });
    const result = resolveSource(finding, { repoRoot: tempDir });
    expect(result.kind).toBe('file');
    if (result.kind !== 'file') throw new Error('unreachable');
    expect(result.language).toBe('python');
  });

  it('returns kind=empty when no snippet and file is missing (ISC-12)', () => {
    const finding = makeFinding({
      location: { path: 'nonexistent.ts', startLine: 1 },
    });
    const result = resolveSource(finding, { repoRoot: tempDir });
    expect(result.kind).toBe('empty');
  });

  it('returns kind=empty when finding has no location and no snippet', () => {
    const finding = makeFinding();
    const result = resolveSource(finding);
    expect(result.kind).toBe('empty');
  });

  it('snippet takes priority over a matching file on disk', () => {
    writeFileSync(join(tempDir, 'foo.ts'), 'file content\n');
    const snippet = {
      path: 'foo.ts',
      startLine: 1,
      endLine: 1,
      targetStartLine: 1,
      targetEndLine: 1,
      lines: [{ line: 1, content: 'snippet content', highlighted: true }],
    };
    const finding = makeFinding({
      location: { path: 'foo.ts', startLine: 1 },
      sourceSnippet: snippet,
    });
    const result = resolveSource(finding, { repoRoot: tempDir });
    expect(result.kind).toBe('snippet');
  });

  it('falls back to cwd when file is not under repoRoot', () => {
    const subDir = join(tempDir, 'sub');
    mkdirSync(subDir);
    writeFileSync(join(subDir, 'bar.ts'), 'bar\n');

    const finding = makeFinding({
      location: { path: 'bar.ts', startLine: 1 },
    });
    // repoRoot does not contain bar.ts, but cwd (subDir) does
    const result = resolveSource(finding, { repoRoot: tempDir, cwd: subDir });
    expect(result.kind).toBe('file');
    if (result.kind !== 'file') throw new Error('unreachable');
    expect(result.lines).toEqual(['bar']);
  });
});
