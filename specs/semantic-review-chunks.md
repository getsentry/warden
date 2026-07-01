# Semantic Review Chunks

Status: historical experiment. The current chunking benchmark rejects semantic
grouping as an efficiency strategy: it did not produce same-or-better findings
with lower wall time or total cost. Keep this document as design context for
the experiment, not as the accepted optimization plan.

Warden currently prepares code for review from git hunks. Git hunks are useful
for changed-line anchoring, but they are a poor unit of review. A single logical
change can produce dozens of tiny hunks, especially in tests, generated catalogs,
or repeated call-site updates. Reviewing each tiny hunk independently repeats
prompt setup, repeats codebase exploration, increases cost, and can hide the
shape of the actual change.

Semantic review chunks make the scanner read a coherent change unit while
Warden still uses git hunks as the source of truth for where inline comments may
land.

## Current Behavior

The current pipeline is:

```text
git patch
  -> parse file diffs into hunks
  -> split large hunks
  -> coalesce nearby hunks by line distance and size
  -> expand context around each hunk
  -> run one scanner call per hunk-like chunk
```

This is simple and safe, but it only fixes nearby fragmentation. If a file has
50 small hunks spread across distant test cases, Warden still makes many scanner
calls for one logical change.

## Desired Outcome

The scanner should receive a larger review packet when that better matches how a
human would review the change.

Examples:

- one test file with many small related changes becomes one review chunk with
  the whole file or a stitched excerpt
- one implementation change plus related tests becomes one semantic chunk when
  both sides are needed to understand the behavior
- one behavior change touching several files remains one semantic chunk with
  multiple file payloads under the same summary
- unrelated edits in the same file stay separate chunks
- very large or generated files stay governed by scan policy and existing skip
  behavior

The target pipeline is:

```text
git patch
  -> atomic hunk inventory
  -> semantic planning module
  -> ReviewChunk materialization
  -> run one scanner call per ReviewChunk
  -> validate findings against changedLineMap
```

Git hunks remain the evidence and anchoring primitive. Review chunks become the
scanner-facing primitive.

Benchmarking for this work is tracked in
[`chunking-strategy-benchmark.md`](chunking-strategy-benchmark.md).

## Module Boundary

Semantic planning should be cleanly encapsulated in its own module because it is
an input/output planning pass, not scanner logic. The rest of Warden should not
know about planner prompts, tool definitions, model selection details, or
planner validation internals.

Current layout:

```text
packages/warden/src/semantic/
  index.ts
  planner.ts
  tools.ts
```

Split `inventory.ts`, `materialize.ts`, or `types.ts` out later only if the
module grows enough that the separation removes real complexity.

Public surface:

```ts
export interface SemanticChunkPlannerInput {
  context: EventContext;
  chunks: AtomicHunkSummary[];
  limits: SemanticChunkLimits;
}

```

The integration point remains thin:

```text
prepareFiles()
  -> atomic ReviewChunks
semantic.planSemanticReviewChunks(...)
  -> semantic ReviewChunkGroups
run scanner on groups
```

`prepareFiles` remains responsible for parsing diffs and creating deterministic
atomic chunks. The semantic module owns only the decision of which atomic chunks
belong together and why.

## ReviewChunk Contract

```ts
export interface ReviewChunk {
  id: string;
  title: string;
  summary?: string;
  files: ReviewChunkFile[];
  changedLineMap: ChangedLineRange[];
}

export interface ReviewChunkFile {
  path: string;
  changedRanges: ChangedLineRange[];
  content: string;
  contentMode: 'whole-file' | 'stitched-file' | 'raw-hunks';
}

export interface ChangedLineRange {
  path: string;
  start: number;
  end: number;
}
```

`title` is a stable label for progress, logging, and trace output. Deterministic
chunking may use filenames and changed ranges.

`summary` is optional and planner-owned. It must only be set when a semantic
planner has described the logical change. Deterministic grouping must not
populate `summary` with filenames or changed ranges and call that semantic.
Scanner prompts must treat summaries as grouping hints, not evidence that the
change is intended or correct.

`files[].content` is the readable review packet. It can be larger than a hunk
and may include unchanged surrounding code. This content is for understanding.
One semantic change may include multiple files when the same logical change
spans implementation, tests, config, or call sites. That semantic change may
still materialize as multiple bounded `ReviewChunk` scanner calls when the
group would otherwise be too large. The chunk title and summary describe the
shared change; each `files[]` entry carries the file-local content needed to
review that scanner slice.

`changedLineMap` is the hard validation boundary. A scanner finding may only
anchor to a line inside this map. Surrounding content can explain a finding but
cannot be used as the comment location.

## Atomic Hunk Inventory

