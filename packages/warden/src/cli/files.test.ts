import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import {
  createPatchFromContent,
  createSyntheticFileChange,
  expandFileGlobs,
  expandAndCreateFileChanges,
  getEffectivePrunePatterns,
} from './files.js';

function initGitRepo(dir: string): void {
  execFileSync('git', ['init', '--initial-branch=main'], { cwd: dir, stdio: 'ignore' });
}

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

  it('does not read oversized files while creating synthetic file changes', () => {
    const filePath = join(tempDir, 'large.ts');
    writeFileSync(filePath, 'x'.repeat(20));

    const change = createSyntheticFileChange(filePath, tempDir, {
      scan: { maxFileBytes: 10 },
    });

    expect(change).toEqual({
      filename: 'large.ts',
      status: 'added',
      additions: 0,
      deletions: 0,
      chunks: 0,
    });
  });

  it('does not read ignored files while creating synthetic file changes', () => {
    const filePath = join(tempDir, 'ignored.ts');
    writeFileSync(filePath, 'const ignored = true;');

    const change = createSyntheticFileChange(filePath, tempDir, {
      ignore: { paths: ['ignored.ts'] },
    });

    expect(change).toEqual({
      filename: 'ignored.ts',
      status: 'added',
      additions: 0,
      deletions: 0,
      chunks: 0,
    });
  });
});

describe('getEffectivePrunePatterns', () => {
  it('returns all built-in prune patterns when no user overrides', () => {
    const patterns = getEffectivePrunePatterns();
    expect(patterns).toContain('**/vendor/**');
    expect(patterns).toContain('**/node_modules/**');
    expect(patterns).toContain('**/dist/**');
  });

  it('returns all built-in prune patterns when user paths have no negations', () => {
    const patterns = getEffectivePrunePatterns(['*.log', 'tmp/']);
    expect(patterns).toContain('**/vendor/**');
    expect(patterns).toContain('**/node_modules/**');
  });

  it('removes vendor prune when user has a !vendor negation', () => {
    const patterns = getEffectivePrunePatterns(['!vendor/**']);
    expect(patterns).not.toContain('**/vendor/**');
    // other prune patterns are unaffected
    expect(patterns).toContain('**/node_modules/**');
  });

  it('removes node_modules prune when user has a !node_modules negation', () => {
    const patterns = getEffectivePrunePatterns(['!node_modules/**']);
    expect(patterns).not.toContain('**/node_modules/**');
    expect(patterns).toContain('**/vendor/**');
  });

  it('handles negation with path separator prefix', () => {
    const patterns = getEffectivePrunePatterns(['!src/vendor/special/**']);
    expect(patterns).not.toContain('**/vendor/**');
  });

  it('handles undefined user paths gracefully', () => {
    expect(() => getEffectivePrunePatterns(undefined)).not.toThrow();
    const patterns = getEffectivePrunePatterns(undefined);
    expect(patterns).toContain('**/vendor/**');
  });
});

