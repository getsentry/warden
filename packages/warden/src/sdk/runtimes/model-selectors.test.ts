import { describe, expect, it } from 'vitest';
import {
  assertValidPiModelSelectors,
  findMissingCloudflareEnv,
  invalidPiModelSelectorMessage,
  isPiModelSelector,
  piModelSelectorTip,
} from './model-selectors.js';

describe('isPiModelSelector', () => {
  it('accepts standard provider/model selectors', () => {
    expect(isPiModelSelector('openai/gpt-5.5')).toBe(true);
    expect(isPiModelSelector('anthropic/claude-sonnet-4-6')).toBe(true);
    expect(isPiModelSelector('groq/llama-3.3-70b-versatile')).toBe(true);
    expect(isPiModelSelector('openrouter/meta-llama/llama-3.3-70b-instruct')).toBe(true);
  });

  it('accepts Pi provider names with hyphens', () => {
    expect(isPiModelSelector('cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6')).toBe(true);
    expect(isPiModelSelector('cloudflare-ai-gateway/@cf/moonshotai/kimi-k2.6')).toBe(true);
    expect(isPiModelSelector('amazon-bedrock/us.anthropic.claude-sonnet-4')).toBe(true);
  });

  it('accepts provider-specific model IDs with internal slashes', () => {
    expect(isPiModelSelector('fireworks/accounts/fireworks/models/kimi-k2p6')).toBe(true);
  });

  it('rejects selectors without both provider and model ID', () => {
    expect(isPiModelSelector('gpt-5.5')).toBe(false);
    expect(isPiModelSelector('/gpt-5.5')).toBe(false);
    expect(isPiModelSelector('fireworks/')).toBe(false);
  });

  it('rejects Cloudflare native model IDs used without a Pi provider prefix', () => {
    expect(isPiModelSelector('@cf/moonshotai/kimi-k2.6')).toBe(false);
    expect(isPiModelSelector('@cf/meta/llama-3.3-70b')).toBe(false);
  });

  it('rejects provider-native namespace prefixes generally', () => {
    // Any segment starting with @ is not a valid Pi provider name
    expect(isPiModelSelector('@vendor/some-model')).toBe(false);
  });
});

describe('invalidPiModelSelectorMessage', () => {
  it('emits targeted guidance for Cloudflare Workers AI native model IDs', () => {
    const msg = invalidPiModelSelectorMessage({ option: 'model', model: '@cf/moonshotai/kimi-k2.6' });
    expect(msg).toContain('cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6');
    expect(msg).toContain('CLOUDFLARE_API_KEY');
    expect(msg).toContain('CLOUDFLARE_ACCOUNT_ID');
  });

  it('emits generic namespace guidance for non-Cloudflare @ prefixes', () => {
    const msg = invalidPiModelSelectorMessage({ option: 'model', model: '@vendor/some-model' });
    expect(msg).toContain('@vendor/');
    expect(msg).toContain('provider-native');
  });

  it('emits targeted guidance for gemini/... (wrong provider name for Google)', () => {
    const msg = invalidPiModelSelectorMessage({ option: 'model', model: 'gemini/gemini-2.5-flash' });
    expect(msg).toContain('google/gemini-2.5-flash');
    expect(msg).toContain('WARDEN_GEMINI_API_KEY');
    expect(msg).not.toContain('must use provider/model format');
  });

  it('emits invalid-provider-segment guidance when provider fails Pi naming rules', () => {
    // e.g. uppercase, underscores — valid shape but invalid provider segment format
    const msg = invalidPiModelSelectorMessage({ option: 'model', model: 'OPENAI/gpt-5.5' });
    expect(msg).toContain('invalid provider segment');
    expect(msg).toContain('OPENAI');
    expect(msg).toContain('lowercase');
    expect(msg).not.toContain('could not find provider or model');
    expect(msg).not.toContain('must use provider/model format');
  });

  it('emits provider-or-model-not-found guidance for valid-shape selectors (unknown or stale model)', () => {
    // Covers both: unknown provider name and known provider with stale/wrong model ID
    const msg = invalidPiModelSelectorMessage({ option: 'model', model: 'unknown-provider/gpt-5.5' });
    expect(msg).toContain('could not find provider or model');
    expect(msg).toContain('unknown-provider/gpt-5.5');
    expect(msg).not.toContain('must use provider/model format');
    expect(msg).not.toContain('unknown Pi provider');
  });

  it('uses same could-not-find wording for known providers with stale model IDs', () => {
    const msg = invalidPiModelSelectorMessage({ option: 'model', model: 'openai/nonexistent-model' });
    expect(msg).toContain('could not find provider or model');
    expect(msg).toContain('openai/nonexistent-model');
    // Does not claim openai is an unknown provider
    expect(msg).not.toContain('unknown Pi provider');
  });

  it('emits standard format guidance for plain model IDs without a provider', () => {
    const msg = invalidPiModelSelectorMessage({ option: 'model', model: 'gpt-5.5' });
    expect(msg).toContain('provider/model format');
    expect(msg).toContain('gpt-5.5');
  });

  it('includes the spec name when provided', () => {
    const msg = invalidPiModelSelectorMessage({
      specName: 'security-review',
      option: 'auxiliaryModel',
      model: '@cf/meta/llama-3.3',
    });
    expect(msg).toContain('security-review');
  });
});

