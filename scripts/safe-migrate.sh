#!/usr/bin/env bash
set -euo pipefail

# Safe Migration: one-shot helper to apply Prisma schema changes safely.
# Usage:
#   bash ./scripts/safe-migrate.sh            # dev-friendly (migrate dev -> generate)
#   MODE=deploy bash ./scripts/safe-migrate.sh # CI/prod (migrate deploy)
# Options via env:
#   DB_HOST (default localhost), DB_PORT (default 5433)
#   SCHEMA (default apps/api/prisma/schema.prisma)

MODE=${MODE:-dev}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5433}
SCHEMA=${SCHEMA:-apps/api/prisma/schema.prisma}
API_DIR="$(dirname "$0")/../apps/api"

echo "[safe-migrate] Mode: $MODE  •  DB: $DB_HOST:$DB_PORT  •  Schema: $SCHEMA"

echo "[safe-migrate] Bringing up Docker services (optional)…"
if command -v docker >/dev/null 2>&1; then
  docker compose up -d || true
else
  echo "  - Docker not found; assuming external DB"
fi

echo "[safe-migrate] Waiting for Postgres on ${DB_HOST}:${DB_PORT} (max 30s)…"
for i in $(seq 1 30); do
  if nc -z "$DB_HOST" "$DB_PORT" >/dev/null 2>&1; then echo "  - Postgres is up"; break; fi
  sleep 1
  if [ "$i" = "30" ]; then echo "  - Postgres did not become ready in time (continuing)"; fi
done

pushd "$API_DIR" >/dev/null

# Resolve schema path relative to current dir (apps/api)
SCHEMA_PATH="$SCHEMA"
if [ ! -f "$SCHEMA_PATH" ]; then
  # Try local prisma/schema.prisma
  if [ -f "prisma/schema.prisma" ]; then
    SCHEMA_PATH="prisma/schema.prisma"
  else
    # Try from repo root absolute
    ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
    if [ -f "$ROOT_DIR/$SCHEMA" ]; then
      SCHEMA_PATH="$ROOT_DIR/$SCHEMA"
    fi
  fi
fi

echo "[safe-migrate] Using schema: $SCHEMA_PATH"
echo "[safe-migrate] Applying Prisma migrations…"
if [ "$MODE" = "deploy" ]; then
  if ! npx prisma migrate deploy --schema "$SCHEMA_PATH"; then
    echo "[safe-migrate] migrate deploy failed; attempting generate anyway…"
  fi
else
  if ! npx prisma migrate dev --schema "$SCHEMA_PATH"; then
    echo "[safe-migrate] migrate dev failed; trying migrate deploy…"
    if ! npx prisma migrate deploy --schema "$SCHEMA_PATH"; then
      echo "[safe-migrate] migrate deploy failed; falling back to db push (dev only)…"
      npx prisma db push --schema "$SCHEMA_PATH" || true
    fi
  fi
fi

echo "[safe-migrate] Generating Prisma Client…"
npx prisma generate --schema "$SCHEMA_PATH" || true

popd >/dev/null

echo "[safe-migrate] Optional seeds…"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT_DIR/il_ilce.csv" ]]; then
  echo "  - Seeding cities/districts from il_ilce.csv"
  npm --workspace=apps/api run seed:cities || true
fi
if [[ -f "$ROOT_DIR/Categories_csv.csv" ]]; then
  echo "  - Seeding categories from Categories_csv.csv"
  npm --workspace=apps/api run seed:categories || true
fi

echo "[safe-migrate] Done."
