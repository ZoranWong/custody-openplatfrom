#!/bin/bash

# Build and Deploy script for Cregis Custody OpenPlatform
# Usage:
#   ./deploy-testing.sh                  # Build & deploy all projects
#   ./deploy-testing.sh api-service      # Build & deploy api-service only
#   ./deploy-testing.sh developer-portal # Build & deploy developer-portal only
#   ./deploy-testing.sh admin-portal     # Build & deploy admin-portal only

set -e

DEPLOY_HOST="root@8.217.54.115"
DEPLOY_PATH="/web/custody-openplatform"
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

deploy_api() {
  build_api
  echo "=========================================="
  echo "Deploying API Service..."
  echo "=========================================="
  ssh "$DEPLOY_HOST" "mkdir -p $DEPLOY_PATH/api-service"
  scp -r "$PROJECT_ROOT/openplatform-api-service/dist/" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
  scp "$PROJECT_ROOT/openplatform-api-service/package.json" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
  scp "$PROJECT_ROOT/openplatform-api-service/package-lock.json" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
  scp "$PROJECT_ROOT/openplatform-api-service/.env" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
  scp -r "$PROJECT_ROOT/openplatform-api-service/prisma/" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
  scp "$PROJECT_ROOT/openplatform-api-service/prisma.config.ts" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
  ssh "$DEPLOY_HOST" "cd $DEPLOY_PATH/api-service && npm install --production && npx prisma migrate deploy && npx prisma generate"
  echo "API Service deployed."
}

deploy_developer() {
  build_developer
  echo "=========================================="
  echo "Deploying Developer Portal..."
  echo "=========================================="
  ssh "$DEPLOY_HOST" "mkdir -p $DEPLOY_PATH/developer-portal"
  scp -r "$PROJECT_ROOT/openplatform-web/developer-portal-v2/dist/" "$DEPLOY_HOST:$DEPLOY_PATH/developer-portal/"
  scp "$PROJECT_ROOT/openplatform-web/developer-portal-v2/.env" "$DEPLOY_HOST:$DEPLOY_PATH/developer-portal/"
  echo "Developer Portal deployed."
}

deploy_admin() {
  build_admin
  echo "=========================================="
  echo "Deploying Admin Portal..."
  echo "=========================================="
  ssh "$DEPLOY_HOST" "mkdir -p $DEPLOY_PATH/admin-portal"
  scp -r "$PROJECT_ROOT/openplatform-web/admin-portal-v2/dist/" "$DEPLOY_HOST:$DEPLOY_PATH/admin-portal/"
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