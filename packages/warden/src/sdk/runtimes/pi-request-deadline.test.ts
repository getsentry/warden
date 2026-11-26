import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAssistantMessageEventStream,
  fauxAssistantMessage,
  fauxProvider,
  isRetryableAssistantError,
  type AssistantMessage,
  type AssistantMessageEvent,
  type AssistantMessageEventStream,
} from '@earendil-works/pi-ai';
import {
  ModelRuntime,
  SessionManager,
  SettingsManager,
  createAgentSession,
  type AgentSession,
} from '@earendil-works/pi-coding-agent';
import { withRequestDeadline } from './pi-request-deadline.js';

type StreamFunction = AgentSession['agent']['streamFunction'];
type StreamModel = Parameters<StreamFunction>[0];
type StreamContext = Parameters<StreamFunction>[1];

const DEADLINE_MS = 1_000;
const NOW = 1_700_000_000_000;
const model = { api: 'openai-completions', provider: 'openrouter', id: 'x-ai/grok-test' } as unknown as StreamModel;
const context = { messages: [] } as unknown as StreamContext;

function message(overrides: Partial<AssistantMessage> = {}): AssistantMessage {
  return {
    role: 'assistant',
    content: [],
    api: 'openai-completions',
    provider: 'openrouter',
    model: 'x-ai/grok-test',
    usage: {
      input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: 'pending',
    timestamp: NOW,
    ...overrides,
  };
}

/** Fake provider that records each request signal and lets the test drive the stream. */
function fakeProvider(source: AssistantMessageEventStream = createAssistantMessageEventStream()) {
  const signals: (AbortSignal | undefined)[] = [];
  const streamFunction: StreamFunction = (_model, _context, options) => {
    signals.push(options?.signal);
    return source;
  };
  return { source, signals, streamFunction };
}

/** Provider stream whose iteration fails, like a dropped socket. */
function throwingStream(error: Error): AssistantMessageEventStream {
  return {
    [Symbol.asyncIterator]: () => ({ next: () => Promise.reject(error) }),
  } as unknown as AssistantMessageEventStream;
}

async function collect(stream: AssistantMessageEventStream): Promise<AssistantMessageEvent[]> {
  const events: AssistantMessageEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

function request(provider: { streamFunction: StreamFunction }, signal?: AbortSignal) {
  return withRequestDeadline(provider.streamFunction, DEADLINE_MS)(model, context, signal ? { signal } : {});
}

describe('withRequestDeadline', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Regression: OpenRouter streams in sentry-javascript stayed open for 45+ minutes.
  it('ends a stalled request with a retryable timeout error that keeps the partial output', async () => {
    const provider = fakeProvider();
    const stream = await request(provider);
    provider.source.push({ type: 'start', partial: message({ content: [{ type: 'text', text: 'partial' }] }) });

    await vi.advanceTimersByTimeAsync(DEADLINE_MS);

    const result = await stream.result();
    expect(result).toEqual(message({
      content: [{ type: 'text', text: 'partial' }],
      stopReason: 'error',
      errorMessage: `Model request timed out after ${DEADLINE_MS}ms`,
    }));
    expect(isRetryableAssistantError(result)).toBe(true);
  });

  it('aborts the provider request when the deadline passes', async () => {
    const provider = fakeProvider();
    await request(provider);

    await vi.advanceTimersByTimeAsync(DEADLINE_MS);

    expect(provider.signals[0]?.aborted).toBe(true);
  });

  it('builds the timeout error from the model when no event arrived', async () => {
    const provider = fakeProvider();
    const stream = await request(provider);

    await vi.advanceTimersByTimeAsync(DEADLINE_MS);

    expect(await stream.result()).toEqual(message({
      stopReason: 'error',
      errorMessage: `Model request timed out after ${DEADLINE_MS}ms`,
      timestamp: NOW + DEADLINE_MS,
    }));
  });

  it('does not time out just before the deadline', async () => {
    const provider = fakeProvider();
    await request(provider);

    await vi.advanceTimersByTimeAsync(DEADLINE_MS - 1);

    expect(provider.signals[0]?.aborted).toBe(false);
  });

  it('passes a request that finishes in time through and clears its deadline', async () => {
    const provider = fakeProvider();
    const stream = await request(provider);
    const done = message({ stopReason: 'stop', content: [{ type: 'text', text: 'ok' }] });
    provider.source.push({ type: 'start', partial: message() });
    provider.source.push({ type: 'done', reason: 'stop', message: done });

    const events = await collect(stream);

    expect(events.map((event) => event.type)).toEqual(['start', 'done']);
    expect(await stream.result()).toBe(done);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('forwards a caller abort to the provider request', async () => {
    const provider = fakeProvider();
    const caller = new AbortController();
    await request(provider, caller.signal);

    caller.abort();

    expect(provider.signals[0]?.aborted).toBe(true);
  });

  it('starts the provider request aborted when the caller already aborted', async () => {
    const provider = fakeProvider();

    await request(provider, AbortSignal.abort());

    expect(provider.signals[0]?.aborted).toBe(true);
  });

  it('ends the turn with the stream error when the provider stream throws', async () => {
    const provider = fakeProvider(throwingStream(new Error('socket hang up')));

    const stream = await request(provider);

    expect(await stream.result()).toEqual(message({ stopReason: 'error', errorMessage: 'socket hang up' }));
  });

  it('ends the turn with a retryable error when the provider stream stops without a terminal event', async () => {
    const provider = fakeProvider();
    const stream = await request(provider);

    provider.source.end();

    const result = await stream.result();
    expect(result.errorMessage).toBe('Model stream ended without a terminal event');
    expect(isRetryableAssistantError(result)).toBe(true);
  });

  it('rethrows a stream function failure and clears its deadline', async () => {
    const failing: StreamFunction = () => {
      throw new Error('No API key for provider: openrouter');
    };

    await expect(withRequestDeadline(failing, DEADLINE_MS)(model, context, {}))
      .rejects.toThrow('No API key for provider: openrouter');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('withRequestDeadline in a Pi agent session', () => {
  let agentDir: string;

  beforeEach(() => {
    agentDir = mkdtempSync(join(tmpdir(), 'warden-pi-deadline-'));
  });

  afterEach(() => {
    rmSync(agentDir, { recursive: true, force: true });
  });

  it('lets Pi retry a timed-out turn and finish with the retried answer', async () => {
    const faux = fauxProvider();
    // First request never answers; the retry answers at once.
    faux.setResponses([() => new Promise<never>(() => undefined), fauxAssistantMessage('retried answer')]);
    const modelRuntime = await ModelRuntime.create({ modelsPath: null, refreshOnCreate: false });
    modelRuntime.registerNativeProvider(faux.provider);
    const { session } = await createAgentSession({
      cwd: agentDir,
      agentDir,
      modelRuntime,
      model: faux.getModel(),
      noTools: 'all',
      sessionManager: SessionManager.inMemory(agentDir),
      settingsManager: SettingsManager.inMemory({
        compaction: { enabled: false },
        retry: { enabled: true, maxRetries: 1, baseDelayMs: 1 },
      }),
    });
    session.agent.streamFunction = withRequestDeadline(session.agent.streamFunction, 50);
    const retries: string[] = [];
    session.subscribe((event) => {
      if (event.type === 'auto_retry_start') retries.push(event.errorMessage);
    });

    await session.prompt('review this hunk');

    expect(retries).toEqual(['Model request timed out after 50ms']);
    expect(faux.state.callCount).toBe(2);
    expect(session.agent.state.messages.at(-1)).toMatchObject({
      role: 'assistant',
      stopReason: 'stop',
      content: [{ type: 'text', text: 'retried answer' }],
    });
    session.dispose();
  });
});
