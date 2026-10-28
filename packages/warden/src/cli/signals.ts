const DEFAULT_DUPLICATE_SIGINT_WINDOW_MS = 750;

interface SigintHandlerOptions {
  abortController: AbortController;
  interrupted: { value: boolean };
  now?: () => number;
  exit?: (code: number) => void;
  duplicateWindowMs?: number;
}

/**
 * Create the CLI SIGINT handler.
 */
export function createSigintHandler(options: SigintHandlerOptions): () => void {
  const duplicateWindowMs = options.duplicateWindowMs ?? DEFAULT_DUPLICATE_SIGINT_WINDOW_MS;
  const now = options.now ?? (() => Date.now());
  const exit = options.exit ?? ((code) => process.exit(code));
  let gracefulInterruptSeen = false;
  let lastSigintAt = 0;

  return () => {
    const sigintAt = now();
    if (gracefulInterruptSeen && sigintAt - lastSigintAt < duplicateWindowMs) {
      return;
    }

    lastSigintAt = sigintAt;

    if (gracefulInterruptSeen) {
      exit(130);
      return;
    }

    gracefulInterruptSeen = true;
    options.abortController.abort();
    options.interrupted.value = true;
  };
}
