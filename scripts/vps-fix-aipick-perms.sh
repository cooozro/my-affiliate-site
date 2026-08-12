#!/bin/bash
# Keep /opt/aipick automation + content writable by selahim-app (uid 1001).
set -euo pipefail
ROOT="${1:-/opt/aipick}"
for sub in data/automation content/posts public/images/posts; do
  dir="$ROOT/$sub"
  if [ -d "$dir" ]; then
    chown -R 1001:1001 "$dir"
    chmod -R u+rwX,g+rX "$dir"
    echo "ok: $dir"
  fi
done
