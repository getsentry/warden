import { describe, expect, it } from 'vitest';
import { DEFAULT_JUDGE_MODEL, resolveEvalProvider } from './provider.js';

describe('resolveEvalProvider', () => {
  it('is disabled without a model override or Anthropic key', () => {
    expect(resolveEvalProvider({})).toEqual({
      apiKey: '',
      model: undefined,
      runtime: undefined,
      auxiliaryModel: undefined,
      judgeModel: DEFAULT_JUDGE_MODEL,
      enabled: false,
    });
  });

  it('keeps scenario models when only an Anthropic key is set', () => {
    const config = resolveEvalProvider({ WARDEN_ANTHROPIC_API_KEY: 'sk-ant' });

    expect(config).toMatchObject({
      apiKey: 'sk-ant',
      model: undefined,
      runtime: undefined,
      judgeModel: DEFAULT_JUDGE_MODEL,
      enabled: true,
    });
  });

  it('accepts the unprefixed Anthropic key', () => {
    expect(resolveEvalProvider({ ANTHROPIC_API_KEY: 'sk-ant' }).apiKey).toBe('sk-ant');
  });

  it('routes evals, auxiliary calls, and the judge through WARDEN_EVAL_MODEL on Pi', () => {
    const config = resolveEvalProvider({
      WARDEN_EVAL_MODEL: ' openrouter/anthropic/claude-sonnet-4.6 ',
      WARDEN_OPENROUTER_API_KEY: 'sk-or',
    });

    expect(config).toEqual({
      apiKey: '',
      model: 'openrouter/anthropic/claude-sonnet-4.6',
      runtime: 'pi',
      auxiliaryModel: 'openrouter/anthropic/claude-sonnet-4.6',
      judgeModel: 'openrouter/anthropic/claude-sonnet-4.6',
      enabled: true,
    });
  });

  it('uses WARDEN_EVAL_JUDGE_MODEL for the judge when set', () => {
    const config = resolveEvalProvider({
      WARDEN_EVAL_MODEL: 'openrouter/x-ai/grok-4.3',
      WARDEN_EVAL_JUDGE_MODEL: 'openrouter/anthropic/claude-sonnet-4.6',
    });

    expect(config.model).toBe('openrouter/x-ai/grok-4.3');
    expect(config.judgeModel).toBe('openrouter/anthropic/claude-sonnet-4.6');
  });

  it('treats empty overrides as unset', () => {
    const config = resolveEvalProvider({ WARDEN_EVAL_MODEL: '', WARDEN_EVAL_JUDGE_MODEL: '  ' });

    expect(config.model).toBeUndefined();
    expect(config.judgeModel).toBe(DEFAULT_JUDGE_MODEL);
    expect(config.enabled).toBe(false);
  });

  it('rejects a model override without a provider prefix', () => {
    expect(() => resolveEvalProvider({ WARDEN_EVAL_MODEL: 'claude-sonnet-4-6' })).toThrow(
      'WARDEN_EVAL_MODEL must be a provider/model selector'
    );
  });
});
