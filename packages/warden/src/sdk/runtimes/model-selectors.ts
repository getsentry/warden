/**
 * Return true when a Pi model selector uses provider/model-id syntax.
 *
 * Valid Pi selectors split at the first slash: the segment before it is the Pi
 * provider name and the segment after is the provider-specific model ID.
 *
 * Pi provider names are lowercase alphanumeric strings with hyphens, e.g.
 * `openai`, `anthropic`, `cloudflare-workers-ai`. Provider-native namespaces
 * such as Cloudflare's `@cf/...` model IDs must be prefixed with the Pi
 * provider name to form a valid Warden selector.
 */
export function isPiModelSelector(model: string): boolean {
  const slashIndex = model.indexOf('/');
  if (slashIndex <= 0 || slashIndex >= model.length - 1) return false;

  // Pi provider names are lowercase letters, digits, and hyphens.
  // Reject provider-native namespace prefixes (e.g. @cf/...) and other
  // non-conforming provider segments that would silently fail at model lookup.
  const provider = model.slice(0, slashIndex);
  return /^[a-z0-9][a-z0-9-]*$/.test(provider);
}

export type PiModelSelectorOption = 'model' | 'auxiliaryModel' | 'synthesisModel';

export interface PiModelSelectorTarget {
  name?: string;
  runtime?: string;
  model?: string;
  auxiliaryModel?: string;
  synthesisModel?: string;
}

export interface InvalidPiModelSelector {
  specName?: string;
  option: PiModelSelectorOption;
  model: string;
}

/**
 * Format the user-facing error for an invalid Pi model selector.
 *
 * Emits targeted guidance for known misuse patterns:
 * - @cf/... Cloudflare-native model IDs without a Pi provider prefix
 * - Other @namespace/... provider-native IDs without a Pi provider prefix
 * - Common wrong provider names (e.g. "gemini" instead of "google")
 * - Valid-shape selectors with an unknown Pi provider name
 */
export function invalidPiModelSelectorMessage(invalid: InvalidPiModelSelector): string {
  const target = invalid.specName ? ` for ${invalid.specName}` : '';
  const { model } = invalid;
  const slashIndex = model.indexOf('/');

  // Cloudflare Workers AI native model IDs start with @cf/. Users sometimes
  // set these directly instead of using the Warden Pi provider prefix.
  if (model.startsWith('@cf/')) {
    return (
      `Pi runtime ${invalid.option}${target} received a Cloudflare Workers AI native model ID: ${model}. ` +
      `Use cloudflare-workers-ai/${model} as the Warden Pi selector instead. ` +
      `Set CLOUDFLARE_API_KEY (or WARDEN_CLOUDFLARE_API_KEY) and CLOUDFLARE_ACCOUNT_ID ` +
      `(or WARDEN_CLOUDFLARE_ACCOUNT_ID) for this provider.`
    );
  }

  // Generic provider-native namespace prefix (@vendor/...) without a Pi provider.
  if (model.startsWith('@') && slashIndex > 0) {
    const namespace = model.slice(0, slashIndex + 1);
    return (
      `Pi runtime ${invalid.option}${target} received a provider-native model ID: ${model}. ` +
      `"${namespace}..." is a provider-native namespace, not a Pi provider name. ` +
      `Prefix with the Pi provider name, e.g. provider-name/${model}. ` +
      `See https://warden.sentry.dev/config/models for supported providers.`
    );
  }

  // When the model already has provider/model shape, the selector is structurally
  // valid but the provider segment is either wrong or unknown to Pi.
  if (slashIndex > 0 && slashIndex < model.length - 1) {
    const provider = model.slice(0, slashIndex);

    // Google Gemini: Pi provider name is "google", env var is GEMINI_API_KEY.
    // Users commonly guess "gemini/..." from the product name.
    if (provider === 'gemini') {
      const modelId = model.slice(slashIndex + 1);
      return (
        `Pi runtime ${invalid.option}${target} received "gemini/..." but Google Gemini's Pi provider name is "google", not "gemini". ` +
        `Use google/${modelId} as the selector and set WARDEN_GEMINI_API_KEY or GEMINI_API_KEY.`
      );
    }

    // Valid shape but provider/model could not be resolved — this happens either
    // when the provider is not registered in Pi (unknown provider) or when the
    // provider is known but the model ID is wrong or stale. Avoid saying
    // "unknown provider" because it may mislead users with a valid provider
    // name and a stale model ID.
    return (
      `Pi runtime ${invalid.option}${target} could not find provider or model: ${model}. ` +
      `Verify the Pi provider name and model ID are correct. ` +
      `See https://warden.sentry.dev/config/models for supported providers and selectors.`
    );
  }

  return `Pi runtime ${invalid.option}${target} must use provider/model format: ${model}`;
}

/**
 * Return a contextual repair tip for an invalid Pi model selector.
 * Used alongside invalidPiModelSelectorMessage to give actionable next steps.
 */
