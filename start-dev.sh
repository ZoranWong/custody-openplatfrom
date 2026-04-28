#!/bin/bash

# Cregis OpenPlatform - All Services Startup Script
# 一键后台启动 Developer Portal, Admin Portal 和 API 服务
# 日志输出到 .dev-logs/ 目录

set -eo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default ports
API_PORT=1000
DEV_PORTAL_PORT=1001
ADMIN_PORTAL_PORT=1002

# Project root
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
API_DIR="${PROJECT_ROOT}/openplatform-api-service"
DEV_PORTAL_DIR="${PROJECT_ROOT}/openplatform-web/developer-portal"
ADMIN_PORTAL_DIR="${PROJECT_ROOT}/openplatform-web/admin-portal"

# Log & PID directories
LOG_DIR="${PROJECT_ROOT}/.dev-logs"
PID_DIR="${PROJECT_ROOT}/.dev-pids"

# ─── Helpers ────────────────────────────────────────────────

ensure_dirs() {
    mkdir -p "$LOG_DIR" "$PID_DIR"
}

log_file() { echo "$LOG_DIR/$1.log"; }
pid_file() { echo "$PID_DIR/$1.pid"; }

get_pid() {
    local pf
    pf="$(pid_file "$1")"
    if [[ -f "$pf" ]]; then
        cat "$pf"
    fi
}

