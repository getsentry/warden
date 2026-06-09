import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ensureLocalTracing, Sentry } from './sentry.js';
import { startTraceRecorder, startTracedSpan } from './sentry-trace.js';
import type { TraceSpan } from './types/index.js';

describe('structured trace capture', () => {
  beforeEach(async () => {
    delete process.env['WARDEN_SENTRY_DSN'];
    await Sentry.close(0);
  });

  afterEach(async () => {
    await Sentry.close(0);
  });

  it('records local child spans when telemetry is not configured', async () => {
    ensureLocalTracing();

    let parentTraceId: string | undefined;
    let parentSpanId: string | undefined;
    let spans: TraceSpan[] | undefined;

    await Sentry.startSpan({ op: 'skill.analyze_hunk', name: 'analyze hunk src/example.ts:1' }, async (span) => {
      const parentContext = span.spanContext();
      parentTraceId = parentContext.traceId;
      parentSpanId = parentContext.spanId;
      const traceRecorder = startTraceRecorder(span);

      await startTracedSpan(
        {
          op: 'gen_ai.invoke_agent',
          name: 'invoke_agent security-review',
          parentSpan: span,
          attributes: {
            'gen_ai.operation.name': 'invoke_agent',
          },
        },
        () => undefined,
        traceRecorder,
      );

      spans = traceRecorder?.snapshot();
    });

    expect(spans).toEqual([
      expect.objectContaining({
        traceId: parentTraceId,
        parentSpanId,
        op: 'gen_ai.invoke_agent',
        name: 'invoke_agent security-review',
        attributes: expect.objectContaining({
          'gen_ai.operation.name': 'invoke_agent',
        }),
      }),
    ]);
  });
});
