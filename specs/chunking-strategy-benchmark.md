# Chunking Strategy Benchmark

Warden's scanner can become slow or expensive when a pull request has many git
hunks, very large generated/test chunks, or repeated tiny edits spread across
files. The scanner also loses precision when unrelated hunks are combined into
one broad prompt. This benchmark records both sides of that tradeoff.

This is a maintainer benchmark plan, not public product documentation. Public
benchmark readouts belong under `packages/docs/src/content/docs/benchmarking/`
after the runner and result format are stable.

## Current Takeaway

The evidence so far does not support semantic grouping as the default
performance fix. Semantic grouping preserved recall on some historical cases,
but it did not reduce cost in the paired baseline and did not recover cases that
non-semantic chunking missed.

The better next bet is a precision-preserving chunk optimizer:

- collapse repeated tiny hunks when the edit shape is nearly identical
- merge sequential same-file hunks under strict size/range caps
- keep risky production chunks bounded
- treat generated/schema/test churn carefully because it dominates cost
- use semantic labels only as neutral metadata, not as authority to make giant
  scanner prompts

The benchmark suite now has three roles:

- historical recall cases with known expected findings
- branch-evolution recall cases where later branch commits fix earlier branch
  bugs
- real performance-shape PRs that measure cost, chunk count, failures, and
  finding quality

## Goal

Answer two questions:

- Does a chunking strategy preserve or improve known-finding recall?
- Does it reduce scanner calls, runtime, tokens, or cost on fragmented changes?

The benchmark should not only prove that a chunking strategy produces fewer
chunks. It must prove that scanner behavior improves or stays correct when the
scanner receives optimized chunks instead of atomic git-hunk chunks.

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

## Performance Shape Cases

Add a separate performance suite made of real pull requests that were slow or
pathologically fragmented. These cases do not need a known expected finding.
They measure scanner-call count, runtime, token cost, failed chunks, duplicate
findings, and whether reported findings are valid.

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
- scanner chunks and failed/interrupted chunks
- wall time and model usage
- duplicate or near-duplicate findings
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
5. Run Warden with semantic chunking disabled.
6. Reset to the same benchmark branch.
7. Run Warden with semantic chunking enabled.
8. Judge both reports against the existing `should_find` assertion.

For each performance shape case:

1. Create or reuse a temporary worktree for the source repository.
2. Check out the PR base SHA.
3. Apply or check out the PR head SHA.
4. Run each chunking strategy against `base..head`.
5. Record scanner calls, runtime, tokens, cost, failed chunks, findings, and
   manual finding validity.

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

## Strategies To Compare

Use the same cases across each strategy:

- current non-semantic chunking
- current semantic grouping
- deterministic precision-preserving optimizer
- optimizer plus optional neutral semantic labels, if implemented

The optimizer is not a replacement for all chunking. It should activate only
for pathological patch shapes: high raw chunk count, high hunk count in one
file, many tiny hunks, or large total diff size.

## Metrics

Record these for each semantic-off and semantic-on run:

- pass/fail against expected finding
- total findings
- duplicate or near-duplicate findings
- failed chunks
- failed extractions
- wall time
- scanner chunk count
- semantic planner group count
- scanner chunks per semantic group
- semantic planner summaries
- input tokens
- output tokens
- recorded cost

The semantic-on run is successful when it keeps the expected finding and reduces
operational load. A lower chunk count is not enough if recall regresses.
Semantic groups are allowed to contain multiple scanner chunks; the target is
fewer, better bounded scanner calls than raw git chunks, not one giant scanner
prompt per logical change.

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
  "expectedFindingMatched": null
}
```

`expectedFindingMatched` stays `null` until the benchmark reuses the existing
eval judge for semantic finding matching. Do not use exact title matching as a
substitute; these reports often describe the same bug with different wording.

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

## Acceptance

Before using this benchmark to make decisions:

- every initial case must run both modes from the same synthetic branch
- performance cases must run every strategy against the same base/head SHA
- the runner must preserve enough logs to debug planner grouping decisions
- expected finding judgments must reuse the existing eval judge or equivalent
  semantic matching
- semantic-on must expose planner summaries in the artifact
- interrupted or timed-out runs must be marked incomplete, not compared
- performance wins must preserve finding quality, not only reduce chunk count
- optimized chunking must beat semantic mode on runtime or cost before it becomes
  the default for pathological patches
