import { describe, expect, it } from 'vitest';
import { ProviderFailureCircuitBreaker } from './circuit-breaker.js';

describe('ProviderFailureCircuitBreaker', () => {
  it('opens immediately on auth failures', () => {
    const controller = new AbortController();
    const breaker = new ProviderFailureCircuitBreaker({ abortController: controller });

    breaker.recordFailure('auth_failed', 'bad key');

    expect(breaker.reason).toEqual({ code: 'auth_failed', message: 'bad key' });
    expect(controller.signal.aborted).toBe(true);
  });

  it('opens after consecutive provider failures and resets on success', () => {
    const controller = new AbortController();
    const breaker = new ProviderFailureCircuitBreaker({
      maxConsecutiveProviderFailures: 2,
      abortController: controller,
    });

    breaker.recordFailure('provider_unavailable', 'first outage');
    breaker.recordSuccess();
    breaker.recordFailure('provider_unavailable', 'second outage');

    expect(breaker.reason).toBeUndefined();
    expect(controller.signal.aborted).toBe(false);

    breaker.recordFailure('provider_unavailable', 'third outage');

    expect(breaker.reason?.code).toBe('provider_unavailable');
    expect(breaker.reason?.message).toContain('Provider unavailable after 2 consecutive failures');
    expect(controller.signal.aborted).toBe(true);
  });
});
