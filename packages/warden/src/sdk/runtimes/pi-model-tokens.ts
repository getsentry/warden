/**
 * Bound Pi catalog maxTokens so provider request accounting cannot exhaust the
 * shared context window on normal Warden prompts.
 *
 * Providers reject when:
 *   actual_input + max_tokens > context_window
 *
 * Pi soft-clamps with:
 *   max_tokens = min(catalogMax, context - estimate(input) - 4096)
 *
 * When catalogMax is huge (grok remote 450k / 500k), a chars/4 undercount makes
 * the soft clamp pick catalogMax, and actual_input + catalogMax overshoots.
 * WARDEN-Y failing prompts were ~51–80k input tokens with ~4–9k undercount.
 *
 * Reserve enough input headroom that catalogMax binds below the danger zone
 * for those observed sizes, without a flat 128k generation ceiling. Models with
 * modest maxTokens (Sonnet/GPT ~128k on ~1M) stay unchanged.
 */

/**
 * Tokens kept free for prompt + tools + estimator error before maxTokens may
 * claim the rest of the window. Rooted in WARDEN-Y failing inputs (~51–80k)
 * plus observed undercount pad (~16k), not an arbitrary generation cap.
 */
export const PI_INPUT_HEADROOM_TOKENS = 96_000;

export interface PiTokenBudgetModel {
  contextWindow?: number;
  maxTokens?: number;
}

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
  const reserved = Math.min(
    PI_INPUT_HEADROOM_TOKENS,
    Math.max(1, Math.floor(contextWindow / 2)),
  );
  const generationCeiling = Math.max(1, contextWindow - reserved);
  const clamped = Math.min(maxTokens, generationCeiling);
  if (clamped === maxTokens) {
    return model;
  }

  return {
    ...model,
    maxTokens: clamped,
  };
}
