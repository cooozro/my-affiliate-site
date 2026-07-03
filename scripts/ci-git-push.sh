#!/usr/bin/env bash
# Shared GHA commit+push with rebase retry (avoids non-fast-forward after parallel workflows).
set -euo pipefail

COMMIT_MSG="${1:?commit message required}"
MAX_ATTEMPTS="${2:-3}"

git config user.name "blog-automation[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

git add content/posts public/images/posts data/automation/

if git diff --staged --quiet; then
  echo "No content changes to commit"
  exit 0
fi

git commit -m "$COMMIT_MSG"

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  echo "git push attempt ${attempt}/${MAX_ATTEMPTS}"
  if git pull --rebase origin main && git push origin HEAD:main; then
    echo "git push OK"
    exit 0
  fi
  echo "git push failed (attempt ${attempt}), retrying in 8s..."
  sleep 8
  attempt=$((attempt + 1))
done

echo "git push failed after ${MAX_ATTEMPTS} attempts"
git status
exit 1
