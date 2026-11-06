#!/bin/sh
# Points the major tag (vX) at the release tag. Prereleases leave it alone so
# `@v0` users never get one. Expects GITHUB_REF_NAME to be the release tag.
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
git tag -fa "$major" -m "Update $major to $tag" HEAD
git push -f origin "refs/tags/$major"
