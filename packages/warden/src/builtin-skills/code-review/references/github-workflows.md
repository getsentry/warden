# GitHub Workflow Bug Review Notes

Use this when reviewing GitHub Actions workflows, local actions, reusable workflows, or scripts/config loaded by workflows. These notes refine the core `code-review` skill; security workflow findings belong to `security-review`.

## Review Map

Start with the effective execution graph:

1. Identify the trigger: `pull_request`, `push`, `merge_group`, `workflow_dispatch`, `workflow_call`, `workflow_run`, `release`, `schedule`, or comment/label triggers.
2. Identify changed workflow files, local actions, reusable workflows, and repo-local scripts loaded by the workflow.
3. Follow job dependencies, matrix expansion, `if:` conditions, defaults, env, outputs, artifact paths, cache keys, and checked-out refs.
4. Compare intended behavior from names, docs, branch filters, required checks, release process, and adjacent workflows.
5. Report only deterministic broken CI, false success, skipped required work, wrong artifact, wrong release/deploy target, or broken local action behavior.

## Reportable Patterns

| Pattern | Report When | Safer Shape |
|---------|-------------|-------------|
| Skipped required checks | Branch, path, event, job `if:`, or matrix conditions exclude code paths that the workflow name or required-check setup says must run. | Align filters and required checks with the shipped paths. |
| False success | A script failure is hidden by `|| true`, missing `set -e` in multi-command shell, ignored exit codes, or background processes that can fail after the step succeeds. | Propagate exit codes and wait for background work. |
| Broken outputs | Step IDs, output names, `$GITHUB_OUTPUT` keys, job outputs, or reusable workflow outputs no longer match consumers. | Keep producer and consumer names aligned. |
| Wrong checkout or ref | Build, release, or deploy job checks out the wrong branch, tag, merge ref, or SHA for the event it claims to process. | Pin the intended event SHA or release ref explicitly. |
| Artifact mismatch | Upload path, download name, retention, working directory, or build output path changed so downstream jobs publish or test stale/missing artifacts. | Use explicit artifact names and verify generated paths. |
| Matrix drift | Matrix includes impossible combinations, drops a supported runtime, or references variables not defined in the expanded job. | Keep matrix dimensions and include/exclude entries consistent. |
| Cache staleness bug | Cache key omits lockfiles, runtime version, OS, architecture, or package manager version and can restore incompatible dependencies in normal CI. | Include dependency and runtime inputs in the key. |
| Reusable workflow contract break | Caller inputs, required secrets, output names, permissions expectations, or defaults no longer match the reusable workflow declaration. | Update callers and callee contracts together. |
| Local action breakage | `action.yml`, composite steps, shell scripts, or checked-in action code no longer match declared inputs, outputs, or runtime. | Keep action metadata and implementation synchronized. |

## False-Positive Controls

- Security issues such as privileged PR execution, expression injection, secrets exposure, broad permissions, mutable action refs, or OIDC trust belong to `security-review`, not this skill.
- Path filters are not bugs when another required workflow covers the skipped files.
- `continue-on-error` is not a bug when the result is intentionally checked later and failures still fail or mark the intended conclusion.
- Broad cache restore keys are not findings unless they can restore incompatible state for a normal workflow path.
- Matrix omissions are not findings unless docs, package metadata, or adjacent workflows show the runtime is still supported.
- A workflow step that only comments, labels, or uploads optional diagnostics is not a correctness bug unless its failure changes required behavior.

## Minimal Examples

**Report: output name drift**

```yaml
jobs:
  build:
    outputs:
      image: ${{ steps.meta.outputs.image }}
    steps:
      - id: metadata
        run: echo "image=ghcr.io/acme/app:${GITHUB_SHA}" >> "$GITHUB_OUTPUT"
  deploy:
    needs: build
    steps:
      - run: deploy "${{ needs.build.outputs.image }}"
```

The job output reads `steps.meta`, but the producer step is now `metadata`, so deploy receives an empty image.

**Report: false success**

```yaml
- run: |
    pnpm build &
    pnpm test
```

The step exits with the test command while the background build can fail after success is reported.

**Report: artifact path drift**

```yaml
- run: pnpm build
- uses: actions/upload-artifact@v4
  with:
    path: build/
```

If the package now writes `dist/`, downstream release jobs download a missing or stale artifact.

**Do not report: covered path filter**

```yaml
on:
  pull_request:
    paths:
      - "docs/**"
```

This is not a bug if a separate required workflow covers source changes.
