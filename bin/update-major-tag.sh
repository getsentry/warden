#!/bin/sh
# Points the major tag (vX) at the release. Prereleases leave it alone so
# `@v0` users never get one. Expects GITHUB_REF_NAME to be the release tag.
#
# vX goes on a child commit with the same tree, not on the release commit.
# Craft reads the previous version with `git describe --tags`, which prefers
# an annotated tag, or the first name, over `vX.Y.Z` on the same commit.
# The child commit is not reachable from main, so Craft never sees vX.
set -eu

tag="$GITHUB_REF_NAME"
version="${tag#v}"
major="v${version%%.*}"

case "$version" in
  *-*)
    echo "Prerelease $tag: leaving $major unchanged"
    exit 0
    ;;
esac

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
commit=$(git commit-tree "HEAD^{tree}" -p HEAD -m "$major: $tag")
git tag -fa "$major" -m "Update $major to $tag" "$commit"
git push -f origin "refs/tags/$major"
