# Release Process

How Warden gets from source to published artifacts.

---

## Artifacts

Warden ships two artifacts from the same repo:

| Artifact | Consumers | Built by | Published via |
|----------|-----------|----------|--------------|
| **npm package** (`@sentry/warden`) | CLI users, library consumers | `tsc` + `pnpm --filter @sentry/warden pack` in CI | Craft downloads CI tarball, publishes to npm |
| **GitHub Action** (`getsentry/warden@v0`) | GitHub Action users | `ncc` (`pnpm build:action`), committed to main | Craft tags the release commit |

## Build Commands

| Command | Output | Purpose |
|---------|--------|---------|
| `pnpm build` | `packages/warden/dist/` (tsc) | Library + CLI for npm |
| `pnpm build:action` | `dist/action/` (ncc) | Self-contained GitHub Action bundle |

The ncc bundle is built with `--no-source-map-register`. Only the bundle files (`dist/action/*.js`, `*.wasm`, `licenses.txt`, `package.json`) are committed. Declaration files and maps stay gitignored.

## What Lives Where

```
main branch          Source + action.yml + dist/action/ (ncc bundle).
vX.Y.Z tag           The release commit on main. Same layout as main.
v0 tag               The latest stable v0.x.y release commit. Craft moves it.
npm tarball          packages/warden/dist/ (tsc output) plus runtime skill assets. No dist/action/.
```

## Action Bundle Policy

`dist/action/` is committed so every commit, including every release tag, can run as an Action. `.gitattributes` marks it `linguist-generated`, so GitHub collapses it in diffs. CodeQL skips `dist/` (`.github/codeql/codeql-config.yml`) and scans the source instead.

On PRs from a branch in this repo, two workflows rebuild the bundle and commit it back to the PR branch:

- `action-dist.yml` runs on `pull_request`. Its `build` job runs PR code with a read-only token and no secrets. When the committed bundle is stale, it uploads the new bundle as the `action-dist` artifact.
- `commit-action-dist.yml` runs on `workflow_run` when `action-dist.yml` completes. GitHub always runs it from the default branch, so a PR cannot change it to read the release bot key. It takes the PR branch and commit from the `workflow_run` payload, not from the artifact. It skips runs that are not `pull_request`, runs from forks or Dependabot, and the `main` and `release/*` branches. It downloads the artifact from that run, checks out the PR commit with no credentials, and runs `bin/commit-action-dist.sh` from the default branch. The script treats the artifact as untrusted: it fails on anything that is not a regular file or directory, copies the files into `dist/action/`, and commits with git hooks off. No PR code runs. The job creates the release bot app token last, and `bin/push-action-dist.sh` pushes. CI runs again on the new commit because the push uses an app token. If the branch moved after the build, the push is not a fast-forward and fails.

`workflow_run` uses the workflow file on the default branch, so a change to `commit-action-dist.yml` takes effect only after it merges.

GitHub cannot push to fork PR branches. There, the contributor runs `pnpm build:action` and commits `dist/action/`.

On every PR and every push to main and `release/*`, CI rebuilds the bundle and `bin/check-action-dist.sh` fails when the committed files differ. A PR cannot merge with a stale bundle, and Craft does not publish a release branch whose CI fails. The rest of `dist/` stays gitignored.

## Release Flow

### 1. Trigger

A maintainer runs the **Release** workflow (`release.yml`) via `workflow_dispatch`, choosing a bump type (`auto`, `pre`, `patch`, `minor`, `major`; default `auto`) or an exact `version` override. `auto` picks the bump from the commits since the last stable release. `pre` cuts a prerelease of the version `auto` would release.

Craft finds the previous release with `git describe --tags`, so release tags must be reachable from main. They are, because Craft tags the release commit and merges the release branch back into main.

Without a `version` input, `bin/check-release-baseline.sh` runs first. Craft bumps from the latest version tag that main reaches, prereleases included. The script fails when that tag is not `v` plus the version in `packages/warden/package.json`. A wrong base tag gives a wrong version, so the script stops the release and asks for an exact `version`.

### 2. Prepare the release branch

The workflow runs `getsentry/craft@v3` which:

1. Resolves the version from the `version` input or the bump type
2. Runs `preReleaseCommand` from `.craft.yml` (`bash bin/bump-version.sh`)
3. `bump-version.sh` bumps the package versions, installs deps, and runs `pnpm build` as a compilation check
4. Commits the version bump and changelog on a `release/X.Y.Z` branch
5. Opens a publish request in `getsentry/publish`

### 3. CI builds the npm tarball

CI (`ci.yml`) runs on the release branch push:

1. Builds tsc output (`pnpm build`)
2. Builds the ncc bundle (`pnpm build:action`) and checks that it matches the committed `dist/action/`
3. Creates a tarball (`pnpm --filter @sentry/warden pack`) which respects `packages/warden/.npmignore`
4. Uploads the tarball as a GitHub Actions artifact

