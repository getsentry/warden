/**
 * Combine abort signals without AbortSignal.any (Node < 20.3).
 * Warden's engines field allows Node >= 20.0.0.
 */
export function anyAbortSignal(...signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(signals);
  }

  const controller = new AbortController();
  const onAbort = (): void => {
    controller.abort();
    for (const signal of signals) {
      signal.removeEventListener('abort', onAbort);
    }
  };

  for (const signal of signals) {
    if (signal.aborted) {
      onAbort();
      break;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  }

  return controller.signal;
}

/**
 * Build a timeout signal without AbortSignal.timeout (Node < 20.3).
 * Same engines window as anyAbortSignal above.
 */
export function timeoutAbortSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
  }, ms);
  // Match Node's AbortSignal.timeout: do not keep the process alive for the deadline alone.
  timer.unref?.();
  return controller.signal;
}
