import { describe, expect, it } from 'vitest';
import { selectOpenRouterKey } from './benchmark-credentials.js';

describe('benchmark credentials', () => {
  it('skips empty higher-priority keys without losing precedence', () => {
    expect(selectOpenRouterKey({ WARDEN_OPENROUTER_API_KEY: '  ', OPENROUTER_API_KEY: 'environment' },
      { OPENROUTER_API_KEY: 'file' })).toBe('environment');
    expect(selectOpenRouterKey({ OPENROUTER_API_KEY: '' }, { OPENROUTER_API_KEY: 'file' })).toBe('file');
  });
});
