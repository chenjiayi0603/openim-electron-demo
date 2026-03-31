#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
NODE_MAJOR="${NODE_MAJOR:-20}"
SKIP_APT="${SKIP_APT:-0}"
CLEAN_INSTALL="${CLEAN_INSTALL:-1}"

usage() {
  cat <<'EOF'
openim-electron-demo 安装脚本（WSL/Linux）

用法:
  ./scripts/install.sh [选项]

选项:
  --skip-apt      跳过系统库安装（libnss3/libasound2t64）
  --no-clean      不删除 node_modules/package-lock.json
  -h, --help      显示帮助

环境变量:
  NODE_MAJOR      默认: 20
  SKIP_APT        默认: 0
  CLEAN_INSTALL   默认: 1
EOF
}

log() {
  echo "[install] $*"
}

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "缺少命令: $1" >&2
    exit 1
  fi
}

for arg in "$@"; do
  case "$arg" in
    --skip-apt)
      SKIP_APT=1
      ;;
    --no-clean)
      CLEAN_INSTALL=0
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "未知参数: $arg" >&2
      usage
      exit 1
      ;;
  esac
done

need_cmd curl
need_cmd bash

if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  log "安装 nvm..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

# shellcheck disable=SC1090
. "$NVM_DIR/nvm.sh"

log "安装/切换 Node ${NODE_MAJOR}..."
nvm install "$NODE_MAJOR"
nvm use "$NODE_MAJOR"
nvm alias default "$NODE_MAJOR"

log "当前 Node/NPM:"
which node
which npm
node -v
npm -v

if [[ "$SKIP_APT" != "1" ]]; then
  if command -v sudo >/dev/null 2>&1; then
    log "安装 Electron 系统依赖（可能需要输入 sudo 密码）..."
    sudo apt-get update
    sudo apt-get install -y libnss3 libasound2t64
  else
    log "未找到 sudo，跳过系统库安装。"
  fi
fi

cd "$ROOT_DIR"

if [[ "$CLEAN_INSTALL" == "1" ]]; then
  log "清理旧依赖..."
  rm -rf node_modules package-lock.json
fi

log "安装 npm 依赖..."
npm install --no-audit --no-fund

log "补齐历史缺失依赖并应用 patch-package..."
npm install --no-save \
  @ckeditor/ckeditor5-ui@43.0.0 \
  @ckeditor/ckeditor5-editor-classic@43.0.0 \
  @ckeditor/ckeditor5-essentials@43.0.0 \
  @ckeditor/ckeditor5-paragraph@43.0.0 \
  esbuild
npx patch-package

log "安装完成。可执行: ./scripts/ops.sh start"
