import { describe, expect, it } from 'vitest';
import { importBenchmarkResults } from './baseline.js';
import type { SuiteEntry } from './entries.js';

const runOptions = {
  runtime: 'pi',
  model: 'openrouter/x-ai/grok-4.5',
  effort: 'high',
  auxiliaryModel: 'openrouter/openai/gpt-5.6-luna',
  auxiliaryEffort: 'high',
  maxTurns: 100,
};

function benchmark(runId: string, found: string[], overrides: Partial<typeof runOptions> = {}) {
  return {
    runId,
    corpusId: 'sentry-vulnerability-corpus',
    skill: 'security-review',
    runOptions: { ...runOptions, ...overrides },
    summary: { inputTokens: 100, outputTokens: 10, cacheReadInputTokens: 50, costUSD: 30 },
    scoring: { reviewer: 'agent-semantic-match-pass' },
    scores: [
      ...found.map((id) => ({ matchedCorpusIds: [id], verdict: 'known-found' })),
      { matchedCorpusIds: [], verdict: 'not-known' },
    ],
  };
}

function entry(id: string, source: SuiteEntry['source'] = 'corpus'): SuiteEntry {
  return { id, source, kind: 'bug', repository: 'getsentry/sentry', ref: 'a', targets: ['x.py'], summary: id };
}

describe('importBenchmarkResults', () => {
  it('turns each scored benchmark run into one security-review repeat', () => {
    const results = importBenchmarkResults(
      [entry('sentry-vuln-001'), entry('sentry-vuln-002'), entry('wrdn-authz/case', 'case')],
      [benchmark('run-1', ['sentry-vuln-001']), benchmark('run-2', ['sentry-vuln-001', 'sentry-vuln-002'])],
    );

    expect(Object.keys(results.entries)).toEqual(['sentry-vuln-001', 'sentry-vuln-002']);
    expect(results.entries['sentry-vuln-001']!.lanes['security-review']).toEqual({ hits: 2, runs: 2 });
    expect(results.entries['sentry-vuln-002']!.lanes['security-review']).toEqual({ hits: 1, runs: 2 });
    expect(results.lanes['security-review']).toMatchObject({
      runs: 2,
      config: { model: 'openrouter/x-ai/grok-4.5', origin: 'run-1, run-2' },
      usage: { costUSD: 60 },
    });
  });

  it('refuses runs from different model lanes', () => {
    expect(() => importBenchmarkResults([entry('sentry-vuln-001')], [
      benchmark('run-1', []),
      benchmark('run-2', [], { effort: 'low' }),
    ])).toThrow('share one runtime');
  });
});
