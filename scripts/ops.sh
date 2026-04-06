#!/usr/bin/env bash

set -euo pipefail

export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20 >/dev/null

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${LOG_DIR:-$ROOT_DIR/_output/logs}"
RUN_DIR="${RUN_DIR:-$ROOT_DIR/_output/run}"
PID_FILE="${PID_FILE:-$RUN_DIR/openim-electron-demo.pid}"
DEV_LOG_FILE="${DEV_LOG_FILE:-$LOG_DIR/dev.log}"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-5173}"
DEV_TARGET="${DEV_TARGET:-web}"
CHECK_HOST="${CHECK_HOST:-127.0.0.1}"

usage() {
  cat <<'EOF'
openim-electron-demo 运维脚本

用法:
  ./scripts/ops.sh <命令> [参数]

命令:
  install                 安装依赖（npm install）
  build                   生产编译（npm run build，Electron + 前端，产物 dist/、dist-electron/）
  build-web               仅 Web 静态资源编译（vite build + vite.web.config.ts，产物 dist/）
  start                   启动开发服务（默认仅 Web：Vite，无 Electron 窗口）
  start-electron          启动 PC 桌面端（npm run dev = Vite + Electron）
  stop                    停止开发服务
  restart                 重启（默认与 start 相同：仅 Web）
  restart-electron        重启为 PC 桌面端开发模式
  status                  查看运行状态（进程 + 端口）
  check                   健康检查（HTTP 探活）
  logs                    实时查看开发日志
  ps                      查看 openim-electron-demo 相关进程
  ports                   查看开发服务监听端口
  help                    显示帮助

环境变量:
  HOST                    默认: 127.0.0.1
  PORT                    默认: 5173
  DEV_TARGET              默认: web（仅浏览器）；设为 electron 等同 start-electron
  CHECK_HOST              默认: 127.0.0.1（健康检查地址）
  LOG_DIR                 默认: ./_output/logs
  RUN_DIR                 默认: ./_output/run
  PID_FILE                默认: $RUN_DIR/openim-electron-demo.pid
  DEV_LOG_FILE            默认: $LOG_DIR/dev.log

示例:
  ./scripts/ops.sh install
  ./scripts/ops.sh build         # 构建 Electron + Web，产物包括 dist/ 和 dist-electron/
  ./scripts/ops.sh build-web     # 仅构建 Web 静态资源，产物只是 dist/
  ./scripts/ops.sh start
  ./scripts/ops.sh start-electron
  DEV_TARGET=electron ./scripts/ops.sh restart
EOF
}

log() {
  echo "[electron-demo-ops] $*"
}

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "缺少命令: $1" >&2
    exit 1
  fi
}

ensure_dirs() {
  mkdir -p "$LOG_DIR" "$RUN_DIR"
}

read_pid() {
  if [[ -f "$PID_FILE" ]]; then
    cat "$PID_FILE"
  fi
}

is_pid_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1
}

install_deps() {
  need_cmd npm
  log "安装依赖..."
  (
    cd "$ROOT_DIR"
    npm install
  )
}

ensure_node_modules() {
  if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
    log "检测到 node_modules 不存在，先安装依赖..."
    install_deps
  fi
}

build_electron() {
  need_cmd npm
  ensure_node_modules
  log "编译（Electron 完整包）: npm run build ..."
  (
    cd "$ROOT_DIR"
    npm run build
  )
  log "完成。静态资源一般在 dist/，Electron 主进程等在 dist-electron/（以 vite.config 为准）。"
}

build_web_only() {
  need_cmd npm
  need_cmd npx
  ensure_node_modules
  log "编译（仅 Web）: vite build --config vite.web.config.ts ..."
  (
    cd "$ROOT_DIR"
    npx vite build --config vite.web.config.ts
  )
  log "完成。产物目录一般为 dist/。"
}

