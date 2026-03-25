## Why

当前 claude-evolution 的通知是单向的（系统 → 用户），用户只能在 WebUI 或命令行操作。如果能在钉钉群里 @机器人 提问、查看分析结果、管理提醒，就能把日常 IM 工作流和代码进化系统打通，降低使用门槛。OpenClaw 已验证了 IM 双向交互的可行性（飞书 WebSocket + HTTP 回调），可以借鉴其 adapter 模式简化实现。

## What Changes

- 新增钉钉机器人 Outgoing Webhook 接收端，监听群内 @bot 消息
- 新增消息路由与处理器，支持文本命令（查状态、触发分析、管理提醒等）
- 新增 LLM 对话 fallback — 无匹配命令时调用 Claude API 进行开放式对话（如"调研下字节跳动"）
- 异步回复机制 — Claude 回复较慢时先同步返回"处理中"，再通过 sessionWebhook 异步推送结果
- 群聊上下文记忆 — 滑动窗口（20 条）+ 30 分钟超时过期，按群隔离
- 新增回复推送模块，将处理结果回复到原群/原消息
- 扩展 daemon lifecycle，启动时注册 bot HTTP 服务
- WebUI Settings 新增"机器人"配置 tab（token、secret、端口等）
- 设计可扩展的 adapter 接口，未来可接入飞书、企微等平台

## Capabilities

### New Capabilities
- `dingtalk-bot-inbound`: 钉钉 Outgoing Webhook 接收端 — HTTP 服务接收钉钉推送的 @bot 消息，验证签名，解析消息内容和发送者信息
- `bot-command-router`: 机器人命令路由与处理 — 将用户消息路由到对应处理器（/status、/analyze、/remind 等），返回结构化回复
- `bot-llm-chat`: LLM 对话 fallback — 无匹配命令时调用 Claude API 开放式对话，支持异步回复 + 滑动窗口上下文记忆
- `dingtalk-bot-reply`: 钉钉消息回复 — 通过 Webhook URL 将处理结果推送回原群聊，支持 Markdown 格式

### Modified Capabilities
- `notification-channel`: 扩展通知渠道支持双向交互上下文（可选，将 bot 回复作为通知渠道的一种形式）

## Impact

- **新增 HTTP 端点**: daemon 新增一个端口（或复用 web server）接收钉钉回调
- **新增依赖**: 钉钉签名验证（crypto，已有）
- **配置扩展**: config.json 新增 `bot` 配置段
- **daemon lifecycle**: startComponents 增加 bot 服务注册
- **安全**: 需要验证钉钉回调签名，防止伪造请求
