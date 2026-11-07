#!/bin/sh
# Usage: push-action-dist.sh REPO_DIR
# Pushes the bundle commit in REPO_DIR to HEAD_BRANCH. Expects PUSH_TOKEN
# (an app token, so the push starts CI again). A plain push accepts only a
# fast-forward, so it fails when the branch moved after the build.
set -eu

git -C "$1" -c core.hooksPath=/dev/null push \
  "https://x-access-token:${PUSH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" \
  "HEAD:refs/heads/${HEAD_BRANCH}"
