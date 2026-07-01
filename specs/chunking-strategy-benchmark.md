# Chunking Strategy Benchmark

Warden's scanner can become slow or expensive when a pull request has many git
hunks, very large generated/test chunks, or repeated tiny edits spread across
files. The scanner also loses precision when unrelated hunks are combined into
one broad prompt. This benchmark records both sides of that tradeoff.

This is a maintainer benchmark plan, not public product documentation. Public
benchmark readouts belong under `packages/docs/src/content/docs/benchmarking/`
after the runner and result format are stable.

## Current Takeaway

The evidence so far rejects semantic grouping as an efficiency strategy.
Semantic grouping preserved recall on some historical cases, but it did not
reduce cost in the paired baseline and did not recover cases that non-semantic
chunking missed. Do not include semantic grouping in the main efficiency
comparison unless a new, separate hypothesis justifies it.

The better next bet is a precision-preserving chunk optimizer:

- collapse repeated tiny hunks when the edit shape is nearly identical
- merge sequential same-file hunks under strict size/range caps
- keep risky production chunks bounded
- treat generated/schema/test churn carefully because it dominates cost
- avoid semantic regrouping for scanner efficiency until new evidence changes
  this conclusion

The benchmark suite now has three roles:

- historical recall cases with known expected findings
- branch-evolution recall cases where later branch commits fix earlier branch
  bugs
- real performance-shape PRs that measure wall time and total cost behind a
  same-or-better findings gate

## Goal

Answer two questions:

- Does a chunking strategy produce at least the same findings as the baseline?
- If yes, does it reduce wall time or total cost on fragmented changes?

The benchmark should not treat scanner chunk count as a success metric. Chunk
count, prompt size, and changed-range density are diagnostics for explaining
outcomes. The score is quality-gated wall time and total cost.

## Dataset Shape

Use existing Sentry eval cases that already identify:

- a vulnerable parent commit
- a fixing commit
- the expected finding
- source files tied to the bug

Run the inverse diff as a bug-introducing change:

```text
base = fixing commit
head = vulnerable parent/source_ref
```

That lets Warden review a realistic pull-request-shaped delta that reintroduces
the known bug.

Apply the whole fixing commit or PR diff in reverse. Do not limit the synthetic
patch to `notes.source_files`. Those files identify the expected finding
location and provenance, but trimming the patch can remove related tests and
call-site edits. The point of this benchmark is to preserve the real
fragmentation shape.

The benchmark should run against a real `getsentry/sentry` checkout, not the
current fixture-only eval repository. The semantic planner has read-only tools,
and those tools are only meaningful when surrounding repository context exists.

## Initial Cases

Start with these cases from `packages/evals/code-review/`.

| Case | Vulnerable commit | Fix commit | Shape | Expected finding |
| --- | --- | --- | --- | --- |
| `sentry-dashboard-axis-range-existing-widget` | `1b2028bb7455b62fba59a1eb3b9d00bdcff27d51` | `01217a6efb90cd26f0f8ac8b33c4f255379fe21d` | 6 files, 14 hunks | Existing dashboard widgets lose their saved axis range because builder defaults override it. |
| `sentry-cursor-service-account-api-key` | `dd2e7671013b38550048c3c427b5152997e91ab9` | `652324b48217e89f4267bfc1bb6e5e390818c277` | 3 files, 36 hunks | Cursor service-account API keys fail validation because `/v0/me` is insufficient. |
| `sentry-fixability-missing-issue-summary` | `4199c6aeed84c7c359aa7ad6863534174769d436` | `62125c6514958cd89aa3cf7374be32f984adb683` | 4 files, 20 hunks | Fixability calculation misses the cached issue summary needed by Seer. |
| `sentry-workflow-status-missing-foreign-key` | `e36f46a85cf4a6c9a6ae0e5e545a7c13b789d478` | `f4cc09c52e73c2ab60a3b14291c60dd0db5458a7` | 2 files, 17 hunks | Workflow status processing fails hard on missing or deleted foreign keys. |

These four cover the core semantic chunking risks:

- many tiny hunks that describe one behavior change
- cross-file implementation and test updates
- changes that need nearby code inspection
- enough fragmentation to make atomic scanner calls expensive

Treat these as the historical recall suite. They answer whether a chunking
strategy still finds known bugs. They are not enough to answer whether a
chunking strategy handles slow, high-fragmentation real pull requests.

## PR-Shaped Recall Cases

Use real fix PRs in reverse when they produce current Warden findings. These are
not evals; they are benchmark fixtures that keep the full PR-shaped diff and
use the fix PR body or linked Warden issue as the oracle.

| Case | Repository | PR | Vulnerable commit | Fix commit | Shape | Skill | Expected finding |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `sentry-slack-options-load-unscoped-group` | `getsentry/sentry` | `#114185` | `c1bc01ad419ac251e153c81f212628221f8c0628` | `0f09491755f71a95343285cbe17c93bf272a0d62` | 2 files, 4 raw chunks, +29/-0 when fixed | `security-review` | Slack options-load can resolve a caller-controlled group id without binding it to the requesting Slack integration's organization. |
| `sentry-preprod-snapshot-project-access` | `getsentry/sentry` | `#114169` | `c1bc01ad419ac251e153c81f212628221f8c0628` | `8fac324d82c903c8022b99dcd4329f3944e57196` | 2 files, 4 raw chunks, +66/-1 when fixed | `security-review` | Preprod snapshot GET and DELETE can access artifacts by organization without checking project access. |
| `sentry-release-threshold-empty-project-filter` | `getsentry/sentry` | `#114049` | `8f9fe309854228051dabac985fb813476a2a5b24` | `8a93913509441a0c8e7d035f9c4bc24dabed2d86` | 2 files, 2 raw chunks, +39/-5 when fixed | `security-review` | ReleaseThreshold query can drop project scoping when the accessible-project list is empty. |
| `sentry-replay-delete-read-scope` | `getsentry/sentry` | `#114159` | `c1bc01ad419ac251e153c81f212628221f8c0628` | `9bf0ea738cd7847438d4a2cfb1fbdbb326426e01` | 2 files, 2 raw chunks, +9/-4 when fixed | `security-review` | Replay DELETE can accept `project:read`, allowing read-only users to delete replay data. |
| `warden-error-cause-chain-regression` | `getsentry/warden` | `#215` | `9273d82be6582d78c4809c3b4317dba09bf1b58b` | `9bf777889e554ac30216ebfbd1f15a68abf92529` | 7 files, 9 raw chunks, +18/-13 when fixed | `code-review` | Dropping `Error` causes loses original git/runtime error diagnostics. Candidate only; finding was not stable across reruns. |