is_running() {
    local pid
    pid="$(get_pid "$1")"
    [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

wait_for_port() {
    local port="$1"
    local max_wait="${2:-20}"
    local i=0
    while [[ $i -lt $max_wait ]]; do
        if lsof -i :"$port" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
        ((i++))
    done
    return 1
}

# Start a single service in background
start_one() {
    local name="$1" dir="$2" port="$3" cmd="$4"
    local lf pf

    lf="$(log_file "$name")"
    pf="$(pid_file "$name")"

    # Kill existing process on the port
    local port_pid
    port_pid=$(lsof -ti :"$port" 2>/dev/null | head -1 || true)
    if [[ -n "$port_pid" ]]; then
        kill "$port_pid" 2>/dev/null || true
        sleep 1
        port_pid=$(lsof -ti :"$port" 2>/dev/null | head -1 || true)
        [[ -n "$port_pid" ]] && kill -9 "$port_pid" 2>/dev/null || true
        sleep 0.5
    fi

    # Truncate log file for fresh start
    : > "$lf"

    # Start service with nohup, fully detached from terminal
    (cd "$dir" && nohup bash -c "$cmd" >> "$lf" 2>&1 & echo $! > "$pf"; disown)

    local pid
    pid=$(cat "$pf")

    # Brief wait then check if process is still alive
    sleep 2
    if ! kill -0 "$pid" 2>/dev/null; then
        echo -e "  ${RED}✗${NC} $name failed to start (check $lf)"
        tail -10 "$lf" 2>/dev/null
        return 1
    fi

    echo -e "  ${GREEN}✓${NC} $name starting... (PID: $pid, Port: $port)"
}

# ─── Commands ───────────────────────────────────────────────

cmd_start() {
    ensure_dirs

    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         Cregis OpenPlatform - All Services Startup         ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Check dependencies
    echo -e "${YELLOW}Checking dependencies...${NC}"
    for dir in "$API_DIR" "$DEV_PORTAL_DIR" "$ADMIN_PORTAL_DIR"; do
        if [[ ! -d "$dir" ]]; then
            echo -e "${RED}Error: directory not found: $dir${NC}"
            exit 1
        fi
        if [[ ! -d "$dir/node_modules" ]]; then
            echo -e "${YELLOW}Installing dependencies in $(basename "$dir")...${NC}"
            (cd "$dir" && npm install)
        fi
    done

    echo ""
    echo -e "${YELLOW}Starting all services in background...${NC}"
    echo ""

    start_one "api"              "$API_DIR"          "$API_PORT"          "npm run dev"
    start_one "developer-portal" "$DEV_PORTAL_DIR"   "$DEV_PORTAL_PORT"  "npm run dev"
    start_one "admin-portal"     "$ADMIN_PORTAL_DIR" "$ADMIN_PORTAL_PORT" "npm run dev"

    echo ""
    echo -e "${YELLOW}Waiting for services to be ready...${NC}"

    # Health check via port
    local all_ok=true
    local name port
    for svc in "api:$API_PORT" "developer-portal:$DEV_PORTAL_PORT" "admin-portal:$ADMIN_PORTAL_PORT"; do
        name="${svc%%:*}"
        port="${svc##*:}"
        if wait_for_port "$port" 25; then
            echo -e "  ${GREEN}✓${NC} $name ready on port $port"
        else
            echo -e "  ${RED}✗${NC} $name not ready after 25s (check $(log_file "$name"))"
            all_ok=false
        fi
    done

    echo ""
    echo -e "${GREEN}============================================================${NC}"
    echo -e "${GREEN}                    Access URLs                            ${NC}"
    echo -e "${GREEN}============================================================${NC}"
    echo ""
    echo -e "  ${YELLOW}API Gateway:${NC}       http://localhost:${API_PORT}"
    echo -e "  ${YELLOW}Developer Portal:${NC}  http://localhost:${DEV_PORTAL_PORT}"
    echo -e "  ${YELLOW}Admin Portal:${NC}      http://localhost:${ADMIN_PORTAL_PORT}"
    echo ""
    echo -e "${GREEN}============================================================${NC}"
    echo ""

    if [[ "$all_ok" == true ]]; then
        echo -e "${GREEN}All services are running in background.${NC}"
    else
        echo -e "${YELLOW}Some services may have issues. Check logs below.${NC}"
    fi

    echo ""
    echo -e "  ${BLUE}Logs:${NC}    tail -f ${LOG_DIR}/<service>.log"
    echo -e "  ${BLUE}Stop:${NC}    $0 stop"
    echo -e "  ${BLUE}Status:${NC}  $0 status"
    echo ""
}

cmd_stop() {
    echo ""
    echo -e "${YELLOW}Stopping all services...${NC}"
    ensure_dirs

    local name pf pid
    for name in "api" "developer-portal" "admin-portal"; do
        pf="$(pid_file "$name")"
        if [[ -f "$pf" ]]; then
            pid=$(cat "$pf")
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "  ${GREEN}✓${NC} Stopping $name (PID: $pid)"
                kill "$pid" 2>/dev/null || true
                pkill -P "$pid" 2>/dev/null || true
            fi
            rm -f "$pf"
        fi
    done

    # Kill any stray processes on the ports
    local port port_pid
    for port in "$API_PORT" "$DEV_PORTAL_PORT" "$ADMIN_PORTAL_PORT"; do
        port_pid=$(lsof -ti :"$port" 2>/dev/null | head -1 || true)
        [[ -n "$port_pid" ]] && kill "$port_pid" 2>/dev/null || true
    done

    sleep 1
    echo ""
    echo -e "${GREEN}All services stopped.${NC}"
    echo ""
}

cmd_status() {
    ensure_dirs
    echo ""

    local name port pid
    for entry in "api:$API_PORT" "developer-portal:$DEV_PORTAL_PORT" "admin-portal:$ADMIN_PORTAL_PORT"; do
        name="${entry%%:*}"
        port="${entry##*:}"
        pid="$(get_pid "$name")"

        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            echo -e "  ${GREEN}●${NC} $name  (PID: $pid, http://localhost:$port)"
        elif lsof -i :"$port" >/dev/null 2>&1; then
            echo -e "  ${YELLOW}●${NC} $name  (running on port $port, PID file stale)"
        else
            echo -e "  ${RED}○${NC} $name  stopped"
        fi
    done
    echo ""
}

cmd_logs() {
    local name="$1"
    if [[ -z "$name" ]]; then
        echo -e "${RED}Usage:${NC} $0 logs <api|developer-portal|admin-portal>"
        exit 1
    fi
    local lf
    lf="$(log_file "$name")"
    if [[ -f "$lf" ]]; then
        tail -f "$lf"
    else
        echo -e "${RED}No log file: $lf${NC}"
        exit 1
    fi
}

cmd_restart() {
    cmd_stop
    sleep 1
    cmd_start
}

# ─── Entry Point ────────────────────────────────────────────

usage() {
    cat <<EOF
Usage: $0 <command>

Commands:
  start    Start all services in background
  stop     Stop all services
  restart  Restart all services
  status   Show status of all services
  logs     Tail logs for a service: $0 logs <api|developer-portal|admin-portal>

Services:
  api                API Gateway           (port $API_PORT)
  developer-portal   Developer Portal      (port $DEV_PORTAL_PORT)
  admin-portal       Admin Portal          (port $ADMIN_PORTAL_PORT)

Logs:   $LOG_DIR/
EOF
}

if [[ $# -eq 0 ]]; then
    usage
    exit 0
fi

command="$1"
shift

case "$command" in
    start)   cmd_start ;;
    stop)    cmd_stop ;;
    restart) cmd_restart ;;
    status)  cmd_status ;;
    logs)    cmd_logs "$@" ;;
    help|-h|--help) usage ;;
    *)
        echo -e "${RED}Unknown command:${NC} $command"
        usage
        exit 1
        ;;
esac
