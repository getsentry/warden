export type ActionCancelSignal = 'SIGINT' | 'SIGTERM';

const DEFAULT_DUPLICATE_SIGNAL_WINDOW_MS = 750;

/** Run-scoped cancellation state shared by the Action entrypoint and workflows. */
export class ActionCancellation {
  private readonly controller = new AbortController();
  readonly signal: AbortSignal = this.controller.signal;
  signalName: ActionCancelSignal | undefined;

  get requested(): boolean {
    return this.signalName !== undefined;
  }

  request(signalName: ActionCancelSignal): boolean {
    if (this.requested) return false;

    this.signalName = signalName;
    this.controller.abort(new Error(`Action cancelled by ${signalName}`));
    return true;
  }

  get exitCode(): number {
    return this.signalName === 'SIGTERM' ? 143 : 130;
  }
}

interface ActionSignalHandlerOptions {
  cancellation: ActionCancellation;
  now?: () => number;
  exit?: (code: number) => void;
  duplicateWindowMs?: number;
}

/** Create a shared SIGINT/SIGTERM handler with graceful-first, force-second behavior. */
export function createActionSignalHandler(
  options: ActionSignalHandlerOptions
): (signalName: ActionCancelSignal) => void {
  const duplicateWindowMs = options.duplicateWindowMs ?? DEFAULT_DUPLICATE_SIGNAL_WINDOW_MS;
  const now = options.now ?? (() => Date.now());
  const exit = options.exit ?? ((code) => process.exit(code));
  let lastSignalAt = 0;

  return (signalName) => {
    const receivedAt = now();
    if (options.cancellation.requested && receivedAt - lastSignalAt < duplicateWindowMs) {
      return;
    }

    lastSignalAt = receivedAt;
    if (!options.cancellation.request(signalName)) {
      exit(signalName === 'SIGTERM' ? 143 : 130);
      return;
    }

    console.warn(`Cancellation requested by ${signalName}; finalizing partial results`);
  };
}