describe('piModelSelectorTip', () => {
  it('gives Cloudflare-specific repair tip for @cf/ models', () => {
    const tip = piModelSelectorTip('@cf/moonshotai/kimi-k2.6');
    expect(tip).toContain('cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6');
    expect(tip).toContain('CLOUDFLARE_ACCOUNT_ID');
  });

  it('gives generic namespace tip for non-Cloudflare @ models', () => {
    const tip = piModelSelectorTip('@vendor/model');
    expect(tip).toContain('provider-name/@vendor/model');
  });

  it('gives targeted Google tip for gemini/... models', () => {
    const tip = piModelSelectorTip('gemini/gemini-2.5-flash');
    expect(tip).toContain('google/gemini-2.5-flash');
    expect(tip).toContain('WARDEN_GEMINI_API_KEY');
  });

  it('gives standard tip for plain model IDs', () => {
    const tip = piModelSelectorTip('gpt-5.5');
    expect(tip).toContain('anthropic/claude-sonnet-4-6');
  });
});

describe('assertValidPiModelSelectors', () => {
  it('allows provider-specific model IDs with slashes in every Pi model lane', () => {
    expect(() => assertValidPiModelSelectors([
      {
        runtime: 'pi',
        model: 'fireworks/accounts/fireworks/models/kimi-k2p6',
        auxiliaryModel: 'fireworks/accounts/fireworks/models/kimi-k2p6',
        synthesisModel: 'fireworks/accounts/fireworks/models/kimi-k2p6',
      },
    ])).not.toThrow();
  });

  it('allows cloudflare-workers-ai selectors with native model IDs', () => {
    expect(() => assertValidPiModelSelectors([
      {
        runtime: 'pi',
        model: 'cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6',
      },
    ])).not.toThrow();
  });

  it('throws for Cloudflare native model IDs used without a Pi provider prefix', () => {
    expect(() => assertValidPiModelSelectors([
      {
        runtime: 'pi',
        model: '@cf/moonshotai/kimi-k2.6',
      },
    ])).toThrow(/cloudflare-workers-ai\/@cf\/moonshotai\/kimi-k2\.6/);
  });
});

