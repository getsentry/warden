import { describe, expect, it } from 'vitest';
import { DEFAULT_JUDGE_MODEL, resolveEvalProvider } from './provider.js';

describe('resolveEvalProvider', () => {
  it('is disabled without a model override or OpenAI key', () => {
    expect(resolveEvalProvider({})).toEqual({
      apiKey: '',
      model: undefined,
      runtime: undefined,
      auxiliaryModel: undefined,
      judgeModel: DEFAULT_JUDGE_MODEL,
      enabled: false,
    });
  });

  it('keeps scenario models when only an OpenAI key is set', () => {
    const config = resolveEvalProvider({ WARDEN_OPENAI_API_KEY: 'sk-openai' });

    expect(config).toMatchObject({
      model: undefined,
      runtime: undefined,
      judgeModel: DEFAULT_JUDGE_MODEL,
      enabled: true,
    });
  });

  it('accepts the unprefixed OpenAI key', () => {
    expect(resolveEvalProvider({ OPENAI_API_KEY: 'sk-openai' }).enabled).toBe(true);
  });

  it('stays disabled with only an Anthropic key, since the default models are OpenAI', () => {
    const config = resolveEvalProvider({ WARDEN_ANTHROPIC_API_KEY: 'sk-ant' });

    expect(config.apiKey).toBe('sk-ant');
    expect(config.enabled).toBe(false);
  });

  it('routes evals, auxiliary calls, and the judge through WARDEN_EVAL_MODEL on Pi', () => {
    const config = resolveEvalProvider({
      WARDEN_EVAL_MODEL: ' openrouter/openai/gpt-6-luna ',
      WARDEN_OPENROUTER_API_KEY: 'sk-or',
    });

    expect(config).toEqual({
      apiKey: '',
      model: 'openrouter/openai/gpt-6-luna',
      runtime: 'pi',
      auxiliaryModel: 'openrouter/openai/gpt-6-luna',
      judgeModel: 'openrouter/openai/gpt-6-luna',
      enabled: true,
    });
  });

  it('uses WARDEN_EVAL_JUDGE_MODEL for the judge when set', () => {
    const config = resolveEvalProvider({
      WARDEN_EVAL_MODEL: 'openrouter/x-ai/grok-4.3',
      WARDEN_EVAL_JUDGE_MODEL: 'openrouter/openai/gpt-6-luna',
    });

    expect(config.model).toBe('openrouter/x-ai/grok-4.3');
    expect(config.judgeModel).toBe('openrouter/openai/gpt-6-luna');
  });

  it('treats empty overrides as unset', () => {
    const config = resolveEvalProvider({ WARDEN_EVAL_MODEL: '', WARDEN_EVAL_JUDGE_MODEL: '  ' });

    expect(config.model).toBeUndefined();
    expect(config.judgeModel).toBe(DEFAULT_JUDGE_MODEL);
    expect(config.enabled).toBe(false);
  });

  it('rejects a model override without a provider prefix', () => {
    expect(() => resolveEvalProvider({ WARDEN_EVAL_MODEL: 'gpt-6-luna' })).toThrow(
      'WARDEN_EVAL_MODEL must be a provider/model selector'
    );
  });
});
