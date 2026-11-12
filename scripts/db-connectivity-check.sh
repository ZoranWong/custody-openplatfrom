#!/usr/bin/env bash
# =============================================================================
# 数据库连通性测试脚本
#
# 分三层验证，定位问题到底出在网络、服务端还是凭据：
#   1. TCP 层  —— 端口能否建立连接（不通 = 安全组/防火墙/mysqld 未监听）
#   2. MySQL 层 —— 能否登录并执行 SELECT 1（失败会区分 1045 密码错 / 超时）
#   3. 应用层  —— 可选，探测 API 的 /health 是否正常
#
# 密码只经由 MYSQL_PWD 环境变量传给 mysql 客户端，不会出现在命令行、
# 不会打印到屏幕、也不会写进日志。
#
# 用法:
#   ./scripts/db-connectivity-check.sh                      # 读默认 .env
#   ./scripts/db-connectivity-check.sh -e path/to/.env      # 指定 env 文件
#   ./scripts/db-connectivity-check.sh -t 3 -r 3            # 超时 3 秒、重试 3 次
#   ./scripts/db-connectivity-check.sh -a http://127.0.0.1:1000
#   ./scripts/db-connectivity-check.sh -s 8.130.161.209     # 只测目标主机 TCP
#
# 退出码: 0 全部通过 | 1 TCP 不通 | 2 MySQL 登录失败 | 3 缺少依赖
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../openplatform-api-service/.env"
TCP_TIMEOUT=4
TCP_RETRIES=3
API_URL=""
HOST_OVERRIDE=""

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()      { printf "${GREEN}  ✔ %s${NC}\n" "$*"; }
bad()     { printf "${RED}  ✘ %s${NC}\n" "$*"; }
warn()    { printf "${YELLOW}  ! %s${NC}\n" "$*"; }
section() { printf "\n${YELLOW}== %s ==${NC}\n" "$*"; }

usage() { sed -n '2,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0; }

while getopts "e:t:r:a:s:h" opt; do
  case "$opt" in
    e) ENV_FILE="$OPTARG" ;;
    t) TCP_TIMEOUT="$OPTARG" ;;
    r) TCP_RETRIES="$OPTARG" ;;
    a) API_URL="$OPTARG" ;;
    s) HOST_OVERRIDE="$OPTARG" ;;
    h) usage ;;
    *) usage ;;
  esac
done

# ─── 跨平台 timeout（macOS 默认没有 timeout 命令） ───────────────────────────
run_timeout() {
  local secs="$1"; shift
  if command -v timeout >/dev/null 2>&1; then
    timeout "$secs" "$@"
  elif command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$secs" "$@"
  else
    "$@" & local pid=$!
    ( sleep "$secs"; kill -9 "$pid" 2>/dev/null ) >/dev/null 2>&1 & local watcher=$!
    wait "$pid" 2>/dev/null; local rc=$?
    kill "$watcher" 2>/dev/null
    return $rc
  fi
}

# ─── 读取 DB 配置（优先 DB_* 变量，回落到 DATABASE_URL 解析） ────────────────
load_db_config() {
  if [ -n "$HOST_OVERRIDE" ]; then
    DB_HOST="$HOST_OVERRIDE"
    DB_PORT="${DB_PORT:-3306}"
    return
  fi

  if [ ! -f "$ENV_FILE" ]; then
    warn "找不到 env 文件: $ENV_FILE（可用 -e 指定，或用 -s 只测主机 TCP）"
    return 1
  fi

  # 只提取键值，不 source，避免执行 env 文件里的任意 shell
  env_val() { awk -F= -v k="$1" '$1==k{sub(/^[^=]*=/,""); print; exit}' "$ENV_FILE" | tr -d '\r' | sed -e 's/^"//' -e 's/"$//'; }

  DB_HOST="$(env_val DB_HOST)"
  DB_PORT="$(env_val DB_PORT)"
  DB_NAME="$(env_val DB_NAME)"
  DB_USER="$(env_val DB_USER)"
  DB_PASSWORD="$(env_val DB_PASSWORD)"

  if [ -z "$DB_HOST" ]; then
    local url; url="$(env_val DATABASE_URL)"
    if [ -n "$url" ]; then
      # mysql://user:pass@host:port/db
      local rest="${url#*://}"
      local cred="${rest%@*}"
      local hostpart="${rest#*@}"
      DB_USER="${cred%%:*}"
      DB_PASSWORD="${cred#*:}"
      DB_HOST="${hostpart%%:*}"
      DB_PORT="${hostpart#*:}"; DB_PORT="${DB_PORT%%/*}"
      DB_NAME="${hostpart##*/}"
    fi
  fi

  DB_PORT="${DB_PORT:-3306}"
  [ -n "${DB_HOST:-}" ] || { warn "env 里没有 DB_HOST / DATABASE_URL"; return 1; }
  return 0
}

