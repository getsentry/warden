import { z } from 'zod';
import type { SuiteEntry } from './entries.js';
import { createResults, recordShardRun, summarize, type LaneConfig, type SuiteResults } from './results.js';

const BenchmarkResultSchema = z.object({
  runId: z.string(),
  corpusId: z.literal('sentry-vulnerability-corpus'),
  skill: z.literal('security-review'),
  runOptions: z.object({
    runtime: z.string(),
    model: z.string(),
    effort: z.string(),
    auxiliaryModel: z.string(),
    auxiliaryEffort: z.string(),
    maxTurns: z.number(),
  }),
  summary: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    cacheReadInputTokens: z.number(),
    costUSD: z.number(),
  }),
  scoring: z.object({ reviewer: z.string() }),
  scores: z.array(z.object({ matchedCorpusIds: z.array(z.string()), verdict: z.string() })),
});

/**
 * Turn scored corpus benchmark results into a security-review baseline lane,
 * one repeat per result file. Every file must share one model lane.
 */
export function importBenchmarkResults(entries: SuiteEntry[], files: unknown[]): SuiteResults {
  const runs = files.map((file) => BenchmarkResultSchema.parse(file));
  const [first] = runs;
  const lanes = new Set(runs.map((run) => JSON.stringify(run.runOptions)));
  if (!first || lanes.size !== 1) {
    throw new Error('Benchmark results must share one runtime, model, effort, and auxiliary lane');
  }

  const corpus = entries.filter((entry) => entry.source === 'corpus');
  const results = createResults(corpus);
  const { runOptions } = first;
  const config: LaneConfig = {
    runtime: runOptions.runtime,
    model: runOptions.model,
    effort: runOptions.effort,
    auxiliaryModel: runOptions.auxiliaryModel,
    auxiliaryEffort: runOptions.auxiliaryEffort,
    maxTurns: runOptions.maxTurns,
    judgeModel: first.scoring.reviewer,
    origin: runs.map((run) => run.runId).join(', '),
  };

  for (const run of runs) {
    const found = new Set(run.scores
      .filter((score) => score.verdict === 'known-found')
      .flatMap((score) => score.matchedCorpusIds));
    recordShardRun(results, {
      skill: 'security-review',
      config,
      usage: {
        inputTokens: run.summary.inputTokens,
        outputTokens: run.summary.outputTokens,
        cacheReadInputTokens: run.summary.cacheReadInputTokens,
        costUSD: run.summary.costUSD,
        judgeCostUSD: 0,
      },
      hits: new Map(corpus.map((entry) => [entry.id, found.has(entry.id)])),
    });
  }
  results.summary = summarize(results);
  return results;
}
