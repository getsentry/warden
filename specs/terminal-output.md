# Terminal Output Design

Design guide for Warden's terminal UX.

This document is intentionally not a command catalog. It defines the shared
principles, state semantics, and implementation constraints that should shape
terminal output across `run`, `build`, and future commands.

Use `specs/reporters.md` for reporter behavior and event formats. Use this file
when designing or reviewing terminal output itself.

## 1. Purpose

Warden has two very different terminal jobs:

- show live progress without lying, flickering, or repeating itself
- leave behind final output that is easy to scan, grep, and trust

The `run` command is currently the strongest reference implementation, but this
document exists so we do not keep copying behavior by feel and rediscovering
the same bugs in other commands.

When this guide needs examples, prefer `run` output unless another command is
the only place a pattern exists.

## 2. Core Principles

### Tell the truth

- Never show work that is not happening.
- Never show a duration for cached work.
- Never imply freshness with `[generated]` when a real duration already says it.
- Never keep stale dynamic text on screen after the state has changed.

### Prefer stable structure over cleverness

- Reuse the same headings, row states, and timing semantics across commands.
- Keep section order stable from top to bottom.
- Keep labels short and predictable.
- Put nuance in detail lines or final summaries, not in transient row labels.

### Separate transient output from durable output

- Dynamic progress is ephemeral.
- Final summaries and artifacts are durable.
- Do not replay transient rows as a second static listing unless that second
  listing adds genuinely new information.

### Optimize for scan speed

- Show the most important state first: what is running, what completed, what
  failed, what was cached.
- Use counts and short labels in headings.
- Avoid paragraphs in the live area.

### Make machine paths clean

- Human progress belongs on `stderr`.
- Machine-readable payloads belong on `stdout` or files.
- JSON output must stay clean even if the command also has a human TTY mode.

## 3. Mental Model

Design terminal output as three layers:

1. Invocation context
   Examples: skill name, source path, model, repo path
2. Progress sections
   Examples: `PLAN`, `TASKS`, `SKILLS`, `FILES`, `TRY IT`
3. Final payload or summary
   Examples: findings report, exported JSON, generated artifact inspection

Each layer should answer a different question:

- what is Warden operating on
- what is happening right now
- what was the result

Do not blend these layers together casually.

## 4. Shared Building Blocks

### Visual language

Warden should use a small semantic style vocabulary instead of ad hoc color
choices.

- Active work: yellow spinner
- Success: green checkmark
- Error: red error mark
- Skipped or cautionary state: yellow skipped marker or warning text
- Metadata: dim text
- Count suffixes in section headings: cyan
- Structural labels such as section names: bold

These are semantic roles, not a license for decorative color. If a new output
pattern needs more colors than this, it is probably doing too much.

Most lines should be mixed-style, not single-style. The common pattern is:

- semantic icon color
- neutral main label text
- dim metadata suffix

This is usually better than coloring the whole line.

### Section headings

- Use short uppercase headings for major sections.
- Use count headings when cardinality matters.
- Prefer the form `{LABEL}  {N} {noun}`.
- Leave one blank line between major sections.

Examples:

- `FILES  12 files`
- `TASKS  6 tasks`
- `SKILLS`
- `PLAN`

Annotated example:

```text
TASKS  6 tasks
```

- `TASKS`: bold
- `6 tasks`: cyan count suffix
- no status icon on the heading itself

### Invocation context block

Commands that need a short identity block before progress should use a compact,
label-value layout.

Example:

```text
  Skill    security
  Source   .warden/skills/security
  Model    default [pi]
```

Style notes:

- field labels are structural and low-noise
- values carry the meaning; avoid decorative framing
- runtime or model hints may use bracketed metadata
- this block should stay short enough that it does not drown out the real work

### Transient rows

Every live row should map to one of a small number of states:

- Pending: `○ label`
- Running: `spinner label [live elapsed]`
- Done, fresh work: `✓ label [final duration]`
- Done, cache hit: `✓ label  [cached]`
- Error: `✗ label [final duration?]  short error`

Rules:

- Running rows use a live elapsed timer until completion.
- Completed rows replace the live timer with a static final duration.
- Cached rows suppress duration entirely.
- Do not stack contradictory badges like `[cached] [1.2s]`.
- Do not invent extra states unless the user can act on the distinction.

Annotated examples:

