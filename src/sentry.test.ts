import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Finding } from './types/index.js';
import { buildFindingStageAttributes } from './telemetry/findings.js';

const mockStartSpan = vi.fn();
const mockGetActiveSpan = vi.fn();
const mockInit = vi.fn();
const mockSetTag = vi.fn();
const mockGetGlobalScope = vi.fn(() => ({ setAttributes: vi.fn() }));
const mockConsoleLoggingIntegration = vi.fn();
const mockAnthropicAIIntegration = vi.fn();
const mockHttpIntegration = vi.fn();

vi.mock('@sentry/node', () => ({
  init: mockInit,
  setTag: mockSetTag,
  getGlobalScope: mockGetGlobalScope,
  getActiveSpan: mockGetActiveSpan,
  startSpan: mockStartSpan,
  consoleLoggingIntegration: mockConsoleLoggingIntegration,
  anthropicAIIntegration: mockAnthropicAIIntegration,
  httpIntegration: mockHttpIntegration,
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), fmt: vi.fn() },
}));

describe('finding telemetry', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env['WARDEN_SENTRY_DSN'];
    mockStartSpan.mockImplementation((_options, callback) => callback({
      setAttributes: vi.fn(),
      spanContext: () => ({ traceId: 'trace-1', spanId: 'span-1' }),
    }));
    mockGetActiveSpan.mockReturnValue({
      spanContext: () => ({ traceId: 'parent-trace', spanId: 'parent-span' }),
    });
  });

  function makeFinding(overrides: Partial<Finding> = {}): Finding {
    return {
      id: 'finding-1',
      severity: 'high',
      confidence: 'medium',
      title: 'Leaky abstraction',
      description: 'State leaks across retries',
      verification: 'Re-run the task twice',
      location: { path: 'src/example.ts', startLine: 12, endLine: 14 },
      additionalLocations: [{ path: 'src/other.ts', startLine: 22 }],
      suggestedFix: {
        description: 'Reset the accumulator',
        diff: '@@ -1 +1 @@\n-old\n+new',
      },
      elapsedMs: 42,
      ...overrides,
    };
  }

  it('builds reference-only attributes for intermediate stages', () => {
    const attrs = buildFindingStageAttributes('report_deduped', [makeFinding()], { skill: 'test-skill' }, {
      traceId: 'trace-1',
      spanId: 'span-1',
    });

    expect(attrs).toMatchObject({
      'warden.findings.stage': 'report_deduped',
      'warden.findings.count': 1,
      'warden.findings.ids': ['finding-1'],
      'warden.findings.skill': 'test-skill',
      'warden.findings.trace_id': 'trace-1',
      'warden.findings.span_id': 'span-1',
    });
    expect(attrs).toHaveProperty('warden.findings.fingerprints');
    expect(attrs).not.toHaveProperty('warden.findings.0.title');
    expect(attrs).not.toHaveProperty('warden.findings.0.has_suggested_fix');
  });

  it('builds full attributes for snapshot stages', () => {
    const attrs = buildFindingStageAttributes('report_final', [makeFinding()], { skill: 'test-skill' }, {
      traceId: 'trace-1',
      spanId: 'span-1',
    });

    expect(attrs).toMatchObject({
      'warden.findings.stage': 'report_final',
      'warden.findings.0.id': 'finding-1',
      'warden.findings.0.title': 'Leaky abstraction',
      'warden.findings.0.has_suggested_fix': true,
      'warden.findings.0.additional_locations.count': 1,
    });
    expect(attrs).not.toHaveProperty('warden.findings.0.description');
    expect(attrs).not.toHaveProperty('warden.findings.0.verification');
  });

  it('captures only references for intermediate stages', async () => {
    process.env['WARDEN_SENTRY_DSN'] = 'https://public@example.com/1';
    const { initSentry, captureFindingStage } = await import('./sentry.js');

    const capturedAttributes: Record<string, unknown>[] = [];
    mockStartSpan.mockImplementation((_options, callback) => callback({
      setAttributes: (attrs: Record<string, unknown>) => {
        capturedAttributes.push(attrs);
      },
      spanContext: () => ({ traceId: 'trace-1', spanId: 'span-1' }),
    }));

    initSentry('cli');
    captureFindingStage('report_deduped', [makeFinding()], { skill: 'test-skill' });

    expect(capturedAttributes).toHaveLength(1);
    expect(capturedAttributes[0]).toMatchObject({
      'warden.findings.stage': 'report_deduped',
      'warden.findings.count': 1,
      'warden.findings.ids': ['finding-1'],
      'warden.findings.skill': 'test-skill',
      'warden.findings.parent_trace_id': 'parent-trace',
      'warden.findings.parent_span_id': 'parent-span',
    });
    expect(capturedAttributes[0]).toHaveProperty('warden.findings.fingerprints');
    expect(capturedAttributes[0]).not.toHaveProperty('warden.findings.0.title');
    expect(capturedAttributes[0]).not.toHaveProperty('warden.findings.0.has_suggested_fix');
  });

  it('captures full finding payloads for snapshot stages', async () => {
    process.env['WARDEN_SENTRY_DSN'] = 'https://public@example.com/1';
    const { initSentry, captureFindingStage } = await import('./sentry.js');

    const capturedAttributes: Record<string, unknown>[] = [];
    mockStartSpan.mockImplementation((_options, callback) => callback({
      setAttributes: (attrs: Record<string, unknown>) => {
        capturedAttributes.push(attrs);
      },
      spanContext: () => ({ traceId: 'trace-1', spanId: 'span-1' }),
    }));

    initSentry('cli');
    captureFindingStage('report_final', [makeFinding()], { skill: 'test-skill' });

    expect(capturedAttributes).toHaveLength(1);
    expect(capturedAttributes[0]).toMatchObject({
      'warden.findings.stage': 'report_final',
      'warden.findings.0.id': 'finding-1',
      'warden.findings.0.title': 'Leaky abstraction',
      'warden.findings.0.has_suggested_fix': true,
      'warden.findings.0.additional_locations.count': 1,
    });
    expect(capturedAttributes[0]).not.toHaveProperty('warden.findings.0.description');
    expect(capturedAttributes[0]).not.toHaveProperty('warden.findings.0.verification');
  });

  it('does nothing when Sentry is disabled', async () => {
    const { captureFindingStage } = await import('./sentry.js');

    captureFindingStage('report_deduped', [makeFinding()], { skill: 'test-skill' });

    expect(mockStartSpan).not.toHaveBeenCalled();
    expect(mockGetActiveSpan).not.toHaveBeenCalled();
  });

  it('skips building span attributes when setFindingStageAttributes is called while disabled', async () => {
    const { setFindingStageAttributes } = await import('./sentry.js');
    const span = {
      setAttributes: vi.fn(),
      spanContext: () => ({ traceId: 'trace-1', spanId: 'span-1' }),
    };
    const explosiveFinding = {
      get id() {
        throw new Error('should not read finding fields when telemetry is disabled');
      },
    } as unknown as Finding;

    setFindingStageAttributes(span, 'initial', [explosiveFinding], { skill: 'test-skill' });

    expect(span.setAttributes).not.toHaveBeenCalled();
  });
});
