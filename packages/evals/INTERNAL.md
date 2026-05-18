# Eval Maintainer Notes

Warden evals are behavioral checks for the agent pipeline. They are not unit
tests, prompt snapshots, or repeated benchmark loops.

## Commands

```bash
pnpm evals
pnpm evals -t code-review
pnpm evals -t security-review
pnpm evals -t verification
pnpm evals:scaffold https://github.com/getsentry/sentry/pull/12345
```

CI runs evals for changes under `packages/evals/`, the eval workflow, package
metadata, or the lockfile. Add the `run-evals` label to a same-repository PR to
force a run when runtime or prompt changes need benchmark coverage. Fork PRs do
not get eval secrets.

The raw Vitest eval command can exit non-zero when individual evals miss. CI
still records the JSON and JUnit reports, publishes JUnit annotations and a job
summary for per-case test reporting, and gates the workflow on the aggregate
`Evaluation Results` baseline. The baseline is `0.75`.

Individual misses are useful harness debt. For a verified real bug, write the
expected `should_find` for the bug Warden should catch even if the current
pipeline fails, drops the candidate in verification, finds only an adjacent
duplicate, or uses the wrong severity. Do not tune assertions to the current
output just to get a passing eval. Remove or skip a bug fixture only when the
source finding is not actually a reachable bug under the target skill.

## Eval Layers

- `packages/evals/*.yaml`: small full-pipeline suites using test skills.
- `packages/evals/code-review/*.json`: one full-pipeline code-review scenario per file.
- `packages/evals/security-review/*.json`: one full-pipeline security-review scenario per file.
- `packages/evals/verification/*.json`: one candidate finding sent directly to `verifyFindings`.
- `packages/evals/fixtures/*`: checked-in fixture source code. Eval runs copy these files
  into temporary git repos under the OS temp directory, preserving paths under
  `packages/evals/fixtures/`.
- `packages/evals/src/e2e.eval.ts`: generic YAML full-pipeline suites.
- `packages/evals/src/code-review.eval.ts`: code-review correctness benchmark scenarios.
- `packages/evals/src/security-review.eval.ts`: security-review benchmark scenarios.
- `packages/evals/src/verify.eval.ts`: verifier-only scenarios.

Eval names should read as `<skill>/<case>`. Runtime and model belong to the
suite configuration, not the case identity. Avoid category names that hide the
real skill under test.

## Adding Full-Pipeline Evals

1. Add or scaffold a scenario JSON file under `packages/evals/<category>/`.
2. Add focused, checked-in fixture files under `packages/evals/fixtures/<scenario>/`.
   GitHub scaffolds use
   `packages/evals/fixtures/<scenario>/github/<owner>/<repo>/<repo-relative-path>` to
   preserve source context while eval output uses `<scenario>/<repo-relative-path>`.
   Scaffolded source repositories are still passed to prompts as repository context.
   They also record `notes.repository`, `notes.source_ref`, and
   `notes.source_files` so the original source state can be reproduced with
   `git clone`, `git checkout`, and `git show <ref>:<sourcePath>`.
   The scaffolder also copies the root LICENSE-like file into `supporting_files`
   so source provenance travels with the fixture without entering the eval diff.
3. Write a specific `should_find` assertion for the verified bug, not for the
   current Warden output, and add useful `should_not_find` guards.
4. Run the narrow case first with `pnpm evals -t <scenario>`.
5. Run the suite with `pnpm evals -t <category>`.

Use `pnpm evals:scaffold <github-pr-url>` for vulnerability-fix PRs. It copies
base-side PR files by default and creates a JSON stub with a TODO `should_find`.
That stub is expected to fail until the assertion is replaced. Review and
tighten it before committing.

## Adding Verification Evals

Use verifier-only evals when discovery found a real candidate but verification
dropped it, or when verification must reject a known false positive.

Each `packages/evals/verification/*.json` file contains:

- `files`: repo context for the verifier to inspect
- `candidate`: the exact finding object to verify
- `expect.verdict`: `keep` or `reject`

Run with:

```bash
pnpm evals -t verification
```

## Reading Pi Performance

Use full-pipeline evals to classify misses:

- no candidate in logs: discovery/runtime miss
- candidate rejected in logs: verifier miss
- finding present but judge fails: assertion or reporting mismatch

Do not optimize by testing prompt text. Change behavior, then rerun the same
eval slice.

Eval suites use `skipIf` when `ANTHROPIC_API_KEY` is missing. Full-pipeline
evals should always register the Warden judge, and verifier-only evals should
always register the verifier verdict judge.
