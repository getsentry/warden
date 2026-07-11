import {readdirSync, readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const docsRoot = fileURLToPath(new URL("..", import.meta.url));
const resultsDir = join(docsRoot, "src/data/benchmarking/results");
const corpusPath = join(docsRoot, "src/data/benchmarking/sentry-vulnerability-corpus.json");

const corpus = JSON.parse(readFileSync(corpusPath, "utf8"));
const corpusIds = new Set(corpus.findings.map((finding) => finding.id));
const errors = [];

const sum = (items, field) =>
  items.reduce((total, item) => total + (Number(item[field]) || 0), 0);

const nearlyEqual = (left, right, epsilon = 0.01) =>
  Math.abs((Number(left) || 0) - (Number(right) || 0)) <= epsilon;

const isStableComparison = (result) =>
  result.corpusId === "sentry-vulnerability-corpus" &&
  result.targetMode === "all-corpus-files-by-sha" &&
  !result.supersededBy &&
  result.summary?.chunksFailed === 0 &&
  result.summary?.chunksAnalyzed === result.summary?.chunksTotal &&
  Boolean(result.timing?.analysisChunkMs);

for (const filename of readdirSync(resultsDir).filter((file) => file.endsWith(".json"))) {
  const result = JSON.parse(readFileSync(join(resultsDir, filename), "utf8"));
  const label = `${filename} (${result.runId ?? "missing runId"})`;

  if (result.scores) {
    if (!result.scoring) {
      errors.push(`${label}: has scores but no scoring summary`);
    }

    if (result.summary?.findingsTotal !== result.scores.length) {
      errors.push(
        `${label}: summary.findingsTotal=${result.summary?.findingsTotal} but scores.length=${result.scores.length}`,
      );
    }

    const matchedCorpusIds = new Set();
    for (const score of result.scores) {
      for (const corpusId of score.matchedCorpusIds ?? []) {
        if (!corpusIds.has(corpusId)) {
          errors.push(`${label}: score ${score.findingId} references unknown corpus id ${corpusId}`);
        }
        matchedCorpusIds.add(corpusId);
      }
    }

    if (result.scoring) {
      if (matchedCorpusIds.size !== result.scoring.knownFound) {
        errors.push(
          `${label}: scoring.knownFound=${result.scoring.knownFound} but unique matched corpus ids=${matchedCorpusIds.size}`,
        );
      }

      const expectedKnownMissed =
        result.scoring.knownFindingCount - result.scoring.knownFound;
      if (result.scoring.knownMissed !== expectedKnownMissed) {
        errors.push(
          `${label}: scoring.knownMissed=${result.scoring.knownMissed} but expected ${expectedKnownMissed}`,
        );
      }

      const expectedRate = Number(
        (result.scoring.knownFound / result.scoring.knownFindingCount).toFixed(4),
      );
      if (
        result.scoring.knownFoundRate !== undefined &&
        result.scoring.knownFoundRate !== expectedRate
      ) {
        errors.push(
          `${label}: scoring.knownFoundRate=${result.scoring.knownFoundRate} but expected ${expectedRate}`,
        );
      }
    }
  }

  if (result.shards?.length && result.summary && !result.supersededBy) {
    const checks = [
      ["chunksTotal", "chunksTotal"],
      ["chunksAnalyzed", "chunksAnalyzed"],
      ["chunksFailed", "chunksFailed"],
      ["filesAnalyzed", "filesAnalyzed"],
      ["findingsTotal", "findingsTotal"],
      ["targetFileCount", "targetFileCount"],
    ];

    for (const [summaryField, shardField] of checks) {
      const shardTotal = sum(result.shards, shardField);
      if (result.summary[summaryField] !== shardTotal) {
        errors.push(
          `${label}: summary.${summaryField}=${result.summary[summaryField]} but shard total=${shardTotal}`,
        );
      }
    }

    const shardDuration = sum(result.shards, "durationMs");
    if (!nearlyEqual(result.summary.durationMs, shardDuration, 1000)) {
      errors.push(
        `${label}: summary.durationMs=${result.summary.durationMs} but shard total=${shardDuration}`,
      );
    }

    const shardCost = sum(result.shards, "costUSD");
    if (!nearlyEqual(result.summary.costUSD, shardCost)) {
      errors.push(
        `${label}: summary.costUSD=${result.summary.costUSD} but shard total=${shardCost}`,
      );
    }
  }

  if (
    result.traceCapture?.enabled &&
    ["complete", "full"].includes(result.traceCapture.coverage)
  ) {
    if (!result.traceSummaries) {
      errors.push(`${label}: traceCapture is ${result.traceCapture.coverage} but traceSummaries is missing`);
    } else if (result.traceSummaries.length !== result.summary?.chunksTotal) {
      errors.push(
        `${label}: traceSummaries.length=${result.traceSummaries.length} but chunksTotal=${result.summary?.chunksTotal}`,
      );
    }

    const failedTraces = (result.traceSummaries ?? []).filter(
      (trace) => trace.status !== "success",
    );
    if (failedTraces.length > 0) {
      errors.push(`${label}: ${failedTraces.length} trace summaries are not success`);
    }
  }

  if (isStableComparison(result)) {
    if (!result.scoring) {
      errors.push(`${label}: stable comparison rows must be scored`);
    }

    if (
      result.timing?.analysisChunkMs &&
      !result.timing.contaminated &&
      result.timing.analysisChunkMs.count !== result.summary.chunksTotal
    ) {
      errors.push(
        `${label}: timing.analysisChunkMs.count=${result.timing.analysisChunkMs.count} but chunksTotal=${result.summary.chunksTotal}`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error("Benchmark result validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Benchmark result validation passed.");
