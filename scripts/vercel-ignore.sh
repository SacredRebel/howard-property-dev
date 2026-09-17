#!/usr/bin/env bash
# Vercel "ignored build step": exit 0 = skip the build, exit 1 = build.
# Commits that only touch the git-backed data (research list, uploads, icon layout) are read by the
# live site at request time (lib/store.js), so they need no redeploy.
set -u
if ! git rev-parse --verify HEAD^ >/dev/null 2>&1; then exit 1; fi
if git diff --quiet HEAD^ HEAD -- . ':(exclude)data/research.json' ':(exclude)data/uploads.json' ':(exclude)data/zone-positions.json' ':(exclude)data/watch.json' ':(exclude)images/uploads' ':(exclude)docs/uploads'; then
  echo "only git-backed data changed — no build needed"; exit 0
fi
exit 1
