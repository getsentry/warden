import { describe, it, expect } from 'vitest';
import {
  buildPiProviderOptions,
  resolveProviderApiKey,
  isLoopbackBaseUrl,
  assertCustomProviderAuth,
} from './custom-provider.js';
import type { ProvidersConfig } from '../../config/schema.js';

const providers: ProvidersConfig = {
  litellm: { baseUrl: 'https://gw.example.com/v1', api: 'openai-completions', models: [{ id: 'my-model' }] },
};

describe('resolveProviderApiKey', () => {
  it('prefers apiKeyEnv when set', () => {
    expect(resolveProviderApiKey('litellm', 'MY_KEY', { MY_KEY: 'k1', WARDEN_LITELLM_API_KEY: 'k2' })).toBe('k1');
  });
  it('falls back to WARDEN_<NAME>_API_KEY then <NAME>_API_KEY', () => {
    expect(resolveProviderApiKey('litellm', undefined, { WARDEN_LITELLM_API_KEY: 'k2' })).toBe('k2');
    expect(resolveProviderApiKey('litellm', undefined, { LITELLM_API_KEY: 'k3' })).toBe('k3');
  });
  it('returns undefined when nothing is set', () => {
    expect(resolveProviderApiKey('litellm', undefined, {})).toBeUndefined();
  });
});

describe('buildPiProviderOptions', () => {
  it('returns undefined for empty input', () => {
    expect(buildPiProviderOptions(undefined, {})).toBeUndefined();
    expect(buildPiProviderOptions({}, {})).toBeUndefined();
  });
  it('applies model defaults and resolves the key', () => {
    const built = buildPiProviderOptions(providers, { WARDEN_LITELLM_API_KEY: 'k2' });
    const p = built?.providers[0];
    expect(p?.name).toBe('litellm');
    expect(p?.apiKey).toBe('k2');
    const m = p?.models[0];
    expect(m).toMatchObject({
      id: 'my-model',
      name: 'my-model',
      api: 'openai-completions',
      reasoning: false,
      input: ['text'],
      contextWindow: 128000,
      maxTokens: 8192,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    });
  });
});

describe('isLoopbackBaseUrl', () => {
  it('recognizes loopback hosts', () => {
    expect(isLoopbackBaseUrl('http://localhost:4000/v1')).toBe(true);
    expect(isLoopbackBaseUrl('http://127.0.0.1:4000')).toBe(true);
    expect(isLoopbackBaseUrl('https://gw.example.com/v1')).toBe(false);
  });
  it('recognizes bracketed IPv6 loopback', () => {
    expect(isLoopbackBaseUrl('http://[::1]:4000/v1')).toBe(true);
  });
});

describe('assertCustomProviderAuth', () => {
  it('throws for a non-loopback provider without a key', () => {
    const built = buildPiProviderOptions(providers, {});
    expect(() => assertCustomProviderAuth(built)).toThrow(/litellm/);
  });
  it('passes for a loopback provider without a key', () => {
    const built = buildPiProviderOptions(
      { local: { baseUrl: 'http://localhost:4000/v1', api: 'openai-completions', models: [{ id: 'm' }] } },
      {},
    );
    expect(() => assertCustomProviderAuth(built)).not.toThrow();
  });
});
