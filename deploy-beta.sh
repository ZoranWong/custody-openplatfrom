#!/bin/bash

# Build and deploy script for the beta environment (https://custody.cregis.ae).
#
# Mirrors deploy-testing.sh but targets the beta host and, when deploying the
# API service, swaps in the beta .env instead of the developer's local .env.
# The beta API talks to the cregis-openplatform-beta database.
#
# Usage:
#   ./deploy-beta.sh                  # Build & deploy all projects
#   ./deploy-beta.sh api-service      # Build & deploy api-service only
#   ./deploy-beta.sh developer-portal # Build & deploy developer-portal only
#   ./deploy-beta.sh admin-portal     # Build & deploy admin-portal only
#   ./deploy-beta.sh auth-page        # Build & deploy auth-page only
#
# The api-service step runs `prisma migrate deploy` against the beta database,
# and the script retires the app through pm2.

set -e

DEPLOY_HOST="root@8.210.46.143"
DEPLOY_PATH="/web/custody-openplatform"
BETA_ENV_FILE="$DEPLOY_PATH/api-service/.env.beta"
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-all}"

cd "$PROJECT_ROOT"

build_api() {
  echo "=========================================="
  echo "Building API Service..."
  echo "=========================================="
  cd "$PROJECT_ROOT/openplatform-api-service"
  npm run build
}

build_developer() {
  echo "=========================================="
  echo "Building Developer Portal..."
  echo "=========================================="
  cd "$PROJECT_ROOT/openplatform-web/developer-portal-v2"
  npm run build
}

build_admin() {
  echo "=========================================="
  echo "Building Admin Portal..."
  echo "=========================================="
  cd "$PROJECT_ROOT/openplatform-web/admin-portal-v2"
  npm run build
}

build_auth() {
  echo "=========================================="
  echo "Building Auth Page..."
  echo "=========================================="
  cd "$PROJECT_ROOT/openplatform-web/auth-page"
  npm run build
}

deploy_api() {
  build_api
  echo "=========================================="
  echo "Deploying API Service to beta..."
  echo "=========================================="
  # Fail before touching the server if we do not have the beta .env to switch in.
  ssh "$DEPLOY_HOST" "test -f $BETA_ENV_FILE" || {
    echo "Missing $BETA_ENV_FILE on $DEPLOY_HOST." >&2
    echo "Create it from the currently live .env (cp $DEPLOY_PATH/api-service/.env $BETA_ENV_FILE) and re-run." >&2
    exit 1
  }
  ssh "$DEPLOY_HOST" "mkdir -p $DEPLOY_PATH/api-service"
  # Never ship the local .env; it points at the SIT database. Stage the build and
  # swap it in so the running process never sees a half-uploaded dist/.
  ssh "$DEPLOY_HOST" "cd $DEPLOY_PATH/api-service && rm -rf dist.new dist.old && mkdir -p dist.new"
  scp -r "$PROJECT_ROOT/openplatform-api-service/dist/." "$DEPLOY_HOST:$DEPLOY_PATH/api-service/dist.new/"
  ssh "$DEPLOY_HOST" "cd $DEPLOY_PATH/api-service && \
    if [ -d dist ]; then mv dist dist.old; fi && \
    mv dist.new dist && \
    rm -rf dist.old && echo '[api-service] switched'"
  scp "$PROJECT_ROOT/openplatform-api-service/package.json" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
  scp "$PROJECT_ROOT/openplatform-api-service/package-lock.json" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
  scp -r "$PROJECT_ROOT/openplatform-api-service/prisma/" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
  scp "$PROJECT_ROOT/openplatform-api-service/prisma.config.ts" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
  ssh "$DEPLOY_HOST" "cd $DEPLOY_PATH/api-service && \
    npm install --production && \
    cp -f $BETA_ENV_FILE .env && \
    npx prisma migrate deploy && \
    npx prisma generate && \
    pm2 restart api-service --update-env"
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
  echo "Deploying Developer Portal to beta..."
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
  echo "Deploying Admin Portal to beta..."
  echo "=========================================="
  deploy_portal_dist \
    "$PROJECT_ROOT/openplatform-web/admin-portal-v2/dist" \
    "$DEPLOY_PATH/admin-portal" \
    "admin-portal"
  scp "$PROJECT_ROOT/openplatform-web/admin-portal-v2/.env" "$DEPLOY_HOST:$DEPLOY_PATH/admin-portal/"
  echo "Admin Portal deployed."
}

deploy_auth() {
  build_auth
  echo "=========================================="
  echo "Deploying Auth Page to beta..."
  echo "=========================================="
  deploy_portal_dist \
    "$PROJECT_ROOT/openplatform-web/auth-page/dist" \
    "$DEPLOY_PATH/auth-page" \
    "auth-page"
  echo "Auth Page deployed."
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
  auth-page)
    deploy_auth
    ;;
  all)
    deploy_api
    deploy_developer
    deploy_admin
    deploy_auth
    ;;
  *)
    echo "Unknown target: $TARGET"
    echo "Usage: $0 [api-service|developer-portal|admin-portal|auth-page|all]"
    exit 1
    ;;
esac

echo ""
echo "=========================================="
echo "Deployment to beta completed!"
echo "=========================================="
