# Security Evals

Optional suite that answers one question: does each security skill catch bugs
the others miss? It runs builtin `security-review` and the `wrdn-*` security
skills over the same real code and scores every lane against the same list of
known bugs.

It never runs from `pnpm evals`, the `run-evals` label, or the PR Evals
workflow. It costs real money. Run it on purpose.

## What it scans

- **Corpus entries**: one per finding in
  `packages/docs/src/data/benchmarking/sentry-vulnerability-corpus.json`
  (86 entries, 6 SHAs, 79 files).
- **Cases**: `cases/<owning-skill>/*.json`, for bug classes the corpus barely
  covers (authz production catches, DoS, data exfiltration, code execution).
  `kind: "bug"` is a known bug at `ref`. `kind: "clean"` is the same code after
  the fix; a hit there is a false positive.

Every entry pins `repository`, `ref`, and `targets`. Skills scan the targets
inside a full worktree of that ref, so Read and Grep can trace callers, base
classes, and permission checks the way they do in production.

## Running it

You need local clones of getsentry/sentry and getsentry/warden-skills. Blobless
is enough:

```bash
git clone --filter=blob:none https://github.com/getsentry/sentry.git ~/src/sentry
git clone https://github.com/getsentry/warden-skills.git ~/src/warden-skills
```

```bash
# Every lane over every entry
pnpm evals:security --sentry-repo ~/src/sentry --skills-repo ~/src/warden-skills

# One candidate lane on its own cases, three passes; other lanes come from the baseline
pnpm evals:security --sentry-repo ~/src/sentry --skills-repo ~/src/warden-skills \
  --skills wrdn-dos-review --entries 'wrdn-dos-review/*' --repeats 3
```

`pnpm evals:security --help` lists every flag. Each one maps to a
`WARDEN_SECURITY_EVALS_*` env var. Defaults match the production lane: pi
runtime, `openrouter/x-ai/grok-4.5` at high effort, and
`openrouter/openai/gpt-5.6-luna` at high effort for auxiliary work. `maxTurns`
defaults to 100, as in the corpus runbook, so a turn cap does not read as a
miss. `--skills-repo` is only needed when a `wrdn-*` lane is selected.

Each pinned ref gets `git fetch origin <sha>` only if its clone lacks it, then
one `git worktree add --detach` under `.cache/`. The warden-skills worktree
(ref in `src/options.ts`) and every skill load happen once, before any pass. A
missing clone or a skill that will not load fails the run there, before any
entry is scored. Each sentry SHA gets its worktree before its first pass, and
it is reused across lanes, entries, and repeats. Past that one fetch, model
APIs are the only network a pass touches.

In CI, run the **Security Evals** workflow by hand. It checks out
warden-skills at the pinned ref, restores a cached blobless sentry clone,
runs the suite, and uploads `results.json`. Bumping the pin means editing
`WARDEN_SKILLS_REF` in both `src/options.ts` and the workflow; a unit test
fails if they drift.

## How it scores

Entries sharing a ref form one shard. Each pass builds one file-mode context
over the shard's targets and runs every selected skill on it. Per lane and
entry, only findings in the entry's target files reach the judge, which
applies the corpus rule: same bug, roughly the same location. Another bug in
the same file does not count. No findings in the targets is a miss with no
judge call. A failed chunk drops the entry from that repeat instead of
counting a miss.

Model calls go through Roach like `packages/evals`. Worktree content is pinned,
so recordings replay; `roach.json` normalizes the worktree, checkout, and
skill cache paths.

## Reading results

`.cache/results.json` has sorted keys and no timestamps, so two runs diff
cleanly. The console and the job summary show:

- per lane: recall, bugs found, bugs only that lane found, bugs it found that
  security-review missed, clean cases flagged, cost, and tokens
- an entry x lane table of hits over repeats

`missedBySecurityReview` is the number that decides whether a skill earns its
keep. Zero across a real fixture set is the case for dropping it.

Single runs are noisy: two production-config security-review corpus runs agreed on 32
of the 46 entries either one found. Use `--repeats 3` or more before deciding.

## Baseline

`baseline/results.json` holds lanes this run does not execute, so a
comparison only pays for the candidate lane. It currently has security-review
over the corpus, imported from the two published production-config benchmark
runs (warden 0.46.2 and 0.47.0, scored by the benchmark reviewer). It has no
case results. Pass `--baseline none` to skip it.

Regenerate it from scored benchmark results:

```bash
pnpm -C packages/security-evals import-benchmark \
  ../docs/src/data/benchmarking/results/<run>.json ...
```

## Known gaps

- `wrdn-code-execution` has one real bug case, plus corpus entries 060 and
  061. `wrdn-data-exfil` has two, plus corpus 052. The corpus has almost no
  DoS or exfiltration entries.
- Cases are getsentry/sentry only. Other repositories need their own clone flag.
