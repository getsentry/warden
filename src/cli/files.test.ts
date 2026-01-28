import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  createPatchFromContent,
  createSyntheticFileChange,
  expandFileGlobs,
  expandAndCreateFileChanges,
} from './files.js';

describe('createPatchFromContent', () => {
  it('creates patch for single line content', () => {
    const patch = createPatchFromContent('hello world');
    expect(patch).toBe('@@ -0,0 +1,1 @@\n+hello world');
  });

  it('creates patch for multi-line content', () => {
    const patch = createPatchFromContent('line1\nline2\nline3');
    expect(patch).toBe('@@ -0,0 +1,3 @@\n+line1\n+line2\n+line3');
  });

  it('handles empty file', () => {
    const patch = createPatchFromContent('');
    expect(patch).toBe('@@ -0,0 +0,0 @@\n');
  });

  it('handles file ending with newline', () => {
    const patch = createPatchFromContent('line1\nline2\n');
    expect(patch).toBe('@@ -0,0 +1,3 @@\n+line1\n+line2\n+');
  });
});

describe('createSyntheticFileChange', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `warden-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates FileChange from file', () => {
    const filePath = join(tempDir, 'test.ts');
    writeFileSync(filePath, 'const x = 1;\nconst y = 2;');

    const change = createSyntheticFileChange(filePath, tempDir);

    expect(change.filename).toBe('test.ts');
    expect(change.status).toBe('added');
    expect(change.additions).toBe(2);
    expect(change.deletions).toBe(0);
    expect(change.patch).toContain('+const x = 1;');
    expect(change.patch).toContain('+const y = 2;');
  });

  it('handles nested files', () => {
    const subDir = join(tempDir, 'src', 'utils');
    mkdirSync(subDir, { recursive: true });
    const filePath = join(subDir, 'helper.ts');
    writeFileSync(filePath, 'export const helper = () => {};\n');

    const change = createSyntheticFileChange(filePath, tempDir);

    expect(change.filename).toBe('src/utils/helper.ts');
  });
});

describe('expandFileGlobs', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `warden-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('expands glob pattern', async () => {
    writeFileSync(join(tempDir, 'file1.ts'), 'content1');
    writeFileSync(join(tempDir, 'file2.ts'), 'content2');
    writeFileSync(join(tempDir, 'file.js'), 'content3');

    const files = await expandFileGlobs(['*.ts'], tempDir);

    expect(files).toHaveLength(2);
    expect(files.some(f => f.endsWith('file1.ts'))).toBe(true);
    expect(files.some(f => f.endsWith('file2.ts'))).toBe(true);
    expect(files.some(f => f.endsWith('file.js'))).toBe(false);
  });

  it('expands nested glob pattern', async () => {
    const srcDir = join(tempDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(tempDir, 'root.ts'), 'root');
    writeFileSync(join(srcDir, 'nested.ts'), 'nested');

    const files = await expandFileGlobs(['**/*.ts'], tempDir);

    expect(files).toHaveLength(2);
    expect(files.some(f => f.endsWith('root.ts'))).toBe(true);
    expect(files.some(f => f.includes('src/nested.ts'))).toBe(true);
  });

  it('handles specific file path', async () => {
    const filePath = join(tempDir, 'specific.ts');
    writeFileSync(filePath, 'content');

    const files = await expandFileGlobs(['specific.ts'], tempDir);

    expect(files).toHaveLength(1);
    expect(files[0]).toContain('specific.ts');
  });

  it('returns empty for no matches', async () => {
    const files = await expandFileGlobs(['*.nonexistent'], tempDir);
    expect(files).toHaveLength(0);
  });
});

describe('expandAndCreateFileChanges', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `warden-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('combines glob expansion and file change creation', async () => {
    writeFileSync(join(tempDir, 'file1.ts'), 'const a = 1;');
    writeFileSync(join(tempDir, 'file2.ts'), 'const b = 2;\nconst c = 3;');

    const changes = await expandAndCreateFileChanges(['*.ts'], tempDir);

    expect(changes).toHaveLength(2);
    expect(changes.every(c => c.status === 'added')).toBe(true);

    const file1 = changes.find(c => c.filename === 'file1.ts');
    expect(file1).toBeDefined();
    expect(file1?.additions).toBe(1);

    const file2 = changes.find(c => c.filename === 'file2.ts');
    expect(file2).toBeDefined();
    expect(file2?.additions).toBe(2);
  });
});
