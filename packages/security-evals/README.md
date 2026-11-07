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

You need a local clone of every repository the selected entries pin (today
only getsentry/sentry) and of getsentry/warden-skills. Blobless is enough:

```bash
git clone --filter=blob:none https://github.com/getsentry/sentry.git ~/src/sentry
git clone https://github.com/getsentry/warden-skills.git ~/src/warden-skills
```

```bash
# Every lane over every entry
pnpm evals:security --repo getsentry/sentry=$HOME/src/sentry --skills-repo ~/src/warden-skills

# One candidate lane on its own cases, three passes; other lanes come from the baseline
pnpm evals:security --repo getsentry/sentry=$HOME/src/sentry --skills-repo ~/src/warden-skills \
  --skills wrdn-dos-review --entries 'wrdn-dos-review/*' --repeats 3
```

`pnpm evals:security --help` lists every flag. Each one maps to a
`WARDEN_SECURITY_EVALS_*` env var. Defaults match the production lane: pi
runtime, `openrouter/x-ai/grok-4.5` at high effort, and
`openrouter/openai/gpt-5.6-luna` at high effort for auxiliary work. `maxTurns`
defaults to 100, as in the corpus runbook, so a turn cap does not read as a
miss. `--skills-repo` is only needed when a `wrdn-*` lane is selected. Repeat
`--repo owner/name=<path>` per repository; `--sentry-repo <path>` is shorthand
for the getsentry/sentry one.

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
judge call.

A failed skill pass, failed chunk, or failed judge call records the entry as
an **error** for that lane, never a miss. Any error fails the run and blocks
that skill's verdict.

Model calls go through Roach like `packages/evals`. Worktree content is pinned,
so recordings replay; `roach.json` normalizes the worktree, checkout, and
skill cache paths.

## Reading results

`.cache/results.json` has sorted keys and no timestamps, so two runs diff
cleanly. The console and the job summary show:

- one verdict per `wrdn-*` lane, first
- per lane: recall, bugs found, bugs only that lane found, clean cases
  flagged, errors, cost, and tokens
- an entry x lane table of hits over repeats, with error counts

Single runs are noisy: two production-config security-review corpus runs
agreed on 32 of the 46 entries either one found. That is why the verdict
wants repeats.

## Proving a skill

Every `wrdn-*` lane gets exactly one verdict against security-review. The
thresholds live in `VERDICT_RULES` in `src/verdict.ts`.

| verdict | when |
| --- | --- |
| `earns-keep` | At least one bug the skill caught in 2 of 3 repeats (or better) that security-review caught in none, both lanes at 3+ repeats. |
| `no-unique-catches` | No such bug, nothing unsettled, and at least 5 bug cases under `cases/<skill>/` with 3+ repeats in both lanes. |
| `insufficient-evidence` | Anything else: an errored entry in either lane, no security-review lane, fewer than 5 owned bug cases, fewer than 3 repeats, or a bug the skill caught that security-review caught only some of the time. |

Corpus entries can produce an `earns-keep`, but only owned cases count toward
the 5. `no-unique-catches` across a real case set is the evidence for
dropping a skill. A bare zero from one pass is not.

## Adding a case

A good case is a real bug that was fixed, squarely in the owning skill's
domain, and traceable inside the repository at that ref. Synthetic code and
bugs that need another service to explain do not belong here.

```bash
pnpm evals:security:add https://github.com/getsentry/sentry/pull/<n> --skill wrdn-dos-review
```

It writes `cases/<skill>/<name>.json` (the bug, at the fix commit's parent)
and `<name>-fixed.json` (the clean twin, at the fix). Targets are the non-test
`.py` and `.ts` files the fix modified; it prints anything it skipped. A
commit URL works too. The name comes from the PR title; `--name <slug>` picks
your own. `GITHUB_TOKEN` avoids rate limits.

Then:

1. Write `summary` in both files: one sentence naming the bug and where it
   lives. The judge matches findings against it.
2. `pnpm -C packages/security-evals test`. The suite validator checks the
   schema, unique ids, no overlap with the corpus, a known skill directory,
   no TODO summary, a clean twin or a `noClean` reason, and that the baseline
   only names entries that exist. It runs in CI with no model and no clone.
3. Run it for real:
   `pnpm evals:security --repo getsentry/sentry=<clone> --skills-repo <clone> --skills security-review,<skill> --entries <skill>/<name>,<skill>/<name>-fixed --repeats 3`.
   A case no lane ever finds is still a valid case; say so in the PR.

Drop the clean twin only when the fix is not pinnable, and say why in
`noClean` on the bug case.

## Baseline

`baseline/results.json` holds lanes a run does not execute, so a comparison
only pays for the candidate lane. Each lane records its provenance: runtime,
model, effort, auxiliary model and effort, max turns, judge model, warden
version, and skill ref (`builtin` or `getsentry/warden-skills@<sha>`). A lane
whose provenance differs from the current run is dropped with a warning, and
an entry whose ref changed is skipped. A stale baseline never gets compared
against a new skill version. Pass `--baseline none` to skip it.

It is empty right now. Fill it after a clean run:

```bash
pnpm evals:security ... --skills security-review --repeats 3 --output /tmp/sr.json
pnpm -C packages/security-evals baseline:update /tmp/sr.json
```

`baseline:update` replaces the tallies for entries the run covered, resets a
lane whose provenance changed, and refuses results with errors. Update it when
you bump the warden version, the model, or the warden-skills pin, and after
adding cases you want compared for free.

## Known gaps

- Owned bug cases today: wrdn-authz 5, wrdn-dos-review 6, wrdn-data-exfil 2,
  wrdn-code-execution 1, wrdn-pii 0. A skill below 5 reads
  `insufficient-evidence` unless it earns its keep outright.
- The corpus has almost no DoS or exfiltration entries. Cases have to carry
  those skills.
- Next: harvest candidate cases from production Warden PR comments that led
  to a fix. Not built.
