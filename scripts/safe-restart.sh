#!/usr/bin/env bash
set -euo pipefail

echo "[safe-restart] Bringing up Docker services (no volume removal)…"
docker compose up -d

echo "[safe-restart] Waiting for Postgres on :5433 (max 30s)…"
for i in $(seq 1 30); do
  if nc -z localhost 5433 >/dev/null 2>&1; then echo "  - Postgres is up"; break; fi
  sleep 1
  if [ "$i" = "30" ]; then echo "  - Postgres did not become ready in time"; fi
done

echo "[safe-restart] Applying Prisma migrations (deploy, no reset)…"
pushd "$(dirname "$0")/../apps/api" >/dev/null
npx prisma migrate deploy --schema prisma/schema.prisma || {
  echo "[safe-restart] migrate deploy failed; attempting dev db push (non-destructive where possible)…"
  npx prisma db push --schema prisma/schema.prisma || true
}
npx prisma generate --schema prisma/schema.prisma || true
popd >/dev/null

echo "[safe-restart] (Optional) Seed cities/districts from CSV if needed…"
if [[ -f "$(dirname "$0")/../il_ilce.csv" ]]; then
  npm --workspace=apps/api run seed:cities || true
else
  echo "  - il_ilce.csv not found; skipping city seed"
fi

echo "[safe-restart] (Optional) Seed categories from Categories_csv.csv if present…"
if [[ -f "$(dirname "$0")/../Categories_csv.csv" ]]; then
  npm --workspace=apps/api run seed:categories || true
else
  echo "  - Categories_csv.csv not found; skipping categories seed"
fi

echo "[safe-restart] Stopping dev servers on ports 3001/3000 if running…"
for P in 3001 3000; do
  if lsof -ti tcp:$P >/dev/null 2>&1; then
    lsof -ti tcp:$P | xargs kill -9 || true
    echo "  - Killed process on :$P"
  else
    echo "  - No process on :$P"
  fi
done

echo "[safe-restart] Starting API and Web in background…"
nohup npm run dev:api > /tmp/dev-api.log 2>&1 &
nohup npm run dev:web > /tmp/dev-web.log 2>&1 &

echo "[safe-restart] Done. Logs: /tmp/dev-api.log, /tmp/dev-web.log"
echo "[safe-restart] Health: http://localhost:3001/api/health  •  Web: http://localhost:3000/"
