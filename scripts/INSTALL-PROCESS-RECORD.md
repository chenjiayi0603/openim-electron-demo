# openim-electron-demo 安装过程记录（WSL）

本文记录在 WSL 环境下完成 `openim-electron-demo` 依赖安装与问题修复的全过程，便于后续复现。

## 背景问题

在 WSL 路径中执行 `npm install` 时出现报错：

- 调用了 `C:\WINDOWS\system32\cmd.exe`
- UNC 路径（`\\wsl.localhost\...`）不被 `cmd.exe` 支持
- 触发 `MODULE_NOT_FOUND`（`cnoke.js` 路径错误）

根因：WSL 中误用了 Windows 的 `npm/node`。

## 处理步骤

### 1) 安装并启用 nvm + Node 20（Linux）

```bash
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
else
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  . "$NVM_DIR/nvm.sh"
fi

nvm install 20
nvm use 20
nvm alias default 20
```

### 2) 校验当前 node/npm 来源

```bash
which node
which npm
node -v
npm -v
```

预期：路径应为 `~/.nvm/versions/node/...`，不是 `/mnt/d/...` 或 `C:\...`。

### 3) 清理并重装依赖

```bash
cd /home/administrator/interview-quicker/openim/openim-electron-demo
rm -rf node_modules package-lock.json
npm install --no-audit --no-fund
```

### 4) patch-package 报错修复

安装过程中遇到：

- `patch-package` 提示 `@ckeditor/ckeditor5-ui` 缺失

执行修复：

```bash
npm install --no-save @ckeditor/ckeditor5-ui@43.0.0
npx patch-package
```

结果：补丁应用成功（`@ckeditor/ckeditor5-ui@43.0.0 ✔`）。

## 最终状态

- Node: `v20.20.2`
- npm: `10.8.2`
- 安装环境：WSL Linux Node（nvm）
- 项目可继续执行开发命令：

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20
./scripts/ops.sh start
```

## 启动后访问方式

当终端提示类似 `服务已在运行 (pid=xxxx)` 时，表示开发服务已启动。

- 本机访问：
  - `http://127.0.0.1:5173`
  - `http://localhost:5173`
- 远程机器访问（局域网）：
  1. 先改为对外监听并重启：

     ```bash
     HOST=0.0.0.0 ./scripts/ops.sh restart
     ```

  2. 再通过服务器 IP 访问：

     ```text
     http://<服务器IP>:5173
     ```

## 建议

- 后续始终通过 nvm 管理 Node，避免回退到 Windows npm。
- 若新终端未自动加载 nvm，先执行：

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20
```
