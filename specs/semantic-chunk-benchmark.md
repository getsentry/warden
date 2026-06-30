# Semantic Chunk Benchmark Plan

Semantic chunking should be measured against real changesets where the scanner
needs to understand a logical change that git split across many small hunks.
The benchmark should compare Warden with semantic chunking disabled and enabled
on the same bug-introducing diffs.

This is a maintainer benchmark plan, not public product documentation. Public
benchmark readouts belong under `packages/docs/src/content/docs/benchmarking/`
after the runner and result format are stable.

## Goal

Answer two questions:

- Does semantic chunking preserve or improve known-finding recall?
- Does it reduce scanner calls, runtime, tokens, or cost on fragmented changes?

The benchmark should not only prove that the planner can produce summaries. It
must prove that scanner behavior improves or stays correct when the scanner
receives semantic review chunks instead of atomic git-hunk chunks.

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

For each benchmark case:

1. Create or reuse a temporary Sentry worktree.
2. Check out the fixing commit.
3. Create a benchmark branch.
4. Apply the full inverse fixing diff back to the vulnerable commit.
5. Run Warden with semantic chunking disabled.
6. Reset to the same benchmark branch.
7. Run Warden with semantic chunking enabled.
8. Judge both reports against the existing `should_find` assertion.

The first implementation can be a one-off script under `packages/evals/scripts/`
or a local maintainer command. Do not add a root `pnpm` script until the output
format and workflow are worth preserving.

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
  }
}
```

## Captured Baseline

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

## Acceptance

Before using this benchmark to make decisions:

- every initial case must run both modes from the same synthetic branch
- the runner must preserve enough logs to debug planner grouping decisions
- expected finding judgments must reuse the existing eval judge or equivalent
  semantic matching
- semantic-on must expose planner summaries in the artifact
- interrupted or timed-out runs must be marked incomplete, not compared