Captured non-semantic baseline:

- date: 2026-06-30
- model: `openrouter/anthropic/claude-sonnet-4.6`
- runtime: `pi`
- verification: disabled
- raw artifact for Slack case: `/tmp/warden-slack-options-low-runner-artifacts/sentry-slack-options-load-unscoped-group.nonsemantic.jsonl`
- raw artifacts for additional security cases: `/tmp/warden-security-recall-batch-artifacts/*.nonsemantic.jsonl`
- raw artifact for Warden #215 candidate: `/tmp/warden-pr215-runner-artifacts/warden-error-cause-chain-regression.nonsemantic.jsonl`

| Case | Complete | Scanner chunks | Findings | Duration | Input tokens | Output tokens | Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `sentry-slack-options-load-unscoped-group` | yes | 4 | 1 | 24.8s | 20,437 | 1,065 | $0.0633 |
| `sentry-preprod-snapshot-project-access` | yes | 4 | 1 | 36.0s | 21,179 | 1,320 | $0.0699 |
| `sentry-release-threshold-empty-project-filter` | yes | 2 | 1 | 19.5s | 10,631 | 1,042 | $0.0555 |
| `sentry-replay-delete-read-scope` | yes | 2 | 1 | 6.8s | 10,365 | 306 | $0.0435 |
| `warden-error-cause-chain-regression` | yes | 8 | 0 | 3m24s | 345,903 | 26,543 | $0.8320 |

Findings produced by current `security-review`:

- `src/sentry/integrations/slack/webhooks/options_load.py:99-104` -
  Removed cross-organization authorization check allows IDOR on group assignment
  data
- `src/sentry/preprod/api/endpoints/preprod_artifact_snapshot.py:140` -
  Project-level access check removed from DELETE endpoint, enabling
  cross-project artifact deletion
- `src/sentry/api/endpoints/release_thresholds/release_threshold_index.py:50-58` -
  Authorization bypass: empty projects list removes all project scoping
- `src/sentry/replays/endpoints/project_replay_details.py:26` -
  DELETE permission expanded to allow `project:read` scope

These are small known-positive security cases. They fix the benchmark's recall
control gap, but they are not large enough to prove the high-fragmentation
performance path. The Warden #215 case remains useful as a repeated small-hunk
candidate, but it is not accepted as a recall baseline until the finding
reproduces reliably.

## Performance Shape Cases

Add a separate performance suite made of real pull requests that were slow or
pathologically fragmented. These cases do not need a known expected finding.
They measure wall time and total cost after verifying that reported findings are
at least equivalent to the baseline. Scanner-call count, failed chunks, prompt
size, and duplicate findings are diagnostic fields only.

| Case | Repository | Base | Head | Shape | Why it matters |
| --- | --- | --- | --- | --- | --- |
| `sentry-mcp-search-issues-period-30d` | `getsentry/sentry-mcp` | `df680f28fa705c447679bb8e0afa3f24e72387e0` | `d4dbb32e7e05cd61024ec2adf06e53c358e77599` | 21 files, 162 hunks, +324/-219 | Real slow PR. Repeated parameter rename/default/schema/test updates create many tiny hunks across related tool files. |
| `sentry-mcp-openrouter-provider` | `getsentry/sentry-mcp` | `032e7f6f28cd513699755920748bd10e9f429df5` | `c42ef54a1de9e3640fc74f3e209c15704d094329` | 34 files, 100 hunks, +650/-84 | Broad provider support change across config, docs, generated schemas, tests, and implementation. |
| `sentry-mcp-ai-conversation-search` | `getsentry/sentry-mcp` | `3bcaf5fd1db4ab1b13270606cc8808c8fa3fffea` | `c11f3b9386ab33c4c85a90e8b9604bffafa14939` | 27 files, 76 hunks, +2,608/-491 | Large feature PR where chunking must keep behavior, schemas, docs, and tests reviewable without making huge scanner prompts. |
| `sentry-mcp-node-pnpm-baseline` | `getsentry/sentry-mcp` | `6e63abecbc732f61536f6df88a47a1fcde9d4c3e` | `7567694fcd28c36a0ffd7312eb0fd746cabb97fe` | 17 files, 20 hunks, +42/-44 | Mechanical build/runtime baseline update with many small low-risk file edits. |
| `warden-split-pr-workflow` | `getsentry/warden` | `86699d45ec2ba2743f0a0c13dba46628ddaeeeb9` | `df091dd43664d40ab9cf55c4407d5749c1ecc295` | 29 files, 119 hunks, +2,578/-137 | Large workflow/action split with generated config, docs, and production behavior changes. |
| `warden-global-scan-policy-limits` | `getsentry/warden` | `60bb7855a42922d5e36fbc30509ed5787caa9861` | `ecf3162593bf019328b400c40500070c5f6af933` | 34 files, 80 hunks, +1,229/-257 | Broad product behavior change across policy loading, CLI/action paths, tests, and docs. |
| `warden-remove-suggested-fix` | `getsentry/warden` | `876e1689996a6f599e5c64d81cb039fa4fbdf726` | `bd8a4134197734cd843432ca9a349d16565467cc` | 41 files, 74 hunks, +17/-1,752 | Deletion-heavy cleanup where most hunks are removals and the scanner should avoid over-reviewing removed surfaces. |
| `warden-hoist-skills` | `getsentry/warden` | `7849f77b36c2ec3e024702007f39a7676a879d6d` | `36fcd770e9f9200961614043fcd0c76c62869ed4` | 34 files, 9 hunks, +20/-32 | Many-file move/rename-style change with low hunk count; useful control for avoiding unnecessary optimizer overhead. |

The `sentry-mcp-search-issues-period-30d` final compare diff is the important
shape. Commit-patch output has 7 commits and double-counts files touched across
commits; Warden should benchmark the final PR diff from base to head.

Run the full performance suite before claiming a strategy win. During local
iteration, use a smaller smoke subset:

- `sentry-mcp-search-issues-period-30d` for repeated tiny hunks
- `warden-split-pr-workflow` for large workflow/config churn
- `warden-hoist-skills` as a low-risk many-file control

Performance cases should be judged differently from historical recall cases:

- valid findings per run, adjudicated manually until a judge exists
- wall time
- total cost
- duplicate or near-duplicate findings
- scanner chunks and failed/interrupted chunks, for diagnosis only
- whether chunk grouping made findings more vague or less actionable
- whether mechanical repeated edits were reviewed once instead of many times

Captured non-semantic baseline:

- date: 2026-06-30
- model: `openrouter/anthropic/claude-sonnet-4.6`
- runtime: `pi`
- skill: `code-review`
- verification: disabled
- raw artifacts: `/tmp/warden-performance-baseline-artifacts`

| Case | Complete | Scanner chunks | Findings | Duration | Input tokens | Output tokens | Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `sentry-mcp-search-issues-period-30d` | yes | 95 | 0 | 7m01s | 2,064,917 | 54,596 | $3.8790 |
| `sentry-mcp-openrouter-provider` | yes | 56 | 0 | 4m38s | 970,997 | 46,760 | $2.1067 |
| `sentry-mcp-ai-conversation-search` | yes | 55 | 0 | 26m19s | 4,902,487 | 231,254 | $11.0339 |
| `sentry-mcp-node-pnpm-baseline` | yes | 19 | 1 | 3m34s | 559,623 | 10,929 | $1.2962 |
| `warden-split-pr-workflow` | no, 1 failed chunk | 67 | 0 | 23m56s | 3,774,012 | 143,749 | $6.9256 |
| `warden-global-scan-policy-limits` | yes | 52 | 0 | 11m48s | 2,365,164 | 119,140 | $4.7875 |
| `warden-remove-suggested-fix` | yes | 58 | 0 | 1m21s | 509,490 | 8,588 | $0.7938 |
| `warden-hoist-skills` | yes | 9 | 0 | 1m09s | 108,185 | 10,179 | $0.2962 |

This baseline shows at least three different performance shapes:

- repeated tiny schema/test hunks: `sentry-mcp-search-issues-period-30d`
- very large generated/schema/test chunks: `sentry-mcp-ai-conversation-search`
  and `warden-split-pr-workflow`
- deletion-heavy or move/control cases that are already cheap enough:
  `warden-remove-suggested-fix` and `warden-hoist-skills`

This performance baseline is not a strong precision/recall benchmark yet. Only
`sentry-mcp-node-pnpm-baseline` produced a finding, so most of the suite can
only tell us whether a strategy is faster or cheaper. It cannot prove that a new
chunking strategy preserves bug-finding quality across large patches.

Before using this suite as a quality gate, add at least:

- one small or moderate PR-shaped case with a known valid finding
- one large or high-fragmentation PR-shaped case with a known valid finding

Branch-evolution recall cases are the best near-term source: find PRs where a
later branch commit fixed a bug introduced by an earlier branch prefix, then run
Warden against the prefix before the fix.

## Branch-Evolution Recall Cases

Some slow PRs can also produce recall cases when a later branch commit fixes a
bug introduced by an earlier branch prefix. Use the later fix commit message and
diff as the expected finding, then run Warden against the earlier buggy prefix.

For a linear branch:

```text
base = PR base
buggy head = parent of fix commit
expected fix = fix commit
```

This gives us real-world recall without needing a known production incident.
The expected finding should be phrased from the later fix, but the scanner must
find it when reviewing `base..buggy head`.

Candidate cases from `getsentry/sentry-mcp#1130`:

| Case | Base | Buggy head | Fix commit | Expected finding |
| --- | --- | --- | --- | --- |
| `sentry-mcp-issue-search-project-period-endpoint` | `df680f28fa705c447679bb8e0afa3f24e72387e0` | `609a52120e0356da333280f301e9a41fcb55256e` | `d4c8ec34cb1643d9a569ad7dd85a3ab653353511` | Project-scoped longer-period issue searches still use the project issues endpoint instead of the organization issues endpoint with a numeric project filter. |
| `sentry-mcp-ai-conversation-period-schema-default` | `df680f28fa705c447679bb8e0afa3f24e72387e0` | `d4c8ec34cb1643d9a569ad7dd85a3ab653353511` | `601163d7c2259cf2d4da63a68698bbe67906fbc9` | `search_ai_conversations` exposes a runtime 30d default but the generated schema does not expose that default to clients. |
| `sentry-mcp-ai-conversation-absolute-range-period-conflict` | `df680f28fa705c447679bb8e0afa3f24e72387e0` | `e5df63d64bef3140deb88c8c80701f0583348afc` | `82890445a1f95d794a3cf7b99cb7c33dc7134c18` | Absolute `start`/`end` AI conversation searches conflict with injected/default `period` instead of letting absolute bounds win. |

These are not replacements for the historical Sentry eval cases. They are a
middle ground: real branch context, known later fix, and high-fragmentation PR
shape.

Current baseline attempt:

- `sentry-mcp-ai-conversation-absolute-range-period-conflict`
  - non-semantic run completed against the buggy prefix
  - 95 scanner chunks, 94 completed, 1 skipped
  - 0 findings
  - 28m11s, 7,056,116 input tokens, 245,823 output tokens, $14.9409

This case remains a strong performance stress case, but it is not a
known-positive recall benchmark for current `code-review`. The scanner did not
find the later fixed `start`/`end` versus `period` conflict in the baseline run.

## Expansion Cases

Add these after the initial four work.

| Case | Vulnerable commit | Fix commit | Shape | Expected finding |
| --- | --- | --- | --- | --- |
| `sentry-dashboard-delete-side-nav-stale` | `14170bd6ae28abe4d4f0b5807185b116f777a1a0` | `86872f4f1491c4392a25f4d3fcba31a12726fa63` | 3 files, 14 hunks | Deleting a dashboard leaves stale side-nav state. |
| `sentry-action-dedup-by-workflow` | `1730e13b97865d3ee8943c6f860964388c4987a8` | `165be911ba388d402993b58f34dc8ad683827e32` | 4 files, 8 hunks | Action dedup keys include workflow id, causing duplicate notifications. |

## Security Controls

Use security-review cases as correctness controls, not the main fragmentation
stress set. These are useful because they exercise Warden's security skill, but
most are smaller diffs.

