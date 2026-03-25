## bot-llm-chat

### 概述
当用户消息不匹配任何固定命令时，作为 fallback 调用 Claude API 进行开放式对话，支持异步回复和群聊上下文记忆。

### 异步回复流程

1. 用户 @Bot "帮我调研下字节跳动"
2. 命令路由无匹配 → 进入 LLM chat handler
3. **同步返回**: `{"msgtype":"text","text":{"content":"正在思考..."}}`
4. **后台异步**: 调用 Claude API（携带群聊上下文）
5. **获取回复后**: POST `sessionWebhook`（钉钉回调请求中携带，有效期 ~2h）
6. 钉钉群显示 Claude 的回复

### 群聊上下文记忆

**策略**: 滑动窗口 + 超时过期

- 每个 chatId 维护独立的消息历史
- 窗口大小: 最近 20 条（可配置 `bot.chat.contextWindow`）
- 超时过期: 30 分钟无活动自动清空（可配置 `bot.chat.contextTimeoutMinutes`）
- 存储: 内存 Map，daemon 重启自动清空
- 定时清理: 每 5 分钟扫描清除超时上下文

### 行为要求

- [ ] 无匹配命令时触发 LLM chat handler
- [ ] 先同步返回"正在思考..."占位回复
- [ ] 异步调用 Anthropic SDK，使用项目 llm 配置（model、temperature、maxTokens）
- [ ] 请求携带群聊历史上下文（ChatContextManager.getHistory）
- [ ] Claude 回复后通过 sessionWebhook POST 推送到群
- [ ] 推送完成后将 user 消息 + assistant 回复写入上下文
- [ ] 消息超过窗口大小时丢弃最早的消息
- [ ] 30 分钟无活动的群上下文自动清空
- [ ] sessionWebhook 不存在或过期时，静默跳过异步回复（已有同步占位）
- [ ] Claude API 调用失败时，通过 sessionWebhook 发送错误提示
- [ ] 系统提示词定义 Claude 为编程助手角色，简洁友好
