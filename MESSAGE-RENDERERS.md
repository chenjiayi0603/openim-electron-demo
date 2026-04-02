# 消息类型渲染器

## 背景

前端聊天界面对未注册的消息类型统一显示 `[Unsupported Message Type]`（`messageDescription.catchMessage`）。
根本原因：`MessageItem/index.tsx` 的 `components` map 原本只注册了 `TextMessage` 和 `PictureMessage`，
其余所有类型均 fallback 到 `CatchMessageRender`。

## 修复内容

在 `src/pages/chat/queryChat/MessageItem/` 下新增以下渲染器并注册：

| 文件 | MessageType | 值 | 渲染方式 |
|------|------------|-----|---------|
| `VoiceMessageRender.tsx` | VoiceMessage | 103 | `<audio>` 播放器，无 URL 时显示时长文字 |
| `VideoMessageRender.tsx` | VideoMessage | 104 | `<video>` 播放器 + 封面图 |
| `FileMessageRender.tsx` | FileMessage | 105 | 文件名 + 大小 + 下载链接 |
| `AtTextMessageRender.tsx` | AtTextMessage | 106 | 渲染 `atTextElem.text` |
| `MergeMessageRender.tsx` | MergeMessage | 107 | 卡片：标题 + 最多 3 条摘要 |
| `CardMessageRender.tsx` | CardMessage | 108 | 头像 + 昵称名片卡 |
| `LocationMessageRender.tsx` | LocationMessage | 109 | 位置描述 + Google Maps 链接 |
| `CustomMessageRender.tsx` | CustomMessage | 110 | 通话类型（`CustomType` 200-204）显示 `[通话]`，其余用 `description` |
| `QuoteMessageRender.tsx` | QuoteMessage | 114 | 引用块 + 回复文本 |
| `FaceMessageRender.tsx` | FaceMessage | 115 | 表情图片（`faceElem.data`），无图时显示文字 |

## 兜底逻辑

- 所有新渲染器在数据缺失时均有文字兜底，不会崩溃
- 仍不在 `components` map 中的类型（如 `TypingMessage`）继续走 `CatchMessageRender`
- `SystemMessageTypes`（群通知、撤回等）由 `ChatContent.tsx` 路由到 `NotificationMessage`，不经过此 map

## 相关文件

- `src/pages/chat/queryChat/MessageItem/index.tsx` — components map 注册
- `src/constants/im.ts` — `SystemMessageTypes` / `CustomType` 定义
- `src/utils/imCommon.ts` — `notificationMessageFormat` / `formatMessageByType`
- `src/i18n/resources/zh.json` / `en.json` — `messageDescription.*` 文案
