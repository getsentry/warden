#!/bin/sh
# Commits the staged dist/action rebuild back to the PR branch. Expects
# PUSH_TOKEN (an app token, so the push starts CI again) and HEAD_REF.
set -eu

git config user.name "sentry-release-bot[bot]"
git config user.email "180476844+sentry-release-bot[bot]@users.noreply.github.com"
git commit -q -m "build(action): Rebuild action bundle"
# Ignore hooks: the build ran PR code in this checkout.
git -c core.hooksPath=/dev/null push \
  "https://x-access-token:${PUSH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" \
  "HEAD:refs/heads/${HEAD_REF}"
