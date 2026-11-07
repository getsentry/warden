#!/bin/sh
# Usage: commit-action-dist.sh ARTIFACT_DIR REPO_DIR
# Replaces REPO_DIR/dist/action with the files in ARTIFACT_DIR and commits
# them. The artifact comes from a PR build, so it is untrusted: it may hold
# only regular files and directories. Runs no code from REPO_DIR, and git
# hooks are off. Writes committed=true to GITHUB_OUTPUT when it commits.
set -eu

src=$1
repo=$2
dist=dist/action

entries=""
if [ -d "$src" ]; then
  entries=$(ls -A "$src")
fi
if [ -z "$entries" ]; then
  echo "No bundle artifact. Nothing to commit."
  exit 0
fi

# Symlinks, devices and FIFOs could point outside the repo or hang a read.
bad=$(find "$src" ! -type f ! -type d)
if [ -n "$bad" ]; then
  echo "::error::Bundle artifact has entries that are not regular files:"
  printf '%s\n' "$bad"
  exit 1
fi

rm -rf "${repo:?}/$dist"
mkdir -p "$repo/$dist"
cp -R "$src/." "$repo/$dist/"

git -C "$repo" add -A -- "$dist"
if git -C "$repo" diff --cached --quiet; then
  echo "Bundle is already up to date."
  exit 0
fi

git -C "$repo" -c core.hooksPath=/dev/null \
  -c user.name="sentry-release-bot[bot]" \
  -c user.email="180476844+sentry-release-bot[bot]@users.noreply.github.com" \
  commit -q -m "build(action): Rebuild action bundle"
echo "committed=true" >> "$GITHUB_OUTPUT"
