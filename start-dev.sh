#!/bin/bash

# Cregis OpenPlatform - All Services Startup Script
# 一键启动 Developer Portal, Admin Portal 和 API 服务

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default ports
API_PORT=1000
DEV_PORTAL_PORT=1001
ADMIN_PORTAL_PORT=1002

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
API_DIR="${PROJECT_ROOT}/openplatform-api-service"
DEV_PORTAL_DIR="${PROJECT_ROOT}/openplatform-web/developer-portal"
ADMIN_PORTAL_DIR="${PROJECT_ROOT}/openplatform-web/admin-portal"

# Check if concurrently is installed
check_concurrently() {
    if ! command -v concurrently &> /dev/null; then
        echo -e "${YELLOW}Installing concurrently globally...${NC}"
        npm install -g concurrently
    fi
}

# Print header
print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         Cregis OpenPlatform - All Services Startup         ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Print access URLs
print_urls() {
    echo ""
    echo -e "${GREEN}============================================================${NC}"
    echo -e "${GREEN}                    Access URLs                            ${NC}"
    echo -e "${GREEN}============================================================${NC}"
    echo ""
    echo -e "  ${YELLOW}Developer Portal:${NC}  http://localhost:${DEV_PORTAL_PORT}"
    echo -e "  ${YELLOW}Admin Portal:${NC}      http://localhost:${ADMIN_PORTAL_PORT}"
    echo -e "  ${YELLOW}API Gateway:${NC}       http://localhost:${API_PORT}"
    echo ""
    echo -e "${GREEN}============================================================${NC}"
    echo ""
    echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"
    echo ""
}

# Check directories exist
check_dirs() {
    if [ ! -d "$API_DIR" ]; then
        echo -e "${RED}Error: API directory not found: $API_DIR${NC}"
        exit 1
    fi
    if [ ! -d "$DEV_PORTAL_DIR" ]; then
        echo -e "${RED}Error: Developer Portal directory not found: $DEV_PORTAL_DIR${NC}"
        exit 1
    fi
    if [ ! -d "$ADMIN_PORTAL_DIR" ]; then
        echo -e "${RED}Error: Admin Portal directory not found: $ADMIN_PORTAL_DIR${NC}"
        exit 1
    fi
}

# Check dependencies installed
check_dependencies() {
    echo -e "${YELLOW}Checking dependencies...${NC}"

    if [ ! -d "${API_DIR}/node_modules" ]; then
        echo -e "${YELLOW}Installing API dependencies...${NC}"
        cd "$API_DIR" && npm install
    fi

    if [ ! -d "${DEV_PORTAL_DIR}/node_modules" ]; then
        echo -e "${YELLOW}Installing Developer Portal dependencies...${NC}"
        cd "$DEV_PORTAL_DIR" && npm install
    fi

    if [ ! -d "${ADMIN_PORTAL_DIR}/node_modules" ]; then
        echo -e "${YELLOW}Installing Admin Portal dependencies...${NC}"
        cd "$ADMIN_PORTAL_DIR" && npm install
    fi
}

# Start all services
start_services() {
    echo ""
    echo -e "${YELLOW}Starting all services...${NC}"
    echo ""

    cd "$PROJECT_ROOT"

    # Use concurrently to run all services in parallel
    concurrently \
        --names "API,DEV-PORTAL,ADMIN-PORTAL" \
        --prefixColors "blue,green,yellow" \
        -c "echo '📦 {name} running on port {socket}...'" \
        "cd $API_DIR && npm run dev" \
        "cd $DEV_PORTAL_DIR && npm run dev" \
        "cd $ADMIN_PORTAL_DIR && npm run dev"

    print_urls
}

# Alternative: Start services in background (no concurrent tool)
start_services_bg() {
    echo ""
    echo -e "${YELLOW}Starting all services in background...${NC}"
    echo ""

    # Start API
    cd "$API_DIR"
    npm run dev > /tmp/api.log 2>&1 &
    API_PID=$!
    echo -e "  ${GREEN}✓${NC} API Gateway started (PID: $API_PID, Port: $API_PORT)"

    # Start Developer Portal
    cd "$DEV_PORTAL_DIR"
    npm run dev > /tmp/dev-portal.log 2>&1 &
    DEV_PID=$!
    echo -e "  ${GREEN}✓${NC} Developer Portal started (PID: $DEV_PID, Port: $DEV_PORTAL_PORT)"

    # Start Admin Portal
    cd "$ADMIN_PORTAL_DIR"
    npm run dev > /tmp/admin-portal.log 2>&1 &
    ADMIN_PID=$!
    echo -e "  ${GREEN}✓${NC} Admin Portal started (PID: $ADMIN_PID, Port: $ADMIN_PORTAL_PORT)"

    # Store PIDs for cleanup
    echo "$API_PID $DEV_PID $ADMIN_PID" > /tmp/openplatform-pids

    print_urls

    # Wait for user interrupt
    trap "stop_services; exit" INT
    wait
}

# Stop all services
stop_services() {
    echo ""
    echo -e "${YELLOW}Stopping all services...${NC}"

    if [ -f /tmp/openplatform-pids ]; then
        read -r API_PID DEV_PID ADMIN_PID < /tmp/openplatform-pids

        if [ -n "$API_PID" ]; then kill $API_PID 2>/dev/null || true; fi
        if [ -n "$DEV_PID" ]; then kill $DEV_PID 2>/dev/null || true; fi
        if [ -n "$ADMIN_PID" ]; then kill $ADMIN_PID 2>/dev/null || true; fi

        rm -f /tmp/openplatform-pids
        echo -e "  ${GREEN}✓${NC} All services stopped"
    else
        # Try to kill by process name
        pkill -f "tsx watch src/main.ts" 2>/dev/null || true
        pkill -f "vite --port 1001" 2>/dev/null || true
        pkill -f "vite --port 1002" 2>/dev/null || true
        echo -e "  ${GREEN}✓${NC} All services stopped"
    fi
}

# Main
main() {
    print_header
    check_dirs
    check_dependencies

    # Check if running in CI or non-interactive mode
    if [ "$CI" = "true" ] || [ "$1" = "--ci" ]; then
        # CI mode: just start services
        start_services_bg
    else
        # Interactive mode
        if command -v concurrently &> /dev/null; then
            start_services
        else
            start_services_bg
        fi
    fi
}

# Handle arguments
case "$1" in
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 1
        main
        ;;
    logs)
        echo -e "${YELLOW}Showing logs...${NC}"
        echo ""
        echo "=== API Gateway Log ===" && tail -f /tmp/api.log 2>/dev/null &
        echo "=== Developer Portal Log ===" && tail -f /tmp/dev-portal.log 2>/dev/null &
        echo "=== Admin Portal Log ===" && tail -f /tmp/admin-portal.log 2>/dev/null &
        wait
        ;;
    *)
        main
        ;;
esac
