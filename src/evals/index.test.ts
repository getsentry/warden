import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { discoverEvalFiles, loadEvalFile, resolveEvalMetas, discoverEvals } from './index.js';
import { DEFAULT_EVAL_MODEL, EvalFileSchema, EvalScenarioSchema } from './types.js';

const evalsDir = join(import.meta.dirname, '..', '..', 'evals');

describe('discoverEvalFiles', () => {
  it('returns array of YAML file paths', () => {
    const files = discoverEvalFiles(evalsDir);

    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file).toMatch(/\.ya?ml$/);
    }
  });

  it('returns empty array for non-existent directory', () => {
    const files = discoverEvalFiles('/non/existent/path');
    expect(files).toEqual([]);
  });

  it('returns sorted paths', () => {
    const files = discoverEvalFiles(evalsDir);
    const sorted = [...files].sort();
    expect(files).toEqual(sorted);
  });
});

describe('loadEvalFile', () => {
  it('loads and validates a YAML eval file', () => {
    const files = discoverEvalFiles(evalsDir);
    expect(files.length).toBeGreaterThan(0);

    const evalFile = loadEvalFile(files[0]!);
    expect(evalFile).toHaveProperty('skill');
    expect(evalFile).toHaveProperty('evals');
    expect(Array.isArray(evalFile.evals)).toBe(true);
    expect(evalFile.evals.length).toBeGreaterThan(0);
  });

  it('loads all YAML eval files without error', () => {
    const files = discoverEvalFiles(evalsDir);
    for (const file of files) {
      expect(() => loadEvalFile(file)).not.toThrow();
    }
  });

  it('throws for missing file', () => {
    expect(() => loadEvalFile('/non/existent.yaml')).toThrow('Eval file not found');
  });
});

describe('resolveEvalMetas', () => {
  it('resolves scenarios into EvalMeta objects', () => {
    const files = discoverEvalFiles(evalsDir);
    const evalFile = loadEvalFile(files[0]!);
    const metas = resolveEvalMetas(evalFile, files[0]!);

    expect(metas.length).toBe(evalFile.evals.length);
    for (const meta of metas) {
      expect(meta).toHaveProperty('name');
      expect(meta).toHaveProperty('category');
      expect(meta).toHaveProperty('given');
      expect(meta).toHaveProperty('skillPath');
      expect(meta).toHaveProperty('filePaths');
      expect(meta).toHaveProperty('model');
      expect(meta).toHaveProperty('should_find');
      expect(meta).toHaveProperty('should_not_find');
    }
  });

  it('resolves skill path as absolute', () => {
    const files = discoverEvalFiles(evalsDir);
    const evalFile = loadEvalFile(files[0]!);
    const metas = resolveEvalMetas(evalFile, files[0]!);

    for (const meta of metas) {
      expect(meta.skillPath).toMatch(/^\//);
      expect(meta.skillPath).toContain('evals/skills/');
    }
  });

  it('resolves fixture file paths as absolute', () => {
    const files = discoverEvalFiles(evalsDir);
    const evalFile = loadEvalFile(files[0]!);
    const metas = resolveEvalMetas(evalFile, files[0]!);

    for (const meta of metas) {
      for (const filePath of meta.filePaths) {
        expect(filePath).toMatch(/^\//);
        expect(filePath).toContain('evals/fixtures/');
      }
    }
  });

  it('extracts category from YAML filename', () => {
    const files = discoverEvalFiles(evalsDir);
    const evalFile = loadEvalFile(files[0]!);
    const metas = resolveEvalMetas(evalFile, files[0]!);

    // First file alphabetically should be bug-detection.yaml
    expect(metas[0]!.category).toBe('bug-detection');
  });
});

describe('discoverEvals', () => {
  it('returns a flat list of all eval metas', () => {
    const evals = discoverEvals(evalsDir);

    expect(evals.length).toBeGreaterThan(0);
    for (const meta of evals) {
      expect(meta).toHaveProperty('name');
      expect(meta).toHaveProperty('category');
      expect(meta).toHaveProperty('given');
      expect(meta.should_find.length).toBeGreaterThan(0);
    }
  });

  it('returns empty array for non-existent directory', () => {
    const evals = discoverEvals('/non/existent/path');
    expect(evals).toEqual([]);
  });
});

describe('EvalFileSchema', () => {
  it('validates a correct YAML structure', () => {
    const valid = {
      skill: 'skills/bug-detection.md',
      evals: [{
        name: 'test-eval',
        given: 'code with a bug',
        files: ['fixtures/test/file.ts'],
        should_find: [{ finding: 'the bug' }],
      }],
    };
    const result = EvalFileSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('applies default model', () => {
    const valid = {
      skill: 'skills/test.md',
      evals: [{
        name: 'test',
        given: 'test scenario',
        files: ['fixtures/test.ts'],
        should_find: [{ finding: 'a bug' }],
      }],
    };
    const result = EvalFileSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBe(DEFAULT_EVAL_MODEL);
    }
  });

  it('rejects missing skill', () => {
    const invalid = {
      evals: [{
        name: 'test',
        given: 'test',
        files: ['file.ts'],
        should_find: [{ finding: 'bug' }],
      }],
    };
    const result = EvalFileSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects empty evals array', () => {
    const invalid = {
      skill: 'skills/test.md',
      evals: [],
    };
    const result = EvalFileSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('EvalScenarioSchema', () => {
  it('validates a correct scenario', () => {
    const valid = {
      name: 'null-access',
      given: 'code with null bug',
      files: ['fixtures/handler.ts'],
      should_find: [{ finding: 'null access', severity: 'high' }],
    };
    const result = EvalScenarioSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('applies default required=true for should_find', () => {
    const valid = {
      name: 'test',
      given: 'test',
      files: ['file.ts'],
      should_find: [{ finding: 'bug' }],
    };
    const result = EvalScenarioSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.should_find[0]!.required).toBe(true);
    }
  });

  it('rejects empty files array', () => {
    const invalid = {
      name: 'test',
      given: 'test',
      files: [],
      should_find: [{ finding: 'bug' }],
    };
    const result = EvalScenarioSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects empty should_find', () => {
    const invalid = {
      name: 'test',
      given: 'test',
      files: ['file.ts'],
      should_find: [],
    };
    const result = EvalScenarioSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid severity', () => {
    const invalid = {
      name: 'test',
      given: 'test',
      files: ['file.ts'],
      should_find: [{ finding: 'test', severity: 'invalid' }],
    };
    const result = EvalScenarioSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
