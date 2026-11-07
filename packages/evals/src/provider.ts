import type { RuntimeName } from '@sentry/warden';

/** Env var that points every live eval at one Pi model selector, e.g. `openrouter/openai/gpt-6-luna`. */
const EVAL_MODEL_ENV = 'WARDEN_EVAL_MODEL';

/** Env var that overrides the judge model. Defaults to the eval model. */
const EVAL_JUDGE_MODEL_ENV = 'WARDEN_EVAL_JUDGE_MODEL';

/** Judge model used when no eval model is configured. */
export const DEFAULT_JUDGE_MODEL = 'openai/gpt-6-luna';

export interface EvalProviderConfig {
  /** Anthropic key for Warden's legacy `apiKey` option. Empty when unset. */
  apiKey: string;
  /** Model selector that replaces every scenario model, when configured. */
  model?: string;
  /** Runtime forced alongside a model override, since provider selectors need Pi. */
  runtime?: RuntimeName;
  /**
   * Model for Warden's auxiliary calls (extraction repair, verification, merge).
   * Set with a model override so those calls use the same provider instead of Pi's default.
   */
  auxiliaryModel?: string;
  /** Pi model selector for the LLM judge. */
  judgeModel: string;
  /** Whether live evals have a configured model or an OpenAI key for the default models. */
  enabled: boolean;
}

function readModelSelector(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]?.trim();
  if (!value) {
    return undefined;
  }
  if (!value.includes('/')) {
    throw new Error(`${name} must be a provider/model selector, for example openrouter/openai/gpt-6-luna`);
  }
  return value;
}

/**
 * Resolve which model and credentials live evals use.
 *
 * Without `WARDEN_EVAL_MODEL`, scenarios keep their checked-in OpenAI models and
 * evals run only when an OpenAI key is present. With it, every scenario,
 * Warden's auxiliary calls, and the judge use that selector, and credentials
 * come from the provider's `WARDEN_<PROVIDER>_API_KEY`.
 */
export function resolveEvalProvider(env: NodeJS.ProcessEnv = process.env): EvalProviderConfig {
  const apiKey = env['WARDEN_ANTHROPIC_API_KEY'] || env['ANTHROPIC_API_KEY'] || '';
  const openaiKey = env['WARDEN_OPENAI_API_KEY'] || env['OPENAI_API_KEY'] || '';
  const model = readModelSelector(env, EVAL_MODEL_ENV);
  const judgeModel = readModelSelector(env, EVAL_JUDGE_MODEL_ENV) ?? model ?? DEFAULT_JUDGE_MODEL;

  return {
    apiKey,
    model,
    runtime: model ? 'pi' : undefined,
    auxiliaryModel: model,
    judgeModel,
    enabled: Boolean(model || openaiKey),
  };
}
