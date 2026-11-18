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

echo "==> Deployed $(git rev-parse --short HEAD)"