The package `.npmignore` excludes `action.yml`, non-runtime source files, tests, and dev config. The tarball contains the tsc-compiled library and CLI plus runtime skill assets.

### 4. Craft publishes

After a maintainer approves the publish request, Craft:

1. Creates the GitHub Release and tag `vX.Y.Z` on the release commit. For a stable release, it also moves the floating tag `vX` (`floatingTags: ['v{major}']`) to that commit
2. Downloads the npm tarball from CI artifacts and publishes it to npm
3. Merges the release branch into main, so `vX.Y.Z` is reachable from main

Craft's npm target publishes pre-built tarballs. It does not run builds at publish time.

### Floating major tag

Craft (3.11.1 or later, so `minVersion` is `3.11.1`) moves `vX` only on stable releases. A prerelease (`vX.Y.Z-alpha.N`) leaves `vX` unchanged, so `@v0` users never get a prerelease. `vX` is on the release commit, which has the committed `dist/action/`, so `@v0` runs the same bundle as `@vX.Y.Z`.

When Craft looks up the previous release, it skips tags that have no full `major.minor.patch` after the prefix. So `v0` on the same commit as `v0.53.0` does not hide `v0.53.0`.

## Sequencing

```
workflow_dispatch
  |
  v
release.yml: Craft resolves the version, pushes release/X.Y.Z
  |
  v
CI: build, test, check dist/action, pack tarball, upload artifact
  |
  v
Maintainer approves the publish request
  |
  v
Craft: tag vX.Y.Z, move vX (stable releases only), GitHub Release, publish npm, merge into main
```

## Transition from detached tags

Releases up to 0.52.0 used a different layout. `dist/` was gitignored, a workflow committed the bundle on top of each release tag, and it force-moved `vX.Y.Z` and `v0` to that detached commit. A `vX.Y.Z-src` tag marked the source commit. Those tags stay as they are.

main reaches only the old `vX.Y.Z-src` tags and `v0.46.0`. Craft reads the current version from the latest tag, prereleases included, so it reads `0.52.0-src`. From there, `auto`, `patch` and `minor` give `0.52.0`, `pre` gives `0.52.0-src.0`, and `major` gives `1.0.0`. `bin/check-release-baseline.sh` stops all of these, because `v0.52.0-src` is not `v0.52.0`. **Run the first release with an exact `version` (for example `0.53.0`).** Its changelog starts at `v0.46.0`, the latest stable tag main reaches, so remove the 0.47.0 to 0.52.0 entries from the release branch before you approve the publish request.

After that release, run `git ls-remote origin refs/tags/v0` and make sure that `v0` points to the `v0.53.0` commit. Craft logs only a warning when it cannot move a floating tag. From the next release on, `auto` works.

## Failure modes

**Stale bundle**: On same-repo PRs, `commit-action-dist.yml` commits the rebuild. On fork PRs, CI fails until the contributor commits it. Two PRs that each pass can still leave main stale when both merge. The check on main shows it, and the release branch check blocks publish until a PR fixes it.

**npm publish is independent**: The npm tarball is built by CI. Craft publishes it from that artifact.

## .npmignore

Controls what goes into the npm tarball. Key exclusions:

- `dist/action/` and `action.yml` (GitHub Action only)
- `src/` (source files, consumers use compiled `dist/`)
- `**/*.test.*` (test files)
- `.github/`, `.craft.yml`, `bin/` (CI/release tooling)
- `packages/`, `specs/`, `CLAUDE.md`, `AGENTS.md` (workspace packages, documentation)

## Files Involved

| File | Role |
|------|------|
| `.craft.yml` | Craft config: `minVersion`, `preReleaseCommand`, targets (github with `floatingTags`, npm) |
| `bin/bump-version.sh` | Version bump + build validation for the release branch |
| `bin/check-release-baseline.sh` | Fails a release without `version` when the latest version tag is not the package version |
| `bin/check-action-dist.sh` | Fails when the committed `dist/action/` is stale |
| `bin/commit-action-dist.sh` | Copies the bundle artifact into a PR checkout and commits it |
| `bin/push-action-dist.sh` | Pushes the bundle commit to the PR branch, fast-forward only |
| `.github/workflows/action-dist.yml` | Rebuilds `dist/action/` on same-repo PRs and uploads it when stale |
| `.github/workflows/commit-action-dist.yml` | On `workflow_run`, commits the uploaded bundle back to the PR branch |
| `.github/workflows/release.yml` | Runs Craft to prepare the release |
| `.github/workflows/ci.yml` | Builds tarball for npm, checks the action bundle |
| `action.yml` | GitHub Action definition, references `dist/action/index.js` |
| `.gitignore` | Ignores `dist/` except the committed action bundle files |
| `.gitattributes` | Marks `dist/action/` as generated |
| `packages/warden/.npmignore` | Excludes non-library files from npm tarball |
| `package.json` | Workspace scripts that delegate to `packages/warden` |
| `packages/warden/package.json` | Package metadata and build scripts (`build`, `build:action`) |
