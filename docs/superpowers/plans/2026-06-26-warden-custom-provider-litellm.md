# Custom Pi Provider (LiteLLM / self-hosted) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users register a self-hosted, OpenAI-compatible endpoint (e.g. LiteLLM) as a named provider in `warden.toml` and target its models with the existing `provider/model` selector, across all model lanes.

**Architecture:** Add a `[defaults.providers.<name>]` config block, normalize it (with sensible per-model defaults) into a Pi provider-options object whose API key is resolved from the environment, and register it on Pi's `ModelRegistry` via `registerProvider` inside `runPiPrompt` (the single choke point all Pi lanes flow through). Thread the raw config from the resolved trigger config to every runtime call site alongside the existing `runtime`/`auxiliaryModel` fields.

**Tech Stack:** TypeScript (strict, ESM), Zod v4, Vitest, `@earendil-works/pi-coding-agent@0.78.0` (`ModelRegistry.registerProvider`), `@earendil-works/pi-ai@0.78.0` (`Api = "openai-completions"`).

## Global Constraints

- TypeScript strict mode; use `export type` for type-only exports (Bun compatibility).
- Zod for all runtime validation; new schemas live in `config/schema.ts`.
- No secrets in `warden.toml`. API keys resolve from env only.
- Co-locate tests (`foo.ts` → `foo.test.ts`). Prefer integration over unit; mock the HTTP/SDK boundary, never call a live endpoint.
- Verify with `pnpm lint && pnpm build && pnpm test` (run targeted vitest during tasks).
- Commit messages use the repo convention and end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Only `openai-completions` is a valid `api` value in v1. The field exists so `anthropic-messages` can be added later.

---

## File Structure

- **Create** `packages/warden/src/sdk/runtimes/custom-provider.ts` — normalization, env key resolution, auth assertion. Pure functions, no I/O beyond reading a passed-in env object.
- **Create** `packages/warden/src/sdk/runtimes/custom-provider.test.ts` — unit tests for the above.
- **Modify** `packages/warden/src/config/schema.ts` — add provider schemas + `DefaultsSchema.providers`.
- **Modify** `packages/warden/src/config/schema.test.ts` (or `config/loader.test.ts` if no schema test exists) — schema accept/reject tests.
- **Modify** `packages/warden/src/sdk/runtimes/index.ts` — extend `getRuntimeProviderOptions` for `pi`.
- **Modify** `packages/warden/src/sdk/runtimes/types.ts` — add `providerOptions` to auxiliary/synthesis requests.
- **Modify** `packages/warden/src/sdk/runtimes/pi.ts` — register custom providers in `runPiPrompt`; read `providerOptions` in `runSkill`/`runStructured`.
- **Modify** `packages/warden/src/sdk/runtimes/pi.test.ts` — registration integration test.
- **Modify** `packages/warden/src/sdk/types.ts` — `SkillRunnerOptions.providers`.
- **Modify** `packages/warden/src/sdk/analyze.ts`, `verify.ts`, `extract.ts` — thread `providers` into agent + extraction runtime calls.
- **Modify** `packages/warden/src/output/dedup.ts`, `action/fix-evaluation/judge.ts`, `sdk/json-output.ts` — thread `providers` into auxiliary/synthesis calls.
- **Modify** `packages/warden/src/config/loader.ts` — `ResolvedTrigger.providers` + assignment.
- **Modify** runner entry points: `action/triggers/executor.ts`, `action/workflow/schedule.ts`, `action/workflow/pr-workflow.ts`, `action/review/poster.ts`, `cli/main.ts` — copy `providers` alongside `auxiliaryModel`.
- **Modify** `packages/docs/src/content/docs/config/models.mdx` — docs.

---

## Task 1: Provider config schema

**Files:**
- Modify: `packages/warden/src/config/schema.ts` (add near `DefaultsSchema`, before line 220)
- Test: `packages/warden/src/config/loader.test.ts` (add a `describe` block; this file already imports the schema/loader)

**Interfaces:**
- Produces: `ProviderModelConfigSchema`, `ProviderConfigSchema`, `ProvidersConfigSchema`; types `ProviderModelConfig`, `ProviderConfig`, `ProvidersConfig`; new optional `DefaultsSchema.providers` field of type `ProvidersConfig`.

- [ ] **Step 1: Write the failing test**

Add to `packages/warden/src/config/loader.test.ts` (top-level, near other `describe`s). It parses TOML through the existing loader the same way other tests in this file do — check the file head for the existing `parseConfig`/`loadConfig` import and reuse it. If the file exposes `WardenConfigSchema` parsing helpers, prefer those. The assertions:

```ts
import { WardenConfigSchema } from './schema.js';

describe('providers config', () => {
  const base = { version: 1 as const, skills: [] };

  it('accepts a valid custom provider', () => {
    const result = WardenConfigSchema.safeParse({
      ...base,
      defaults: {
        providers: {
          litellm: {
            baseUrl: 'http://localhost:4000/v1',
            models: [{ id: 'my-model' }],
          },
        },
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const p = result.data.defaults?.providers?.['litellm'];
      expect(p?.api).toBe('openai-completions'); // default applied
      expect(p?.models[0]?.id).toBe('my-model');
    }
  });

  it('rejects a non-URL baseUrl', () => {
    const result = WardenConfigSchema.safeParse({
      ...base,
      defaults: { providers: { litellm: { baseUrl: 'not a url', models: [{ id: 'm' }] } } },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unsupported api value', () => {
    const result = WardenConfigSchema.safeParse({
      ...base,
      defaults: { providers: { x: { baseUrl: 'http://h/v1', api: 'cohere', models: [{ id: 'm' }] } } },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty models array', () => {
    const result = WardenConfigSchema.safeParse({
      ...base,
      defaults: { providers: { x: { baseUrl: 'http://h/v1', models: [] } } },
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sentry/warden test -- config/loader.test.ts -t "providers config"`
Expected: FAIL (TOML parses but `providers` is stripped/unknown, so `api` default assertion fails; reject cases pass-through as success).

- [ ] **Step 3: Add the schemas**

In `packages/warden/src/config/schema.ts`, insert before `DefaultsSchema` (currently line 220):

```ts
// Per-model definition for a custom provider. Only `id` is required; Warden
// fills the remaining fields Pi requires with sensible defaults.
export const ProviderModelConfigSchema = z.object({
  /** Model id as exposed by the endpoint (e.g. the LiteLLM model name). */
  id: z.string().min(1),
  /** Display name. Defaults to `id`. */
  name: z.string().min(1).optional(),
  /** Whether the model supports reasoning/thinking. Default: false. */
  reasoning: z.boolean().optional(),
  /** Accepted input modalities. Default: ["text"]. */
  input: z.array(z.enum(['text', 'image'])).min(1).optional(),
  /** Context window in tokens. Default: 128000. */
  contextWindow: z.number().int().positive().optional(),
  /** Max output tokens. Default: 8192. */
  maxTokens: z.number().int().positive().optional(),
  /** Per-token cost (USD per token). Default: all zeros. */
  cost: z.object({
    input: z.number().nonnegative(),
    output: z.number().nonnegative(),
    cacheRead: z.number().nonnegative(),
    cacheWrite: z.number().nonnegative(),
  }).optional(),
}).strict();
export type ProviderModelConfig = z.infer<typeof ProviderModelConfigSchema>;

// A custom, self-hosted or gateway provider (e.g. LiteLLM). OpenAI-compatible only in v1.
export const ProviderConfigSchema = z.object({
  /** OpenAI-compatible base URL, typically ending in /v1. */
  baseUrl: z.string().url(),
  /** Wire protocol. Only "openai-completions" is supported today. */
  api: z.enum(['openai-completions']).default('openai-completions'),
  /** Extra HTTP headers sent on every request. */
  headers: z.record(z.string(), z.string()).optional(),
  /** Env var holding the API key. Defaults to WARDEN_<NAME>_API_KEY then <NAME>_API_KEY. */
  apiKeyEnv: z.string().min(1).optional(),
  /** Models this provider exposes. At least one is required. */
  models: z.array(ProviderModelConfigSchema).min(1),
}).strict();
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

// Map of provider name -> provider config. The name becomes the model-selector prefix.
export const ProvidersConfigSchema = z.record(z.string().min(1), ProviderConfigSchema);
export type ProvidersConfig = z.infer<typeof ProvidersConfigSchema>;
```

Then add to `DefaultsSchema` (after the `scan` field, around line 257):

```ts
  /** Custom OpenAI-compatible providers (e.g. self-hosted LiteLLM). Keyed by provider name. */
  providers: ProvidersConfigSchema.optional(),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @sentry/warden test -- config/loader.test.ts -t "providers config"`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/warden/src/config/schema.ts packages/warden/src/config/loader.test.ts
git commit -m "feat(config): add custom provider schema for self-hosted LLMs

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Provider normalization + env key resolution

**Files:**
- Create: `packages/warden/src/sdk/runtimes/custom-provider.ts`
- Test: `packages/warden/src/sdk/runtimes/custom-provider.test.ts`

**Interfaces:**
- Consumes: `ProvidersConfig`, `ProviderConfig`, `ProviderModelConfig` from `../../config/schema.js`.
- Produces:
  - `interface PiProviderModel { id; name; api: 'openai-completions'; reasoning: boolean; input: ('text'|'image')[]; cost: { input; output; cacheRead; cacheWrite }; contextWindow: number; maxTokens: number }`
  - `interface PiProvider { name: string; baseUrl: string; api: 'openai-completions'; headers?: Record<string,string>; apiKey?: string; models: PiProviderModel[] }`
  - `type PiProviderOptions = { providers: PiProvider[] } | undefined`
  - `function resolveProviderApiKey(name: string, apiKeyEnv: string | undefined, env: NodeJS.ProcessEnv): string | undefined`
  - `function buildPiProviderOptions(providers: ProvidersConfig | undefined, env: NodeJS.ProcessEnv): PiProviderOptions`
  - `function isLoopbackBaseUrl(baseUrl: string): boolean`
  - `function assertCustomProviderAuth(options: PiProviderOptions): void` (throws `Error` naming the provider + expected env var)

