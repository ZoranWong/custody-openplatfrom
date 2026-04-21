#!/usr/bin/env bash
# =============================================================================
# Cregis OpenPlatform - Development Server Manager
# Usage: ./dev.sh {start|stop|restart|status|logs} [api|admin|developer|auth|sdk]
# =============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$SCRIPT_DIR/.dev-pids"
LOG_DIR="$SCRIPT_DIR/.dev-logs"

ALL_SERVICES=("api" "admin" "developer" "auth" "sdk")

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─── Service Helpers ────────────────────────────────────────────────────────

svc_dir() {
    case "$1" in
        api)       echo "openplatform-api-service" ;;
        admin)     echo "openplatform-web/admin-portal" ;;
        developer) echo "openplatform-web/developer-portal" ;;
        auth)      echo "openplatform-web/auth-page" ;;
        sdk)       echo "openplatform-sdk/web" ;;
    esac
}

svc_cmd() {
    case "$1" in
        api)       echo "npx tsx watch src/main.ts" ;;
        admin)     echo "npm run dev" ;;
        developer) echo "npm run dev" ;;
        auth)      echo "npm run dev" ;;
        sdk)       echo "python3 -m http.server 4000" ;;
    esac
}

svc_port() {
    case "$1" in
        api)       echo "1000" ;;
        admin)     echo "1002" ;;
        developer) echo "1001" ;;
        auth)      echo "1003" ;;
        sdk)       echo "4000" ;;
    esac
}

svc_name() {
    case "$1" in
        api)       echo "API Gateway" ;;
        admin)     echo "Admin Portal" ;;
        developer) echo "Developer Portal" ;;
        auth)      echo "Auth Page" ;;
        sdk)       echo "SDK Examples" ;;
    esac
}

ensure_dirs() {
    mkdir -p "$PID_DIR" "$LOG_DIR"
}

pid_file() { echo "$PID_DIR/$1.pid"; }
log_file() { echo "$LOG_DIR/$1.log"; }

is_running() {
    local svc="$1"
    local pf
    pf="$(pid_file "$svc")"
    if [[ -f "$pf" ]]; then
        local pid
        pid=$(cat "$pf")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        else
            rm -f "$pf"
            return 1
        fi
    fi
    return 1
}

start_service() {
    local svc="$1"
    local dir cmd port pidfile logfile

    dir="$(svc_dir "$svc")"
    cmd="$(svc_cmd "$svc")"
    port="$(svc_port "$svc")"
    pidfile="$(pid_file "$svc")"
    logfile="$(log_file "$svc")"

    if is_running "$svc"; then
        local pid
        pid=$(cat "$pidfile")
        echo -e "${CYAN}[$svc]${NC} already running (PID: $pid, port: $port)"
        return 0
    fi

    echo -e "${CYAN}[$svc]${NC} starting on port $port ..."

    # Kill anything on the port first
    local port_pid
    port_pid=$(lsof -ti :"$port" 2>/dev/null | head -1 || true)
    if [[ -n "$port_pid" ]]; then
        echo -e "${CYAN}[$svc]${NC}   killing existing process on port $port (PID: $port_pid)"
        kill "$port_pid" 2>/dev/null || true
        sleep 1
        local still_running
        still_running=$(lsof -ti :"$port" 2>/dev/null | head -1 || true)
        [[ -n "$still_running" ]] && kill -9 "$still_running" 2>/dev/null || true
        sleep 0.5
    fi

    # Start in background
    if [[ "$svc" == "sdk" ]]; then
        (cd "$SCRIPT_DIR/$dir" && nohup bash -c "$cmd" > "$logfile" 2>&1 &
         # For python http.server, find the actual child PID
         sleep 1
         local child
         child=$(lsof -ti :"$port" 2>/dev/null | head -1 || true)
         echo "$child" > "$pidfile")
    else
        (cd "$SCRIPT_DIR/$dir" && nohup bash -c "$cmd" > "$logfile" 2>&1 & echo $! > "$pidfile")
    fi

    local pid
    sleep 1
    pid=$(cat "$pidfile")

    # Wait for port
    local i=0
    while [[ $i -lt 30 ]]; do
        if lsof -i :"$port" >/dev/null 2>&1; then
            break
        fi
        sleep 1
        ((i++))
    done

    if lsof -i :"$port" >/dev/null 2>&1; then
        echo -e "${CYAN}[$svc]${NC} ${GREEN}started${NC} (PID: $pid, http://localhost:$port)"
    else
        echo -e "${CYAN}[$svc]${NC} ${YELLOW}warning:${NC} port $port not ready after 30s (check $logfile)"
    fi
}