describe('expandFileGlobs', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `warden-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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

  it('expands a directory target recursively', async () => {
    const srcDir = join(tempDir, 'src');
    const nestedDir = join(srcDir, 'nested');
    mkdirSync(nestedDir, { recursive: true });
    writeFileSync(join(srcDir, 'index.ts'), 'index');
    writeFileSync(join(nestedDir, 'helper.ts'), 'helper');
    writeFileSync(join(tempDir, 'root.ts'), 'root');

    const files = await expandFileGlobs(['src'], tempDir);

    expect(files).toHaveLength(2);
    expect(files.some(f => f.includes('src/index.ts'))).toBe(true);
    expect(files.some(f => f.includes('src/nested/helper.ts'))).toBe(true);
    expect(files.some(f => f.endsWith('root.ts'))).toBe(false);
  });

  it('handles specific file path', async () => {
    const filePath = join(tempDir, 'specific.ts');
    writeFileSync(filePath, 'content');

    const files = await expandFileGlobs(['specific.ts'], tempDir);

    expect(files).toHaveLength(1);
    expect(files[0]).toContain('specific.ts');
  });

  it('does not pass outside-repo absolute paths to gitignore matching', async () => {
    const outsideDir = join(tmpdir(), `warden-outside-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(outsideDir, { recursive: true });

    try {
      const outsideFile = join(outsideDir, 'outside.ts');
      writeFileSync(outsideFile, 'content');

      const files = await expandFileGlobs([outsideFile], tempDir);

      expect(files).toEqual([outsideFile]);
    } finally {
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it('returns empty for no matches', async () => {
    const files = await expandFileGlobs(['*.nonexistent'], tempDir);
    expect(files).toHaveLength(0);
  });

  describe('built-in directory pruning', () => {
    it('prunes vendor/ directory by default without gitignore', async () => {
      // Simulate a new laravel-style app: app code + vendor/ with PHP files
      mkdirSync(join(tempDir, 'app'), { recursive: true });
      mkdirSync(join(tempDir, 'vendor', 'laravel', 'framework'), { recursive: true });
      writeFileSync(join(tempDir, 'app', 'Controller.php'), '<?php class Controller {}');
      writeFileSync(join(tempDir, 'vendor', 'laravel', 'framework', 'Framework.php'), '<?php');

      const files = await expandFileGlobs(['**/*.php'], tempDir);

      expect(files.some(f => f.includes('app/Controller.php'))).toBe(true);
      expect(files.some(f => f.includes('vendor/'))).toBe(false);
    });

    it('prunes node_modules/ directory by default', async () => {
      mkdirSync(join(tempDir, 'src'), { recursive: true });
      mkdirSync(join(tempDir, 'node_modules', 'pkg'), { recursive: true });
      writeFileSync(join(tempDir, 'src', 'index.ts'), 'export {}');
      writeFileSync(join(tempDir, 'node_modules', 'pkg', 'index.ts'), 'module');

      const files = await expandFileGlobs(['**/*.ts'], tempDir);

      expect(files.some(f => f.includes('src/index.ts'))).toBe(true);
      expect(files.some(f => f.includes('node_modules/'))).toBe(false);
    });

    it('prunes vendor/ even when not in a git repo (no gitignore fallback needed)', async () => {
      // No git init — this tests that the fast-glob level prune works independently
      mkdirSync(join(tempDir, 'app'), { recursive: true });
      mkdirSync(join(tempDir, 'vendor', 'lib'), { recursive: true });
      writeFileSync(join(tempDir, 'app', 'main.php'), '<?php');
      writeFileSync(join(tempDir, 'vendor', 'lib', 'dep.php'), '<?php');

      const files = await expandFileGlobs(['**/*.php'], tempDir);

      expect(files.some(f => f.includes('app/main.php'))).toBe(true);
      expect(files.some(f => f.includes('vendor/'))).toBe(false);
    });

    it('re-includes vendor/ when user ignore has a !vendor negation', async () => {
      mkdirSync(join(tempDir, 'app'), { recursive: true });
      mkdirSync(join(tempDir, 'vendor', 'lib'), { recursive: true });
      writeFileSync(join(tempDir, 'app', 'main.php'), '<?php class App {}');
      writeFileSync(join(tempDir, 'vendor', 'lib', 'dep.php'), '<?php class Dep {}');

      const files = await expandFileGlobs(['**/*.php'], {
        cwd: tempDir,
        ignore: { paths: ['!vendor/**'] },
      });

      expect(files.some(f => f.includes('app/main.php'))).toBe(true);
      expect(files.some(f => f.includes('vendor/lib/dep.php'))).toBe(true);
    });
  });

  describe('gitignore support', () => {
    it('excludes files matching .gitignore patterns by default', async () => {
      initGitRepo(tempDir);
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
      initGitRepo(tempDir);
      writeFileSync(join(tempDir, '.gitignore'), 'ignored.ts\n');
      writeFileSync(join(tempDir, 'included.ts'), 'content');
      writeFileSync(join(tempDir, 'ignored.ts'), 'content');

      const files = await expandFileGlobs(['**/*.ts'], { cwd: tempDir, gitignore: false });

      expect(files).toHaveLength(2);
      expect(files.some(f => f.endsWith('included.ts'))).toBe(true);
      expect(files.some(f => f.endsWith('ignored.ts'))).toBe(true);
    });

    it('handles node_modules pattern', async () => {
      initGitRepo(tempDir);
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
      initGitRepo(tempDir);
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

    it('ignores bogus ancestor .git directories', async () => {
      const childDir = join(tempDir, 'child');
      mkdirSync(join(tempDir, '.git'), { recursive: true });
      mkdirSync(childDir, { recursive: true });
      writeFileSync(join(tempDir, '.gitignore'), 'child/file2.ts\n');
      writeFileSync(join(childDir, 'file1.ts'), 'content');
      writeFileSync(join(childDir, 'file2.ts'), 'content');

      const files = await expandFileGlobs(['**/*.ts'], childDir);

      expect(files).toHaveLength(2);
    });

    it('handles nested .gitignore files', async () => {
      initGitRepo(tempDir);
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
      initGitRepo(tempDir);
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

    it('applies gitignore rules to symlink paths instead of symlink targets', async () => {
      initGitRepo(tempDir);
      const outsideDir = join(tmpdir(), `warden-outside-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      mkdirSync(outsideDir, { recursive: true });

      try {
        const outsideFile = join(outsideDir, 'target.ts');
        writeFileSync(outsideFile, 'content');
        writeFileSync(join(tempDir, '.gitignore'), 'ignored-link.ts\n');
        symlinkSync(outsideFile, join(tempDir, 'ignored-link.ts'));

        const files = await expandFileGlobs(['ignored-link.ts'], tempDir);

        expect(files).toEqual([]);
      } finally {
        rmSync(outsideDir, { recursive: true, force: true });
      }
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

  it('passes ignore config through so user negations can re-include pruned dirs', async () => {
    mkdirSync(join(tempDir, 'app'), { recursive: true });
    mkdirSync(join(tempDir, 'vendor', 'lib'), { recursive: true });
    writeFileSync(join(tempDir, 'app', 'main.php'), '<?php class App {}');
    writeFileSync(join(tempDir, 'vendor', 'lib', 'dep.php'), '<?php class Dep {}');

    // Without negation: vendor is pruned
    const withoutOverride = await expandAndCreateFileChanges(['**/*.php'], tempDir);
    expect(withoutOverride.some(f => f.filename.includes('vendor/'))).toBe(false);

    // With negation: vendor is re-included at traversal time
    const withOverride = await expandAndCreateFileChanges(['**/*.php'], tempDir, {
      ignore: { paths: ['!vendor/**'] },
    });
    expect(withOverride.some(f => f.filename.includes('vendor/'))).toBe(true);
  });
});
