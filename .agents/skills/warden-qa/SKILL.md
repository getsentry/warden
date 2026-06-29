---
name: warden-qa
description: Concise local QA workflow for Warden changes. Use when asked to manually QA Warden, verify scanner behavior, exercise config or chunking changes, or sanity-check local output before finishing.
---

Use one targeted local run to prove the changed Warden behavior. Prefer the
smallest deterministic path that exercises the real code.

## Choose the Probe

- For diff parsing, chunking, trigger matching, config loading, or report
  shaping, use a focused `tsx` snippet against package APIs.
- For CLI behavior, use `pnpm cli -- ...` with the narrowest command and flags
  that reach the changed path.
- For model-backed scanner behavior, use one small fixture and one skill. If
  credentials or network access block the run, report that and verify the
  deterministic pre-model path instead.
- Do not run broad, expensive, or unrelated Warden scans for a narrow change.

## Common Commands

Run package API probes from `packages/warden` when they do not need a built CLI:

```sh
pnpm --filter @sentry/warden exec tsx -e '<targeted TypeScript probe>'
```

Run Warden through the repo wrapper when validating operator-facing CLI behavior:

```sh
pnpm cli -- <command> --json
pnpm cli -- <command> --log
```

For chunking changes, verify the prepared file shape directly:

```sh
pnpm --filter @sentry/warden exec tsx -e '<prepareFiles probe printing files, chunks, contentMode, changedLineMap>'
```

Use synthetic patches when they prove the behavior more clearly than a live PR.
Keep them tiny: one file, two or three hunks, and expected changed line ranges.

## What to Inspect

- The exact config that loaded.
- File count and chunk count.
- `ReviewChunk.contentMode`.
- `ReviewChunk.changedLineMap`.
- Any rendered prompt or JSON output that proves the changed path.
- Exit status and the key output, not the full transcript.

## Failure Handling

If the output is too broad to prove the change, narrow the fixture or command.
If a live scanner run is blocked by credentials, model gateway access, or
network restrictions, say so and show the deterministic local evidence that was
still checked.

Do not hide uncertainty behind a passing test command. Name what local QA did
not prove.

## Reporting

Report:

- pass or fail
- exact command run
- key observed output
- what behavior the output proves
- anything still unproven locally

Keep automated validation such as `pnpm lint`, `pnpm build`, `pnpm test`, and
typechecks in a separate validation note. Manual QA is the local behavior probe.
