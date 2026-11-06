#!/bin/sh
# Commits the ncc bundle onto the release tag and moves the version tag to it.
# The major tag (vX) moves only for stable releases, so `@v0` users never get
# a prerelease. Expects GITHUB_REF_NAME to be the release tag (vX.Y.Z).
set -eu

tag="$GITHUB_REF_NAME"
version="${tag#v}"
major="v${version%%.*}"

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

# Stage only the bundle files needed by the action
git add -f dist/action/index.js dist/action/licenses.txt dist/action/package.json
# Add chunk and asset files if ncc produced any
git add -f dist/action/*.index.js dist/action/*.wasm 2>/dev/null || true

# Skip commit if bundle is already present (idempotent re-runs)
if ! git diff --cached --quiet; then
  git commit -m "Build dist/action for $tag"
fi

git tag -fa "$tag" -m "Release $tag"
git push -f origin "$tag"

case "$version" in
  *-*)
    echo "Prerelease $tag: leaving $major unchanged"
    ;;
  *)
    git tag -fa "$major" -m "Update $major to $tag"
    git push -f origin "$major"
    ;;
esac
