#!/bin/sh
# Fails when the latest version tag that HEAD reaches is not the version in
# packages/warden/package.json. Craft bumps from that tag, so a mismatch
# gives a wrong version. Releases up to 0.52.0 left only `vX.Y.Z-src` tags
# on main, so the first Craft release needs an exact version.
set -eu

version=$(node -p "require('./packages/warden/package.json').version")
expected="v$version"

# Same tags Craft reads: full versions, prereleases included, `v0` excluded.
if ! latest=$(git describe --tags --abbrev=0 --match 'v[0-9]*.[0-9]*.[0-9]*' 2>/dev/null); then
  latest=""
fi

if [ "$latest" != "$expected" ]; then
  printf '::error::Latest version tag on this commit is "%s", but packages/warden/package.json is %s. Craft would bump from the wrong version. Run the release with an exact version input.\n' "${latest:-none}" "$version"
  exit 1
fi

printf 'Release baseline: %s\n' "$latest"
