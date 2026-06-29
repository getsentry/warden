import { bridgeWardenProviderApiKeyEnv } from '../../warden/src/utils/index.js';
export { DEFAULT_EVAL_MODEL, DEFAULT_EVAL_RUNTIME } from './types.js';
import { DEFAULT_EVAL_MODEL } from './types.js';

function providerFromModel(model: string): string | undefined {
  const slashIndex = model.indexOf('/');
  if (slashIndex <= 0) {
    return undefined;
  }

  return model.slice(0, slashIndex);
}

function providerEnvPrefix(provider: string): string {
  return provider.toUpperCase().replace(/-/g, '_');
}

/**
 * Returns a provider API key from the env for eval skip checks.
 */
export function getEvalProviderApiKey(model = defaultEvalModel()): string {
  bridgeWardenProviderApiKeyEnv();

  const provider = providerFromModel(model);
  if (!provider) {
    return '';
  }

  const prefix = providerEnvPrefix(provider);
  return process.env[`WARDEN_${prefix}_API_KEY`] ?? process.env[`${prefix}_API_KEY`] ?? '';
}

/**
 * Returns the legacy runtime API key override only for direct Anthropic Pi models.
 */
export function getEvalRuntimeApiKey(model = defaultEvalModel()): string {
  const provider = providerFromModel(model);
  return provider === 'anthropic' ? getEvalProviderApiKey(model) : '';
}

/**
 * Returns the eval model override or the repo's OpenRouter default.
 */
export function defaultEvalModel(): string {
  return process.env['WARDEN_MODEL'] ?? DEFAULT_EVAL_MODEL;
}
