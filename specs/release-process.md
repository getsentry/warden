# Release Process

How Warden gets from source to published artifacts.

---

## Artifacts

Warden ships two independent artifacts from the same repo:

| Artifact | Consumers | Built by | Published via |
|----------|-----------|----------|--------------|
| **npm package** (`@sentry/warden`) | CLI users, library consumers | `tsc` + `pnpm pack` in CI | Craft downloads CI tarball, publishes to npm |
| **GitHub Action** (`getsentry/warden@v0`) | GitHub Action users | `ncc` in `update-major-tag` workflow | Force-pushed to release tags |

Neither artifact is committed to main. All of `dist/` is gitignored.

## Build Commands

| Command | Output | Purpose |
|---------|--------|---------|
| `pnpm build` | `dist/` (tsc) | Library + CLI for npm |
| `pnpm build:action` | `dist/action/` (ncc) | Self-contained GitHub Action bundle |

The ncc bundle is built with `--no-source-map-register`. No sourcemaps, declaration files, or type maps should ever appear in git history.

## What Lives Where

```
main branch          Source + action.yml. No dist/.
v0.7.0 tag           Source + action.yml + dist/action/ (ncc bundle only).
v0 tag               Same commit as latest v0.x.y tag.
npm tarball          dist/ (tsc output). No dist/action/, no source.
```

## Gitignore Policy

All of `dist/` is gitignored. No exceptions, no whitelist. Build artifacts never land on main.

## Release Flow

### 1. Trigger

A maintainer runs the **Release** workflow (`release.yml`) via `workflow_dispatch`, choosing a semver bump type (patch, minor, major).

### 2. Source tag

Before preparing the release, the workflow creates a source tag (`vX.Y.Z-src`) on the previous version's bump commit on main. This is required because `git describe --tags` cannot find version tags that point to detached commits off main (see step 6).

### 3. Prepare release PR

The workflow runs `getsentry/action-prepare-release@v1` which:

1. Runs `preReleaseCommand` from `.craft.yml` (`bash bin/bump-version.sh`)
2. `bump-version.sh` bumps `package.json`, installs deps, and runs `pnpm build` as a compilation check
3. Since `dist/` is gitignored, only `package.json` is committed
4. A PR is opened on a `releases/X.Y.Z` branch

### 4. CI builds the npm tarball

CI (`ci.yml`) runs on the release branch push and again on merge to main:

1. Builds tsc output (`pnpm build`)
2. Builds ncc bundle (`pnpm build:action`) as a validation step
3. Creates a tarball (`pnpm pack`) which respects `.npmignore`
4. Uploads the tarball as a GitHub Actions artifact

The `.npmignore` excludes `dist/action/`, `action.yml`, source files, tests, and dev config. The tarball contains only the tsc-compiled library and CLI.

### 5. Merge

A maintainer reviews and merges the release PR into main. Main gets the version bump in `package.json` and nothing else.

### 6. Craft publishes

After merge, Craft:

1. Creates git tag `vX.Y.Z` on the merge commit
2. Creates a GitHub Release (triggers step 7)
3. Downloads the npm tarball from CI artifacts
4. Publishes the tarball to npm (no build happens here)

Craft's npm target publishes pre-built tarballs. It does not check out code or run builds at publish time.

### 7. Tag update (update-major-tag.yml)

Triggered by `release: published`. This is where the GitHub Action bundle gets built:

1. Checks out the `vX.Y.Z` tag
2. Installs dependencies and runs `pnpm build:action`
3. Commits only the ncc bundle files (`index.js`, chunk files, `licenses.txt`, `package.json`) via `git add -f`
4. Force-updates `vX.Y.Z` to point to this new commit
5. Force-updates the major tag (`vX`) to the same commit

After this step, `vX.Y.Z` and `vX` point to a detached commit that is NOT on main. This commit has everything from main plus `dist/action/`.

## Sequencing

```
workflow_dispatch
  |
  v
release.yml: create -src tag, prepare PR (bump version)
  |
  v
CI: build, test, pack tarball, upload artifact
  |
  v
Maintainer merges releases/X.Y.Z -> main
  |
  v
CI: build + pack on main (tarball for Craft)
  |
  v
Craft: tag vX.Y.Z, GitHub Release, download tarball, publish npm
  |
  v
update-major-tag.yml: build ncc, commit to tag, force-update vX.Y.Z + vX
```

## Timing and failure modes

**Tag update window**: There is a 1-3 minute window between Craft creating the GitHub Release and the tag workflow finishing. During this window, the version and major tags point to a commit without `dist/action/`. Any GitHub Action runs that resolve the tag during this window will fail. Existing users with cached action versions are unaffected.

**Tag workflow failure**: If `update-major-tag.yml` fails (build error, permission issue), the release tags will point to commits without the ncc bundle, breaking the GitHub Action for this version. Recovery: fix the issue and re-run the workflow from the Actions tab.

**npm publish is independent**: The npm tarball is built by CI and published by Craft before the tag workflow runs. A tag workflow failure does not affect npm.

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
| `.craft.yml` | Craft config: `preReleaseCommand`, targets (github, npm) |
| `bin/bump-version.sh` | Version bump + build validation for release PR |
| `.github/workflows/release.yml` | Triggers release PR creation, creates `-src` tags |
| `.github/workflows/ci.yml` | Builds tarball for npm, validates ncc build |
| `.github/workflows/update-major-tag.yml` | Builds ncc bundle, commits to release tags |
| `action.yml` | GitHub Action definition, references `dist/action/index.js` |
| `.gitignore` | Ignores all of `dist/` |
| `.npmignore` | Excludes `dist/action/` and non-library files from npm tarball |
| `package.json` | Build scripts (`build`, `build:action`) |
