#!/bin/sh
# Craft finds the previous release with `git describe --tags`. Published
# vX.Y.Z tags point to detached dist/action commits, so main only reaches the
# vX.Y.Z-src source tags. Craft reads those as prereleases (0.52.0-src), and
# `auto` or a bump type would then promote 0.52.0-src to 0.52.0. This script
# points each vX.Y.Z tag at its source commit in this checkout only, so Craft
# sees the real release history. Nothing is pushed.
set -eu

current=$(node -p "require('./packages/warden/package.json').version")
source_tag="v${current}-src"

if ! git rev-parse --verify --quiet "${source_tag}^{commit}" >/dev/null; then
  echo "::error::Missing source tag $source_tag. The previous release did not finalize its source tag."
  exit 1
fi

source_tags=$(git tag --list 'v*-src')
for tag in $source_tags; do
  sha=$(git rev-parse "${tag}^{commit}")
  git tag --force "${tag%-src}" "$sha" >/dev/null
  git tag --delete "$tag" >/dev/null
done

described=$(git describe --tags --abbrev=0 --match 'v*')
if [ "$described" != "v$current" ]; then
  echo "::error::Expected git describe to resolve to v$current, got $described"
  exit 1
fi

echo "Craft previous-release baseline: $described"
