# GitHub Workflow Security Notes

Use this when reviewing GitHub Actions workflows, local actions, reusable workflows, or scripts/config loaded by workflows. This reference adapts the dedicated workflow-security prior art for the broad `security-review` skill; keep findings exploit-oriented, not style-oriented.

## Contents

- [Review Map](#review-map)
- [Reportable Patterns](#reportable-patterns)
- [False-Positive Controls](#false-positive-controls)
- [Verification Checklist](#verification-checklist)
- [Minimal Examples](#minimal-examples)

## Review Map

Start with the effective execution graph:

1. Identify the trigger: `pull_request`, `pull_request_target`, `workflow_run`, `workflow_dispatch`, `workflow_call`, `issue_comment`, `discussion`, `label`, `push`, `release`, or `schedule`.
2. Mark who controls each input: fork PR code, PR title/body, branch names, changed filenames, comments, labels, discussion text, manual inputs, reusable-workflow inputs, artifacts, caches, local actions, and checked-out refs.
3. Follow every boundary: `uses: ./.github/actions/...`, `uses: ./.github/workflows/...`, composite action steps, repo-local scripts, Makefiles, package commands, artifacts, caches, and downloaded tools.
4. Mark privileges at the point of execution: `secrets.*`, PATs, deploy keys, registry tokens, `id-token: write`, `GITHUB_TOKEN` write scopes, release/package/deploy authority, and self-hosted runners.
5. Report only when untrusted or caller-controlled code/data reaches privileged execution, credentials, trusted artifacts, releases/packages/deployments, or sensitive runners.

In-scope files include `.github/workflows/*.yml`, `.github/workflows/*.yaml`, `.github/actions/**/action.yml`, `.github/actions/**/action.yaml`, repository-root `action.yml`/`action.yaml`, and any scripts/config files loaded by those workflows.

## Reportable Patterns

| Pattern | Report When | Safer Shape |
|---------|-------------|-------------|
| Privileged PR checkout | `pull_request_target`, privileged `workflow_run`, or similar trusted context checks out, imports, builds, tests, or executes PR-controlled refs while trusted tokens/secrets are available | Use `pull_request` for untrusted code, or keep `pull_request_target` metadata-only |
| Expression injection | Attacker/caller-controlled `${{ }}` reaches `run:`, composite shell steps, `bash -c`, `node -e`, `python -c`, `actions/github-script`, `actions/script`, or workflow command files | Move values to `env:`, read native variables, quote/validate, and avoid interpreter strings |
| Manual or reusable input RCE | Free-form `workflow_dispatch` or `workflow_call` input reaches release, deploy, publish, signing, PR creation, OIDC, PAT, or secret-bearing commands | Use finite input types, allowlists, argv APIs, and least privilege |
| Comment/chatops abuse | `issue_comment`, discussion, label, or slash-command workflows execute privileged commands without a trusted actor gate, or use comment text as shell/script input | Verify owner/member/collaborator/team permission and parse arguments as data |
| Approval TOCTOU | Maintainer approval occurs, then the workflow re-resolves `pull_request.head.sha`, `head_ref`, or PR refs at run time before privileged checkout/execution | Pin the exact SHA approved by the maintainer, or require re-approval after every push |
| Reusable/local action trust crossing | Caller grants secrets/write scopes while a callee or local composite action executes caller-controlled inputs or PR-controlled files | Pass narrow secrets, define callee permissions, validate inputs, keep local actions on trusted code |
| Artifact/cache trust crossing | Privileged `workflow_run`, release, or deploy job executes or trusts artifacts/caches produced by untrusted PR jobs | Treat artifacts/caches as untrusted data; validate, sign, or partition trust scopes |
| Artifact credential leak | `upload-artifact` uploads the workspace/root, `.git/`, home credential files, Docker/npm config, or similar after credentials were written | Upload only build outputs; set `persist-credentials: false`; exclude credential paths |
| Self-hosted runner exposure | PR-reachable or comment-triggered jobs run untrusted code on persistent, internal, signing, deploy, or otherwise sensitive self-hosted runners | Keep untrusted code on GitHub-hosted runners or require a strong approval gate |
| Mutable action supply chain | Third-party `uses: owner/action@tag`, branch, partial SHA, or mutable reusable workflow runs in a job with secrets, OIDC, write token, release, deploy, package, or signing power | Pin third-party actions and reusable workflows to a 40-character commit SHA |
| AI agent config poisoning | Privileged workflows run coding/review agents on PR-controlled checkouts or instruction files such as `AGENTS.md`, `CLAUDE.md`, or Copilot instructions | Run agents in unprivileged PR context, protect instruction files, and avoid write/secrets in poisoned contexts |

### Expression Injection Sources

Treat these as untrusted when the trigger is externally reachable, manually triggerable, or callable:

- PR title/body, issue title/body, comment body, review body, discussion title/body, label names, branch names, commit messages, changed filenames, and changed-file lists.
- `inputs.*` and `github.event.inputs.*` from `workflow_dispatch`.
- `inputs.*` from `workflow_call`, including values passed through visible caller workflows.
- Action outputs or env vars derived from the values above.

Usually not injectable by themselves: PR numbers, numeric IDs, full commit SHAs, booleans, base-repository constants, and hardcoded shell-safe `choice` inputs. Re-check them if later code reinterprets the value as shell, JavaScript, Python, package-manager flags, or another code-like language.

Dangerous sinks include:

- `run: echo "${{ github.event.pull_request.title }}"`
- `actions/github-script` or `actions/script` `script:` bodies containing `${{ github.event.* }}` or `${{ inputs.* }}`
- `echo "key=${{ github.event.comment.body }}" >> $GITHUB_OUTPUT`, `$GITHUB_ENV`, `$GITHUB_STEP_SUMMARY`, or `$GITHUB_PATH`
- `npx semver -i ${{ inputs.bump }} "$CURRENT"`, `gh pr create --fill ${{ inputs.pr_options }}`, `docker build -t ${{ inputs.tag }}`, `git checkout ${{ inputs.ref }}`
- Composite action shell steps that interpolate `${{ inputs.* }}` from an externally reachable caller

### Privileged PR Context

High-signal indicators:

- `on: pull_request_target` plus `actions/checkout` with `ref: ${{ github.event.pull_request.head.sha }}`, `github.head_ref`, `github.event.pull_request.head.ref`, `repository: ${{ github.event.pull_request.head.repo.full_name }}`, `refs/pull/...`, or custom `git fetch` of PR refs.
- Build/test/package commands after PR checkout: `npm install`, `pnpm install`, `npm test`, `pip install`, `tox`, `pytest`, `make`, `cargo`, `go test`, `bundle`, `gradle`, `mvn`.
- Local actions, scripts, Makefiles, package lifecycle hooks, or config files loaded from the PR checkout.
- `persist-credentials` omitted or true before untrusted code runs.
- Write scopes, secrets, OIDC, package publishing, release creation, deployments, or agent write access available in the same job.

Do not report `pull_request_target` that only labels, comments, or reads metadata without checking out or loading PR-controlled files.

### Reusable Workflows, Artifacts, Caches, And Credentials

Trace cross-file flows before reporting:

- `workflow_call` callers that pass secrets/write permissions into a callee that executes caller-controlled inputs.
- Reusable workflows that reference `secrets.X` without declaring `X` under `on.workflow_call.secrets`, other than `GITHUB_TOKEN`; this hides the secret surface and pressures callers into `secrets: inherit`.
- Reusable workflows without top-level or job-level `permissions:` when the callee needs a narrower scope than callers commonly grant.
- `workflow_run` jobs that download artifacts from untrusted PR workflows and execute scripts, import code, publish packages, or make trusted comments without validation.
- Caches shared from untrusted PR jobs into privileged jobs, including eviction-and-replace poisoning of expected cache keys.
- `actions/upload-artifact` whose `path:` includes `.`, `./`, `${{ github.workspace }}`, `.git/`, `~/.docker/config.json`, `~/.npmrc`, `~/.gitconfig`, `~/.aws/credentials`, or other credential-bearing paths after checkout/login/setup steps.
- `id-token: write` where untrusted refs can satisfy visible cloud OIDC trust policies.

Permissions and secrets are amplifiers. Tie them to the untrusted execution or leak path.

### Mutable Action References

Report mutable third-party actions only when job privilege makes compromise security-relevant. CVE-2025-30066 (`tj-actions/changed-files`) and related 2025 supply-chain incidents showed that tag rewrites can leak secrets at scale.

Severity guide:

| Shape | Severity |
|-------|----------|
| Mutable third-party ref in package publishing, release signing, protected-branch push, production deploy, or token-minting job | high |
| Mutable third-party ref with secrets, OIDC, or non-trivial write-scoped `GITHUB_TOKEN` | medium |
| Pinned action that downloads and executes mutable remote scripts in a privileged job | medium, or high when the downloaded payload runs inside the privileged step |
| Mutable third-party ref in public read-only CI with no secrets and no write scopes | no finding unless adjacent to another traced workflow risk |

First-party `actions/*` and `github/*` actions on version tags are not findings by themselves. Same-repo or vendored actions are not third-party supply-chain findings, but can still be unsafe if they are loaded from PR-controlled checkouts.

## False-Positive Controls

- Broad `permissions:` alone is not a vulnerability. Report it only as part of untrusted execution, credential exposure, artifact trust, or privileged side effect.
- Plain `pull_request` normally has restricted token and no base secrets for forks. Trace downstream artifacts/caches before escalating.
- `${{ }}` in `if:`, ordinary `with:`, or `env:` is not a sink unless the receiving action or a later shell/script interprets it as code. `actions/github-script` `with: script:` is a code sink.
- `env:` is only safe when the later shell/script uses native variables with quoting or validation. `echo '${{ env.BODY }}'` is still expression expansion.
- Hardcoded `choice`, `boolean`, `number`, and `environment` workflow inputs are usually safe when used only in `if:`, ordinary `with:`, or safely quoted `env:` contexts.
- Comment/body parsing is not a bug unless it triggers meaningful execution or privileged state change.
- `CONTRIBUTOR` is not equivalent to `MEMBER`, `OWNER`, or `COLLABORATOR` for chatops authorization.
- `persist-credentials: false` reduces `.git/config` token theft, but does not protect unrelated secrets, PATs, OIDC, or registry credentials.
- Do not invent external action internals. If source is unavailable, report the unresolved trust assumption as medium confidence at most.

## Verification Checklist

Before reporting:

1. Confirm the trigger can be reached by the attacker or lower-privileged caller you name.
2. Identify the exact attacker-controlled or caller-controlled value.
3. Identify the sink: shell/script execution, local action, package lifecycle hook, artifact/cache trust, credential-bearing upload, mutable action, or sensitive runner.
4. Follow local actions, reusable workflows, scripts, package commands, and workflow-produced artifacts/caches.
5. Confirm secrets, token scopes, OIDC, deploy/release/package authority, or runner sensitivity at the sink.
6. Check actor gates, branch/fork guards, finite input types, SHA pinning, `persist-credentials: false`, artifact path narrowing, and cloud trust-policy constraints.
7. Anchor the finding to the changed workflow line, and name the crossed boundary plus concrete impact.

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
      - run: pnpm install
      - run: pnpm test
```

Risk: fork code controls package scripts while the job has trusted-repository permissions.

**Report: github-script injection**

```yaml
on: issues
jobs:
  comment:
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              body: `hello ${{ github.event.issue.title }}`
            })
```

Risk: the issue title is expanded into JavaScript before `actions/github-script` runs.

**Report: workspace artifact leak**

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/upload-artifact@v4
    with:
      path: .
```

Risk: `.git/config` can contain persisted checkout credentials, and public-repo artifacts can expose them.

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

No PR-controlled code or text reaches execution. Broad token scope alone is not enough.
