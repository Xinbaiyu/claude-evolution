## Context

当前 claude-evolution 的提醒系统支持两种通知渠道：桌面通知（DesktopChannel）和 WebSocket（WebSocketChannel）。通道架构基于 `NotificationChannel` 接口，通过 `NotificationDispatcher` 并行分发。配置在 `reminders.channels` 下按通道名独立启停。

用户希望在不在电脑前时也能收到提醒，钉钉等 IM 工具是最常用的移动端触达方式。参考 openclaw 项目的插件化通道设计（adapter + plugin registry），我们在现有架构上增加一个通用的 webhook 通道即可满足需求，无需引入完整的插件系统。

## Goals / Non-Goals

**Goals:**
- 新增 `WebhookChannel`，实现 `NotificationChannel` 接口
- 内置钉钉机器人 webhook 模板（text 消息 + 可选签名验证）
- 提供请求体模板机制（Handlebars 风格占位符），用户可适配任意 webhook（飞书、企微、Slack Incoming Webhook）
- 支持配置多个 webhook endpoint（如同时发钉钉和飞书）
- 配置错误时跳过该 webhook 并 warn，不影响其他通道

**Non-Goals:**
- 不实现双向交互（如在钉钉中回复操作提醒）
- 不实现 webhook 重试/队列机制（单次 fire-and-forget）
- 不实现 OAuth/复杂鉴权流程（仅支持 URL token + HMAC 签名）
- 不构建类似 openclaw 的完整插件注册系统

## Decisions

### D1: 通用 WebhookChannel + 模板机制 vs 每个 IM 独立 Channel

**选择**: 通用 WebhookChannel + 内置预设模板

**理由**: 钉钉/飞书/企微的 webhook 接口本质都是 HTTP POST JSON，差异仅在请求体结构和签名方式。一个通用 channel 配合模板比为每个 IM 写独立 channel 更灵活、维护成本更低。

**替代方案**: 每个 IM 一个 channel class — 代码重复度高，新增 IM 需改代码。

### D2: 模板语法 — 简单占位符 vs Handlebars

**选择**: 简单 `{{variable}}` 占位符替换

**理由**: 通知消息体结构简单（title + body），不需要条件逻辑或循环。简单字符串替换零依赖，容易理解。

**可用变量**: `{{title}}`, `{{body}}`, `{{type}}`, `{{timestamp}}`

### D3: 钉钉签名实现

**选择**: 内置 HMAC-SHA256 签名支持

**理由**: 钉钉自定义机器人的加签模式是最安全的验证方式，实现简单（Node.js crypto 模块），无需外部依赖。签名逻辑：`HmacSHA256(timestamp + "\n" + secret, secret)` → Base64 → URL encode，追加到 webhook URL query 参数。

### D4: 多 webhook 配置结构

**选择**: `webhooks` 数组，每项包含 `name`, `url`, `template/preset`, `secret`

**理由**: 数组结构比 named map 更直观，支持同一平台配多个群机器人。`preset` 字段引用内置模板（如 `"dingtalk"`），`template` 字段允许自定义请求体。

```typescript
// 配置示例
{
  reminders: {
    channels: {
      webhook: {
        enabled: true,
        webhooks: [
          {
            name: "钉钉-团队群",
            url: "https://oapi.dingtalk.com/robot/send?access_token=xxx",
            preset: "dingtalk",
            secret: "SEC..."  // 可选，用于加签
          },
          {
            name: "飞书-项目群",
            url: "https://open.feishu.cn/open-apis/bot/v2/hook/xxx",
            preset: "feishu"
          }
        ]
      }
    }
  }
}
```

### D5: 内置预设列表

| 预设名 | 平台 | 请求体格式 | 签名方式 |
|--------|------|-----------|---------|
| `dingtalk` | 钉钉 | `{"msgtype":"text","text":{"content":"{{title}}: {{body}}"}}` | HMAC-SHA256 (可选) |
| `feishu` | 飞书 | `{"msg_type":"text","content":{"text":"{{title}}: {{body}}"}}` | HMAC-SHA256 (可选) |
| `wecom` | 企业微信 | `{"msgtype":"text","text":{"content":"{{title}}: {{body}}"}}` | 无（URL token） |
| `slack-incoming` | Slack | `{"text":"*{{title}}*\n{{body}}"}` | 无（URL token） |

## Risks / Trade-offs

- **[Webhook URL 泄露]** → URL 包含 access_token，仅存储在本地 config 文件，不通过 API 暴露，不写入日志
- **[网络不可达]** → 单次发送失败仅 warn 日志，不阻塞其他通道。用户可通过 WebUI 查看通知历史确认是否送达
- **[钉钉频率限制]** → 钉钉机器人每分钟最多 20 条消息，正常提醒频率远低于此，不做额外限流
- **[模板注入]** → 用户控制模板内容但仅用于自己的本地通知，风险可接受。对 title/body 做 JSON 转义防止 JSON 格式破坏
