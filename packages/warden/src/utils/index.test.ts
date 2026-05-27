import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { bridgeWardenProviderApiKeyEnv, escapeHtml, getAnthropicApiKey } from './index.js';

describe('escapeHtml', () => {
  it('escapes angle brackets outside code', () => {
    expect(escapeHtml('Check the <sub> tag')).toBe('Check the &lt;sub&gt; tag');
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('escapes multiple HTML characters', () => {
    expect(escapeHtml('<div>foo & bar</div>')).toBe('&lt;div&gt;foo &amp; bar&lt;/div&gt;');
  });

  it('preserves content inside inline code', () => {
    expect(escapeHtml('no `<sub>warden:` tag')).toBe('no `<sub>warden:` tag');
  });

  it('preserves content inside code blocks', () => {
    const input = 'Check this:\n```\n<html>\n  <body></body>\n</html>\n```\nDone';
    expect(escapeHtml(input)).toBe(input);
  });

  it('escapes outside code but preserves inside', () => {
    const input = 'When <sub> tag like `<sub>warden:` is missing';
    const expected = 'When &lt;sub&gt; tag like `<sub>warden:` is missing';
    expect(escapeHtml(input)).toBe(expected);
  });

  it('handles multiple inline code spans', () => {
    const input = 'Use `<div>` or `<span>` elements';
    expect(escapeHtml(input)).toBe(input);
  });

  it('handles mixed code blocks and inline code', () => {
    const input = 'See `<tag>` and:\n```\n<html>\n```\nThen <other>';
    const expected = 'See `<tag>` and:\n```\n<html>\n```\nThen &lt;other&gt;';
    expect(escapeHtml(input)).toBe(expected);
  });

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('returns string without HTML unchanged', () => {
    expect(escapeHtml('plain text')).toBe('plain text');
  });
});

describe('getAnthropicApiKey', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env['WARDEN_ANTHROPIC_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns WARDEN_ANTHROPIC_API_KEY when set', () => {
    process.env['WARDEN_ANTHROPIC_API_KEY'] = 'warden-key';
    expect(getAnthropicApiKey()).toBe('warden-key');
  });

  it('returns WARDEN_ANTHROPIC_API_KEY over ANTHROPIC_API_KEY when both set', () => {
    process.env['WARDEN_ANTHROPIC_API_KEY'] = 'warden-key';
    process.env['ANTHROPIC_API_KEY'] = 'anthropic-key';
    expect(getAnthropicApiKey()).toBe('warden-key');
  });

  it('falls back to ANTHROPIC_API_KEY when WARDEN key not set', () => {
    process.env['ANTHROPIC_API_KEY'] = 'anthropic-key';
    expect(getAnthropicApiKey()).toBe('anthropic-key');
  });

  it('returns undefined when neither key is set', () => {
    expect(getAnthropicApiKey()).toBeUndefined();
  });
});

describe('bridgeWardenProviderApiKeyEnv', () => {
  it('mirrors WARDEN-prefixed API keys to provider SDK env names', () => {
    const env: NodeJS.ProcessEnv = {
      WARDEN_OPENAI_API_KEY: 'openai-key',
      WARDEN_ANTHROPIC_API_KEY: 'anthropic-key',
    };

    bridgeWardenProviderApiKeyEnv(env);

    expect(env['OPENAI_API_KEY']).toBe('openai-key');
    expect(env['ANTHROPIC_API_KEY']).toBe('anthropic-key');
  });

  it('does not overwrite explicitly supplied provider env vars', () => {
    const env: NodeJS.ProcessEnv = {
      WARDEN_OPENAI_API_KEY: 'warden-openai-key',
      OPENAI_API_KEY: 'explicit-openai-key',
    };

    bridgeWardenProviderApiKeyEnv(env);

    expect(env['OPENAI_API_KEY']).toBe('explicit-openai-key');
  });

  it('ignores WARDEN env vars that are not API keys', () => {
    const env: NodeJS.ProcessEnv = {
      WARDEN_MODEL: 'openai/gpt-5.5',
      WARDEN_SENTRY_DSN: 'https://public@example.com/1',
    };

    bridgeWardenProviderApiKeyEnv(env);

    expect(env['MODEL']).toBeUndefined();
    expect(env['SENTRY_DSN']).toBeUndefined();
  });
});
