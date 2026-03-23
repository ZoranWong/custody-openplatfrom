#!/bin/bash

# Build and Deploy script for Cregis Custody OpenPlatform
# Usage: ./deploy-dist.sh

set -e

DEPLOY_HOST="root@8.217.54.115"
DEPLOY_PATH="/web/custody-openplatform"
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$PROJECT_ROOT"

echo "=========================================="
echo "Building projects..."
echo "=========================================="

# Build API Service
echo "[1/3] Building API Service..."
cd "$PROJECT_ROOT/openplatform-api-service"
npm run build

# Build Developer Portal
echo "[2/3] Building Developer Portal..."
cd "$PROJECT_ROOT/openplatform-web/developer-portal"
npm run build

# Build Admin Portal
echo "[3/3] Building Admin Portal..."
cd "$PROJECT_ROOT/openplatform-web/admin-portal"
npm run build

# Build Auth Page
echo "[4/4] Building Auth Page..."
cd "$PROJECT_ROOT/openplatform-web/auth-page"
npm run build

echo "=========================================="
echo "Deploying to server..."
echo "=========================================="

# Create remote directory if not exists
ssh $DEPLOY_HOST "mkdir -p $DEPLOY_PATH/api-service $DEPLOY_PATH/developer-portal $DEPLOY_PATH/admin-portal $DEPLOY_PATH/auth-page"

# Sync API Service files
echo "Syncing API Service..."
scp -r "$PROJECT_ROOT/openplatform-api-service/dist/" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
scp "$PROJECT_ROOT/openplatform-api-service/package.json" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
scp "$PROJECT_ROOT/openplatform-api-service/package-lock.json" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
scp "$PROJECT_ROOT/openplatform-api-service/.env" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
scp -r "$PROJECT_ROOT/openplatform-api-service/prisma/" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"
scp "$PROJECT_ROOT/openplatform-api-service/prisma.config.ts" "$DEPLOY_HOST:$DEPLOY_PATH/api-service/"

# Run npm install on server
ssh $DEPLOY_HOST "cd $DEPLOY_PATH/api-service && npm install --production"

# Sync Developer Portal
echo "Syncing Developer Portal..."
ssh $DEPLOY_HOST "mkdir -p $DEPLOY_PATH/developer-portal"
scp -r "$PROJECT_ROOT/openplatform-web/developer-portal/dist/" "$DEPLOY_HOST:$DEPLOY_PATH/developer-portal/"
scp "$PROJECT_ROOT/openplatform-web/developer-portal/.env" "$DEPLOY_HOST:$DEPLOY_PATH/developer-portal/"

# Sync Admin Portal
echo "Syncing Admin Portal..."
ssh $DEPLOY_HOST "mkdir -p $DEPLOY_PATH/admin-portal"
scp -r "$PROJECT_ROOT/openplatform-web/admin-portal/dist/" "$DEPLOY_HOST:$DEPLOY_PATH/admin-portal/"
scp "$PROJECT_ROOT/openplatform-web/admin-portal/.env" "$DEPLOY_HOST:$DEPLOY_PATH/admin-portal/"

# Sync Auth Page
echo "Syncing Auth Page..."
ssh $DEPLOY_HOST "mkdir -p $DEPLOY_PATH/auth-page"
scp -r "$PROJECT_ROOT/openplatform-web/auth-page/dist/" "$DEPLOY_HOST:$DEPLOY_PATH/auth-page/"
scp "$PROJECT_ROOT/openplatform-web/auth-page/.env" "$DEPLOY_HOST:$DEPLOY_PATH/auth-page/"
scp "$PROJECT_ROOT/openplatform-web/auth-page/vite.config.ts" "$DEPLOY_HOST:$DEPLOY_PATH/auth-page/"

# Sync Nginx config
echo "Syncing Nginx config..."
scp "$PROJECT_ROOT/deploy/nginx.conf" "$DEPLOY_HOST:$DEPLOY_PATH/"

echo "=========================================="
echo "Deployment completed!"
echo "=========================================="

# Output nginx config location
echo ""
echo "Nginx config synced to: $DEPLOY_HOST:$DEPLOY_PATH/nginx.conf"
echo "Copy to /etc/nginx/sites-available/ and restart nginx:"
echo "  ssh $DEPLOY_HOST"
echo "  cp $DEPLOY_PATH/nginx.conf /etc/nginx/sites-available/custody-openplatform"
echo "  ln -sf /etc/nginx/sites-available/custody-openplatform /etc/nginx/sites-enabled/"
echo "  nginx -t && nginx -s reload"
