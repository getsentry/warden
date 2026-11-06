#!/bin/sh
# Commits the rebuilt dist/action back to the PR branch. Expects PUSH_TOKEN
# (an app token, so the push starts CI again) and HEAD_REF.
set -eu

git config user.name "sentry-release-bot[bot]"
git config user.email "180476844+sentry-release-bot[bot]@users.noreply.github.com"
git add -A -- dist/action
# Ignore hooks so no repo hook runs while PUSH_TOKEN is set.
git -c core.hooksPath=/dev/null commit -q -m "build(action): Rebuild action bundle"
git -c core.hooksPath=/dev/null push \
  "https://x-access-token:${PUSH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" \
  "HEAD:refs/heads/${HEAD_REF}"
