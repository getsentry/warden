/**
 * Review Coordination
 *
 * Safety checks for stale comment resolution across multiple triggers.
 */
// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------
/**
 * Check if stale comment resolution should proceed.
 *
 * Returns false if any trigger failed, because failed triggers may have
 * had findings that we can no longer verify are fixed.
 */
export function shouldResolveStaleComments(results) {
    return results.every((r) => !r.error);
}
//# sourceMappingURL=coordination.js.map