/**
 * Bound Pi catalog maxTokens so provider request accounting cannot exhaust the
 * shared context window on normal Warden prompts.
 *
 * Providers reject when:
 *   actual_input + max_tokens > context_window
 *
 * Pi then soft-clamps with:
 *   max_tokens = min(catalogMax, context - estimate(input) - 4096)
 *
 * Remote catalogs sometimes advertise maxTokens ≈ 0.9 * contextWindow
 * (for example openrouter/x-ai/grok-4.5: 450k of 500k). A chars/4 estimate
 * undercount of a few thousand tokens is enough to push a ~50k security-review
 * prompt over the limit. Models with modest maxTokens (Sonnet/GPT ~128k on a
 * 1M window) are unaffected either way.
 *
 * Bound catalog maxTokens by:
 * 1. a hard generation ceiling — Warden never needs multi-hundred-k completions
 * 2. a hard input reservation — even estimate=0 must leave room for the prompt
 */
export const PI_MAX_OUTPUT_TOKENS = 128_000;

/** Tokens always reserved for prompt + tools before any maxTokens claim. */
export const PI_MIN_INPUT_RESERVATION_TOKENS = 128_000;

export type PiTokenBudgetModel = {
  contextWindow?: number;
  maxTokens?: number;
};

/**
 * Return a copy of `model` with maxTokens capped for provider headroom.
 * No-ops when context/maxTokens are missing or already within bounds.
 */
export function clampPiCatalogMaxTokens<T extends PiTokenBudgetModel>(model: T): T {
  const contextWindow = model.contextWindow ?? 0;
  const maxTokens = model.maxTokens ?? 0;
  if (contextWindow <= 0 || maxTokens <= 0) {
    return model;
  }

  // On small windows, reserve at most half so generation still has room.
  const inputReservation = Math.min(
    PI_MIN_INPUT_RESERVATION_TOKENS,
    Math.max(1, Math.floor(contextWindow / 2)),
  );
  const generationCeiling = Math.min(
    PI_MAX_OUTPUT_TOKENS,
    Math.max(1, contextWindow - inputReservation),
  );
  const clamped = Math.min(maxTokens, generationCeiling);
  if (clamped === maxTokens) {
    return model;
  }

  return {
    ...model,
    maxTokens: clamped,
  };
}