stop_service() {
    local svc="$1"
    local port pidfile

    port="$(svc_port "$svc")"
    pidfile="$(pid_file "$svc")"

    if is_running "$svc"; then
        local pid
        pid=$(cat "$pidfile")
        echo -e "${CYAN}[$svc]${NC} stopping (PID: $pid) ..."
        kill "$pid" 2>/dev/null || true

        local i=0
        while kill -0 "$pid" 2>/dev/null && [[ $i -lt 10 ]]; do
            sleep 1
            ((i++))
        done

        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null || true
        fi
        echo -e "${CYAN}[$svc]${NC} stopped"
    elif lsof -ti :"$port" >/dev/null 2>&1; then
        local port_pid
        port_pid=$(lsof -ti :"$port")
        echo -e "${CYAN}[$svc]${NC} stopping stray process on port $port (PID: $port_pid) ..."
        kill "$port_pid" 2>/dev/null || true
        sleep 1
        lsof -ti :"$port" >/dev/null 2>&1 && kill -9 "$(lsof -ti :"$port")" 2>/dev/null || true
        echo -e "${CYAN}[$svc]${NC} stopped"
    else
        echo -e "${CYAN}[$svc]${NC} not running"
    fi

    rm -f "$pidfile"
}

status_service() {
    local svc="$1"
    local port
    port="$(svc_port "$svc")"

    if is_running "$svc"; then
        local pid
        pid=$(cat "$(pid_file "$svc")")
        echo -e "  ${GREEN}●${NC} $svc ($(svc_name "$svc"))  PID: $pid  http://localhost:$port"
    else
        echo -e "  ${RED}○${NC} $svc ($(svc_name "$svc"))  stopped"
    fi
}

# ─── Commands ───────────────────────────────────────────────────────────────

cmd_start() {
    ensure_dirs
    local services=("$@")
    if [[ ${#services[@]} -eq 0 ]]; then
        services=("${ALL_SERVICES[@]}")
    fi

    echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   Cregis OpenPlatform Dev Server Manager          ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""

    for svc in "${services[@]}"; do
        case "$svc" in
            api|admin|developer|auth|sdk) start_service "$svc" ;;
            *) echo -e "${RED}[ERROR]${NC} unknown service: $svc (valid: ${ALL_SERVICES[*]})";;
        esac
    done

    echo ""
    echo -e "${GREEN}[INFO]${NC} Started:"
    for svc in "${services[@]}"; do
        case "$svc" in
            api|admin|developer|auth|sdk) status_service "$svc" ;;
        esac
    done
    echo ""
    echo -e "${GREEN}[INFO]${NC} View logs: tail -f .dev-logs/<service>.log"
    echo -e "${GREEN}[INFO]${NC} Stop all:  $0 stop"
}

cmd_stop() {
    local services=("$@")
    if [[ ${#services[@]} -eq 0 ]]; then
        services=("${ALL_SERVICES[@]}")
    fi

    for svc in "${services[@]}"; do
        case "$svc" in
            api|admin|developer|auth|sdk) stop_service "$svc" ;;
            *) echo -e "${RED}[ERROR]${NC} unknown service: $svc";;
        esac
    done
}

cmd_restart() {
    local services=("$@")
    if [[ ${#services[@]} -eq 0 ]]; then
        services=("${ALL_SERVICES[@]}")
    fi

    cmd_stop "${services[@]}"
    sleep 1
    cmd_start "${services[@]}"
}

cmd_status() {
    echo -e "${BLUE}Services:${NC}"
    echo ""
    for svc in "${ALL_SERVICES[@]}"; do
        status_service "$svc"
    done
    echo ""
}

cmd_logs() {
    local svc="$1"
    if [[ -z "$svc" ]]; then
        echo -e "${RED}[ERROR]${NC} usage: $0 logs <service>"
        return 1
    fi
    local lf
    lf="$(log_file "$svc")"
    if [[ -f "$lf" ]]; then
        tail -f "$lf"
    else
        echo -e "${RED}[ERROR]${NC} no log file for $svc: $lf"
    fi
}

usage() {
    cat <<EOF
Usage: $0 <command> [services...]

Commands:
  start [services...]   Start services (default: all)
  stop  [services...]   Stop services (default: all)
  restart [services...] Restart services (default: all)
  status                Show status of all services
  logs <service>        Tail logs for a service

Services:
  api        API Gateway           (port 1000)
  admin      Admin Portal          (port 3001)
  developer  Developer Portal      (port 1001)
  auth       Auth Page             (port 1002)
  sdk        SDK Examples          (port 4000)

Examples:
  $0 start                        # Start all services
  $0 start api admin              # Start API + Admin
  $0 start developer              # Start Developer Portal only
  $0 stop                         # Stop all services
  $0 stop sdk                     # Stop SDK only
  $0 restart                      # Restart all services
  $0 status                       # Show all service status
  $0 logs api                     # Tail API logs
EOF
}

# ─── Entry Point ────────────────────────────────────────────────────────────

if [[ $# -eq 0 ]]; then
    usage
    exit 0
fi

command="$1"
shift

case "$command" in
    start)   cmd_start "$@" ;;
    stop)    cmd_stop "$@" ;;
    restart) cmd_restart "$@" ;;
    status)  cmd_status ;;
    logs)    cmd_logs "$@" ;;
    help|-h|--help) usage ;;
    *)
        echo -e "${RED}[ERROR]${NC} unknown command: $command"
        usage
        exit 1
        ;;
esac
