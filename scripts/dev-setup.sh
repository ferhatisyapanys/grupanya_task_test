#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
LOG_DIR="$ROOT_DIR/artifacts/logs"
PID_DIR="$ROOT_DIR/artifacts/pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

echo "[1/6] Starting Docker services (optional)"
if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    docker compose up -d || true
  else
    docker-compose up -d || true
  fi
else
  echo "Docker not found; skipping DB/Redis containers."
fi

echo "[2/6] Installing dependencies (npm install at repo root)"
npm install

echo "[3/6] Preparing env files"
if [ ! -f "$ROOT_DIR/apps/api/.env" ]; then
  cp "$ROOT_DIR/apps/api/.env.example" "$ROOT_DIR/apps/api/.env"
fi
if [ ! -f "$ROOT_DIR/.env" ] && [ -f "$ROOT_DIR/.env.example" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
fi

echo "[4/6] Running Prisma migrate (if DB available)"
if command -v npx >/dev/null 2>&1; then
  (
    cd "$ROOT_DIR/apps/api" && \
    npx prisma migrate dev --schema prisma/schema.prisma || echo "Prisma migrate skipped (DB unavailable)."
  )
fi

echo "[5/6] Starting API (background)"
cd "$ROOT_DIR"
nohup npm run dev:api > "$LOG_DIR/api.log" 2>&1 & echo $! > "$PID_DIR/api.pid"

echo "[6/6] Starting Web (background)"
nohup npm run dev:web > "$LOG_DIR/web.log" 2>&1 & echo $! > "$PID_DIR/web.pid"

echo "\nAll set!\n- API: http://localhost:3001/api/health\n- WEB: http://localhost:3000/\nLogs in $LOG_DIR, PIDs in $PID_DIR."
