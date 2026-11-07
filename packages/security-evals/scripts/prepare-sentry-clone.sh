#!/bin/sh
# Ensure $SENTRY_CLONE holds a blobless getsentry/sentry clone. A restored
# cache is used as is: the suite fetches any pinned SHA the clone lacks.
set -eu

: "${SENTRY_CLONE:?SENTRY_CLONE must name the clone directory}"

if [ -d "$SENTRY_CLONE/.git" ]; then
  printf 'Using cached clone at %s\n' "$SENTRY_CLONE"
  exit 0
fi

timeout 1800 git clone --quiet --filter=blob:none --no-checkout \
  https://github.com/getsentry/sentry.git "$SENTRY_CLONE"
