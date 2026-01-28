import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { discoverExamples, loadExample, getExampleFiles, ExampleMetaSchema } from './index.js';

const examplesDir = join(import.meta.dirname, '..', '..', 'examples');

describe('discoverExamples', () => {
  it('finds all example directories', () => {
    const examples = discoverExamples(examplesDir);

    expect(examples.length).toBeGreaterThan(0);
    // All discovered paths should contain _meta.json
    for (const dir of examples) {
      expect(dir).toContain('examples');
    }
  });

  it('returns empty array for non-existent directory', () => {
    const examples = discoverExamples('/non/existent/path');
    expect(examples).toEqual([]);
  });
});

describe('loadExample', () => {
  it('loads and validates _meta.json', () => {
    const examples = discoverExamples(examplesDir);
    expect(examples.length).toBeGreaterThan(0);

    const meta = loadExample(examples[0]!);
    expect(meta).toHaveProperty('skill');
    expect(meta).toHaveProperty('description');
    expect(meta).toHaveProperty('expected');
    expect(Array.isArray(meta.expected)).toBe(true);
  });

  it('throws for missing _meta.json', () => {
    expect(() => loadExample('/non/existent')).toThrow('No _meta.json found');
  });
});

describe('getExampleFiles', () => {
  it('returns source files excluding _meta.json', () => {
    const examples = discoverExamples(examplesDir);
    expect(examples.length).toBeGreaterThan(0);

    const files = getExampleFiles(examples[0]!);
    expect(files.length).toBeGreaterThan(0);

    // None of the files should be _meta.json
    for (const file of files) {
      expect(file).not.toContain('_meta.json');
    }
  });
});

describe('ExampleMetaSchema', () => {
  it('validates correct _meta.json', () => {
    const valid = {
      skill: 'security-review',
      description: 'Test example',
      expected: [{ severity: 'critical', pattern: 'test' }],
    };
    const result = ExampleMetaSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('validates with optional file field', () => {
    const valid = {
      skill: 'security-review',
      description: 'Test example',
      expected: [{ severity: 'high', pattern: 'test', file: 'test.ts' }],
    };
    const result = ExampleMetaSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects invalid severity', () => {
    const invalid = {
      skill: 'security-review',
      description: 'Test example',
      expected: [{ severity: 'invalid', pattern: 'test' }],
    };
    const result = ExampleMetaSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const invalid = {
      skill: 'security-review',
      // missing description
      expected: [],
    };
    const result = ExampleMetaSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
