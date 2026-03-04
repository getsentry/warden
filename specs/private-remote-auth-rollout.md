# Private Remote Auth Rollout Notes

## What Changed
- Hosted GitHub Action runs now pass `github-token` into remote skill resolution.
- Remote fetches can authenticate private `github.com` remotes using per-command git auth env injection.
- For authenticated GitHub fetches, runtime transport uses HTTPS even if config used SSH remote syntax.

## Known Limitations
- Authenticated private-remote fetch support is scoped to `github.com`.
- GitHub token must have repository read access and, for GitHub Apps, installation access to the remote skill repo.
- CLI token fallback (`WARDEN_GITHUB_TOKEN`) is not part of this MVP.

## Operator Runbook
1. Confirm token source:
- Action: `github-token` input (defaults to `GITHUB_TOKEN`)
- Ensure token is non-empty and has read access to the remote repo.

2. Confirm repository access model:
- For GitHub App tokens: app must be installed on both code repo and remote skill repo.
- For PATs: token owner must have read access to remote skill repo.

3. Confirm remote host:
- MVP auth path supports `github.com` remotes.
- Non-`github.com` remotes follow existing unauthenticated behavior.

4. Failure interpretation:
- `Failed to authenticate when cloning owner/repo` indicates token access/scope/installation issue.
- `Failed to clone ... via HTTPS` in unauthenticated flow indicates missing credentials.

## Verification Summary
Executed:
- `corepack pnpm lint` ✅
- `corepack pnpm build` ✅
- Targeted auth and action tests ✅
  - `corepack pnpm test src/skills/remote-auth.test.ts src/skills/remote.test.ts src/action/triggers/executor.test.ts src/action/workflow/schedule.test.ts`
- Secret-safety sweep ✅
  - `rg -n "ghp_|github_pat_|Authorization:\s*Bearer|x-access-token" src packages/docs agent-docs -S`

Full suite status:
- `corepack pnpm test` currently fails due pre-existing unrelated tests:
  - `src/action/inputs.test.ts` (`setupAuthEnv` OAuth env expectation)
  - `src/cli/output/tty.test.ts` (`FORCE_COLOR` expectation)
  - `src/action/fix-evaluation/judge.test.ts` (live judge fallback assertions)
