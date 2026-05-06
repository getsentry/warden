# GitHub Workflow Security Notes

Use this when reviewing GitHub Actions workflows, local actions, reusable workflows, or scripts/config loaded by workflows. These examples refine the core skill; they do not add new reporting scope.

## Entry Points

- Review `.github/workflows/*.yml`, `.github/workflows/*.yaml`, `.github/actions/**/action.yml`, `.github/actions/**/action.yaml`, `action.yml`, and `action.yaml`.
- Follow `uses: ./.github/actions/...`, reusable workflows, composite actions, scripts, Makefiles, package commands, artifacts, and caches.
- Start from the trigger: `pull_request`, `pull_request_target`, `workflow_run`, `workflow_dispatch`, `workflow_call`, `issue_comment`, labels, discussions, schedules, and pushes.
- Map who controls code/text: fork PRs, comments, titles, branch names, changed filenames, artifacts, caches, manual inputs, reusable inputs, and checked-out refs.

## High-Signal Patterns

| Pattern | Vulnerable | Safer |
|---------|------------|-------|
| Pwn request | `pull_request_target` checks out `github.event.pull_request.head.sha` and runs install/test/build/local actions | Use `pull_request` for untrusted code or keep `pull_request_target` metadata-only |
| Expression injection | `${{ github.event.* }}` or `${{ inputs.* }}` inside `run:`, `bash -c`, `node -e`, `python -c`, or `actions/github-script` | Put value in `env:`, read native variable, quote/validate before use |
| Manual/reusable input RCE | free-form `workflow_dispatch`/`workflow_call` input reaches release, deploy, publish, signing, PR creation, OIDC, PAT, or secret-bearing shell | Use finite input types, allowlists, argv APIs, and least privilege |
| Comment command abuse | `issue_comment` or label workflow executes commands without member/team approval, or checks out latest PR head after approval | Verify actor and pin the approved SHA |
| Artifact/cache trust | privileged `workflow_run`, release, or deploy job executes artifacts/caches from untrusted PR jobs | Treat artifacts as data; validate, sign, partition cache scopes |
| Artifact secret leak | `upload-artifact` uploads workspace/root after checkout with persisted credentials or secret files | Upload only build outputs; set `persist-credentials: false`; exclude `.git/` and credential files |
| Self-hosted runner | PR-reachable job runs untrusted code on persistent/internal/self-hosted runner | Keep untrusted PRs on GitHub-hosted runners or require a strong approval gate |
| Mutable action supply chain | third-party `uses: owner/action@tag` in job with secrets, OIDC, write token, deploy, release, or package power | Pin third-party actions to full commit SHA |

## False-Positive Controls

- `pull_request_target` with default checkout of base code and metadata-only steps is not a pwn request.
- Plain `pull_request` normally has restricted token and no base secrets for forks; trace downstream artifacts before reporting.
- `${{ }}` in `if:`, ordinary `with:`, or `env:` is not a sink unless later interpreted by shell/script/action code. `actions/github-script` `script:` is a code sink.
- Numeric IDs, full SHAs, booleans, base-repo constants, and hardcoded shell-safe `choice` inputs are usually not injectable.
- Broad `permissions:` alone is an amplifier. Report only with a path to untrusted execution, credential exposure, artifact trust, or privileged side effect.
- First-party `actions/*` and `github/*` refs on tags are not mutable-action findings by themselves.

## Minimal Examples

**Report: privileged PR checkout**

```yaml
on: pull_request_target
permissions: write-all
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
      - run: npm install
      - run: npm test
```

Risk: fork controls package scripts and test code. Require: unprivileged trigger or no PR-controlled checkout under trusted token/secrets.

**Report: expression injection**

```yaml
on: issue_comment
jobs:
  triage:
    steps:
      - run: echo "${{ github.event.comment.body }}" >> $GITHUB_OUTPUT
```

Risk: comment body is parsed by shell and GitHub output file format. Require: env variable plus safe quoting or structured parsing.

**Report: workspace artifact leak**

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/upload-artifact@v4
    with:
      path: .
```

Risk: `.git/config` can contain persisted credentials. Require: `persist-credentials: false` and narrow artifact paths.

**Do not report: metadata-only target workflow**

```yaml
on: pull_request_target
permissions:
  pull-requests: write
jobs:
  label:
    steps:
      - run: gh pr edit "$PR" --add-label needs-review
```

No PR-controlled code or text reaches execution. Broad token is not enough without the exploit path.
