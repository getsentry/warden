# Semantic Review Chunks

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
  -> semantic chunk planner
  -> ReviewChunk materialization
  -> run one scanner call per ReviewChunk
  -> validate findings against changedLineMap
```

Git hunks remain the evidence and anchoring primitive. Review chunks become the
scanner-facing primitive.

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

`files[].content` is the readable review packet. It can be larger than a hunk
and may include unchanged surrounding code. This content is for understanding.
One `ReviewChunk` may include multiple files when the same logical change spans
implementation, tests, config, or call sites. The chunk title and summary
describe the shared change; each `files[]` entry carries the file-local content
needed to review that change.

`changedLineMap` is the hard validation boundary. A scanner finding may only
anchor to a line inside this map. Surrounding content can explain a finding but
cannot be used as the comment location.

## Atomic Hunk Inventory

Before planning, Warden should normalize parsed hunks into stable atomic units:

```ts
export interface AtomicHunk {
  id: string;
  path: string;
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
  header?: string;
  changedLines: string[];
  excerpt: string;
}
```

The planner operates on this inventory. It does not invent changed lines. Each
atomic hunk is either assigned to exactly one review chunk or excluded by an
existing scan/ignore policy before planning.

## Planner

The semantic chunk planner groups atomic hunks into review chunks and selects a
content mode for each file in each chunk.

Planner input:

- repository and PR metadata
- PR title and body
- changed file list
- atomic hunk inventory with compact excerpts
- file sizes and line counts where available
- hard limits for chunk size and count

Planner output:

```ts
export interface PlannedReviewChunk {
  id: string;
  title: string;
  summary: string;
  hunkIds: string[];
  files: Array<{
    path: string;
    contentMode: 'whole-file' | 'stitched-file' | 'raw-hunks';
  }>;
}
```

The planner should optimize for scanner usefulness, not for diff prettiness.
Good chunks are cohesive enough that the scanner can understand the change in
one pass and small enough that the scanner can stay precise.
Cross-file groups are allowed and expected when the files are part of the same
semantic delta. A source change and its test assertion should usually stay
together if reviewing them independently would hide the behavior change.

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
maxChunkChars = 30000
maxHunksPerChunk = 50
preferWholeFileBelowLines = 800
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

## Rollout

1. Add `AtomicHunk`, `ReviewChunk`, and multi-range finding validation.
2. Adapt the existing hunk/coalescing flow to emit `ReviewChunk` values using
   `raw-hunks`.
3. Update scanner prompt construction to accept `ReviewChunk`.
4. Add the model-backed semantic planner behind `chunking.semantic.enabled`.
   Planner output is the first place `ReviewChunk.summary` should be populated.
5. Add materializers for `whole-file`, `stitched-file`, and `raw-hunks`.
6. Add telemetry for chunk counts, cost, duration, and planner failures.
7. Add regression fixtures for tiny-hunk pathological changes, including the
   `getsentry/sentry-mcp` style case from Warden issue 313.
8. Enable selectively, compare eval recall and cost, then consider making it
   default.

## Non-Goals

- replacing git diff parsing
- letting the planner decide where comments may land
- exposing planner recovery strategy as user config
- building a full AST differ
- reviewing unchanged lines as primary finding locations
