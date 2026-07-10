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
      STATE_BACKUP=""
      if [ -f data/automation/state.json ]; then
        STATE_BACKUP="$(mktemp)"
        cp data/automation/state.json "$STATE_BACKUP"
      fi
      git reset --soft origin/main
      git add content/posts public/images/posts data/automation/
      if [ -n "$STATE_BACKUP" ] && [ -f "$STATE_BACKUP" ]; then
        node -e "
          const fs = require('fs');
          const ours = JSON.parse(fs.readFileSync(process.env.STATE_BACKUP, 'utf8'));
          const path = 'data/automation/state.json';
          let theirs = {};
          try { theirs = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}
          const merged = { ...theirs, ...ours };
          merged.history = (ours.history?.length ?? 0) >= (theirs.history?.length ?? 0) ? ours.history : theirs.history;
          merged.topicHistory = (ours.topicHistory?.length ?? 0) >= (theirs.topicHistory?.length ?? 0) ? ours.topicHistory : theirs.topicHistory;
          merged.usedTopicIds = (ours.usedTopicIds?.length ?? 0) >= (theirs.usedTopicIds?.length ?? 0) ? ours.usedTopicIds : theirs.usedTopicIds;
          merged.formatHistory = (ours.formatHistory?.length ?? 0) >= (theirs.formatHistory?.length ?? 0) ? ours.formatHistory : theirs.formatHistory;
          fs.writeFileSync(path, JSON.stringify(merged, null, 2) + '\n');
        " STATE_BACKUP="$STATE_BACKUP"
      fi
      git add data/automation/state.json
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
