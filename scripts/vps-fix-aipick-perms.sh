#!/bin/bash
# Keep /opt/aipick automation state writable by selahim-app (uid 1001).
set -euo pipefail
DIR="${1:-/opt/aipick/data/automation}"
if [ ! -d "$DIR" ]; then
  echo "missing $DIR"
  exit 1
fi
chown -R 1001:1001 "$DIR"
chmod -R u+rwX,g+rX "$DIR"
echo "ok: $DIR owned by 1001:1001"