| Case | Source | Fix commit(s) | Expected finding |
| --- | --- | --- | --- |
| `sentry-preprod-snapshot-project-access` | `https://github.com/getsentry/sentry/pull/114169` | `8fac324d82c903c8022b99dcd4329f3944e57196` | Snapshot detail GET/DELETE bypasses project access. |
| `sentry-slack-options-load-unscoped-group` | `https://github.com/getsentry/sentry/pull/114185` | `0f09491755f71a95343285cbe17c93bf272a0d62`, `b718661dd8560a20a826d90ee6755f153957969c` | Slack options-load resolves a group without verifying the integration belongs to the group's org. |
| `sentry-release-threshold-empty-project-filter` | `https://github.com/getsentry/sentry/pull/114049` | `8a93913509441a0c8e7d035f9c4bc24dabed2d86` | Empty accessible-project filters remove project scoping from release threshold queries. |

Security cases whose provenance is only a blob SHA should stay out of the first
benchmark until the fixing commit is identified.

## Run Method

For each historical recall case:

1. Create or reuse a temporary Sentry worktree.
2. Check out the fixing commit.
3. Create a benchmark branch.
4. Apply the full inverse fixing diff back to the vulnerable commit.
5. Run the baseline strategy.
6. Reset to the same benchmark branch.
7. Run the candidate strategy.
8. Judge both reports against the existing `should_find` assertion.

For each performance shape case:

1. Create or reuse a temporary worktree for the source repository.
2. Check out the PR base SHA.
3. Apply or check out the PR head SHA.
4. Run each chunking strategy against `base..head`.
5. Record findings, wall time, total cost, and enough diagnostic data
   (scanner calls, tokens, failed chunks) to explain regressions.

The runner lives under `benchmarks/chunking/` because this is maintainer
benchmark infrastructure, not the eval framework. It may read historical eval
fixture JSON for commit provenance, but it does not run through `pnpm evals` and
should not live under `packages/evals`. Do not add a root `pnpm` script until
the output format and workflow are worth preserving.

Current maintainer runner:

```bash
pnpm exec tsx benchmarks/chunking/runner.ts \
  --sentry-repo ~/src/sentry \
  --output /tmp/warden-chunking-benchmark.json \
  --artifacts-dir /tmp/warden-chunking-benchmark-artifacts
```

By default this runs the initial four cases. Use `--case <name>` one or more
times to run a smaller slice while iterating. Historical cases create synthetic
bug-introducing worktrees. Performance cases use explicit base/head SHAs from
real PR-shaped diffs. Both modes write paired summaries plus raw JSONL
artifacts.

Use `--profile` before model-backed experiments. It runs the same worktree
setup and `prepareFiles` path, then writes prepared scanner chunk counts,
changed ranges, content size, top files, and skipped files without invoking the
scanner. Use `--traces` when debugging model variance and `--effort high` for
recall controls that are noisy at default effort.

## Research Signals

Current external evidence matches the local benchmark failures: code-review
quality is sensitive to context shape, and "more context" is often worse.

- SWE-PRBench evaluates 350 real pull requests against human review comments.
  Its reported result is especially relevant: all tested frontier models got
  worse as context expanded from diff-only to richer file/full-context setups,
  even with structured semantic layers such as AST-extracted function context
  and import graph resolution. The authors attribute the dominant failure mode
  to attention dilution, and a smaller structured diff-with-summary prompt beat
  a richer full-context prompt.
- Long-context divide-and-conquer research frames failures as a balance between
  task noise, model noise, and aggregation noise. Chunking helps when context
  size creates model noise, but it fails when the issue requires cross-chunk
  dependence or when the aggregator loses signal.
- Dynamic chunking work suggests fixed-size chunking is brittle, but its
  successful pattern is not "merge everything semantically." It separates
  content adaptively and selects question-relevant chunks. For Warden, the
  "question" is the skill/risk class, so chunk selection should be risk-aware.
- Repository-level vulnerability benchmarks increasingly use paired
  introducing/fixing commits and agentic inspection because real findings often
  require interprocedural or cross-file evidence. This supports keeping
  security controls as paired commits with stable expected findings, not just
  no-finding performance PRs.
- Code long-context recall work distinguishes lexical recall from semantic
  recall and shows code reasoning can degrade by position and granularity.
  This is a warning against giant stitched chunks: a model can "see" the lines
  and still fail to reason about the relevant statement.

Design constraints from this:

- Do not optimize for scanner chunk count alone.
- Treat prompt size, changed-range density, and per-file long-pole runtime as
  first-class metrics.
- Prefer small structured diff prompts with targeted context over whole-file or
  broad semantic bundles.
- Add benchmark cases with known human or security findings across different
  shapes: direct diff issue, same-file contextual issue, cross-file issue, and
  generated-artifact-heavy no-finding case.
- Run repeated trials or high-effort controls before declaring recall changes.
- Compare strategies with frozen context configurations, not ad hoc prompt
  changes mixed with chunking changes.

## Strategies To Compare

Use the same cases across each strategy:

- current non-semantic chunking
- deterministic precision-preserving optimizer
- generated/derived artifact policy, if implemented

The optimizer is not a replacement for all chunking. It should activate only
for pathological patch shapes: high raw chunk count, high hunk count in one
file, many tiny hunks, or large total diff size.

## Metrics

Primary benchmark metrics:

- pass/fail against expected finding
- total findings
- wall time
- recorded cost

Diagnostic fields:

- duplicate or near-duplicate findings
- failed chunks
- failed extractions
- scanner chunk count
- input tokens
- output tokens

A strategy is successful only when its findings are at least equivalent to the
baseline and it reduces wall time or total cost. Lower chunk count, lower input
tokens, or cleaner grouping are explanatory details, not pass criteria.

## Output

Store raw run output separately from checked-in docs until the format stabilizes.
The final durable artifact should be a small JSON result set that can power a
public docs readout later, similar to the existing Sentry security benchmark
data under `packages/docs/src/data/benchmarking/`.

At minimum, each result record should include:

```json
{
  "case": "sentry-dashboard-axis-range-existing-widget",
  "repository": "getsentry/sentry",
  "base": "01217a6efb90cd26f0f8ac8b33c4f255379fe21d",
  "head": "1b2028bb7455b62fba59a1eb3b9d00bdcff27d51",
  "semantic": true,
  "passed": true,
  "findings": 1,
  "scannerChunks": 3,
  "semanticGroups": 1,
  "durationMs": 0,
  "usage": {
    "inputTokens": 0,
    "outputTokens": 0,
    "costUSD": 0
  },
  "expectedFindingMatched": true
}
```

`expectedFindingMatched` is a deterministic benchmark gate for historical cases.
It is useful for rejecting obvious misses, but final benchmark decisions should
still manually adjudicate finding equivalence until a judge is wired into this
runner.

## Captured Baseline

Paired maintainer-runner baseline:

- date: 2026-06-30
- cases: initial four Sentry code-review cases
- repository: `getsentry/sentry`
- model: `openrouter/anthropic/claude-sonnet-4.6`
- runtime: `pi`
- skill: `code-review`
- verification: disabled
- results: `specs/chunking-strategy-benchmark-results.json`

| Case | Mode | Expected found | Scanner chunks | Findings | Duration | Input tokens | Output tokens | Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| axis range | semantic off | no | 9 | 0 | 2m06s | 119,788 | 8,589 | $0.3428 |
| axis range | semantic on | no | 5 | 0 | 2m03s | 207,575 | 7,501 | $0.3904 |
| cursor service account | semantic off | yes | 7 | 3 | 4m49s | 217,727 | 16,902 | $0.5860 |
| cursor service account | semantic on | yes | 7 | 2 | 4m23s | 384,304 | 20,268 | $0.7174 |
| fixability summary | semantic off | no | 5 | 1 | 1m12s | 127,987 | 11,044 | $0.3586 |
| fixability summary | semantic on | no | 4 | 1 | 3m09s | 602,384 | 23,791 | $1.0903 |
| workflow FK | semantic off | yes | 5 | 2 | 7m24s | 535,681 | 23,518 | $1.1353 |
| workflow FK | semantic on | yes | 5 | 2 | 7m46s | 665,740 | 38,759 | $1.4570 |

This baseline is more useful than the earlier single-case experiments:

- Recall was preserved on the two cases where either mode found the known issue.
- Semantic mode did not recover cases that non-semantic missed.
- Semantic mode reduced scanner chunks on axis-range and fixability, but did
  not reduce cost on any completed paired run.
- Cursor and workflow-status show that semantic grouping can preserve high
  signal findings, but the planner overhead currently dominates the cost model.

Initial smoke run:

- date: 2026-06-30
- case: `sentry-dashboard-axis-range-existing-widget`
- repository: `getsentry/sentry`
- synthetic base: `01217a6efb90cd26f0f8ac8b33c4f255379fe21d`
- synthetic head: `4d022227929c4d923cfb9bb2b45721407570cf8c`
- model: `openrouter/anthropic/claude-sonnet-4.6`
- runtime: `pi`
- skill: `code-review`
- verification: disabled

This smoke run intentionally used a trimmed two-file reverse patch. It proves
that the benchmark mechanics and semantic grouping path work, but it should not
be used as the dataset quality baseline.

| Mode | Scanner chunks | Findings | Duration | Input tokens | Output tokens | Cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| semantic off | 2 | 1 | 11m54s | 445,997 | 39,484 | $1.2213 |
| semantic on | 1 | 1 | 3m03s | 160,096 | 10,079 | $0.4609 |

The semantic-on run grouped both changed ranges into one scanner chunk and kept
the expected medium-confidence axis-range regression finding.

Full reverse-patch run:

- date: 2026-06-30
- case: `sentry-dashboard-axis-range-existing-widget`
- repository: `getsentry/sentry`
- synthetic base: `01217a6efb90cd26f0f8ac8b33c4f255379fe21d`
- synthetic head: `a4778dc5fcf`
- model: `openrouter/anthropic/claude-sonnet-4.6`
- runtime: `pi`
- skill: `code-review`
- verification: disabled

| Mode | Scanner chunks | Findings | Duration | Input tokens | Output tokens | Cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| non-semantic, partial | 1/13 completed | 1 | 2m53s | 160,637 | 9,024 | $0.3191 |
| semantic on, bounded groups | 5 | 0 | 10m45s | 481,391 | 34,884 | $1.2564 |
| semantic on, bounded groups plus summary anti-bias prompt | 4 | 0 | 8m19s | 472,104 | 26,978 | $1.1046 |
| semantic on, bounded groups plus changed-range cap | 5 | 0 | 7m24s | 432,183 | 23,708 | $0.9862 |
| semantic on, neutral scanner prompt | 4 | 0 | 5m14s | 374,416 | 15,714 | $0.7504 |
| semantic on, neutral prompt plus changed-range cap 2 | 7 | 0 | 13m40s | 807,047 | 45,554 | $2.0509 |
| semantic on, compact similar tiny hunks | 6 | 1 | 7m23s | 758,900 | 50,400 | $1.9500 |

The full non-semantic run was interrupted after one completed scanner chunk, so
it is not a clean cost comparison. That completed chunk did find the expected
style of regression: removing `axisRange: 'auto'` assertions masked a behavior
break. The semantic full-patch runs preserved the real patch shape but did not
find the expected axis-range regression. This makes the case useful as a recall
warning: semantic grouping can make a bad behavior look like a coherent
migration when tests are changed to match it. The scanner prompt now states
that semantic summaries are grouping hints, not evidence of correctness.

The changed-range cap run is incomplete for score comparison because one
test-heavy scanner chunk hit `turn_limit`. It is still useful operationally: it
split one broad semantic group into two scanner chunks and reduced recorded
cost, but the run cannot be treated as a clean recall result.

The neutral scanner prompt removed semantic summaries from scanner prompts. It
reduced cost again but still missed recall, and a stricter changed-range cap of
2 increased scanner calls and cost without recovering the finding. This points
away from size alone. The stronger hypothesis is that semantically grouping
implementation and test-update chunks makes the scanner evaluate a coherent
intentional migration, while raw hunk mode caught an isolated assertion removal
as masking a regression.

Rejected follow-up experiments isolated changed test assertions as scanner
chunks. Those runs restored findings, but the rule was too benchmark-specific
and worked against the broader goal: semantic grouping should collapse repeated
small similar hunks into precise scanner slices, not special-case test syntax.

The compact-similar run restored the add-to-dashboard finding without a
test-specific rule by materializing repeated tiny hunks in a compact form. It is
not yet a clear cost win over earlier semantic runs, but it is the first generic
semantic variant that recovered the expected finding on the full patch.

## Failed Attempts

These approaches are recorded as rejected unless new evidence changes the
result. Do not reintroduce them without rerunning the recall controls and at
least one finding-bearing performance case.

### Trimmed Reverse-Patch Semantic Grouping

What we tried:

- Case: `sentry-dashboard-axis-range-existing-widget`
- Patch shape: trimmed two-file reverse patch
- Semantic planner grouped both changed ranges into one scanner chunk.

Result:

