#!/usr/bin/env bash
# Shared GHA commit+push with rebase retry (avoids non-fast-forward after parallel workflows).
set -euo pipefail

COMMIT_MSG="${1:?commit message required}"
MAX_ATTEMPTS="${2:-6}"

git config user.name "blog-automation[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

git add content/posts public/images/posts data/automation/

if git diff --staged --quiet; then
  echo "No content changes to commit"
  exit 0
fi

git commit -m "$COMMIT_MSG"

# Fast path when workflows are serialized (no concurrent writers).
if git push origin HEAD:main; then
  echo "git push OK (fast path)"
  exit 0
fi

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  echo "git push attempt ${attempt}/${MAX_ATTEMPTS} (sync + rebase)"
  git fetch origin main
  if git rebase origin/main; then
    :
  else
    echo "rebase conflict — merging origin/main instead"
    git rebase --abort || true
    if ! git merge origin/main --no-edit; then
      echo "merge conflict — soft reset onto origin/main and recommit"
      git merge --abort || true
      git reset --soft origin/main
      git add content/posts public/images/posts data/automation/
      git commit -m "$COMMIT_MSG"
    fi
  fi
  if git push origin HEAD:main; then
    echo "git push OK"
    exit 0
  fi
  echo "git push failed (attempt ${attempt}), retrying in 15s..."
  sleep 15
  attempt=$((attempt + 1))
done

echo "git push failed after ${MAX_ATTEMPTS} attempts"
git status
exit 1
