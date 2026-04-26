# Private Remote Git Auth

## Problem

Remote skills can be sourced from GitHub repositories via `skills[].remote`.

That works for public repositories and for private repositories when the runtime can use SSH credentials. It does not work reliably in hosted GitHub Actions runs, where:

- the checkout token is available as `GITHUB_TOKEN`
- SSH keys are usually not configured
- remote skill repositories may be private

The result is that private remote skills are difficult to use in hosted runs even when GitHub already issued a token with the right repository access.

## Goals

- Allow hosted GitHub Action runs to fetch private remote skills from `github.com` using the existing `github-token` input.
- Preserve current behavior for public remotes and for non-GitHub remotes.
- Avoid embedding credentials in clone URLs, persisted cache state, or user-visible error messages.
- Keep remote resolution behavior consistent across PR and schedule workflows.

## Non-Goals

- Add a general-purpose credential system for arbitrary git hosts.
- Persist credentials in git config, state files, or cache directories.
- Change CLI auth flows beyond using the options already threaded into remote resolution.
- Add token discovery from new environment variables as part of this change.

## User-Facing Behavior

### Configuration

No config format changes are required.

Remote skills continue to use:

- `owner/repo`
- `owner/repo@sha`
- `https://github.com/owner/repo.git`
- `git@github.com:owner/repo.git`

### Hosted GitHub Actions

When Warden resolves a remote skill or agent in GitHub Actions:

- the action passes `github-token` into remote resolution
- if the remote resolves to `github.com` and the token is non-empty, fetches use one-shot git auth env injection
- authenticated runtime transport uses `https://github.com/owner/repo.git`
- configured remote syntax is still preserved in cache metadata for future non-authenticated refreshes

### Non-GitHub Remotes

If a cached or configured remote is not a `github.com` remote:

- no GitHub auth env is injected
- existing clone/fetch behavior is preserved
- failures from that host should surface as the underlying git failure, not as GitHub-token guidance

## Auth Model

### Token Source

This change relies on the existing action input:

- `github-token`, which already defaults to `GITHUB_TOKEN`

Whitespace-only values are treated as unset.

### Git Transport

For authenticated `github.com` fetches:

- Warden does not rewrite the configured remote reference
- Warden builds a per-command git environment using `http.https://github.com/.extraheader`
- the Authorization header is sent only for that git subprocess
- the token is never placed in the clone URL

### Persistence Rules

Warden may persist the original remote URL form in cache state for refresh behavior.

Warden must not persist:

- the token
- an authenticated URL
- an auth header

## Resolution Rules

### Remote Detection

GitHub auth is used only when both conditions hold:

1. A non-empty `githubToken` is present.
2. The effective remote is a `github.com` remote.

The effective remote is determined from:

- the explicit remote URL from the current ref, if present
- otherwise the stored `cloneUrl` in cache state, if present
- otherwise shorthand `owner/repo`, which is treated as GitHub

### Refresh Semantics

For unpinned remotes:

- cached explicit remote URLs remain authoritative for refresh behavior
- cached SSH remotes continue to refresh via SSH unless GitHub auth is actively being used for that fetch
- authenticated GitHub fetches reset to `FETCH_HEAD`

For pinned remotes:

- the cached SHA remains authoritative
- the repository is only fetched when not cached or when force-refresh behavior requires it

## Error Semantics

### Authenticated GitHub Fetches

When the authenticated GitHub path is in use and git returns an auth-shaped failure, Warden should raise a high-signal loader error:

- `Failed to authenticate when cloning owner/repo. Ensure the provided GitHub token has read access ...`

The original error must be preserved as `cause`.

### Unauthenticated Shorthand HTTPS Fetches

When a shorthand GitHub remote falls back to HTTPS without a token and git cannot prompt for credentials, Warden should raise guidance that points to:

- providing a GitHub token
- or using the SSH remote form

### Non-GitHub Failures

If GitHub auth was not used, Warden should not rewrite failures as GitHub token problems merely because a token happened to be present.

## Integration Points

The token must be threaded through:

- action input parsing
- PR workflow trigger execution
- schedule workflow skill execution
- loader remote resolution for both skills and agents

This change does not require schema changes in `warden.toml`.

## Tests

Required coverage:

- token is threaded from action workflows into remote resolution
- whitespace-only tokens are ignored
- GitHub SSH remotes use runtime HTTPS plus auth env when a token is present
- non-GitHub remotes do not receive GitHub auth env
- non-GitHub failures are not rewritten into GitHub-specific auth errors
- auth-related errors preserve the original cause
- tokens do not appear in thrown messages
- concurrent fetches keep auth env isolated per command

## Operational Notes

- GitHub token must have repository read access to the remote skill repository.
- For GitHub App tokens, the app must be installed on both the code repository and the remote skill repository.
- This spec intentionally limits authenticated remote support to `github.com`.
