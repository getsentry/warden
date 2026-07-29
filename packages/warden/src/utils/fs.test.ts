import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type * as NodeFs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeFileAtomic } from './fs.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFs>();
  return { ...actual, writeFileSync: vi.fn(actual.writeFileSync) };
});

describe('writeFileAtomic', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `warden-fs-atomic-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes the full content in one shot', () => {
    const target = join(tempDir, 'out.json');
    writeFileAtomic(target, '{"a":1}');
    expect(readFileSync(target, 'utf-8')).toBe('{"a":1}');
  });

  it('creates missing parent directories', () => {
    const target = join(tempDir, 'nested', 'deeper', 'out.json');
    writeFileAtomic(target, 'content');
    expect(readFileSync(target, 'utf-8')).toBe('content');
  });

  it('overwrites an existing file', () => {
    const target = join(tempDir, 'out.json');
    writeFileAtomic(target, 'first');
    writeFileAtomic(target, 'second');
    expect(readFileSync(target, 'utf-8')).toBe('second');
  });

  it('leaves no orphaned temp file after a failed write', () => {
    const target = join(tempDir, 'out.json');
    vi.mocked(writeFileSync).mockImplementationOnce(() => {
      throw new Error('disk full');
    });

    expect(() => writeFileAtomic(target, 'content')).toThrow('disk full');
    expect(existsSync(target)).toBe(false);
    expect(readdirSync(tempDir)).toEqual([]);
  });

  it('uses distinct temp file names across concurrent calls to different targets', () => {
    const targetA = join(tempDir, 'a.json');
    const targetB = join(tempDir, 'b.json');
    writeFileAtomic(targetA, 'a');
    writeFileAtomic(targetB, 'b');
    expect(readFileSync(targetA, 'utf-8')).toBe('a');
    expect(readFileSync(targetB, 'utf-8')).toBe('b');
  });
});
