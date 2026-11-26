import {
  createAssistantMessageEventStream,
  type AssistantMessage,
  type AssistantMessageEvent,
  type AssistantMessageEventStream,
} from '@earendil-works/pi-ai';
import type { AgentSession } from '@earendil-works/pi-coding-agent';
import { anyAbortSignal } from './abort-signals.js';

type StreamFunction = AgentSession['agent']['streamFunction'];
type StreamModel = Parameters<StreamFunction>[0];

/** Relays provider events to the agent loop and can end the turn with an error. */
interface TurnRelay {
  readonly output: AssistantMessageEventStream;
  forward(event: AssistantMessageEvent): void;
  /** No-op once the turn has a terminal event. */
  fail(errorMessage: string): void;
}

/**
 * Bound each model request by wall-clock time.
 *
 * Provider SDK timeouts stop at the response headers, and Pi's HTTP idle
 * timeout resets on every streamed byte, so a stream that keeps trickling
 * data never ends (OpenRouter streams in Warden ran 45+ minutes). On expiry
 * the request is aborted and the turn ends with a retryable error, so Pi's
 * agent-level retry resubmits the turn.
 */
export function withRequestDeadline(streamFunction: StreamFunction, deadlineMs: number): StreamFunction {
  return async (model, context, options) => {
    const deadline = new AbortController();
    const signal = options?.signal ? anyAbortSignal(options.signal, deadline.signal) : deadline.signal;
    const relay = createTurnRelay(model);
    const timer = setTimeout(() => {
      const message = timeoutErrorMessage(deadlineMs);
      deadline.abort(new Error(message));
      relay.fail(message);
    }, deadlineMs);
    timer.unref?.();

    try {
      const source = await streamFunction(model, context, { ...options, signal });
      void pipeTurn(source, relay).finally(() => clearTimeout(timer));
    } catch (error) {
      clearTimeout(timer);
      throw error;
    }
    return relay.output;
  };
}

/** Pi retries assistant errors matching "timed out" (pi-ai `isRetryableAssistantError`). */
function timeoutErrorMessage(deadlineMs: number): string {
  return `Model request timed out after ${deadlineMs}ms`;
}

async function pipeTurn(source: AssistantMessageEventStream, relay: TurnRelay): Promise<void> {
  try {
    for await (const event of source) {
      relay.forward(event);
    }
  } catch (error) {
    relay.fail(error instanceof Error ? error.message : String(error));
  }
  // A source that ends without "done" or "error" would leave the agent loop
  // waiting on result() forever. "ended without" is also a Pi retry pattern.
  relay.fail('Model stream ended without a terminal event');
}

function createTurnRelay(model: StreamModel): TurnRelay {
  const output = createAssistantMessageEventStream();
  let lastPartial: AssistantMessage | undefined;
  return {
    output,
    forward(event) {
      if ('partial' in event) lastPartial = event.partial;
      output.push(event);
    },
    fail(errorMessage) {
      const base = lastPartial ?? emptyAssistantMessage(model);
      output.push({ type: 'error', reason: 'error', error: { ...base, stopReason: 'error', errorMessage } });
    },
  };
}

function emptyAssistantMessage(model: StreamModel): AssistantMessage {
  return {
    role: 'assistant',
    content: [],
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: 'error',
    timestamp: Date.now(),
  };
}
