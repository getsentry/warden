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
v0 tag               Child commit of the latest stable v0.x.y tag, same tree. Not on main.
npm tarball          packages/warden/dist/ (tsc output) plus runtime skill assets. No dist/action/.
```

## Action Bundle Policy

`dist/action/` is committed so every commit, including every release tag, can run as an Action. `.gitattributes` marks it `linguist-generated`, so GitHub collapses it in diffs.

On PRs from a branch in this repo, `action-dist.yml` rebuilds the bundle and `bin/commit-action-dist.sh` commits it back to the PR branch. The push uses a release bot app token, so CI runs again on the new commit. The token is created after the build, so PR code does not run with it.

GitHub cannot push to fork PR branches. There, the contributor runs `pnpm build:action` and commits `dist/action/`.

On every PR and every push to main and `release/*`, CI rebuilds the bundle and `bin/check-action-dist.sh` fails when the committed files differ. A PR cannot merge with a stale bundle, and Craft does not publish a release branch whose CI fails. The rest of `dist/` stays gitignored.

## Release Flow

### 1. Trigger

A maintainer runs the **Release** workflow (`release.yml`) via `workflow_dispatch`, choosing a bump type (`auto`, `pre`, `patch`, `minor`, `major`; default `auto`) or an exact `version` override. `auto` picks the bump from the commits since the last stable release. `pre` cuts a prerelease of the version `auto` would release.

Craft finds the previous release with `git describe --tags`, so release tags must be reachable from main. They are, because Craft tags the release commit and merges the release branch back into main.

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

1. Creates the GitHub Release and tag `vX.Y.Z` on the release commit (triggers step 5)
2. Downloads the npm tarball from CI artifacts and publishes it to npm
3. Merges the release branch into main, so `vX.Y.Z` is reachable from main

Craft's npm target publishes pre-built tarballs. It does not run builds at publish time.

### 5. Major tag update (update-major-tag.yml)

Triggered by `release: published`. `bin/update-major-tag.sh` makes a child commit of the release commit with the same tree, and force-updates the major tag (`vX`) to it. Prereleases (`vX.Y.Z-alpha.N`) leave `vX` unchanged, so `@v0` users never get a prerelease.

`vX` is not put on the release commit itself. When two tags are on the same commit, `git describe --tags` returns the annotated one (or the first by name), so Craft would read `v0` as the previous release and lose the real version. main never reaches the child commit, so Craft sees only `vX.Y.Z`.

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
Craft: tag vX.Y.Z, GitHub Release, publish npm, merge into main
  |
  v
update-major-tag.yml: move vX to a same-tree child commit (stable releases only)
```

## Transition from detached tags

Releases up to 0.52.0 used a different layout. `dist/` was gitignored, a workflow committed the bundle on top of each release tag, and it force-moved `vX.Y.Z` and `v0` to that detached commit. A `vX.Y.Z-src` tag marked the source commit. Those tags stay as they are.

main reaches only the old `vX.Y.Z-src` tags and `v0.46.0`. Craft reads `0.52.0-src` as a prerelease, so `auto` and bump types would resolve to `0.52.0` again. **Run the first release with an exact `version` (for example `0.53.0`).** Its changelog starts at `v0.46.0`, the latest stable tag main reaches, so remove the 0.47.0 to 0.52.0 entries from the release branch before you approve the publish request. After that release, `auto` works.

## Failure modes

**Stale bundle**: On same-repo PRs, `action-dist.yml` commits the rebuild. On fork PRs, CI fails until the contributor commits it. Two PRs that each pass can still leave main stale when both merge. The check on main shows it, and the release branch check blocks publish until a PR fixes it.

**Major tag workflow failure**: `vX` keeps pointing at the previous stable release. Re-run the workflow from the Actions tab.

**npm publish is independent**: The npm tarball is built by CI. A major tag failure does not affect npm.

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
| `.craft.yml` | Craft config: `minVersion`, `preReleaseCommand`, targets (github, npm) |
| `bin/bump-version.sh` | Version bump + build validation for the release branch |
| `bin/check-action-dist.sh` | Fails when the committed `dist/action/` is stale |
| `bin/commit-action-dist.sh` | Commits a rebuilt `dist/action/` back to a same-repo PR branch |
| `.github/workflows/action-dist.yml` | Rebuilds `dist/action/` on same-repo PRs and runs `bin/commit-action-dist.sh` |
| `bin/update-major-tag.sh` | Moves `vX` to a same-tree child of the release, skipping prereleases |
| `.github/workflows/release.yml` | Runs Craft to prepare the release |
| `.github/workflows/ci.yml` | Builds tarball for npm, checks the action bundle |
| `.github/workflows/update-major-tag.yml` | Runs `bin/update-major-tag.sh` on published releases |
| `action.yml` | GitHub Action definition, references `dist/action/index.js` |
| `.gitignore` | Ignores `dist/` except the committed action bundle files |
| `.gitattributes` | Marks `dist/action/` as generated |
| `packages/warden/.npmignore` | Excludes non-library files from npm tarball |
| `package.json` | Workspace scripts that delegate to `packages/warden` |
| `packages/warden/package.json` | Package metadata and build scripts (`build`, `build:action`) |
