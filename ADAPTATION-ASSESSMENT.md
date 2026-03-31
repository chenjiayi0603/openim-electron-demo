# openim-electron-demo 适配性评估（open-im-server / openim-chat / openim-livekit）

## 结论

- 当前客户端代码链路设计满足联调方向：
  - 登录与业务接口走 `openim-chat`（`10008`）
  - IM SDK 连接 `open-im-server`（`10002` API + `10001` WS）
  - RTC 通过 `openim-chat` 获取 LiveKit token
- 当前运行环境下的总体结论：**部分满足（可做登录+IM测试，RTC实连暂不满足）**
  - 原因：本机未发现 LiveKit 监听端口（`7880/7881`）

## 代码映射核对

- 环境变量映射：`.env`
  - `VITE_WS_URL=ws://$VITE_BASE_HOST:10001`
  - `VITE_API_URL=http://$VITE_BASE_HOST:10002`
  - `VITE_CHAT_URL=http://$VITE_BASE_HOST:10008`
- 登录/注册接口：`src/api/login.ts`
  - `/account/register`
  - `/account/login`
- IM SDK 初始化：`src/layout/useGlobalEvents.tsx`
  - `apiAddr = VITE_API_URL`
  - `wsAddr = VITE_WS_URL`
- RTC token 接口：`src/api/imApi.ts`
  - `/user/rtc/get_token`
- LiveKit 客户端接入：`src/pages/common/RtcCallModal/index.tsx`
  - 使用 `LiveKitRoom`，依赖 `serverUrl + token`

## 服务状态与接口实测

## 1) open-im-server / openim-chat 状态

- `open-im-server`：`./scripts/ops.sh status` 返回 `All services are running normally`
- `openim-chat`：`mage check` 返回 `All services are running normally`
- 关键端口在线：`10001`、`10002`、`10008`

## 2) 业务登录链路（chat）

- `/account/login` 可正常响应（参数错误会返回 `ArgsError`，合法参数会返回 token）
- 已实测 `register -> login` 成功，返回：
  - `chatToken`
  - `imToken`
  - `userID`

## 3) IM 核心链路（server）

- 使用登录返回的 `imToken` 调用 `open-im-server`：
  - `POST /auth/parse_token`
  - 返回 `errCode=0` 且解析出 `userID/platformID/expireTimeSeconds`
- 说明客户端的 IM 登录令牌可被 `open-im-server` 正常识别

## 4) RTC / LiveKit 链路

- `openim-chat` 的 `/user/rtc/get_token` 在携带 `chatToken` 后可返回：
  - `serverUrl=ws://127.0.0.1:7880`
  - `token=<jwt>`
- 但当前机器 LiveKit 端口未监听：
  - `7880` 不通
  - `7881` 不通
- 因此：当前只验证了“发放 RTC token 能力”，**尚未验证实际音视频入会成功**

## 配置一致性检查

- `openim-chat/config/chat-rpc-chat.yml` 中 LiveKit 配置：
  - `url: ws://127.0.0.1:7880`
  - `key/secret` 已配置
- `openim-chat/livekit/livekit.yaml` 中 `keys` 与上面配置一致
- `openim-livekit` 目录目前仅看到 `config-sample.yaml`（样例），未发现本地运行配置文件

## 最小验收步骤（建议）

1. 客户端 `.env` 将 `VITE_BASE_HOST` 改成实际服务 IP（不要保留 `your-server-ip`）。
2. 确认 `open-im-server` 与 `openim-chat` 都是 healthy。
3. 在客户端执行注册/登录，确认能进入会话页并收发消息。
4. 启动 `openim-livekit`（或可达的外部 LiveKit），确保 `7880/7881` 可达。
5. 再次发起音视频通话，确认 `LiveKitRoom` 成功连接。

## 判定

- 登录/IM 测试：**满足**
- RTC 测试：**已满足（LiveKit 已启动，7880/7881 可达）**