```text
⠦ command-injection [8.4s]
✓ path-traversal [12.3s]
✓ secrets-exposure  [cached]
✗ deserialization [4.1s]  malformed frontmatter
○ dependency-vulnerabilities
```

- `⠦`: yellow spinner
- `✓`: green success marker
- `✗`: red error marker
- `○`: dim pending marker and label
- `[8.4s]`, `[12.3s]`, `[cached]`: dim metadata
- `malformed frontmatter`: dim short error summary

Dense completed rows are acceptable when the metadata is all genuinely useful.

Example:

```text
✓ Synthesized plan with 6 tasks  [15 KB · 57.8s · 13.9k input / 3.7k output · $0.06 · 3 sources · 1 turn]
```

Style notes:

- `✓`: green success marker
- main completion phrase: neutral text
- bracketed stats block: dim metadata
- use `·` as a compact separator inside dense metadata trailers
- reserve dense trailers for completed rows or section summaries, not active rows

Equivalent `run` example:

```text
✓ security-review [4.2s]  2 findings  $0.03
```

- state comes from the icon, not whole-line color
- duration remains dim metadata
- findings count stays inline because it changes operator attention
- cost stays secondary

### Detail lines

Use a detail line only when it adds context the label cannot carry cleanly.

Good uses:

- explain whether work is validating cache or synthesizing fresh output
- show a short note about what a section is doing
- show a truncated scope line after a completed artifact row

Bad uses:

- duplicating the label in sentence form
- long explanations that push active work off screen
- repo-specific implementation trivia during transient progress

Annotated example:

```text
⠧ Identify critical vulnerabilities in the codebase [11.8s]
Synthesizing outline from the skill definition. This can take a minute.
```

- first line: active row with live elapsed timer
- second line: dim detail line
- the detail explains the operation; it does not restate the whole label

### Banner and framing

The startup banner or other framing output should stay visually subordinate to
the actual work.

Example:

```text
 __    __              _
/ / /\ \ \__ _ _ __ __| | ___ _ __
\ \/  \/ / _` | '__/ _` |/ _ \ '_ \
 \  /\  / (_| | | | (_| |  __/ | | |
  \/  \/ \__,_|_|  \__,_|\___|_| |_|

v0.22.0
```

Style notes:

- banner treatment should be dim or otherwise low-priority
- it may establish identity, but it should not compete with progress sections
- once the command starts doing work, section headings and state rows matter more

## 5. Loading Patterns

Choose a loading pattern based on the shape of the work, not the command name.

### Single-step loader

Use for one long-running operation with one primary status label.

Reference example from `build`:

```text
OUTLINE
⠴ Identify authorization weaknesses in the changed code [6.2s]
Validating cached generated skill outline...
```

Use this when:

- the user only needs one active row
- parallelism is not visible or not relevant
- the operation has one primary artifact

### Concurrent list loader

Use for multiple peer tasks running in parallel.

Example:

```text
TASKS  4 tasks
✓ command-injection  [cached]
⠴ path-traversal [3.1s]
⠴ deserialization [2.8s]
○ authentication-bypass
```

Use this when:

- there are multiple independent work items
- the user benefits from knowing which items are active right now
- completion order may differ from declaration order

Rules:

- show active items explicitly, not a summary like `4 tasks are generating`
- keep the label to the work item identity
- keep timing on the row, not in a separate legend

### Nested loader

Use when one parent unit owns several active child units, as in `run`.

Reference example from `run`:

```text
⠦ security-review  [2/5 files]  1 finding  $0.03
  ⠦ src/api/auth.ts [2/4]
  ⠦ src/cli/main.ts [1/2]
```

Use this when:

- one active parent contains several active children
- child progress matters while the parent is still running
- showing all siblings flat would lose structure

Rules:

- only show active children in the transient nested area
- print fuller completed summaries later, after the live area clears
- do not mix nested and flat concurrent patterns in the same section unless the
  user genuinely needs both

### Post-live summary

When the dynamic area clears, any follow-up static output must add new
information.

Good:

- completed per-file breakdown after a running skill UI disappears
- `TRY IT` or next-step hint after synthesis finishes

Bad:

- replaying the same finished task rows with the same information
- restating every item that was already visible in the live list

## 6. Timing Semantics

Timing is one of the easiest places to damage trust.

Rules:

- Running timers are live elapsed time from the moment the row entered running.
- Completed timers are the measured duration of the work that actually ran.
- Cached work shows no duration unless the duration is explicitly historical and
  clearly labeled as such. By default, do not show it.
- Aggregate command durations should reflect wall-clock time, not the sum of
  overlapping parallel work.

## 7. Cache Semantics

Cache state is useful because it explains why something completed instantly.

Rules:

- Show `[cached]` only when the current invocation reused an existing artifact.
- Cached rows should otherwise look like normal completions.
- Do not use `[generated]` as a mirror image of `[cached]`.
- If cache validation itself is meaningful, explain it in a section detail line,
  not by inventing extra row badges.

## 8. TTY, Plain, and Machine Modes

### TTY

- Use dynamic Ink rendering for live progress.
- Keep the dynamic area compact.
- Prefer one shared renderer for shared state patterns.
- Clear the transient area before printing durable follow-up output.

Reference `run` shape while work is active:

```text
⠦ security-review  [2/5 files]  1 finding  $0.03
  ⠦ src/api/auth.ts [2/4]
  ⠦ src/cli/main.ts [1/2]
○ style-guide
```

Reference `run` shape after the live area clears:

```text
✓ security-review [4.2s]  2 findings  $0.03
  ✓ src/api/auth.ts [4/4]  ● 1  1.8s  $0.01
  ✓ src/cli/main.ts [2/2]  ● 1  1.1s  $0.01
```

Design takeaway:

- active state can mix nested running children with flat sibling rows
- completed follow-up output should add information not visible in the live area
- this is the primary reference pattern for richer terminal UX

### Plain / non-TTY

- Use timestamped step lines.
- Preserve the same high-level ordering as TTY where practical.
- Do not simulate animation.
- Keep wording stable and grep-friendly.

### JSON or other machine-readable modes

- Emit only the requested payload on `stdout`.
- Keep human progress out of the payload stream.
- If a flag is an inspection path, short-circuit expensive side effects that do
  not affect the payload.

Example plain-mode step lines:

```text
[2026-05-01T04:01:47.053Z] warden: Identify authorization weaknesses in changed code
[2026-05-01T04:01:47.410Z] warden: path-traversal
```

- ISO timestamp prefix on every line
- no spinner or animation
- no color-dependent semantics required for comprehension

### Mixed-style section example

Real Warden output often combines several of the patterns above in one compact
flow. Prefer examples from `run`, since that surface is the more mature model.

Example:

```text
FILES  5 files

⠦ security-review  [2/5 files]  1 finding  $0.03
  ⠦ src/api/auth.ts [2/4]
  ⠦ src/cli/main.ts [1/2]
✓ perf-review [1.7s]
○ style-guide
```

Design takeaway:

- headings stay structurally simple
- success is conveyed by the icon, not by coloring the full sentence
- durations and stats stay in dim suffixes
- nested running children can coexist with flat sibling rows
- multiple metadata shapes can coexist as long as each row still reads left to right:
  state, identity, metadata

`Synth` should follow these semantics unless it has a concrete reason to
deviate.

## 9. Ink Implementation Rules

Ink is easy to make look wrong even when the code is technically correct.

Rules:

- Batch rerenders with `setImmediate()` or an equivalent debounce point.
- Allow one final render tick before `clear()` and `unmount()`.
- Use stable keys for dynamic rows.
- Do not maintain separate transient renderers for the same state model unless
  they genuinely differ in behavior.
- Prefer shared helpers for common row-state logic instead of reimplementing
  timers, cached badges, and completion formatting per command.

## 10. When To Add A New Pattern

Before adding a new output pattern, ask:

- Is this a real new state, or can an existing row state express it?
- Does this help the user decide what to do next?
- Will this still make sense in plain mode and in logs?
- Can this be expressed as a section detail instead of a new badge?
- Are we introducing behavior that other commands will now need to match?

If the answer to the last question is yes, the pattern belongs in this guide
and probably in shared renderer code.

## 11. Review Checklist

When reviewing terminal UX changes, verify:

- the output is truthful about running, cached, completed, and failed work
- live timers become static final durations on completion
- cached rows do not show fake durations
- section order is stable and easy to scan
- transient rows are not replayed as redundant static output
- plain mode remains readable and grep-friendly
- machine-readable output stays clean
- the change reuses shared primitives instead of inventing a command-only one