- [ ] **Step 1: Write the failing test**

Create `packages/warden/src/sdk/runtimes/custom-provider.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sentry/warden test -- runtimes/custom-provider.test.ts`
Expected: FAIL with module-not-found / export errors.

- [ ] **Step 3: Implement the module**

Create `packages/warden/src/sdk/runtimes/custom-provider.ts`:

```ts
/**
 * Normalization and auth resolution for custom OpenAI-compatible providers
 * (e.g. self-hosted LiteLLM). Pure functions over a passed-in env object so
 * they are trivially testable and never read process.env implicitly.
 */
import type { ProvidersConfig } from '../../config/schema.js';

const DEFAULT_CONTEXT_WINDOW = 128_000;
const DEFAULT_MAX_TOKENS = 8_192;
const DEFAULT_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } as const;

export interface PiProviderModel {
  id: string;
  name: string;
  api: 'openai-completions';
  reasoning: boolean;
  input: ('text' | 'image')[];
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
  contextWindow: number;
  maxTokens: number;
}

export interface PiProvider {
  name: string;
  baseUrl: string;
  api: 'openai-completions';
  headers?: Record<string, string>;
  apiKey?: string;
  models: PiProviderModel[];
}

export type PiProviderOptions = { providers: PiProvider[] } | undefined;

/** Resolve a provider API key from the environment. apiKeyEnv wins, then conventional names. */
export function resolveProviderApiKey(
  name: string,
  apiKeyEnv: string | undefined,
  env: NodeJS.ProcessEnv,
): string | undefined {
  const upper = name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const candidates = apiKeyEnv ? [apiKeyEnv] : [`WARDEN_${upper}_API_KEY`, `${upper}_API_KEY`];
  for (const candidate of candidates) {
    const value = env[candidate];
    if (value) return value;
  }
  return undefined;
}

/** Normalize warden.toml providers into Pi registerProvider input with defaults + resolved keys. */
export function buildPiProviderOptions(
  providers: ProvidersConfig | undefined,
  env: NodeJS.ProcessEnv,
): PiProviderOptions {
  if (!providers) return undefined;
  const entries = Object.entries(providers);
  if (entries.length === 0) return undefined;

  const built: PiProvider[] = entries.map(([name, config]) => ({
    name,
    baseUrl: config.baseUrl,
    api: config.api,
    ...(config.headers ? { headers: config.headers } : {}),
    apiKey: resolveProviderApiKey(name, config.apiKeyEnv, env),
    models: config.models.map((model) => ({
      id: model.id,
      name: model.name ?? model.id,
      api: config.api,
      reasoning: model.reasoning ?? false,
      input: model.input ?? ['text'],
      cost: model.cost ?? { ...DEFAULT_COST },
      contextWindow: model.contextWindow ?? DEFAULT_CONTEXT_WINDOW,
      maxTokens: model.maxTokens ?? DEFAULT_MAX_TOKENS,
    })),
  }));

  return { providers: built };
}

/** True when the base URL points at a loopback host (unauthenticated runs allowed). */
export function isLoopbackBaseUrl(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  } catch {
    return false;
  }
}

/** Fail fast when a non-loopback provider has no resolvable API key. */
export function assertCustomProviderAuth(options: PiProviderOptions): void {
  if (!options) return;
  for (const provider of options.providers) {
    if (!provider.apiKey && !isLoopbackBaseUrl(provider.baseUrl)) {
      throw new Error(
        `Custom provider "${provider.name}" has no API key. ` +
        `Set WARDEN_${provider.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_KEY ` +
        `(or the configured apiKeyEnv), or use a localhost baseUrl for an unauthenticated endpoint.`,
      );
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @sentry/warden test -- runtimes/custom-provider.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/warden/src/sdk/runtimes/custom-provider.ts packages/warden/src/sdk/runtimes/custom-provider.test.ts
git commit -m "feat(runtime): normalize custom providers and resolve keys from env

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Wire provider options into `getRuntimeProviderOptions`

**Files:**
- Modify: `packages/warden/src/sdk/runtimes/index.ts:37-53`
- Modify: `packages/warden/src/sdk/runtimes/types.ts` (add `providerOptions` to auxiliary/synthesis requests)
- Test: `packages/warden/src/sdk/runtimes/index.test.ts` (exists)

**Interfaces:**
- Consumes: `buildPiProviderOptions`, `PiProviderOptions` from `./custom-provider.js`; `ProvidersConfig` from `../../config/schema.js`.
- Produces: `RuntimeProviderOptionsInput` gains `providers?: ProvidersConfig`; `getRuntimeProviderOptions('pi', { providers })` returns `PiProviderOptions`. `AuxiliaryRunRequestBase`/`SynthesisRunRequest` gain `providerOptions?: unknown`.

- [ ] **Step 1: Write the failing test**

Add to `packages/warden/src/sdk/runtimes/index.test.ts`:

```ts
import { getRuntimeProviderOptions } from './index.js';

describe('getRuntimeProviderOptions pi providers', () => {
  it('builds pi provider options from config', () => {
    const result = getRuntimeProviderOptions('pi', {
      providers: { litellm: { baseUrl: 'http://localhost:4000/v1', api: 'openai-completions', models: [{ id: 'm' }] } },
    }) as { providers: { name: string; models: { id: string }[] }[] } | undefined;
    expect(result?.providers[0]?.name).toBe('litellm');
    expect(result?.providers[0]?.models[0]?.id).toBe('m');
  });

  it('returns undefined for pi without providers', () => {
    expect(getRuntimeProviderOptions('pi', {})).toBeUndefined();
  });

  it('still returns the claude executable path', () => {
    expect(getRuntimeProviderOptions('claude', { pathToClaudeCodeExecutable: '/bin/claude' }))
      .toEqual({ pathToClaudeCodeExecutable: '/bin/claude' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sentry/warden test -- runtimes/index.test.ts -t "pi providers"`
Expected: FAIL (pi branch currently returns undefined even with providers).

- [ ] **Step 3: Implement**

In `packages/warden/src/sdk/runtimes/index.ts`, replace the `RuntimeProviderOptionsInput` interface and `getRuntimeProviderOptions` body (lines 37-53):

```ts
import { buildPiProviderOptions } from './custom-provider.js';
import type { ProvidersConfig } from '../../config/schema.js';

export interface RuntimeProviderOptionsInput {
  pathToClaudeCodeExecutable?: string;
  providers?: ProvidersConfig;
}

/**
 * Build provider-specific runtime options at the runtime boundary.
 */
export function getRuntimeProviderOptions(
  name: RuntimeName,
  options: RuntimeProviderOptionsInput
): unknown {
  if (name === 'claude') {
    return { pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable };
  }

  if (name === 'pi') {
    return buildPiProviderOptions(options.providers, process.env);
  }

  return undefined;
}
```

Add the `import` lines to the top of the file with the other imports (do not duplicate the existing `claudeRuntime`/`piRuntime` imports).

In `packages/warden/src/sdk/runtimes/types.ts`, add `providerOptions?: unknown;` to `AuxiliaryRunRequestBase<T>` (after `maxRetries?` at line 112) and to `SynthesisRunRequest<T>` (after `maxRetries?` at line 139), each with the doc comment:

```ts
  /** Provider-specific settings consumed only by the selected runtime adapter. */
  providerOptions?: unknown;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @sentry/warden test -- runtimes/index.test.ts -t "pi providers"`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/warden/src/sdk/runtimes/index.ts packages/warden/src/sdk/runtimes/types.ts packages/warden/src/sdk/runtimes/index.test.ts
git commit -m "feat(runtime): expose custom providers via getRuntimeProviderOptions

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Register custom providers in the Pi adapter

**Files:**
- Modify: `packages/warden/src/sdk/runtimes/pi.ts` (PiPromptOptions ~98-117; `runPiPrompt` registry creation ~346-348; `runSkill` request destructure ~751-796; `runStructured` call ~683-697)
- Test: `packages/warden/src/sdk/runtimes/pi.test.ts`

**Interfaces:**
- Consumes: `PiProviderOptions` from `./custom-provider.js`; `ModelRegistry.registerProvider` and `AuthStorage.setRuntimeApiKey` from the Pi SDK.
- Produces: `runSkill`/`runStructured` honor `request.providerOptions` of shape `PiProviderOptions`; registered providers are resolvable by `resolvePiModel`.

- [ ] **Step 1: Write the failing test**

`pi.test.ts` mocks the Pi SDK. Inspect the existing mock setup at the top of `packages/warden/src/sdk/runtimes/pi.test.ts` and reuse it. The new test asserts that when `providerOptions` carries a provider, `registerProvider` is called with the normalized config before the model is resolved. Add:

```ts
it('registers custom providers from providerOptions before resolving the model', async () => {
  // registerProvider is a vi.fn() on the mocked ModelRegistry instance — see the
  // existing mock factory in this file and extend it to capture registerProvider calls.
  const calls = capturedRegisterProviderCalls; // provided by the mock factory (see Step 3)
  calls.length = 0;

  await piRuntime.runAuxiliary({
    task: 'extraction',
    apiKey: undefined,
    prompt: 'hi',
    schema: z.object({ ok: z.boolean() }),
    model: 'litellm/my-model',
    providerOptions: {
      providers: [{
        name: 'litellm',
        baseUrl: 'http://localhost:4000/v1',
        api: 'openai-completions',
        apiKey: 'k',
        models: [{
          id: 'my-model', name: 'my-model', api: 'openai-completions', reasoning: false,
          input: ['text'], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 128000, maxTokens: 8192,
        }],
      }],
    },
  });

  expect(calls[0]?.[0]).toBe('litellm');
  expect(calls[0]?.[1]).toMatchObject({ baseUrl: 'http://localhost:4000/v1', apiKey: 'k' });
});
```

If the existing mock does not yet expose `registerProvider`/a capture array, that is part of Step 3.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sentry/warden test -- runtimes/pi.test.ts -t "registers custom providers"`
Expected: FAIL (registerProvider never called / mock missing).

- [ ] **Step 3: Implement**

In `packages/warden/src/sdk/runtimes/pi.ts`:

(a) Add the import near the other local imports:

```ts
import type { PiProviderOptions } from './custom-provider.js';
```

(b) Add to `PiPromptOptions` (after `legacyAnthropicApiKey?` ~line 104):

```ts
  /** Custom providers to register on the model registry before resolving the model. */
  customProviders?: PiProviderOptions;
```

(c) Add a helper near `createAuthStorage` (after line 151):

```ts
function registerCustomProviders(
  modelRegistry: ModelRegistry,
  authStorage: AuthStorage,
  customProviders: PiProviderOptions,
): void {
  if (!customProviders) return;
  for (const provider of customProviders.providers) {
    modelRegistry.registerProvider(provider.name, {
      baseUrl: provider.baseUrl,
      api: provider.api,
      ...(provider.headers ? { headers: provider.headers } : {}),
      ...(provider.apiKey ? { apiKey: provider.apiKey } : {}),
      models: provider.models,
    });
    if (provider.apiKey) {
      authStorage.setRuntimeApiKey(provider.name, provider.apiKey);
    }
  }
}
```

(d) In `runPiPrompt`, right after `const modelRegistry = ModelRegistry.create(authStorage);` (line 347) and before `const model = resolvePiModel(...)` (line 348):

```ts
  registerCustomProviders(modelRegistry, authStorage, options.customProviders);
```

(e) In `runSkill` destructure `providerOptions` from `request` (add to the destructure block ~751-761), then pass it through to `runPiPrompt` (in the `runPiPrompt({ ... })` call ~783-796):

```ts
      customProviders: request.providerOptions as PiProviderOptions,
```

(f) In `runStructured`, the request object already spreads `...request`. Pass it into the `runPiPrompt` call (~683-697):

```ts
          customProviders: request.providerOptions as PiProviderOptions,
```

(`runStructured`'s `request` param type is the inline object; add `providerOptions?: unknown;` to it alongside the other fields ~643-658.)

(g) Update the mock factory in `pi.test.ts` so the mocked `ModelRegistry` instance has `registerProvider: vi.fn((...args) => capturedRegisterProviderCalls.push(args))` and export/declare `capturedRegisterProviderCalls` at module scope, and the mocked `AuthStorage` has `setRuntimeApiKey: vi.fn()`. Mirror how the existing mock exposes `find`/`create`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @sentry/warden test -- runtimes/pi.test.ts`
Expected: PASS (new test + existing tests still green).

- [ ] **Step 5: Commit**

```bash
git add packages/warden/src/sdk/runtimes/pi.ts packages/warden/src/sdk/runtimes/pi.test.ts
git commit -m "feat(runtime): register custom providers in the pi adapter

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Thread `providers` through the SDK runner + all runtime call sites

**Files:**
- Modify: `packages/warden/src/sdk/types.ts` (`SkillRunnerOptions`, after line 116 `runtime?`)
- Modify: `packages/warden/src/sdk/analyze.ts:397-399` (agent call) and the extraction call site
- Modify: `packages/warden/src/sdk/verify.ts:268-270` (and `VerifyFindingsOptions`)
- Modify: `packages/warden/src/sdk/extract.ts:29-35` (`AuxiliaryCallOptions`) and `:230-238`
- Modify: `packages/warden/src/output/dedup.ts:616` and `:919`
- Modify: `packages/warden/src/action/fix-evaluation/judge.ts:208-229`
- Modify: `packages/warden/src/sdk/json-output.ts:72`
- Test: `packages/warden/src/sdk/extract.test.ts` (assert providerOptions is forwarded)

**Interfaces:**
- Consumes: `getRuntimeProviderOptions` (Task 3); `ProvidersConfig` from `config/schema.js`.
- Produces: `SkillRunnerOptions.providers?: ProvidersConfig`; `AuxiliaryCallOptions.providers?: ProvidersConfig`; `VerifyFindingsOptions.providers?: ProvidersConfig`; every Pi-capable runtime request carries `providerOptions` derived from `providers`.

- [ ] **Step 1: Write the failing test**

In `packages/warden/src/sdk/extract.test.ts`, add a test that stubs the runtime and asserts `providerOptions` is forwarded. Reuse the file's existing runtime mock (look for where `getRuntime`/`runAuxiliary` is mocked). The assertion:

```ts
it('forwards providerOptions built from providers to the auxiliary runtime', async () => {
  // Arrange: runAuxiliary mock captures its request; runtime = 'pi'.
  await extractFindingsWithLLM(rawTextWithFindings, {
    runtime: 'pi',
    providers: { litellm: { baseUrl: 'http://localhost:4000/v1', api: 'openai-completions', models: [{ id: 'm' }] } },
  });
  const req = runAuxiliaryMock.mock.calls[0][0];
  expect(req.providerOptions).toBeDefined();
  expect(req.providerOptions.providers[0].name).toBe('litellm');
});
```

(Adapt `rawTextWithFindings`/option shape to the existing test helpers in the file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sentry/warden test -- extract.test.ts -t "forwards providerOptions"`
Expected: FAIL (`providers` not a known option; `providerOptions` undefined on the request).

- [ ] **Step 3: Implement the threading**

Make these edits (each mirrors the existing `runtime`/`auxiliaryModel` handling):

1. `sdk/types.ts` — in `SkillRunnerOptions`, after `runtime?` (line 116):
```ts
  /** Custom OpenAI-compatible providers to register for the Pi runtime. */
  providers?: ProvidersConfig;
```
Add the import: `import type { ProvidersConfig } from '../config/schema.js';` (extend the existing `config/schema.js` import on line 3).

2. `sdk/extract.ts` — in `AuxiliaryCallOptions` (line 29-35) add:
```ts
  providers?: ProvidersConfig;
```
Import `ProvidersConfig` and `getRuntimeProviderOptions` (the latter is already re-exported via runner; import from `./runtimes/index.js`). In the `runAuxiliary` call (line 230), add:
```ts
    providerOptions: getRuntimeProviderOptions(runtimeName, { providers: options.providers }),
```

3. `sdk/analyze.ts` — the extraction call delegates to `extractFindingsWithLLM`; ensure the options passed there include `providers: options.providers`. Find the `extractFindingsWithLLM(` / extraction-options construction in this file and add `providers: options.providers`. Also the agent `getRuntimeProviderOptions` call (line 397) becomes:
```ts
            providerOptions: getRuntimeProviderOptions(runtimeName, {
              pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
              providers: options.providers,
            }),
```

4. `sdk/verify.ts` — add `providers?: ProvidersConfig` to `VerifyFindingsOptions`; line 268 call becomes:
```ts
          providerOptions: getRuntimeProviderOptions(runtimeName, {
            pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
            providers: options.providers,
          }),
```

5. `output/dedup.ts` — add `providers?: ProvidersConfig` to the dedup options type; both `runAuxiliary` calls (lines 616, 919) add:
```ts
    providerOptions: getRuntimeProviderOptions(options.runtime ?? 'claude', { providers: options.providers }),
```

6. `action/fix-evaluation/judge.ts` — add `providers?: ProvidersConfig` to `runtimeOptions`; the `runAuxiliary` call (line 226) adds:
```ts
    providerOptions: getRuntimeProviderOptions(runtimeOptions.runtime, { providers: runtimeOptions.providers }),
```

7. `sdk/json-output.ts` — the repair path (line 72) builds a runtime request; add `providerOptions: getRuntimeProviderOptions(repair.runtimeName ?? 'claude', { providers: repair.providers })` to that request and `providers?: ProvidersConfig` to the repair options type.

For each, import `getRuntimeProviderOptions` from `./runtimes/index.js` (or `../sdk/runtimes/index.js` for non-sdk files) and `ProvidersConfig` from the appropriate `config/schema.js` relative path.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @sentry/warden test -- extract.test.ts -t "forwards providerOptions"` → PASS.
Then `pnpm --filter @sentry/warden typecheck` → no errors (catches any missed `providers` field or import).

- [ ] **Step 5: Commit**

```bash
git add packages/warden/src/sdk packages/warden/src/output/dedup.ts packages/warden/src/action/fix-evaluation/judge.ts
git commit -m "feat(runtime): thread custom providers through all model lanes

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Resolve `providers` from config and pass it to every runner entry point

**Files:**
- Modify: `packages/warden/src/config/loader.ts` (`ResolvedTrigger` ~400, `resolveSkillConfigs` ~495 + both push branches ~546-556 and ~581-592)
- Modify: `packages/warden/src/action/triggers/executor.ts:189-192`
- Modify: `packages/warden/src/action/workflow/schedule.ts:216-219`
- Modify: `packages/warden/src/action/workflow/pr-workflow.ts:184` + auxiliary/fix-eval option construction (~313, ~566, ~635, ~685)
- Modify: `packages/warden/src/action/review/poster.ts:255-315` (consolidate + dedup option construction)
- Modify: `packages/warden/src/cli/main.ts:1100-1130, 1153-1171` (runner options + per-trigger options)
- Test: `packages/warden/src/config/loader.test.ts`

**Interfaces:**
- Consumes: `WardenConfig.defaults.providers` (Task 1).
- Produces: `ResolvedTrigger.providers?: ProvidersConfig`, populated from `defaults.providers`; carried into `SkillRunnerOptions.providers` and every auxiliary/synthesis options object.

- [ ] **Step 1: Write the failing test**

In `packages/warden/src/config/loader.test.ts`, add:

```ts
it('propagates defaults.providers onto every resolved trigger', () => {
  const config = WardenConfigSchema.parse({
    version: 1,
    defaults: { providers: { litellm: { baseUrl: 'http://localhost:4000/v1', models: [{ id: 'm' }] } } },
    skills: [{ name: 'a' }, { name: 'b', triggers: [{ type: 'local' }] }],
  });
  const resolved = resolveSkillConfigs(config);
  expect(resolved).toHaveLength(2);
  for (const trigger of resolved) {
    expect(trigger.providers?.['litellm']?.baseUrl).toBe('http://localhost:4000/v1');
  }
});
```

(Reuse the existing `resolveSkillConfigs`/`WardenConfigSchema` imports already present in the test file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sentry/warden test -- config/loader.test.ts -t "propagates defaults.providers"`
Expected: FAIL (`trigger.providers` is undefined).

- [ ] **Step 3: Implement**

1. `config/loader.ts`:
   - Add to `ResolvedTrigger` (after `runtime?` ~line 401): `providers?: ProvidersConfig;`
   - In `resolveSkillConfigs`, after `const runtime = defaults?.runtime ?? 'pi';` (line 495): `const providers = defaults?.providers;`
   - Add `providers,` to both pushed objects (next to `runtime,` at lines ~546 and ~581).
   - Import `ProvidersConfig` from `./schema.js` (extend the existing schema import).

2. Each runner entry point copies `providers` next to where it already copies `auxiliaryModel`/`runtime` into the options object it builds:
   - `action/triggers/executor.ts:189-192` → add `providers: trigger.providers,`
   - `action/workflow/schedule.ts:216-219` → add `providers: resolved.providers,`
   - `action/workflow/pr-workflow.ts` → set `providers` on the runner options (near line 184) from `baseDefaults?.providers ?? repoDefaults?.providers`, and on `auxiliaryOptions` (line 313) + fix-eval options (lines 635/685) carry the same `providers`.
   - `action/review/poster.ts` → the consolidate options (line 282) and dedup options (line 315) add `providers: ctx.providers` (add `providers?: ProvidersConfig` to the poster `ctx` type, populated upstream from the resolved trigger).
   - `cli/main.ts` → add `providers: match?.providers ?? config?.defaults?.providers` to the runner options near line 1100, and `providers: t.providers` to the per-trigger options near line 1127; add `providers` to the local options interface (~615) and the `mergeOptions` allow-list (~646) if model fields are gated there.

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm --filter @sentry/warden test -- config/loader.test.ts -t "propagates defaults.providers"` → PASS.
Run: `pnpm --filter @sentry/warden typecheck` → no errors (catches any entry point still missing `providers` where the options type now requires it, or unused-field issues).

- [ ] **Step 5: Commit**

```bash
git add packages/warden/src/config/loader.ts packages/warden/src/action packages/warden/src/cli/main.ts packages/warden/src/config/loader.test.ts
git commit -m "feat(config): propagate custom providers to all runner entry points

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Preflight auth validation for custom providers

**Files:**
- Modify: `packages/warden/src/cli/main.ts:778-790` (the preflight auth path that already calls `verifyAuth`)
- Modify: `packages/warden/src/action/workflow/base.ts` (or the action preflight near the existing auth guard ~line 71)
- Test: `packages/warden/src/cli/main.test.ts` if present, else assert via a focused unit on `assertCustomProviderAuth` already covered in Task 2 — add one integration assertion in `cli/main.test.ts` only if the harness exists.

**Interfaces:**
- Consumes: `assertCustomProviderAuth`, `buildPiProviderOptions` from `../sdk/runtimes/custom-provider.js`.
- Produces: a clear thrown error before analysis starts when a non-loopback custom provider has no key.

- [ ] **Step 1: Write the failing test**

If `cli/main.test.ts` exists with a preflight harness, add:

```ts
it('fails preflight when a non-loopback custom provider has no key', async () => {
  // Arrange runner options with runtime 'pi' and providers pointing at a remote URL,
  // with the relevant env var unset. Expect the run to reject with /API key/.
  await expect(runWithOptions({
    runtime: 'pi',
    providers: { litellm: { baseUrl: 'https://gw.example.com/v1', models: [{ id: 'm' }] } },
  })).rejects.toThrow(/litellm/);
});
```

If no such harness exists, skip the integration test (Task 2 already unit-tests `assertCustomProviderAuth`) and proceed to Step 3; record this in the commit body.

- [ ] **Step 2: Run test to verify it fails (if written)**

Run: `pnpm --filter @sentry/warden test -- cli/main.test.ts -t "fails preflight"`
Expected: FAIL (no preflight check yet).

- [ ] **Step 3: Implement**

In the CLI preflight (`cli/main.ts`, the function around line 778-790 that calls `verifyAuth`), after the existing auth handling, add (only when `runtime === 'pi'`):

```ts
import { buildPiProviderOptions, assertCustomProviderAuth } from '../sdk/runtimes/custom-provider.js';

// ...inside the preflight, when options.runtime is 'pi':
assertCustomProviderAuth(buildPiProviderOptions(options.providers, process.env));
```

Add the equivalent guard in the action preflight next to the existing API-key error in `action/workflow/base.ts` (~line 71), guarded by `runtime === 'pi'`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @sentry/warden test -- cli` and `pnpm --filter @sentry/warden typecheck` → PASS / no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/warden/src/cli/main.ts packages/warden/src/action/workflow/base.ts
git commit -m "feat(runtime): fail fast when a remote custom provider has no key

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Documentation

**Files:**
- Modify: `packages/docs/src/content/docs/config/models.mdx` (after the "Pi Model Selectors" section, before "Claude Runtime Models" ~line 58)

**Interfaces:** none (docs only).

- [ ] **Step 1: Add the docs section**

Insert into `packages/docs/src/content/docs/config/models.mdx`:

````mdx
## Self-hosted / OpenAI-compatible providers (LiteLLM)

When `runtime = "pi"`, you can register a self-hosted, OpenAI-compatible endpoint
(such as a [LiteLLM](https://docs.litellm.ai/) proxy) as a named provider and
target its models with the usual `provider/model` selector. The custom provider
covers every model lane (agent, auxiliary, synthesis).

```toml title="warden.toml"
[defaults]
runtime = "pi"

[defaults.providers.litellm]
baseUrl = "http://localhost:4000/v1"   # required; OpenAI-compatible base URL
api = "openai-completions"             # optional; default
# headers = { "X-Tenant" = "team-a" }  # optional custom headers
# apiKeyEnv = "WARDEN_LITELLM_API_KEY" # optional; overrides the default lookup

[[defaults.providers.litellm.models]]
id = "my-model"                        # required; the model name your endpoint exposes
# contextWindow = 128000               # optional; default 128000
# maxTokens = 8192                     # optional; default 8192
# reasoning = false                    # optional; default false
# cost = { input = 0, output = 0, cacheRead = 0, cacheWrite = 0 }

[defaults.agent]
model = "litellm/my-model"
```

**Model defaults:** only `id` is required. Warden fills `name` (= `id`),
`reasoning` (`false`), `input` (`["text"]`), `contextWindow` (`128000`),
`maxTokens` (`8192`), and `cost` (all zeros). Self-hosted runs therefore report
`$0` cost unless you set explicit costs.

**Authentication:** the API key is read from the environment, never from
`warden.toml`. Warden looks up `apiKeyEnv` if set, otherwise
`WARDEN_<NAME>_API_KEY` then `<NAME>_API_KEY` (e.g. `WARDEN_LITELLM_API_KEY`).
A `localhost` / `127.0.0.1` base URL may run without a key; any other host
requires one or Warden fails before analysis starts.

### Alternative: Pi `models.json`

Advanced users can instead define a custom provider in Pi's own `models.json`
(the format Pi loads on startup). Warden's Pi runtime picks up any providers and
models defined there. Prefer the `warden.toml` block above unless you already
maintain a shared Pi configuration.
````

- [ ] **Step 2: Build the docs**

Run: `pnpm --filter warden-docs build` (or the repo's docs build script)
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/docs/src/content/docs/config/models.mdx
git commit -m "docs: document self-hosted OpenAI-compatible providers (LiteLLM)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification

- [ ] Run `pnpm lint && pnpm build && pnpm test` from the repo root. All green.
- [ ] Manual smoke (optional, requires a reachable LiteLLM): set `WARDEN_LITELLM_API_KEY`, add the `[defaults.providers.litellm]` block with `model = "litellm/<model>"`, run `warden run` on a small diff, confirm analysis completes against the custom endpoint.

---

## Self-Review

**Spec coverage:**
- Config surface (`[defaults.providers.*]`) → Task 1. ✓
- Model defaults (only `id` required) → Task 2 (`buildPiProviderOptions`). ✓
- Auth from env, no secrets in config, loopback exception, fail-fast preflight → Task 2 (`resolveProviderApiKey`/`assertCustomProviderAuth`) + Task 7. ✓
- `getRuntimeProviderOptions('pi', …)` → Task 3. ✓
- Pi adapter `registerProvider` at the `runPiPrompt` choke point → Task 4. ✓
- All lanes (agent + auxiliary + synthesis) → Tasks 3 (request types) + 5 (call sites) + 6 (entry points). ✓
- `models.json` passthrough documented → Task 8. ✓
- Tests (schema, builder, provider options, registration, threading, propagation) → Tasks 1-6. ✓
- Docs → Task 8. ✓
- Out of scope (per-skill providers, ANTHROPIC_BASE_URL formalization, non-OpenAI compat) → not implemented, consistent with spec. ✓

**Placeholder scan:** No "TBD"/"implement later". The two places that say "if the harness exists" (Task 5 mock extension, Task 7 integration test) are conditional on existing test infrastructure and give a concrete fallback; not placeholders for missing plan content.

**Type consistency:** `ProvidersConfig`/`ProviderConfig`/`ProviderModelConfig` (Task 1) are used verbatim in Tasks 2/3/5/6. `PiProviderOptions`/`PiProvider`/`PiProviderModel` (Task 2) are used verbatim in Tasks 3/4. `getRuntimeProviderOptions(name, { providers })` signature (Task 3) matches every call site in Tasks 5/7. `request.providerOptions` (Task 3 types) is read in Task 4 and written in Task 5. `registerProvider(name, { baseUrl, api, headers, apiKey, models })` matches the verified `ProviderConfigInput` shape.
