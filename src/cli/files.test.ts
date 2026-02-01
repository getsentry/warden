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

  describe('gitignore support', () => {
    function initGitRepo(): void {
      mkdirSync(join(tempDir, '.git'), { recursive: true });
    }

    it('excludes files matching .gitignore patterns by default', async () => {
      initGitRepo();
      writeFileSync(join(tempDir, '.gitignore'), 'ignored.ts\nbuild/\n');
      writeFileSync(join(tempDir, 'included.ts'), 'content');
      writeFileSync(join(tempDir, 'ignored.ts'), 'should be ignored');
      mkdirSync(join(tempDir, 'build'), { recursive: true });
      writeFileSync(join(tempDir, 'build', 'output.ts'), 'should be ignored');

      const files = await expandFileGlobs(['**/*.ts'], tempDir);

      expect(files).toHaveLength(1);
      expect(files.some(f => f.endsWith('included.ts'))).toBe(true);
      expect(files.some(f => f.endsWith('ignored.ts'))).toBe(false);
      expect(files.some(f => f.includes('build/'))).toBe(false);
    });

    it('includes ignored files when gitignore: false', async () => {
      initGitRepo();
      writeFileSync(join(tempDir, '.gitignore'), 'ignored.ts\n');
      writeFileSync(join(tempDir, 'included.ts'), 'content');
      writeFileSync(join(tempDir, 'ignored.ts'), 'content');

      const files = await expandFileGlobs(['**/*.ts'], { cwd: tempDir, gitignore: false });

      expect(files).toHaveLength(2);
      expect(files.some(f => f.endsWith('included.ts'))).toBe(true);
      expect(files.some(f => f.endsWith('ignored.ts'))).toBe(true);
    });

    it('handles node_modules pattern', async () => {
      initGitRepo();
      writeFileSync(join(tempDir, '.gitignore'), 'node_modules/\n');
      writeFileSync(join(tempDir, 'index.ts'), 'content');
      mkdirSync(join(tempDir, 'node_modules', 'pkg'), { recursive: true });
      writeFileSync(join(tempDir, 'node_modules', 'pkg', 'index.ts'), 'module');

      const files = await expandFileGlobs(['**/*.ts'], tempDir);

      expect(files).toHaveLength(1);
      expect(files.some(f => f.endsWith('index.ts'))).toBe(true);
      expect(files.some(f => f.includes('node_modules'))).toBe(false);
    });

    it('handles negation patterns in .gitignore', async () => {
      initGitRepo();
      writeFileSync(join(tempDir, '.gitignore'), '*.ts\n!important.ts\n');
      writeFileSync(join(tempDir, 'ignored.ts'), 'ignored');
      writeFileSync(join(tempDir, 'important.ts'), 'not ignored');

      const files = await expandFileGlobs(['**/*.ts'], tempDir);

      expect(files).toHaveLength(1);
      expect(files.some(f => f.endsWith('important.ts'))).toBe(true);
      expect(files.some(f => f.endsWith('ignored.ts'))).toBe(false);
    });

    it('skips gitignore rules when not in a git repository', async () => {
      writeFileSync(join(tempDir, 'file1.ts'), 'content');
      writeFileSync(join(tempDir, 'file2.ts'), 'content');
      writeFileSync(join(tempDir, '.gitignore'), 'file2.ts\n');

      const files = await expandFileGlobs(['**/*.ts'], tempDir);

      expect(files).toHaveLength(2);
    });

    it('handles nested .gitignore files', async () => {
      initGitRepo();
      writeFileSync(join(tempDir, '.gitignore'), 'root-ignored.ts\n');
      mkdirSync(join(tempDir, 'subdir'), { recursive: true });
      writeFileSync(join(tempDir, 'subdir', '.gitignore'), 'subdir-ignored.ts\n');
      writeFileSync(join(tempDir, 'root-ignored.ts'), 'ignored');
      writeFileSync(join(tempDir, 'root-included.ts'), 'included');
      writeFileSync(join(tempDir, 'subdir', 'subdir-ignored.ts'), 'ignored');
      writeFileSync(join(tempDir, 'subdir', 'subdir-included.ts'), 'included');

      const files = await expandFileGlobs(['**/*.ts'], tempDir);

      expect(files).toHaveLength(2);
      expect(files.some(f => f.endsWith('root-included.ts'))).toBe(true);
      expect(files.some(f => f.endsWith('subdir-included.ts'))).toBe(true);
      expect(files.some(f => f.includes('ignored'))).toBe(false);
    });

    it('handles leading slash patterns in nested .gitignore', async () => {
      initGitRepo();
      mkdirSync(join(tempDir, 'subdir'), { recursive: true });
      // Leading slash anchors pattern to the .gitignore location
      writeFileSync(join(tempDir, 'subdir', '.gitignore'), '/anchored.ts\n');
      writeFileSync(join(tempDir, 'subdir', 'anchored.ts'), 'ignored');
      writeFileSync(join(tempDir, 'subdir', 'included.ts'), 'included');

      const files = await expandFileGlobs(['**/*.ts'], tempDir);

      expect(files).toHaveLength(1);
      expect(files.some(f => f.endsWith('included.ts'))).toBe(true);
      expect(files.some(f => f.endsWith('anchored.ts'))).toBe(false);
    });
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
