#!/bin/bash
set -eux
OLD_VERSION="${1}"
NEW_VERSION="${2}"

export npm_config_git_tag_version=false
npm --prefix packages/warden version "${NEW_VERSION}"

pnpm install --frozen-lockfile
pnpm build
