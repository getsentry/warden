/**
 * @deprecated Tests for the old examples infrastructure.
 * The canonical tests are now in src/evals/index.test.ts and src/evals/types.test.ts.
 *
 * This file verifies that the backwards-compatible re-exports work.
 */
import { describe, it, expect } from 'vitest';
import { discoverExamples, discoverExampleFiles, loadExampleFile, ExampleMetaSchema } from './index.js';

describe('examples backwards-compatible re-exports', () => {
  it('discoverExamples is a function', () => {
    expect(typeof discoverExamples).toBe('function');
  });

  it('discoverExampleFiles is a function', () => {
    expect(typeof discoverExampleFiles).toBe('function');
  });

  it('loadExampleFile is a function', () => {
    expect(typeof loadExampleFile).toBe('function');
  });

  it('ExampleMetaSchema is defined', () => {
    expect(ExampleMetaSchema).toBeDefined();
  });

  it('discoverExamples returns eval metas', () => {
    const results = discoverExamples();
    expect(results.length).toBeGreaterThan(0);
  });
});
