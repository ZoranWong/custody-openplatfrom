#!/bin/bash

# Build and Deploy script for Cregis Custody OpenPlatform — beta environment
# (https://custody.cregis.ae)
#
# Same layout as deploy-testing.sh; only the target host differs.
#
# Usage:
#   ./deploy-beta.sh                  # Build & deploy all projects
#   ./deploy-beta.sh api-service      # Build & deploy api-service only
#   ./deploy-beta.sh developer-portal # Build & deploy developer-portal only
#   ./deploy-beta.sh admin-portal     # Build & deploy admin-portal only
#   SKIP_BUILD=1 ./deploy-beta.sh ... # Deploy existing dist/ (used when
#                                     # deploy-testing.sh is running in parallel)

set -e

DEPLOY_HOST="root@8.210.46.143"
DEPLOY_PATH="/web/custody-openplatform"
# Beta host default node is v22.7.0; Prisma 7 requires ≥v22.12.
REMOTE_NODE="export PATH=/root/.nvm/versions/node/v22.12.0/bin:\$PATH"
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-all}"
SKIP_BUILD="${SKIP_BUILD:-0}"

cd "$PROJECT_ROOT"

build_api() {
  echo "=========================================="
  echo "Building API Service..."
  echo "=========================================="
  if [ "$SKIP_BUILD" = "1" ]; then echo "SKIP_BUILD=1, using existing dist/"; return; fi
  cd "$PROJECT_ROOT/openplatform-api-service"
  npm run build
}

build_developer() {
  echo "=========================================="
  echo "Building Developer Portal..."
  echo "=========================================="
  if [ "$SKIP_BUILD" = "1" ]; then echo "SKIP_BUILD=1, using existing dist/"; return; fi
  cd "$PROJECT_ROOT/openplatform-web/developer-portal-v2"
  npm run build
}

build_admin() {
  echo "=========================================="
  echo "Building Admin Portal..."
  echo "=========================================="
  if [ "$SKIP_BUILD" = "1" ]; then echo "SKIP_BUILD=1, using existing dist/"; return; fi
  cd "$PROJECT_ROOT/openplatform-web/admin-portal-v2"
  npm run build
}

deploy_api() {
  build_api
  echo "=========================================="
  echo "Deploying API Service..."
  echo "=========================================="
  ssh "$DEPLOY_HOST" "$REMOTE_NODE && mkdir -p $DEPLOY_PATH/api-service"
  scp -r "$PROJECT_ROOT/openplatform-api-service/dist/" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
  scp "$PROJECT_ROOT/openplatform-api-service/package.json" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
  scp "$PROJECT_ROOT/openplatform-api-service/package-lock.json" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
  scp "$PROJECT_ROOT/openplatform-api-service/.env.beta" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/.env"
  scp -r "$PROJECT_ROOT/openplatform-api-service/prisma/" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
  scp "$PROJECT_ROOT/openplatform-api-service/prisma.config.ts" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
  ssh "$DEPLOY_HOST" "$REMOTE_NODE && cd $DEPLOY_PATH/api-service && npm install --production && npx prisma migrate deploy && npx prisma generate"
  # dist/ and .env were just replaced, but pm2 keeps running the old in-memory
  # process; --update-env re-reads .env on restart.
  ssh "$DEPLOY_HOST" "$REMOTE_NODE && cd $DEPLOY_PATH/api-service && pm2 restart api-service --update-env"
  echo "API Service deployed."
}

# Upload a portal's dist/ into a staging directory, then swap it into place in one
# step. Uploading straight over the live directory exposes a window where index.html
# already references chunks that have not been uploaded yet (users then get the SPA
# fallback HTML in place of JS, which CDNs happily cache).
deploy_portal_dist() {
  local local_dist="$1"
  local remote_dir="$2"
  local label="$3"

  ssh "$DEPLOY_HOST" "mkdir -p $remote_dir && rm -rf $remote_dir/dist.new $remote_dir/dist.old && mkdir -p $remote_dir/dist.new"
  scp -r "$local_dist/." "$DEPLOY_HOST:$remote_dir/dist.new/"
  ssh "$DEPLOY_HOST" "cd $remote_dir && \
    if [ -d dist ]; then mv dist dist.old; fi && \
    mv dist.new dist && \
    rm -rf dist.old && echo '[$label] switched'"
}

deploy_developer() {
  build_developer
  echo "=========================================="
  echo "Deploying Developer Portal..."
  echo "=========================================="
  deploy_portal_dist \
    "$PROJECT_ROOT/openplatform-web/developer-portal-v2/dist" \
    "$DEPLOY_PATH/developer-portal" \
    "developer-portal"
  scp "$PROJECT_ROOT/openplatform-web/developer-portal-v2/.env" "$DEPLOY_HOST:$DEPLOY_PATH/developer-portal/"
  echo "Developer Portal deployed."
}

deploy_admin() {
  build_admin
  echo "=========================================="
  echo "Deploying Admin Portal..."
  echo "=========================================="
  deploy_portal_dist \
    "$PROJECT_ROOT/openplatform-web/admin-portal-v2/dist" \
    "$DEPLOY_PATH/admin-portal" \
    "admin-portal"
  scp "$PROJECT_ROOT/openplatform-web/admin-portal-v2/.env" "$DEPLOY_HOST:$DEPLOY_PATH/admin-portal/"
  echo "Admin Portal deployed."
}

case "$TARGET" in
  api-service)
    deploy_api
    ;;
  developer-portal)
    deploy_developer
    ;;
  admin-portal)
    deploy_admin
    ;;
  all)
    deploy_api
    deploy_developer
    deploy_admin
    ;;
  *)
    echo "Unknown target: $TARGET"
    echo "Usage: $0 [api-service|developer-portal|admin-portal|all]"
    exit 1
    ;;
esac

echo ""
echo "=========================================="
echo "Deployment completed!"
echo "=========================================="