Before planning, Warden should normalize parsed hunks into stable atomic units:

```ts
export interface AtomicHunkSummary {
  id: string;
  path: string;
  language?: string;
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
  header?: string;
  symbolHint?: string;
  additions: number;
  deletions: number;
  changedLinePreview?: string[];
}
```

The planner operates on this inventory. It does not invent changed lines. Each
atomic hunk is either assigned to exactly one review chunk or excluded by an
existing scan/ignore policy before planning.

The planner should be tool-backed on every semantic run. It should have enough
compact metadata to decide where to inspect, then use read-only tools to inspect
the changed code before finalizing the grouping.

Full content is still primarily for scanner execution after semantic grouping.
Planning input should stay small enough that the planner can reason over the
whole changeset without reproducing the same token cost that semantic chunking
is meant to avoid.

Small diffs can be embedded directly as an optimization. The cutoff should be
tunable because model context windows and price/performance profiles vary. A
conservative default is:

- embed full atomic hunk content only when the total planner diff payload is at
  most 8k characters
- embed only when there are at most 12 atomic chunks
- embed only when there are at most 12 changed ranges after deterministic
  preparation
- otherwise send compact metadata plus capped changed-line previews and require
  tool inspection

This keeps tiny PRs cheap while preserving the main goal for pathological PRs:
avoid passing a huge fragmented patch to the planner.

The knobs belong under semantic chunking config, for example:

```toml
[defaults.chunking.semantic]
maxEmbeddedDiffChars = 8000
maxEmbeddedDiffChunks = 12
maxEmbeddedDiffRanges = 12
```

Smaller-context or expensive models can set these lower, including `0` to force
metadata-plus-tools planning.

Allowed compact inputs include:

- repository metadata
- PR title and body
- commit messages, when available
- changed file list and file statuses
- atomic chunk ids
- file paths and languages
- changed ranges
- hunk headers and symbol hints
- additions, deletions, and hunk counts
- small capped changed-line previews when useful
- full atomic hunk content only when the whole semantic planning input is below
  the small-diff threshold

Disallowed by default:

- full rendered hunk content for medium or large changesets
- whole changed files
- scanner skill prompts
- full repository context

## Planner

The semantic chunk planner groups atomic hunks into review chunks and writes a
semantic summary for each planned group.

Planner input:

- repository and PR metadata
- PR title and body
- commit messages, when available
- changed file list
- atomic hunk inventory with compact metadata
- file sizes and line counts where available
- hard limits for chunk size and count

Planner output:

```ts
export interface PlannedReviewChunk {
  title: string;
  summary: string;
  chunkIds: string[];
}
```

Current materialization keeps planned groups as `raw-hunks` review chunks. Whole
file and stitched-file materializers remain future work.

The planner should optimize for scanner usefulness, not for diff prettiness.
Good chunks are cohesive enough that the scanner can understand the change in
one pass and small enough that the scanner can stay precise.
Cross-file groups are allowed and expected when the files are part of the same
semantic delta. A source change and its test assertion should usually stay
together if reviewing them independently would hide the behavior change.

The planner should use the primary scanner model by default, not the auxiliary
model. Semantic grouping is a hard reasoning task: it must infer relationships
between files, tests, call sites, and behavior. Auxiliary models remain
appropriate for extraction repair and other bounded post-processing work.

### Tool-Using Planning Agent

The planner should be a tool-using read-only agent, not only a single schema
call over a rendered prompt. It should always have tools available and should
inspect code before finalizing a plan. Embedded small diffs can reduce tool
turns, but tools remain the primary way to resolve cross-file relationships,
symbol usage, and behavior.

Read-only tools should include:

- read changed file content at head
- read base content or changed-range context
- inspect nearby symbols/functions
- search usages/imports with bounded `rg`
- inspect PR metadata and commit messages

The planner must not have write tools. It should also not receive an unbounded
repo dump. Tool calls should be driven by grouping uncertainty: inspect enough
code to decide which chunks belong together, then stop.

The scanner remains responsible for finding issues. The planner is responsible
only for grouping and writing semantic summaries that explain why the grouped
changes should be reviewed together.

## Materialization

Materialization turns a planned chunk into the scanner-facing `ReviewChunk`.
For cross-file groups, materialization keeps one shared `ReviewChunk` and
creates one `ReviewChunkFile` per path. It must not flatten file contents into a
single synthetic file, because extraction and changed-line validation depend on
real paths.

Content modes:

| Mode | Use When | Content |
|------|----------|---------|
| `whole-file` | File is below configured line/byte limits and many small hunks are spread across it | Current file contents |
| `stitched-file` | File is too large for whole-file but related hunks need broad structure | Ordered excerpts around changed ranges, with omitted sections marked |
| `raw-hunks` | Planning is unnecessary or the change is already compact | Existing formatted hunks with context |

