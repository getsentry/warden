import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseActionInputs, setupAuthEnv, validateInputs } from './inputs.js';

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

  describe('authentication token handling', () => {
    it('detects API key from ANTHROPIC_API_KEY', () => {
      process.env['ANTHROPIC_API_KEY'] = 'sk-ant-api-key';
      const inputs = parseActionInputs();
      expect(inputs.anthropicApiKey).toBe('sk-ant-api-key');
      expect(inputs.oauthToken).toBe('');
    });

    it('detects OAuth token by sk-ant-oat prefix', () => {
      process.env['ANTHROPIC_API_KEY'] = 'sk-ant-oat-oauth-token';
      const inputs = parseActionInputs();
      expect(inputs.anthropicApiKey).toBe('');
      expect(inputs.oauthToken).toBe('sk-ant-oat-oauth-token');
    });

    it('checks CLAUDE_CODE_OAUTH_TOKEN env var', () => {
      delete process.env['ANTHROPIC_API_KEY'];
      delete process.env['WARDEN_ANTHROPIC_API_KEY'];
      process.env['CLAUDE_CODE_OAUTH_TOKEN'] = 'sk-ant-oat-from-env';
      const inputs = parseActionInputs();
      expect(inputs.oauthToken).toBe('sk-ant-oat-from-env');
      expect(inputs.anthropicApiKey).toBe('');
    });

    it('allows missing Anthropic auth at input parsing time', () => {
      delete process.env['ANTHROPIC_API_KEY'];
      delete process.env['WARDEN_ANTHROPIC_API_KEY'];
      delete process.env['CLAUDE_CODE_OAUTH_TOKEN'];
      const inputs = parseActionInputs();
      expect(inputs.anthropicApiKey).toBe('');
      expect(inputs.oauthToken).toBe('');
    });
  });

  describe('boolean input handling', () => {
    it('parses request-changes as true', () => {
      process.env['INPUT_REQUEST_CHANGES'] = 'true';
      const inputs = parseActionInputs();
      expect(inputs.requestChanges).toBe(true);
    });

    it('parses request-changes as false', () => {
      process.env['INPUT_REQUEST_CHANGES'] = 'false';
      const inputs = parseActionInputs();
      expect(inputs.requestChanges).toBe(false);
    });

    it('leaves requestChanges undefined when not set', () => {
      const inputs = parseActionInputs();
      expect(inputs.requestChanges).toBeUndefined();
    });

    it('parses fail-check as true', () => {
      process.env['INPUT_FAIL_CHECK'] = 'true';
      const inputs = parseActionInputs();
      expect(inputs.failCheck).toBe(true);
    });

    it('parses fail-check as false', () => {
      process.env['INPUT_FAIL_CHECK'] = 'false';
      const inputs = parseActionInputs();
      expect(inputs.failCheck).toBe(false);
    });

    it('leaves failCheck undefined when not set', () => {
      const inputs = parseActionInputs();
      expect(inputs.failCheck).toBeUndefined();
    });
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

  describe('config path handling', () => {
    it('parses base-config-path when provided', () => {
      process.env['INPUT_BASE_CONFIG_PATH'] = '.warden-org/warden.toml';
      const inputs = parseActionInputs();
      expect(inputs.baseConfigPath).toBe('.warden-org/warden.toml');
    });

    it('parses base-skill-root when provided', () => {
      process.env['INPUT_BASE_SKILL_ROOT'] = '.warden-org';
      const inputs = parseActionInputs();
      expect(inputs.baseSkillRoot).toBe('.warden-org');
    });

    it('leaves baseConfigPath undefined when not set', () => {
      const inputs = parseActionInputs();
      expect(inputs.baseConfigPath).toBeUndefined();
    });
  });
});

describe('setupAuthEnv', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('sets ANTHROPIC_API_KEY for API key auth', () => {
    setupAuthEnv({
      anthropicApiKey: 'sk-ant-api-key',
      oauthToken: '',
      githubToken: 'test',
      configPath: 'warden.toml',
      maxFindings: 50,
      parallel: 4,
    });
    expect(process.env['ANTHROPIC_API_KEY']).toBe('sk-ant-api-key');
    expect(process.env['WARDEN_ANTHROPIC_API_KEY']).toBe('sk-ant-api-key');
    expect(process.env['CLAUDE_CODE_OAUTH_TOKEN']).toBeUndefined();
  });

  it('sets CLAUDE_CODE_OAUTH_TOKEN for OAuth auth', () => {
    setupAuthEnv({
      anthropicApiKey: '',
      oauthToken: 'sk-ant-oat-oauth-token',
      githubToken: 'test',
      configPath: 'warden.toml',
      maxFindings: 50,
      parallel: 4,
    });
    expect(process.env['CLAUDE_CODE_OAUTH_TOKEN']).toBe('sk-ant-oat-oauth-token');
    expect(process.env['ANTHROPIC_API_KEY']).toBeUndefined();
    expect(process.env['WARDEN_ANTHROPIC_API_KEY']).toBeUndefined();
  });

  it('clears stale API key env vars for OAuth auth', () => {
    process.env['ANTHROPIC_API_KEY'] = 'stale-api-key';
    process.env['WARDEN_ANTHROPIC_API_KEY'] = 'stale-warden-key';

    setupAuthEnv({
      anthropicApiKey: '',
      oauthToken: 'sk-ant-oat-oauth-token',
      githubToken: 'test',
      configPath: 'warden.toml',
      maxFindings: 50,
      parallel: 4,
    });

    expect(process.env['CLAUDE_CODE_OAUTH_TOKEN']).toBe('sk-ant-oat-oauth-token');
    expect(process.env['ANTHROPIC_API_KEY']).toBeUndefined();
    expect(process.env['WARDEN_ANTHROPIC_API_KEY']).toBeUndefined();
  });

  it('clears stale auth env vars when no auth is supplied', () => {
    process.env['ANTHROPIC_API_KEY'] = 'stale-api-key';
    process.env['WARDEN_ANTHROPIC_API_KEY'] = 'stale-warden-key';
    process.env['CLAUDE_CODE_OAUTH_TOKEN'] = 'stale-oauth-token';

    setupAuthEnv({
      anthropicApiKey: '',
      oauthToken: '',
      githubToken: 'test',
      configPath: 'warden.toml',
      maxFindings: 50,
      parallel: 4,
    });

    expect(process.env['CLAUDE_CODE_OAUTH_TOKEN']).toBeUndefined();
    expect(process.env['ANTHROPIC_API_KEY']).toBeUndefined();
    expect(process.env['WARDEN_ANTHROPIC_API_KEY']).toBeUndefined();
  });
});

describe('validateInputs', () => {
  it('requires base-config-path when base-skill-root is set', () => {
    expect(() => validateInputs({
      anthropicApiKey: 'sk-ant-api-key',
      oauthToken: '',
      githubToken: 'test',
      baseSkillRoot: '.warden-org',
      configPath: 'warden.toml',
      maxFindings: 50,
      parallel: 4,
    })).toThrow('base-skill-root requires base-config-path');
  });
});