# 把密码里的 URL 编码还原（DATABASE_URL 里可能是 encodeURIComponent 过的）
if load_db_config; then :; fi
if [ -n "${DB_PASSWORD:-}" ] && command -v python3 >/dev/null 2>&1; then
  DB_PASSWORD="$(python3 -c 'import sys,urllib.parse; print(urllib.parse.unquote(sys.argv[1]),end="")' "$DB_PASSWORD")"
fi

printf "目标: %s%s:%s%s\n" "${DB_HOST:-?}" "" "${DB_PORT:-3306}" "${DB_NAME:+/$DB_NAME}"
[ -n "${DB_USER:-}" ] && printf "用户: %s（密码长度 %s，不显示）\n" "$DB_USER" "${#DB_PASSWORD}"

# ─── 1. TCP 层 ──────────────────────────────────────────────────────────────
section "1. TCP 连接 $DB_HOST:$DB_PORT"
tcp_ok=0
for i in $(seq 1 "$TCP_RETRIES"); do
  if run_timeout "$TCP_TIMEOUT" bash -c "(echo > /dev/tcp/$DB_HOST/$DB_PORT)" 2>/dev/null; then
    ok "第 $i 次: 端口可达"
    tcp_ok=1
    break
  else
    bad "第 $i 次: 超时/拒绝（${TCP_TIMEOUT}s）"
  fi
done

if [ "$tcp_ok" -eq 0 ]; then
  warn "TCP 不通，MySQL 凭据不会被执行。常见原因："
  printf "     - 安全组/防火墙未放行 %s 入方向\n" "$DB_PORT"
  printf "     - mysqld 未运行，或只监听 127.0.0.1\n"
  printf "     - 云主机已关机/内网路由异常\n"
  exit 1
fi

# ─── 2. MySQL 登录 ──────────────────────────────────────────────────────────
section "2. MySQL 登录与查询"
if ! command -v mysql >/dev/null 2>&1; then
  warn "本机没有 mysql 客户端，跳过登录测试（可 apt/yum install mysql-client）"
else
  [ -n "${DB_USER:-}" ] || { bad "没有 DB_USER，无法登录"; exit 2; }
  export MYSQL_PWD="$DB_PASSWORD"
  out="$(run_timeout 15 mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
        --connect-timeout="$TCP_TIMEOUT" -N -e "SELECT 1" 2>&1)"
  rc=$?
  unset MYSQL_PWD

  if [ "$rc" -eq 0 ] && [ "$out" = "1" ]; then
    ok "登录成功，SELECT 1 = 1"
    if [ -n "${DB_NAME:-}" ]; then
      tables="$(run_timeout 10 mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -N \
        -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME'" 2>/dev/null)"
      if [ -n "$tables" ]; then
        ok "库 $DB_NAME 可读，共 $tables 张表"
      else
        warn "登录成功，但读不到库 $DB_NAME（库名不对或无权限）"
      fi
    fi
  else
    bad "登录失败（exit=$rc）: $(printf '%s' "$out" | head -2 | tr '\n' ' ')"
    case "$out" in
      *"Access denied"*)  warn "1045 = 密码或用户/来源主机权限不对（不是网络问题）" ;;
      *"Can't connect"*)  warn "连接被拒 = 服务在跑但拒绝该来源，检查 bind-address / 用户 host 白名单" ;;
      *"Unknown database"*) warn "登录成功但库不存在，检查 DB_NAME" ;;
      *"timed out"*|"")    warn "超时 = 连上了 TCP 但会话建立不了，检查 max_connections / 服务负载" ;;
    esac
    exit 2
  fi
fi

# ─── 3. 应用层（可选） ──────────────────────────────────────────────────────
if [ -n "$API_URL" ]; then
  section "3. API 健康检查 $API_URL/health"
  if command -v curl >/dev/null 2>&1; then
    body="$(run_timeout 15 curl -s -m 12 "$API_URL/health" -w '\nHTTP:%{http_code} TIME:%{time_total}')"
    printf "%s\n" "$body" | tail -3
  else
    warn "没有 curl，跳过"
  fi
fi

echo
ok "全部检查通过"