| Mode | Scanner chunks | Findings | Duration | Input tokens | Output tokens | Cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| semantic off | 2 | 1 | 11m54s | 445,997 | 39,484 | $1.2213 |
| semantic on | 1 | 1 | 3m03s | 160,096 | 10,079 | $0.4609 |

Why it failed as evidence:

- It used a trimmed patch, not the full PR-shaped diff.
- It proved the mechanics worked, but it made the problem easier by removing
  surrounding branch noise.
- Later full-patch runs did not preserve this apparent win.

Takeaway:

- Do not use trimmed patches to validate chunking quality. They can be useful
  smoke tests, but they are not recall or performance proof.

### Full-Patch Semantic Grouping

What we tried:

- Case: `sentry-dashboard-axis-range-existing-widget`
- Patch shape: full reverse fixing diff
- Variants:
  - bounded semantic groups
  - summary anti-bias prompt
  - changed-range caps
  - neutral scanner prompt
  - neutral prompt plus stricter changed-range cap

Result:

| Mode | Scanner chunks | Findings | Duration | Input tokens | Output tokens | Cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| non-semantic, partial | 1/13 completed | 1 | 2m53s | 160,637 | 9,024 | $0.3191 |
| semantic on, bounded groups | 5 | 0 | 10m45s | 481,391 | 34,884 | $1.2564 |
| semantic on, bounded groups plus summary anti-bias prompt | 4 | 0 | 8m19s | 472,104 | 26,978 | $1.1046 |
| semantic on, bounded groups plus changed-range cap | 5 | 0 | 7m24s | 432,183 | 23,708 | $0.9862 |
| semantic on, neutral scanner prompt | 4 | 0 | 5m14s | 374,416 | 15,714 | $0.7504 |
| semantic on, neutral prompt plus changed-range cap 2 | 7 | 0 | 13m40s | 807,047 | 45,554 | $2.0509 |

Why it failed:

- All full-patch semantic variants missed the expected axis-range regression.
- Lower chunk count did not translate into preserved recall.
- Changed-range caps could reduce prompt size in some cases, but one test-heavy
  scanner chunk still hit `turn_limit`.
- Removing semantic summaries from scanner prompts reduced cost but did not
  recover the finding.

Takeaway:

- Size alone was not the root problem. Grouping implementation and updated test
  hunks into one coherent semantic change can make a regression look
  intentional.
- Semantic summaries are grouping metadata, not correctness evidence.

### Test-Assertion-Specific Isolation

What we tried:

- Isolated changed test assertions into their own scanner chunks.
- This targeted the axis-range case where removed assertions were the main
  signal.

Result:

- The axis-range finding came back in the experimental run.

Why it failed:

- It was overfit to one benchmark shape.
- It encoded domain-specific syntax heuristics into the chunker instead of
  solving the general "many tiny hunks" problem.
- It worked against the goal of collapsing small similar hunks safely.

Takeaway:

- Do not add literal test-assertion rules to the chunker.
- If tests need different treatment, make that a general risk/role signal, not
  a syntax-specific escape hatch.

### Semantic Compact Similar Tiny Hunks

What we tried:

- Kept semantic grouping, but materialized repeated tiny hunks in compact form.
- The goal was to avoid giant scanner prompts while still grouping repeated
  edit shapes.

Result:

| Mode | Scanner chunks | Findings | Duration | Input tokens | Output tokens | Cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| semantic on, compact similar tiny hunks | 6 | 1 | 7m23s | 758,900 | 50,400 | $1.9500 |

Why it failed as a default:

- It recovered the axis-range finding, so it was better than earlier full-patch
  semantic variants.
- It was still expensive relative to the earlier semantic variants and did not
  establish a cost win over non-semantic baselines.
- Evidence came from one difficult case, not the broader benchmark suite.

Takeaway:

- Compact repeated-hunk materialization is worth remembering, but not enough to
  make semantic grouping the default performance fix.

### Paired Semantic Benchmark Baseline

What we tried:

- Ran the initial four historical code-review cases through the maintainer
  runner with semantic mode on and off.

Result:

| Case | Mode | Expected found | Scanner chunks | Findings | Duration | Input tokens | Output tokens | Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| axis range | semantic off | no | 9 | 0 | 2m06s | 119,788 | 8,589 | $0.3428 |
| axis range | semantic on | no | 5 | 0 | 2m03s | 207,575 | 7,501 | $0.3904 |
| cursor service account | semantic off | yes | 7 | 3 | 4m49s | 217,727 | 16,902 | $0.5860 |
| cursor service account | semantic on | yes | 7 | 2 | 4m23s | 384,304 | 20,268 | $0.7174 |
| fixability summary | semantic off | no | 5 | 1 | 1m12s | 127,987 | 11,044 | $0.3586 |
| fixability summary | semantic on | no | 4 | 1 | 3m09s | 602,384 | 23,791 | $1.0903 |
| workflow FK | semantic off | yes | 5 | 2 | 7m24s | 535,681 | 23,518 | $1.1353 |
| workflow FK | semantic on | yes | 5 | 2 | 7m46s | 665,740 | 38,759 | $1.4570 |

Why it failed:

- Semantic mode preserved recall only where non-semantic mode already found the
  issue.
- Semantic mode did not recover missed cases.
- Semantic mode reduced scanner chunks on two cases, but cost increased on
  every completed paired run.

Takeaway:

- Semantic grouping is not currently justified as the default performance
  strategy. It may still be useful as metadata or as an opt-in planner for
  specific pathological shapes.

### Branch-Evolution Recall From MCP #1130

What we tried:

- Case: `sentry-mcp-ai-conversation-absolute-range-period-conflict`
- Ran the buggy branch prefix before the later fix commit.
- Expected finding: absolute `start`/`end` searches conflict with injected or
  default `period`.

Result:

| Mode | Scanner chunks | Completed | Findings | Duration | Input tokens | Output tokens | Cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| non-semantic | 95 | 94 | 0 | 28m11s | 7,056,116 | 245,823 | $14.9409 |

Why it failed:

- It did not produce the known later-fix finding.
- It is too expensive to use as the first recall guardrail for iteration.

Takeaway:

- Keep it as a performance stress case.
- Do not count it as a known-positive recall case unless current Warden can
  reliably find the later-fixed issue.

### Exact Distant Tiny-Hunk Coalescing

What we tried:

- Deterministic non-semantic optimizer.
- Merged distant same-file tiny hunks only when their changed diff lines were
  exactly identical.
- Capped each merged group at 4 hunks and the existing coalescing chunk size.
- Exposed only through a temporary benchmark flag; implementation was backed
  out after the test.

