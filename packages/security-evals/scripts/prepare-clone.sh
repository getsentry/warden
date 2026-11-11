#!/bin/sh
# Usage: prepare-clone.sh <owner/name> <dir>
# Ensure <dir> holds a blobless clone of the GitHub repository. A restored
# cache is used as is: the suite fetches any pinned SHA the clone lacks.
set -eu

if [ "$#" -ne 2 ]; then
  printf 'usage: %s <owner/name> <dir>\n' "$0" >&2
  exit 2
fi
repository=$1
dir=$2

if [ -d "$dir/.git" ]; then
  printf 'Using cached %s clone at %s\n' "$repository" "$dir"
  exit 0
fi

timeout 1800 git clone --quiet --filter=blob:none --no-checkout \
  "https://github.com/$repository.git" "$dir"
