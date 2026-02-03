import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseActionInputs } from './inputs.js';

describe('parseActionInputs', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set required inputs
    process.env['ANTHROPIC_API_KEY'] = 'test-api-key';
    process.env['GITHUB_TOKEN'] = 'test-github-token';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('numeric input handling', () => {
    it('parses valid max-findings input', () => {
      process.env['INPUT_MAX_FINDINGS'] = '25';
      const inputs = parseActionInputs();
      expect(inputs.maxFindings).toBe(25);
    });

    it('uses default when max-findings is empty', () => {
      process.env['INPUT_MAX_FINDINGS'] = '';
      const inputs = parseActionInputs();
      expect(inputs.maxFindings).toBe(50);
    });

    it('falls back to default when max-findings is non-numeric', () => {
      process.env['INPUT_MAX_FINDINGS'] = 'abc';
      const inputs = parseActionInputs();
      expect(inputs.maxFindings).toBe(50);
    });

    it('parses valid parallel input', () => {
      process.env['INPUT_PARALLEL'] = '8';
      const inputs = parseActionInputs();
      expect(inputs.parallel).toBe(8);
    });

    it('falls back to default when parallel is non-numeric', () => {
      process.env['INPUT_PARALLEL'] = 'invalid';
      const inputs = parseActionInputs();
      // DEFAULT_CONCURRENCY is 4
      expect(inputs.parallel).toBe(4);
    });
  });
});