Recall guardrail result:

| Case | Scanner chunks | Findings | Duration | Input tokens | Cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| `sentry-slack-options-load-unscoped-group` | 4 | 1 | 21.9s | 20,445 | $0.0627 |
| `sentry-preprod-snapshot-project-access` | 4 | 1 | 39.2s | 21,179 | $0.0756 |
| `sentry-release-threshold-empty-project-filter` | 2 | 1 | 20.2s | 10,627 | $0.0411 |
| `sentry-replay-delete-read-scope` | 2 | 1 | 14.0s | 10,369 | $0.0492 |

Performance result:

| Case | Mode | Scanner chunks | Findings | Duration | Input tokens | Output tokens | Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `sentry-mcp-search-issues-period-30d` | baseline | 95 | 0 | 7m01s | 2,064,917 | 54,596 | $3.8790 |
| `sentry-mcp-search-issues-period-30d` | exact tiny merge | 67 | 0 | 5m35s | 1,977,998 | 47,867 | $3.7740 |

Finding-bearing control result:

| Case | Mode | Findings | Duration | Input tokens | Output tokens | Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `sentry-mcp-node-pnpm-baseline` | current baseline rerun | 1 | 1m46s | 229,197 | 5,815 | $0.4580 |
| `sentry-mcp-node-pnpm-baseline` | exact tiny merge | 0 | 1m20s | 127,549 | 4,330 | $0.2680 |
| `sentry-mcp-node-pnpm-baseline` | exact tiny merge rerun | 0 | 3m43s | 247,700 | 12,200 | $0.5900 |

Why it failed:

- It improved the slow no-finding MCP case, but missed the only finding-bearing
  performance control twice.
- The `pnpm-workspace.yaml:4-23` scanner chunk was still isolated, so the
  failure was not a visible line-range merge error.
- The missed run spent much less effort on the important chunk than the
  successful baseline rerun. The optimization appears to change enough run
  shape, ordering, cache behavior, or agent context to reduce thoroughness.

Takeaway:

- Fewer scanner calls and faster wall time are not sufficient.
- Even conservative distant-hunk merging can harm recall indirectly.
- Do not merge distant hunks as the next default strategy. The next safer
  experiment should prefer sequential same-file coalescing under strict caps and
  only activate for pathological hunk counts.

### Broad Sequential Gap Increase

What we tried:

- Used current same-file sequential coalescing, but increased
  `maxGapLines` from 30 to 120 for every file in the benchmark config.
- Kept the existing `maxChunkSize` cap.

Result:

| Case | Mode | Scanner chunks | Findings | Duration | Input tokens | Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `sentry-slack-options-load-unscoped-group` | baseline | 4 | 1 | 24.8s | 20,437 | $0.0633 |
| `sentry-slack-options-load-unscoped-group` | `maxGapLines=120` | 2 | 0 | 2.4s | 10,500 | $0.0400 |

Why it failed:

- It merged both production hunks in `options_load.py` into one scanner chunk:
  `14-19, 99-104`.
- Warden missed the high-signal Slack IDOR finding that baseline finds.
- This is a direct recall regression, not merely stochastic benchmark noise,
  because the chunk shape changed on the failing file.

Takeaway:

- Increasing the sequential gap globally is too aggressive.
- Small security-sensitive files need the existing conservative gap behavior.

### Adaptive High-Hunk Sequential Gap

What we tried:

- Widened same-file sequential coalescing only when a file started with at least
  12 hunks.
- Files below that threshold kept the existing 30-line gap.
- Kept the existing `maxChunkSize` cap.
- Implementation was backed out after testing.

Recall-control result:

| Case | Scanner chunks | Findings | Duration | Input tokens | Cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| `sentry-slack-options-load-unscoped-group` | 4 | 0 | 3.7s | 20,437 | $0.0478 |
| `sentry-preprod-snapshot-project-access` | 4 | 1 | 51.7s | 21,179 | $0.0754 |
| `sentry-release-threshold-empty-project-filter` | 2 | 1 | 22.5s | 10,631 | $0.0576 |
| `sentry-replay-delete-read-scope` | 2 | 1 | 13.4s | 10,361 | $0.0481 |

Performance result:

| Case | Mode | Scanner chunks | Findings | Duration | Input tokens | Output tokens | Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `sentry-mcp-search-issues-period-30d` | baseline | 95 | 0 | 7m01s | 2,064,917 | 54,596 | $3.8790 |
| `sentry-mcp-search-issues-period-30d` | adaptive high-hunk gap | 51 | 0 | 5m00s | 1,659,025 | 41,407 | $2.9629 |

Finding-bearing control result:

| Case | Mode | Scanner chunks | Findings | Duration | Input tokens | Output tokens | Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `sentry-mcp-node-pnpm-baseline` | baseline | 19 | 1 | 3m34s | 559,623 | 10,929 | $1.2962 |
| `sentry-mcp-node-pnpm-baseline` | current baseline rerun | 19 | 1 | 1m46s | 229,197 | 5,815 | $0.4580 |
| `sentry-mcp-node-pnpm-baseline` | adaptive high-hunk gap | 19 | 0 | 10m13s | 381,049 | 34,753 | $1.3056 |

Why it failed:

- Operationally, it was the best result so far on the slow MCP no-finding case:
  scanner chunks dropped from 95 to 51 and cost dropped about 24%.
- It did not pass the finding-bearing control. The pnpm case kept the same
  scanner chunk count and same `pnpm-workspace.yaml:4-23` chunk shape, but the
  run still missed the known finding.
- The Slack recall miss also kept the old 4-chunk shape, so this run exposed
  benchmark/model variance in addition to chunking behavior.
- Because the requirement is no precision or recall loss, a promising
  performance win is not enough.

Takeaway:

- Adaptive sequential same-file coalescing remains the most promising
  performance theory, but it needs a stronger and more stable quality gate
  before productizing.
- The benchmark should run repeated trials or use a cheaper deterministic
  scanner-summary check for finding-bearing controls; single LLM runs are too
  noisy to prove "no precision loss."
- If this is revisited, restrict activation to files with high hunk counts and
  consider generated/test/docs files first, but do not ship it until
  finding-bearing controls pass repeatedly.

### Skip Generated Definition Artifacts

What we tried:

- Skipped generated MCP definition files in the benchmark config:
  - `**/skillDefinitions.json`
  - `**/toolDefinitions.json`
- Left existing hunk coalescing unchanged.

Result:

