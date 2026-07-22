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

  it('opens immediately on invalid model selectors', () => {
    const controller = new AbortController();
    const breaker = new ProviderFailureCircuitBreaker({ abortController: controller });

    breaker.recordFailure('invalid_model_selector', 'bad model');

    expect(breaker.reason).toEqual({ code: 'invalid_model_selector', message: 'bad model' });
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

    const providerContextScope = {
      apiKey: 'secret-provider-key',
      circuitBreaker: breaker,
    };
    breaker.recordFailure('provider_unavailable', 'third outage', {
      runtime: 'pi',
      provider: 'openrouter',
      model: 'openrouter/anthropic/claude-sonnet-4',
      status: 'provider_error',
      responseId: 'req_123',
      message: 'third outage',
    }, providerContextScope);

    expect(breaker.reason?.code).toBe('provider_unavailable');
    expect(breaker.reason?.message).toContain('Provider unavailable after 2 consecutive failures');
    expect(breaker.reason?.message).toContain('third outage');
    expect(breaker.reason?.providerContext).toEqual({
      runtime: 'pi',
      provider: 'openrouter',
      model: 'openrouter/anthropic/claude-sonnet-4',
      status: 'provider_error',
      responseId: 'req_123',
      attempts: 2,
      message: 'third outage',
    });
    expect(breaker.providerContextFor(providerContextScope)).toEqual(
      breaker.reason?.providerContext,
    );
    expect(breaker.providerContextFor({})).toBeUndefined();
    expect(() => JSON.stringify(breaker.reason)).not.toThrow();
    expect(JSON.stringify(breaker.reason)).not.toContain(providerContextScope.apiKey);
    expect(controller.signal.aborted).toBe(true);
  });

  it('humanizes Anthropic overloaded errors in the circuit message', () => {
    const breaker = new ProviderFailureCircuitBreaker({ maxConsecutiveProviderFailures: 1 });
    const raw = 'Runtime execution failed: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}';

    breaker.recordFailure('provider_unavailable', raw);

    expect(breaker.reason?.message).toContain('Anthropic is overloaded');
    expect(breaker.reason?.message).not.toContain('{');
  });
});