describe('findMissingCloudflareEnv', () => {
  it('returns undefined when no Cloudflare provider is configured', () => {
    const result = findMissingCloudflareEnv(
      [{ runtime: 'pi', model: 'openai/gpt-5.5' }],
      { OPENAI_API_KEY: 'key' },
    );
    expect(result).toBeUndefined();
  });

  it('returns undefined when cloudflare-workers-ai has all required env vars', () => {
    const result = findMissingCloudflareEnv(
      [{ runtime: 'pi', model: 'cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6' }],
      { CLOUDFLARE_API_KEY: 'key', CLOUDFLARE_ACCOUNT_ID: 'acct' },
    );
    expect(result).toBeUndefined();
  });

  it('accepts WARDEN_CLOUDFLARE_ACCOUNT_ID as an alternative', () => {
    const result = findMissingCloudflareEnv(
      [{ runtime: 'pi', model: 'cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6' }],
      { CLOUDFLARE_API_KEY: 'key', WARDEN_CLOUDFLARE_ACCOUNT_ID: 'acct' },
    );
    expect(result).toBeUndefined();
  });

  it('reports missing CLOUDFLARE_ACCOUNT_ID for cloudflare-workers-ai', () => {
    const result = findMissingCloudflareEnv(
      [{ runtime: 'pi', model: 'cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6' }],
      { CLOUDFLARE_API_KEY: 'key' },
    );
    expect(result).toMatchObject({
      provider: 'cloudflare-workers-ai',
      missing: ['CLOUDFLARE_ACCOUNT_ID'],
    });
  });

  it('reports both missing vars for cloudflare-ai-gateway', () => {
    const result = findMissingCloudflareEnv(
      [{ runtime: 'pi', model: 'cloudflare-ai-gateway/workers-ai/@cf/moonshotai/kimi-k2.6' }],
      { CLOUDFLARE_API_KEY: 'key' },
    );
    expect(result).toMatchObject({
      provider: 'cloudflare-ai-gateway',
      missing: expect.arrayContaining(['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_GATEWAY_ID']),
    });
  });

  it('reports only CLOUDFLARE_GATEWAY_ID when account ID is present', () => {
    const result = findMissingCloudflareEnv(
      [{ runtime: 'pi', model: 'cloudflare-ai-gateway/workers-ai/@cf/moonshotai/kimi-k2.6' }],
      { CLOUDFLARE_API_KEY: 'key', CLOUDFLARE_ACCOUNT_ID: 'acct' },
    );
    expect(result).toMatchObject({
      provider: 'cloudflare-ai-gateway',
      missing: ['CLOUDFLARE_GATEWAY_ID'],
    });
  });

  it('accepts WARDEN_CLOUDFLARE_GATEWAY_ID as an alternative', () => {
    const result = findMissingCloudflareEnv(
      [{ runtime: 'pi', model: 'cloudflare-ai-gateway/workers-ai/@cf/moonshotai/kimi-k2.6' }],
      {
        CLOUDFLARE_API_KEY: 'key',
        CLOUDFLARE_ACCOUNT_ID: 'acct',
        WARDEN_CLOUDFLARE_GATEWAY_ID: 'gw',
      },
    );
    expect(result).toBeUndefined();
  });

  it('skips non-Pi runtimes', () => {
    const result = findMissingCloudflareEnv(
      [{ runtime: 'claude', model: 'cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6' }],
      {},
    );
    expect(result).toBeUndefined();
  });

  it('skips targets with invalid selectors (already caught by other checks)', () => {
    const result = findMissingCloudflareEnv(
      [{ runtime: 'pi', model: '@cf/moonshotai/kimi-k2.6' }],
      {},
    );
    expect(result).toBeUndefined();
  });

  it('detects missing account ID when Cloudflare provider is in auxiliaryModel but not model', () => {
    const result = findMissingCloudflareEnv(
      [{
        runtime: 'pi',
        model: 'anthropic/claude-sonnet-4-6',
        auxiliaryModel: 'cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6',
      }],
      { CLOUDFLARE_API_KEY: 'key' },
    );
    expect(result).toMatchObject({
      provider: 'cloudflare-workers-ai',
      missing: ['CLOUDFLARE_ACCOUNT_ID'],
    });
  });

  it('detects missing account ID when Cloudflare provider is in synthesisModel only', () => {
    const result = findMissingCloudflareEnv(
      [{
        runtime: 'pi',
        model: 'openai/gpt-5.5',
        synthesisModel: 'cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6',
      }],
      { CLOUDFLARE_API_KEY: 'key' },
    );
    expect(result).toMatchObject({
      provider: 'cloudflare-workers-ai',
      missing: ['CLOUDFLARE_ACCOUNT_ID'],
    });
  });
});