export function piModelSelectorTip(model: string): string {
  if (model.startsWith('@cf/')) {
    return `Use cloudflare-workers-ai/${model} and set CLOUDFLARE_API_KEY + CLOUDFLARE_ACCOUNT_ID.`;
  }
  if (model.startsWith('@')) {
    return 'Prefix the model with its Pi provider name, e.g. provider-name/@vendor/model-id.';
  }
  const slashIndex = model.indexOf('/');
  if (slashIndex > 0) {
    const provider = model.slice(0, slashIndex);
    if (provider === 'gemini') {
      return `Use google/${model.slice(slashIndex + 1)} (Pi provider name is "google") and set WARDEN_GEMINI_API_KEY.`;
    }
  }
  return 'Set a Pi model selector such as anthropic/claude-sonnet-4-6 or google/gemini-2.5-flash.';
}

/**
 * Preserve invalid Pi selector details through shared error classification.
 */
export class InvalidPiModelSelectorError extends Error {
  invalid: InvalidPiModelSelector;

  constructor(invalid: InvalidPiModelSelector) {
    super(invalidPiModelSelectorMessage(invalid));
    this.name = 'InvalidPiModelSelectorError';
    this.invalid = invalid;
  }
}

export interface MissingCloudflareEnv {
  provider: string;
  /** The env var names that are missing (native form, e.g. CLOUDFLARE_ACCOUNT_ID). */
  missing: string[];
}

/**
 * Find required Cloudflare provider env vars that are not set.
 *
 * Cloudflare Workers AI requires CLOUDFLARE_ACCOUNT_ID in addition to an API
 * key. Cloudflare AI Gateway additionally requires CLOUDFLARE_GATEWAY_ID.
 * Neither can be inferred from model selectors alone and both must be set as
 * environment variables (Pi does not read them from its auth.json).
 *
 * Both the native form (CLOUDFLARE_ACCOUNT_ID) and the Warden alias
 * (WARDEN_CLOUDFLARE_ACCOUNT_ID) are accepted.
 *
 * Returns the first target with missing required vars, or undefined.
 */
export function findMissingCloudflareEnv(
  targets: PiModelSelectorTarget[],
  env: NodeJS.ProcessEnv = process.env,
): MissingCloudflareEnv | undefined {
  for (const target of targets) {
    if ((target.runtime ?? 'pi') !== 'pi') continue;

    // Check each model lane independently. A target can mix providers across
    // lanes (e.g. anthropic for `model`, cloudflare-workers-ai for
    // `auxiliaryModel`), so each lane that resolves to a Cloudflare provider
    // must be validated independently.
    for (const lane of ['model', 'auxiliaryModel', 'synthesisModel'] as const) {
      const model = target[lane];
      if (!model || !isPiModelSelector(model)) continue;

      const slashIndex = model.indexOf('/');
      const provider = model.slice(0, slashIndex);

      if (provider !== 'cloudflare-workers-ai' && provider !== 'cloudflare-ai-gateway') continue;

      const missing: string[] = [];

      if (!env['CLOUDFLARE_ACCOUNT_ID'] && !env['WARDEN_CLOUDFLARE_ACCOUNT_ID']) {
        missing.push('CLOUDFLARE_ACCOUNT_ID');
      }

      if (provider === 'cloudflare-ai-gateway') {
        if (!env['CLOUDFLARE_GATEWAY_ID'] && !env['WARDEN_CLOUDFLARE_GATEWAY_ID']) {
          missing.push('CLOUDFLARE_GATEWAY_ID');
        }
      }

      if (missing.length > 0) {
        return { provider, missing };
      }
    }
  }

  return undefined;
}

/**
 * Format the user-facing error for missing required Cloudflare env vars.
 */
export function missingCloudflareEnvMessage(missing: MissingCloudflareEnv): string {
  const vars = missing.missing.map((v) => `${v} (or WARDEN_${v})`).join(', ');
  return (
    `Pi provider ${missing.provider} requires additional environment variables: ${vars}. ` +
    `Set these alongside CLOUDFLARE_API_KEY before running Warden.`
  );
}

/**
 * Find the first Pi runner option using a model ID that is not provider/model.
 */
export function findInvalidPiModelSelector(
  targets: PiModelSelectorTarget[]
): InvalidPiModelSelector | undefined {
  for (const target of targets) {
    const runtimeName = target.runtime ?? 'pi';
    if (runtimeName !== 'pi') {
      continue;
    }

    for (const option of ['model', 'auxiliaryModel', 'synthesisModel'] as const) {
      const model = target[option];
      if (model && !isPiModelSelector(model)) {
        return { specName: target.name, option, model };
      }
    }
  }

  return undefined;
}

/**
 * Throw when any Pi runner option is not a provider/model selector.
 */
export function assertValidPiModelSelectors(targets: PiModelSelectorTarget[]): void {
  const invalid = findInvalidPiModelSelector(targets);
  if (invalid) {
    throw new InvalidPiModelSelectorError(invalid);
  }
}
