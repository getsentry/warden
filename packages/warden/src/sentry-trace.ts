import { AsyncLocalStorage } from 'node:async_hooks';
import type { Span } from '@sentry/node';
import { Sentry } from './sentry.js';
import type { TraceSpan, TraceSpanAttributeValue } from './types/index.js';

type SentryStartSpanOptions = Parameters<typeof Sentry.startSpan>[0];
type SentrySpanContext = ReturnType<Span['spanContext']>;
type SentrySpanJson = ReturnType<typeof Sentry.spanToJSON>;
type SentrySpanAttributeValue = SentrySpanJson['data'][string];

export interface TraceRecorder {
  record(span: Span | undefined): void;
  snapshot(): TraceSpan[] | undefined;
}

const traceRecorderStore = new AsyncLocalStorage<TraceRecorder>();

/** Run a callback with a hunk-scoped trace recorder for Warden-created spans. */
export function withTraceRecorder<T>(recorder: TraceRecorder | undefined, callback: () => T): T {
  if (!recorder) return callback();
  return traceRecorderStore.run(recorder, callback);
}

/** Return the Sentry span context when available. */
export function getSpanContext(span: Span | undefined): SentrySpanContext | undefined {
  try {
    return span?.spanContext?.();
  } catch {
    return undefined;
  }
}

function isTraceSpanAttributeValue(value: unknown): value is TraceSpanAttributeValue {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  return Array.isArray(value) && value.every((item) =>
    typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
  );
}

function compactAttributes(attributes: Record<string, SentrySpanAttributeValue | undefined> | undefined): Record<string, TraceSpanAttributeValue> | undefined {
  if (!attributes) return undefined;

  const compact: Record<string, TraceSpanAttributeValue> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (isTraceSpanAttributeValue(value)) {
      compact[key] = value;
    }
  }

  return Object.keys(compact).length > 0 ? compact : undefined;
}

function timestampMs(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.round(value * 1000)
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function snapshotSpan(span: Span | undefined): TraceSpan | undefined {
  if (!span) return undefined;
  let spanJson: SentrySpanJson;
  try {
    spanJson = Sentry.spanToJSON(span);
  } catch {
    return undefined;
  }
  const traceId = stringValue(spanJson?.trace_id);
  const spanId = stringValue(spanJson?.span_id);
  if (!traceId || !spanId) return undefined;

  const startTimeUnixMs = timestampMs(spanJson?.start_timestamp);
  const endTimeUnixMs = timestampMs(spanJson?.timestamp);

  return {
    traceId,
    spanId,
    parentSpanId: stringValue(spanJson?.parent_span_id),
    op: stringValue(spanJson?.op),
    name: stringValue(spanJson?.description),
    startTimeUnixMs,
    endTimeUnixMs,
    durationMs: startTimeUnixMs !== undefined && endTimeUnixMs !== undefined
      ? Math.max(0, endTimeUnixMs - startTimeUnixMs)
      : undefined,
    status: stringValue(spanJson?.status),
    origin: stringValue(spanJson?.origin),
    attributes: compactAttributes(spanJson?.data),
  };
}

function descendantsForParent(spans: TraceSpan[], parentSpanId: string | undefined): TraceSpan[] {
  if (!parentSpanId) return spans;

  const byId = new Map(spans.map((span) => [span.spanId, span]));
  return spans.filter((span) => {
    let currentParentId = span.parentSpanId;
    while (currentParentId) {
      if (currentParentId === parentSpanId) return true;
      currentParentId = byId.get(currentParentId)?.parentSpanId;
    }
    return false;
  });
}

function activeTraceRecorder(): TraceRecorder | undefined {
  return traceRecorderStore.getStore();
}

function hasFinally(value: unknown): value is Promise<unknown> {
  return Boolean(value && typeof value === 'object' && typeof (value as { finally?: unknown }).finally === 'function');
}

/**
 * Start a real Sentry span and record it in Warden's active hunk trace buffer.
 *
 * The span still participates in Sentry's distributed trace. The buffer is
 * Warden-owned, though, so structured run output only depends on spans we
 * explicitly create through this helper.
 */
export function startTracedSpan<T>(options: SentryStartSpanOptions, callback: (span: Span) => T): T {
  const recorder = activeTraceRecorder();
  let spanRef: Span | undefined;
  const recordSpan = (): void => recorder?.record(spanRef);

  try {
    const result = Sentry.startSpan(options, (span) => {
      spanRef = span;
      return callback(span);
    });

    if (hasFinally(result)) {
      return result.finally(recordSpan) as T;
    }
    recordSpan();
    return result;
  } catch (error) {
    recordSpan();
    throw error;
  }
}

/** Start an inactive Sentry span that can be ended and recorded manually. */
export function startInactiveTracedSpan(options: SentryStartSpanOptions): Span {
  return Sentry.startInactiveSpan(options);
}

/** Record a manually-ended span in the active Warden trace buffer. */
export function recordTracedSpan(span: Span | undefined): void {
  activeTraceRecorder()?.record(span);
}

/** Create a hunk-scoped recorder for Warden-owned spans under a Sentry parent span. */
export function startTraceRecorder(parentSpan: Span | undefined): TraceRecorder | undefined {
  if (!parentSpan) return undefined;

  const parentContext = getSpanContext(parentSpan);
  const buffer = new Map<string, TraceSpan>();

  return {
    record(span: Span | undefined) {
      const snapshot = snapshotSpan(span);
      if (!snapshot) return;
      if (parentContext?.traceId && snapshot.traceId !== parentContext.traceId) return;
      if (snapshot.spanId === parentContext?.spanId) return;
      buffer.set(snapshot.spanId, snapshot);
    },
    snapshot() {
      const spans = descendantsForParent([...buffer.values()], parentContext?.spanId);
      return spans.length > 0 ? spans : undefined;
    },
  };
}
