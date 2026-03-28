#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required." >&2
  exit 1
fi

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "GITHUB_TOKEN is not set." >&2
  exit 1
fi

echo "Syncing issue backlog -> GitHub Issues"
node scripts/sync-issues.mjs
