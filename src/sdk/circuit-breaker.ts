import type { ErrorCode } from '../types/index.js';
import { sanitizeErrorMessage } from './errors.js';

const DEFAULT_MAX_CONSECUTIVE_PROVIDER_FAILURES = 5;

type CircuitBreakerCode = Extract<ErrorCode, 'auth_failed' | 'provider_unavailable'>;

export interface CircuitBreakerReason {
  code: CircuitBreakerCode;
  message: string;
}

interface ProviderFailureCircuitBreakerOptions {
  maxConsecutiveProviderFailures?: number;
  abortController?: AbortController;
}

function providerUnavailableMessage(count: number, lastMessage: string): string {
  const detail = sanitizeErrorMessage(lastMessage).trim();
  const suffix = detail ? ` Last error: ${detail}` : '';
  return `Provider unavailable after ${count} consecutive failures. Warden stopped early.${suffix}`;
}

/**
 * Tracks unrecoverable provider failures across a Warden run.
 */
export class ProviderFailureCircuitBreaker {
  private consecutiveProviderFailures = 0;
  private openReason?: CircuitBreakerReason;
  private readonly maxConsecutiveProviderFailures: number;
  private readonly abortController?: AbortController;

  constructor(options: ProviderFailureCircuitBreakerOptions = {}) {
    this.maxConsecutiveProviderFailures =
      options.maxConsecutiveProviderFailures ?? DEFAULT_MAX_CONSECUTIVE_PROVIDER_FAILURES;
    this.abortController = options.abortController;
  }

  get reason(): CircuitBreakerReason | undefined {
    return this.openReason;
  }

  recordSuccess(): void {
    if (this.openReason) return;
    this.consecutiveProviderFailures = 0;
  }

  recordFailure(code: ErrorCode, message: string): void {
    if (this.openReason) return;

    if (code === 'auth_failed') {
      this.open({ code, message });
      return;
    }

    if (code !== 'provider_unavailable') return;

    this.consecutiveProviderFailures++;
    if (this.consecutiveProviderFailures >= this.maxConsecutiveProviderFailures) {
      this.open({
        code,
        message: providerUnavailableMessage(this.consecutiveProviderFailures, message),
      });
    }
  }

  private open(reason: CircuitBreakerReason): void {
    this.openReason = reason;
    if (!this.abortController?.signal.aborted) {
      this.abortController?.abort();
    }
  }
}
