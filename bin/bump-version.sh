#!/bin/bash
set -eux
OLD_VERSION="${1}"
NEW_VERSION="${2}"

export npm_config_git_tag_version=false
npm version "${NEW_VERSION}"

# Build for npm and GitHub Action (dist/action must be committed with release)
pnpm install --frozen-lockfile
pnpm build
pnpm build:action
git add -f dist/action/
