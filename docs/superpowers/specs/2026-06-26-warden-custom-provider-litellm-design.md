# Design: Self-hosted LLMs via custom Pi providers (LiteLLM)

**Date:** 2026-06-26
**Status:** Approved (pending spec review)
**Topic:** Custom OpenAI-compatible provider support for the Pi runtime

## Problem

Warden can only target the providers Pi ships built-in (Anthropic, OpenAI,
OpenRouter, Fireworks, etc.) or the Claude runtime. Users who run their own
models behind a self-hosted gateway such as [LiteLLM](https://docs.litellm.ai/)
have no first-class way to point Warden at a custom base URL. LiteLLM exposes an
OpenAI-compatible `/v1/chat/completions` surface (and an Anthropic-compatible
`/v1/messages` surface), so the capability exists at the SDK layer but is not
reachable from `warden.toml`.

## Goal

Let a user register a self-hosted, OpenAI-compatible endpoint as a named provider
in `warden.toml` and select its models with the existing `provider/model`
selector syntax. All model lanes (agent, auxiliary, synthesis) route through the
custom provider when their selector points at it.

## Non-goals (YAGNI)

- Per-skill or per-trigger provider definitions. Providers are global within a
  config layer, consistent with how `runtime` already works.
- Formalizing `ANTHROPIC_BASE_URL` for the `claude` runtime. (It already works
  via env passthrough; not part of this change.)
- Compatibility modes beyond OpenAI-completions. The schema reserves an `api`
  field so `anthropic-messages` can be added later, but only
  `openai-completions` is wired and tested now.
- Storing secrets in `warden.toml`. API keys come from the environment only.

## Key facts (verified against installed packages)

- `@earendil-works/pi-coding-agent@0.78.0` `ModelRegistry` exposes
  `registerProvider(name, config: ProviderConfigInput)` where
  `ProviderConfigInput` accepts `{ baseUrl, apiKey, api, headers, authHeader,
  models[] }`. Each `models[]` entry requires
  `{ id, name, reasoning, input, cost{input,output,cacheRead,cacheWrite},
  contextWindow, maxTokens }` and optional `{ api, baseUrl, headers, compat,
  thinkingLevelMap }`.
- `@earendil-works/pi-ai@0.78.0` `Api` includes `"openai-completions"`.
  `OpenAICompletionsCompat` is auto-detected from the base URL when `compat` is
  omitted.
- `pi.ts` `runPiPrompt()` is the single choke point: both `runSkill` and the
  auxiliary/synthesis `runStructured` paths call it. It builds a fresh
  `ModelRegistry.create(authStorage)` per call, then `resolvePiModel()`.
  Registering the custom provider here covers every lane.
- `AuthStorage.setRuntimeApiKey(provider, apiKey)` already sets the legacy
  Anthropic key today (`createAuthStorage`). The same mechanism sets a custom
  provider key.
- `bridgeWardenProviderApiKeyEnv()` already mirrors `WARDEN_<X>_API_KEY` to
  `<X>_API_KEY`.
- The agent path (`analyze.ts`, `verify.ts`) already builds provider options via
  `getRuntimeProviderOptions(runtimeName, {...})` and threads a `providerOptions`
  field on `SkillRunRequest`. `AuxiliaryRunRequest`/`SynthesisRunRequest` do
  **not** yet carry `providerOptions`; this change adds it.

## Configuration surface

New `[defaults.providers.<name>]` map in `warden.toml`:

```toml
[defaults]
runtime = "pi"

[defaults.providers.litellm]
baseUrl = "http://localhost:4000/v1"   # required; OpenAI-compatible base URL
api = "openai-completions"             # optional; default "openai-completions"
# headers = { "X-Tenant" = "team-a" }  # optional custom headers
# apiKeyEnv = "WARDEN_LITELLM_API_KEY" # optional; override the default env lookup

[[defaults.providers.litellm.models]]
id = "my-model"                        # required; the model name LiteLLM exposes
# contextWindow = 128000               # optional; default 128000
# maxTokens = 8192                     # optional; default 8192
# reasoning = false                    # optional; default false
# cost = { input = 0, output = 0, cacheRead = 0, cacheWrite = 0 }  # default zeros

[defaults.agent]
model = "litellm/my-model"
```

Selector behavior is unchanged: split at the first `/`, provider before, model id
after. `litellm/my-model` resolves to the registered `litellm` provider.

### Model field defaults

Only `id` is required per model. Warden fills the rest before calling
`registerProvider`:

| Field | Default |
| --- | --- |
| `name` | same as `id` |
| `reasoning` | `false` |
| `input` | `["text"]` |
| `contextWindow` | `128000` |
| `maxTokens` | `8192` |
| `cost` | `{ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }` |
| `api` | provider-level `api` (default `openai-completions`) |

Cost defaults of zero mean self-hosted runs report `$0`; acceptable for the
common internal-gateway case.

## Authentication

No secret lives in `warden.toml`. The Bearer key is resolved from the
environment at runtime:

1. If `apiKeyEnv` is set, read that variable.
2. Otherwise try `WARDEN_<NAME_UPPER>_API_KEY`, then `<NAME_UPPER>_API_KEY`
   (e.g. `WARDEN_LITELLM_API_KEY`, then `LITELLM_API_KEY`).
3. If none is set and the endpoint is non-loopback, fail preflight with a clear
   message naming the expected env var. Loopback URLs (localhost/127.0.0.1) are
   allowed to run unauthenticated.

The resolved key is handed to Pi via `registerProvider({ apiKey })` and/or
`AuthStorage.setRuntimeApiKey(name, key)`. It never touches disk.

## Architecture / plumbing

### 1. Schema (`config/schema.ts`)

- `ProviderModelSchema`: `{ id: string (min 1), name?: string,
  reasoning?: boolean, input?: ("text"|"image")[], contextWindow?: positive int,
  maxTokens?: positive int, cost?: { input, output, cacheRead, cacheWrite all
  >= 0 } }`.
- `ProviderConfigSchema`: `{ baseUrl: z.string().url(),
  api?: z.enum(["openai-completions"]) (default "openai-completions"),
  headers?: z.record(z.string()), apiKeyEnv?: z.string(),
  models: z.array(ProviderModelSchema).min(1) }` (`.strict()`).
- `ProvidersConfigSchema`: `z.record(z.string(), ProviderConfigSchema)`.
- Add `providers: ProvidersConfigSchema.optional()` to `DefaultsSchema`.

### 2. Provider options builder (`runtimes/index.ts`)

- Extend `RuntimeProviderOptionsInput` with an optional `providers` field
  (the validated `ProvidersConfig`).
- In `getRuntimeProviderOptions`, when `name === 'pi'` and `providers` is
  present, return a `PiProviderOptions` object: the normalized provider list with
  model defaults applied and the env-resolved API key attached per provider.
  Key resolution (env lookup) happens here so the Pi adapter receives ready
  values; absent keys are left undefined for the adapter/preflight to handle.
- `claude` branch unchanged.

### 3. Pi adapter (`runtimes/pi.ts`)

- Add `providers?: PiProviderOptions` to `PiPromptOptions`.
- In `runPiPrompt`, after `ModelRegistry.create(authStorage)` and before
  `resolvePiModel`, iterate `providers` and call
  `modelRegistry.registerProvider(name, { baseUrl, api, headers, apiKey,
  models })`. Set the runtime API key on `authStorage` when present.
- `runSkill` reads `providers` from `request.providerOptions`.
- `runStructured` (auxiliary/synthesis) reads `providers` from the request and
  forwards into `runPiPrompt`.

### 4. Request types (`runtimes/types.ts`)

- Add `providerOptions?: unknown` to `AuxiliaryRunRequestBase` and
  `SynthesisRunRequest` so auxiliary/synthesis calls can carry the same
  provider options the agent path already passes.

### 5. Threading (all lanes)

Pass the `providers` config into `getRuntimeProviderOptions` at every Pi call
site, mirroring how `runtimeName`/`model` already flow:

- Agent: `analyze.ts`, `verify.ts` (extend the existing
  `getRuntimeProviderOptions` calls with `providers`).
- Auxiliary/synthesis: `extract.ts`, `output/dedup.ts`,
  `action/fix-evaluation/judge.ts`, `sdk/json-output.ts`, and the skill-builder
  paths (`outline.ts`, `agentic.ts`, `skill.ts`) — add `providerOptions:
  getRuntimeProviderOptions(runtimeName, { providers })` to each runtime request.

The `providers` value originates from the resolved `WardenConfig.defaults` and
is carried alongside the existing runner options object that already conveys
`runtime`/`model` to these call sites.

### 6. Validation & errors

- When resolving a model selector whose provider prefix is neither a built-in Pi
  provider nor a key in `[defaults.providers]`, throw a clear error naming the
  unknown provider and listing configured custom providers. Reuse the existing
  invalid-selector error surface where practical.
- Preflight: if a configured provider requires a key (has `apiKeyEnv` or a
  non-loopback `baseUrl`) and none resolves, fail before the first model call.

## Testing

- **Unit (`config/schema.test.ts`)**: accept a valid `[defaults.providers.*]`
  block; reject a bad `baseUrl`, an unsupported `api`, and an empty `models`
  array.
- **Unit (`runtimes/index.test.ts`)**: `getRuntimeProviderOptions('pi',
  { providers })` applies model defaults and resolves the API key from
  `apiKeyEnv`, then `WARDEN_<NAME>_API_KEY`, then `<NAME>_API_KEY`; returns
  undefined key when absent.
- **Integration (`runtimes/pi.test.ts`)**: with `ModelRegistry`/
  `registerProvider` stubbed, a request carrying a custom provider registers it
  and resolves `litellm/my-model`. Mock the HTTP boundary; no live LiteLLM.
- **Regression**: a selector with an unknown provider prefix produces the
  friendly error.

## Documentation

Extend `packages/docs/src/content/docs/config/models.mdx` with a "Self-hosted /
OpenAI-compatible providers (LiteLLM)" section covering the
`[defaults.providers.*]` block, the model-field defaults table, env-var auth,
and the Pi `models.json` passthrough as an alternative escape hatch.

## Decisions captured

- Runtime: Pi only.
- Config surface: first-class `warden.toml` + documented `models.json`
  passthrough.
- Endpoint shape: OpenAI-compatible with Bearer key.
- Lane coverage: all lanes (agent + auxiliary + synthesis).
- Model fields: sensible defaults; only `id` required.
