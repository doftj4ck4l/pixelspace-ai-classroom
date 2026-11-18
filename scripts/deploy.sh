#!/usr/bin/env bash
set -euo pipefail

BRANCH="${DEPLOY_BRANCH:-main}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE="${DEPLOY_SERVICE:-paic2.service}"

export PATH="/home/work-station-2/nodejs/bin:${PATH}"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/1000}"

cd "$APP_DIR"

echo "==> Deploying '$BRANCH' in $APP_DIR"
echo "==> Fetching latest"
git fetch --prune origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

echo "==> Building"
pnpm build

echo "==> Restarting $SERVICE"
systemctl --user restart "$SERVICE"
sleep 3
systemctl --user is-active "$SERVICE"

echo "==> Ensuring pi harness is up"
HARNESS_DIR="${PIXELSPACE_DIR:-/home/work-station-2/pixelspace-0.11.2}"
HARNESS_URL="${PI_BASE_URL:-http://127.0.0.1:4010}"
if ! curl -sf -m 5 -o /dev/null "${HARNESS_URL}/api/meta"; then
  if [ -d "$HARNESS_DIR" ]; then
    (cd "$HARNESS_DIR" && docker compose up -d)
    sleep 5
  fi
  if curl -sf -m 5 -o /dev/null "${HARNESS_URL}/api/meta"; then
    echo "==> pi harness is healthy"
  else
    echo "==> WARNING: pi harness is not reachable (chat falls back to the gateway)"
  fi
else
  echo "==> pi harness is healthy"
fi

echo "==> Deployed $(git rev-parse --short HEAD)"