For test files with many tiny hunks, `whole-file` should usually be preferred
when file limits allow it. Tests often need the surrounding `describe`/`it`
structure to make the change reviewable.

## Finding Validation

Scanner prompts must say that findings can only anchor to changed lines in the
review chunk's changed-line map.

Warden must also enforce that rule after extraction:

- a finding with no location may remain a general finding
- a finding with a location is accepted only if `location.path` and
  `location.startLine` fall inside `changedLineMap`
- multi-line findings must be fully contained by a changed range
- out-of-range findings are dropped and recorded in telemetry

This replaces the current single hunk-range check with a multi-range check.

## Configuration

Semantic review chunks should be configured with a small public surface:

```toml
[defaults.chunking.semantic]
enabled = true
maxChunks = 20
maxChunkChars = 20000
maxHunksPerChunk = 4
maxChangedRangesPerChunk = 4
maxEmbeddedDiffChars = 8000
maxEmbeddedDiffChunks = 12
maxEmbeddedDiffRanges = 12
```

Do not expose fallback behavior as config. If semantic planning fails mechanical
validation or cannot run, any recovery behavior should remain internal. Users
should not need to choose recovery strategy.

## Validation Rules

Planner output must pass deterministic validation before scanner execution:

- every planned `hunkId` exists
- no hunk is assigned to more than one chunk
- every included hunk is assigned to a chunk
- every planned path exists in the changed file set
- each chunk respects hard size and hunk-count limits after materialization
- each `changedLineMap` range comes from assigned atomic hunks
- chunk ids are stable within the run and unique

Invalid plans are not partially trusted.

## Prompt Changes

The scanner task should move from hunk-specific language to chunk-specific
language:

```text
Analyze this review chunk according to the skill criteria.

If a semantic summary is present, use it as planner context for why these
changed ranges are being reviewed together. File content may include unchanged
surrounding code for context. Only report findings covered by the skill
instructions, and only anchor locations to lines listed in the changed-line map.
```

The JSON output schema can stay mostly unchanged. The location rules need to
reference changed-line maps instead of a single hunk range.

## Telemetry

Warden should record enough data to prove whether semantic chunking helps:

- original atomic hunk count
- planned review chunk count
- materialized chunk count
- content mode counts
- planner duration and usage
- scanner duration and usage
- internal recovery reason when semantic chunking is not used
- number of dropped out-of-range findings

This should make cost and latency changes visible without reading logs line by
line.

## User-Facing Visibility

Semantic segments may be useful beyond internal execution. Warden should be able
to expose them in debug or verbose output, and possibly in pull request reports,
without making them noisy by default.

Useful fields to expose:

- segment title
- semantic summary
- files included
- changed ranges included
- atomic chunk count
- scanner chunk count
- content mode per file
- scanner result count for the segment

CLI presentation can show a compact plan before scanning when verbose output is
enabled:

```text
Semantic plan: 7 review chunks from 42 atomic hunks
  1. Enforce project access in token lookup
     api/tokens.ts, auth/permissions.ts, api/tokens.test.ts
  2. Update dashboard range validation
     dashboard/range.ts, dashboard/range.test.ts
```

Pull request presentation should be more conservative. A collapsed report
section can help reviewers understand why findings came from a cross-file
chunk, but inline comments should remain focused on findings. The plan should
not become another review surface unless it clearly helps explain Warden's
coverage and cost.

## Benchmarking and Evals

Semantic chunking needs more than a chunk-count benchmark. We need fixtures
where semantic grouping should materially improve or preserve scanner quality.

Good fixtures:

- real commit or PR SHA
- known security regression or confirmed product bug
- objective expected finding
- issue spans multiple files or many tiny hunks
- baseline hunk mode is worse in recall, duplicates, cost, or model calls

Preferred security examples:

- removed authorization check
- unsafe command execution
- path traversal
- SSRF
- SQL/query injection
- secret exposure
- unsafe deserialization

Each fixture should run the same scanner twice:

```text
same fixture + same skill + semantic off
same fixture + same skill + semantic on
```

Compare:

- expected finding found or missed
- severity and confidence
- location correctness
- duplicate findings
- total findings
- chunk count
- model calls
- input and output tokens
- cost
- wall time

The eval should also inspect planner output directly:

- at least one expected semantic group exists
- group summary describes behavior, not files or line numbers
- cross-file changes can be grouped when they are one logical change
- unrelated edits remain separate