| Case | Mode | Scanner chunks | Findings | Duration | Input tokens | Output tokens | Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `sentry-mcp-search-issues-period-30d` | baseline | 95 | 0 | 7m01s | 2,064,917 | 54,596 | $3.8790 |
| `sentry-mcp-search-issues-period-30d` | skip generated definitions | 83 | 0 | 7m26s | 1,552,548 | 46,992 | $2.6260 |

Why it failed as a standalone strategy:

- It reduced cost, but wall time got worse.
- The generated files were expensive, but the long pole became
  `search-events.test.ts`, which still ran as 32 scanner chunks.
- Skipping generated files is a policy decision, not a general chunking
  strategy. It may be valid for derived artifacts, but it does not solve "many
  tiny hunks in one source/test file."

Takeaway:

- Generated artifact skipping is useful as a multiplier with better chunking,
  not sufficient by itself.
- If productized, it should be framed as generated-file policy with clear
  defaults and override paths, not hidden in semantic chunking.

### Skip Generated Definitions Plus Adaptive High-Hunk Gap

What we tried:

- Combined the two best operational levers:
  - skip generated MCP definition JSON files
  - widen same-file sequential coalescing only for files with at least 12 hunks
- Implementation was temporary and backed out after the run.

Result:

| Case | Mode | Scanner chunks | Findings | Duration | Input tokens | Output tokens | Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `sentry-mcp-search-issues-period-30d` | baseline | 95 | 0 | 7m01s | 2,064,917 | 54,596 | $3.8790 |
| `sentry-mcp-search-issues-period-30d` | adaptive high-hunk gap | 51 | 0 | 5m00s | 1,659,025 | 41,407 | $2.9629 |
| `sentry-mcp-search-issues-period-30d` | skip generated definitions | 83 | 0 | 7m26s | 1,552,548 | 46,992 | $2.6260 |
| `sentry-mcp-search-issues-period-30d` | combined | 44 | 0 | 4m24s | 805,895 | 30,757 | $1.3774 |

Why it is promising:

- It is the strongest performance result so far on the slow MCP case:
  - scanner chunks down 54%
  - wall time down 37%
  - input tokens down 61%
  - cost down 64%
- It avoids cross-file semantic grouping.
- It keeps small files on the existing conservative coalescing behavior.
- It removes derived generated artifacts from scanner review instead of asking
  the scanner to re-review source and generated output for the same change.

Why it is not accepted yet:

- The performance case has no findings, so it proves efficiency only.
- The current finding-bearing controls are unstable:
  - Slack missed twice with unchanged chunk shape and very short runs.
  - The pnpm case missed with unchanged chunk shape after a 10m run.
- Because the requirement is no precision or recall loss, this cannot ship until
  quality controls pass repeatedly or the benchmark has a more deterministic
  recall gate.

Takeaway:

- This is the best next implementation candidate, but the next task is improving
  the benchmark quality gate, not adding more chunking heuristics.
- A serious follow-up should run repeated trials for controls or use a judge
  over saved traces to separate chunking regressions from model/run variance.

### Pressure-Triggered Same-File Coalescing

What we tried:

- Added a temporary `prepareFiles` rule:
  - run normal same-file coalescing first
  - if one file still produced at least 12 scanner chunks, rerun coalescing for
    that file with a 120-line gap
  - leave small files on the existing conservative 30-line gap
- Added benchmark runner `--profile` support to measure prepared scanner chunks
  without invoking the model.
- Implementation was backed out after the real scanner run.

Deterministic profile result:

| Case | Baseline scanner chunks | Pressure scanner chunks | Delta |
| --- | ---: | ---: | ---: |
| `sentry-mcp-search-issues-period-30d` | 94 | 65 | -29 |
| `sentry-mcp-issue-search-project-period-endpoint` | 91 | 63 | -28 |
| `sentry-mcp-ai-conversation-period-schema-default` | 92 | 64 | -28 |
| `sentry-mcp-ai-conversation-absolute-range-period-conflict` | 94 | 66 | -28 |
| all other profiled performance cases | unchanged | unchanged | 0 |

Security-control profile result:

| Case | Baseline scanner chunks | Pressure scanner chunks |
| --- | ---: | ---: |
| `sentry-preprod-snapshot-project-access` | 4 | 4 |
| `sentry-release-threshold-empty-project-filter` | 2 | 2 |
| `sentry-replay-delete-read-scope` | 2 | 2 |
| `sentry-slack-options-load-unscoped-group` | 4 | 4 |

High-effort recall result under the temporary rule:

| Case | Findings | Result |
| --- | ---: | --- |
| `sentry-preprod-snapshot-project-access` | 1 high | pass |
| `sentry-release-threshold-empty-project-filter` | 1 high | pass |
| `sentry-replay-delete-read-scope` | 1 high | pass |
| `sentry-slack-options-load-unscoped-group` | 1 high | pass |

Real performance result:

| Case | Mode | Scanner chunks | Findings | Duration | Input tokens | Output tokens | Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `sentry-mcp-search-issues-period-30d` | baseline | 95 | 0 | 7m01s | 2,064,917 | 54,596 | $3.8790 |
| `sentry-mcp-search-issues-period-30d` | pressure coalescing | 66 (65 completed, 1 skipped) | 0 | 9m23s | 2,503,750 | 60,629 | $4.6710 |

Why it failed:

- It reduced scanner calls, but larger chunks were more expensive for the model
  to reason over.
- The new long pole was `packages/mcp-core/src/toolDefinitions.json`, which
  remained 8 scanner chunks and took 9m20s / $2.90 by itself.
- The collapsed `search-events.test.ts` shape was operationally better
  (32 chunks became 3), but that win was erased by larger prompts elsewhere.

Takeaway:

- Chunk count alone is the wrong optimization target.
- Any strategy that merges hunks must track prompt size and per-file long poles,
  not only scanner-call count.
- The next likely lever is explicit generated/derived artifact policy, because
  derived definition JSON dominated the failed run.

## Acceptance

Before using this benchmark to make decisions:

- every initial case must run both modes from the same synthetic branch
- performance cases must run every strategy against the same base/head SHA
- the runner must preserve enough logs to debug planner grouping decisions
- expected finding judgments must reuse the existing eval judge or equivalent
  semantic matching
- interrupted or timed-out runs must be marked incomplete, not compared
- performance wins must preserve or improve findings, then reduce wall time or
  total cost
- optimized chunking must beat the current baseline on wall time or total cost
  before it becomes the default for pathological patches
