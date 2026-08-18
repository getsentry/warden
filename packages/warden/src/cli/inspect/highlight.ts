/**
 * Syntax-highlight wrapper for the `warden inspect` source pane.
 *
 * Loads `cli-highlight` dynamically.  If the package is absent or the
 * highlight call throws, falls back to returning the line unchanged.
 *
 * Callers receive plain strings; this module never leaks the underlying
 * highlighter through `@sentry/warden`'s public exports.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HighlightOptions {
  /** Language hint (e.g. `'typescript'`, `'python'`). Fallback to plain text when omitted. */
  language?: string;
}

// ---------------------------------------------------------------------------
// Highlighter
// ---------------------------------------------------------------------------

/** Cached highlighter function, or `null` when the package is unavailable. */
let highlightFn: ((code: string, opts: { language?: string }) => string) | null | undefined =
  undefined;

async function loadHighlighter(): Promise<
  ((code: string, opts: { language?: string }) => string) | null
> {
  if (highlightFn !== undefined) return highlightFn;

  try {
    // Dynamic import — `cli-highlight` is an optional runtime dependency.
    // The type-level import is intentionally avoided so the build succeeds
    // even when the package is absent from node_modules.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: Record<string, any> = await import('cli-highlight' as string);
    const fn = mod['highlight'] ?? mod['default'];
    if (typeof fn === 'function') {
      highlightFn = fn as (code: string, opts: { language?: string }) => string;
    } else {
      highlightFn = null;
    }
  } catch {
    highlightFn = null;
  }

  return highlightFn;
}

/**
 * Highlight a block of source code.
 *
 * Returns the input unchanged when the highlighter is unavailable or when
 * highlighting throws.
 *
 * @param code - The full source text to highlight (may be multi-line).
 * @param opts - Language hint and other options.
 */
export async function highlightCode(code: string, opts: HighlightOptions = {}): Promise<string> {
  const fn = await loadHighlighter();
  if (!fn) return code;
  try {
    return fn(code, { language: opts.language });
  } catch {
    return code;
  }
}

/**
 * Synchronous highlight — returns the input unchanged when the async
 * highlighter hasn't been loaded yet.  Safe to call after a successful
 * `highlightCode()` call has primed the cache.
 */
export function highlightCodeSync(code: string, opts: HighlightOptions = {}): string {
  if (!highlightFn) return code;
  try {
    return highlightFn(code, { language: opts.language });
  } catch {
    return code;
  }
}

/**
 * Pre-warm the highlighter cache.  Call once on startup so that the first
 * render has the function available synchronously.
 */
export async function primeHighlighter(): Promise<void> {
  await loadHighlighter();
}
