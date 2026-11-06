#!/bin/sh
# Fails when the committed GitHub Action bundle differs from a fresh
# `pnpm build:action`. Run after the build.
set -eu

dist=dist/action
changes=$(git status --porcelain --untracked-files=all -- "$dist")
if [ -n "$changes" ]; then
  echo "::error::$dist is out of date. Run 'pnpm build:action' and commit $dist."
  printf '%s\n' "$changes"
  exit 1
fi