start_server() {
  need_cmd npm
  need_cmd npx
  ensure_dirs

  local pid
  pid="$(read_pid || true)"
  if is_pid_running "${pid:-}"; then
    log "服务已在运行 (pid=$pid)"
    return
  fi

  ensure_node_modules

  if [[ "$DEV_TARGET" == "electron" ]]; then
    log "模式: Electron（PC 桌面端）+ Vite — http://$HOST:$PORT"
  else
    log "模式: Web（仅 Vite，无 Electron；PC 端请用: ./scripts/ops.sh start-electron）"
    log "开发页: http://$HOST:$PORT"
  fi

  (
    cd "$ROOT_DIR"
    if [[ "$DEV_TARGET" == "electron" ]]; then
      nohup npm run dev -- --host "$HOST" --port "$PORT" >"$DEV_LOG_FILE" 2>&1 &
    else
      nohup npx vite --force --config vite.web.config.ts --host "$HOST" --port "$PORT" >"$DEV_LOG_FILE" 2>&1 &
    fi
    echo $! >"$PID_FILE"
  )

  sleep 1
  pid="$(read_pid || true)"
  if ! is_pid_running "${pid:-}"; then
    echo "启动失败，请检查日志: $DEV_LOG_FILE" >&2
    exit 1
  fi

  log "启动成功 (pid=$pid), 日志: $DEV_LOG_FILE"
}

stop_server() {
  local pid
  pid="$(read_pid || true)"
  if [[ -z "${pid:-}" ]]; then
    log "未发现 PID 文件，无需停止"
    return
  fi

  if ! is_pid_running "$pid"; then
    log "进程不存在，清理 PID 文件"
    rm -f "$PID_FILE"
    return
  fi

  log "停止服务 (pid=$pid)..."
  kill "$pid" >/dev/null 2>&1 || true
  sleep 1

  if is_pid_running "$pid"; then
    log "进程仍在运行，执行强制停止"
    kill -9 "$pid" >/dev/null 2>&1 || true
  fi

  rm -f "$PID_FILE"
  log "服务已停止"
}

kill_matching_processes() {
  local pattern="$1"
  local pids
  pids="$(pgrep -f "$pattern" || true)"
  if [[ -z "${pids:-}" ]]; then
    return
  fi

  log "清理残留进程: $pattern"
  # shellcheck disable=SC2086
  kill $pids >/dev/null 2>&1 || true
  sleep 1

  local alive=()
  local pid
  for pid in $pids; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      alive+=("$pid")
    fi
  done

  if [[ ${#alive[@]} -gt 0 ]]; then
    kill -9 "${alive[@]}" >/dev/null 2>&1 || true
  fi
}

cleanup_project_processes() {
  kill_matching_processes "$ROOT_DIR/node_modules/electron/dist/electron"
  kill_matching_processes "$ROOT_DIR/node_modules/.bin/vite"
  rm -f "$PID_FILE"
}

status_server() {
  local pid
  pid="$(read_pid || true)"

  if is_pid_running "${pid:-}"; then
    log "状态: 运行中 (pid=$pid)"
  else
    log "状态: 未运行"
  fi

  ports_server
}

check_server() {
  need_cmd curl
  local url="http://$CHECK_HOST:$PORT"
  if curl -sS -m 3 "$url" >/dev/null 2>&1; then
    log "健康检查通过: $url"
  else
    echo "健康检查失败: $url" >&2
    echo "请执行 ./scripts/ops.sh logs 查看日志" >&2
    exit 1
  fi
}

logs_server() {
  ensure_dirs
  if [[ ! -f "$DEV_LOG_FILE" ]]; then
    echo "日志文件不存在: $DEV_LOG_FILE" >&2
    exit 1
  fi
  log "实时查看日志: $DEV_LOG_FILE"
  tail -f "$DEV_LOG_FILE"
}

ps_server() {
  log "openim-electron-demo 相关进程:"
  ps -ef | awk '
    NR==1 {print; next}
    tolower($0) ~ /openim-electron-demo|vite|electron/ {print}
  '
}

ports_server() {
  log "开发服务监听端口:"
  ss -lntp | awk -v p=":$PORT" '
    NR==1 {print; next}
    index($4, p) > 0 {print}
  '
}

cmd="${1:-help}"
case "$cmd" in
  install)
    install_deps
    ;;
  build)
    build_electron
    ;;
  build-web)
    build_web_only
    ;;
  start)
    start_server
    ;;
  start-electron)
    DEV_TARGET=electron
    export DEV_TARGET
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    stop_server
    start_server
    ;;
  restart-electron)
    DEV_TARGET=electron
    export DEV_TARGET
    stop_server
    cleanup_project_processes
    start_server
    ;;
  status)
    status_server
    ;;
  check)
    check_server
    ;;
  logs)
    logs_server
    ;;
  ps)
    ps_server
    ;;
  ports)
    ports_server
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    echo "未知命令: $cmd" >&2
    echo
    usage
    exit 1
    ;;
esac
