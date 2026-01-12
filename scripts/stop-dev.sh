#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
PID_DIR="$ROOT_DIR/artifacts/pids"

for name in api web; do
  PID_FILE="$PID_DIR/$name.pid"
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE" || true)
    if [ -n "${PID:-}" ] && ps -p "$PID" >/dev/null 2>&1; then
      echo "Stopping $name (pid $PID)"
      kill "$PID" || true
    fi
    rm -f "$PID_FILE"
  fi
done

echo "Stopped background dev servers."

