## Why

当前提醒系统只支持桌面通知和 WebSocket 两种渠道。用户不在电脑前时完全收不到提醒，需要接入钉钉等 IM 工具实现移动端触达。参考 openclaw 项目的插件化通道架构，我们需要一个可扩展的 webhook 通道机制，让用户可以将提醒推送到钉钉、飞书、企业微信等任意支持 webhook 的通讯工具。

## What Changes

- 新增 `WebhookChannel` 通用通知渠道，支持通过 HTTP webhook 发送通知
- 内置钉钉（DingTalk）机器人 webhook 模板，开箱即用
- 提供模板机制（template），用户可自定义请求体格式，适配任意 webhook 接口（飞书、企微、Slack Incoming Webhook 等）
- 扩展配置 schema，在 `reminders.channels` 下新增 `webhook` 配置段
- 在 daemon lifecycle 中注册 WebhookChannel
- WebUI 提醒管理页面增加 webhook 通道状态展示

## Capabilities

### New Capabilities
- `webhook-notification`: 通用 webhook 通知通道，支持自定义 HTTP 请求模板，内置钉钉机器人适配

### Modified Capabilities
- `notification-channel`: 扩展 NotificationDispatcher 以支持 webhook 通道注册与配置

## Impact

- **代码**: `src/notifications/` 新增 webhook-channel.ts；`src/config/schema.ts` 扩展 channels 配置
- **配置**: `~/.claude-evolution/config.json` 增加 `reminders.channels.webhook` 配置段
- **依赖**: 无新外部依赖，使用 Node.js 内置 `fetch` 发送 HTTP 请求
- **API**: 无 REST API 变更，通道注册在 daemon 启动时完成
- **安全**: webhook URL 和签名密钥需在本地配置文件中管理，不通过 API 暴露
