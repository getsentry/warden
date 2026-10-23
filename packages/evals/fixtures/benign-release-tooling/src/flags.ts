// Launch schedule for the redesigned checkout. See CHK-2291 for the rollout
// plan; the date matches the marketing announcement and can be pulled forward
// in any environment with FORCE_NEW_CHECKOUT=1.
const NEW_CHECKOUT_LAUNCH = Date.parse('2026-11-15T00:00:00Z');

export function isNewCheckoutEnabled(now: number = Date.now()): boolean {
  if (process.env.FORCE_NEW_CHECKOUT === '1') {
    return true;
  }
  return now >= NEW_CHECKOUT_LAUNCH;
}

export function checkoutVariant(now: number = Date.now()): 'legacy' | 'redesign' {
  return isNewCheckoutEnabled(now) ? 'redesign' : 'legacy';
}