The benchmark corpus already supports known Sentry vulnerabilities. We should
reuse that machinery where possible, but semantic chunking needs fixtures
selected for cross-file or many-hunk behavior, not just historical security
coverage.

## Prior Art Notes

This space has enough prior art to shape the implementation, but not enough
public detail to copy an architecture directly.

- CodeRabbit documents context-aware PR review, path-specific instructions,
  linked issue context, MCP context, multi-repo analysis, walkthrough comments,
  and a review interface that reorganizes a PR into a logical walkthrough
  rather than a flat file list:
  <https://docs.coderabbit.ai/llms.txt>
- CodeRabbit's path instructions and filters are a useful reminder that semantic
  grouping should respect review scope and file-specific guidance. Generated
  files, binaries, and lockfiles should be filtered before semantic planning,
  and path-scoped review instructions should remain scanner inputs rather than
  planner inputs:
  <https://docs.coderabbit.ai/configuration/path-instructions>
- Qodo describes its current review product as multi-agent PR analysis with
  diff plus repository-aware reasoning, ticket-aware context, and a separate
  semantic code intelligence layer for repository retrieval and multi-step
  reasoning:
  <https://docs.qodo.ai/llms.txt>
- SWE-PRBench is the strongest warning against "just add more context." Its
  results show AI review quality degrading as context expands, even with
  structured semantic layers such as AST function context and import graph
  resolution. It also found that a compact diff-with-summary context beat a
  richer full-context prompt in their setup:
  <https://arxiv.org/abs/2603.26130>
- MutaGReP supports the same direction from code-use tasks: instead of putting
  the whole repo into context, it builds grounded natural-language plans using
  retrieval over relevant symbols. The reported plans use a small fraction of a
  large context window while preserving task performance:
  <https://arxiv.org/abs/2502.15872>
- Semantic-aware AST diff work, especially RefactoringMiner-based approaches,
  suggests a future deterministic enhancement: detect moved/renamed/refactored
  code so the semantic planner starts with better symbol and relationship hints:
  <https://arxiv.org/abs/2403.05939>
- Empirical AI review studies suggest concise, actionable comments matter.
  One study of GitHub Actions review tools found concise comments with code
  snippets and hunk-level review tools were more likely to lead to code changes:
  <https://arxiv.org/abs/2508.18771>
- Industrial Qodo PR Agent studies found automated review can help bug
  detection and awareness, but can also increase review time and produce faulty
  or irrelevant comments:
  <https://arxiv.org/abs/2412.18531>

Implementation lessons for Warden:

- Keep planner context compact. The planner should operate over an inventory and
  retrieve extra context through bounded tools only when needed.
- Treat semantic summaries as routing/context, not evidence. Findings still
  need changed-line anchors and scanner evidence.
- Separate planning from scanning. A planning agent can inspect the repo to
  group work; skill scanners still own domain-specific finding generation.
- Prefer explicit semantic segments over invisible behavior. Showing the plan in
  verbose CLI output, JSONL, or a collapsed PR section can make Warden's work
  auditable without overwhelming inline review.
- Evaluate against expected findings, not only cost. A cheaper run that misses a
  known bug is worse. A more expensive planner may be justified only when it
  improves or preserves recall while reducing scanner fragmentation.
- Avoid unbounded full-context prompts. Prior work suggests attention dilution
  is a real failure mode; semantic chunking should reduce cognitive load, not
  move the entire PR into an earlier prompt.

## Rollout

1. Add `AtomicHunkSummary`, `ReviewChunk`, and multi-range finding validation.
2. Adapt the existing hunk/coalescing flow to emit `ReviewChunk` values using
   `raw-hunks`.
3. Update scanner prompt construction to accept `ReviewChunk`.
4. Move semantic planning into `packages/warden/src/semantic/` with a narrow
   public API.
5. Replace the simple auxiliary schema call with a primary-model, read-only
   tool-using planning agent.
6. Keep planner input compact and make code inspection explicit through tools.
7. Add materializers for `whole-file`, `stitched-file`, and `raw-hunks`.
8. Add telemetry for chunk counts, cost, duration, and planner failures.
9. Add regression fixtures for tiny-hunk pathological changes, including the
   `getsentry/sentry-mcp` style case from Warden issue 313.
10. Add semantic-vs-hunk eval fixtures with known expected findings.
11. Add optional verbose CLI and collapsed PR visibility for semantic segments.
12. Enable selectively, compare eval recall and cost, then consider making it
   default.

## Non-Goals

- replacing git diff parsing
- letting the planner decide where comments may land
- exposing planner recovery strategy as user config
- building a full AST differ
- reviewing unchanged lines as primary finding locations
- passing full diffs or full repository context to the planner by default
- making semantic segment display a required PR review surface
