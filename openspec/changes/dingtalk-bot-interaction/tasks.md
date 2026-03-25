## Tasks

### Phase 1: Bot Adapter 基础类型 + 接口

- [x] 1.1 创建 `src/bot/types.ts` — BotMessage（含 sessionWebhook）、BotReply（含 async 标记）、CommandContext、CommandHandler 接口定义
- [x]1.2 创建 `src/bot/adapter.ts` — BotAdapter 抽象接口（含 sendAsync 方法）
- [x]1.3 创建 `src/bot/reply-formatter.ts` — 钉钉回复格式化纯函数（text/markdown，截断处理）

### Phase 2: 钉钉 Inbound Adapter

- [x]2.1 创建 `src/bot/dingtalk-verify.ts` — 签名验证独立模块（纯函数，便于测试）
- [x]2.2 创建 `src/bot/dingtalk-adapter.ts` — DingTalkBotAdapter 类
  - 签名验证（HMAC-SHA256）
  - 消息解析（去除 @bot 文本，提取 senderId/senderNick/content/sessionWebhook）
  - Express 路由注册（POST /api/bot/dingtalk）
  - 同步回复通过 res.json()，异步回复通过 sendAsync() POST sessionWebhook

### Phase 3: 命令路由与处理器

- [x]3.1 创建 `src/bot/command-router.ts` — BotCommandRouter 类（前缀匹配 + 别名 + LLM fallback）
- [x]3.2 创建 `src/bot/commands/help.ts` — /help 帮助命令
- [x]3.3 创建 `src/bot/commands/status.ts` — /status 系统状态命令
- [x]3.4 创建 `src/bot/commands/analyze.ts` — /analyze 手动触发分析命令
- [x]3.5 创建 `src/bot/commands/remind.ts` — /remind 创建提醒命令
- [x]3.6 创建 `src/bot/commands/reminders.ts` — /reminders 列出提醒命令

### Phase 4: LLM 对话 + 上下文记忆

- [x]4.1 创建 `src/bot/chat-context.ts` — ChatContextManager 类（滑动窗口 20 条 + 30 分钟超时 + 定时清理）
- [x]4.2 创建 `src/bot/commands/chat.ts` — LLM 对话 fallback handler（调用 Anthropic SDK，异步回复，写入上下文）
- [x]4.3 创建 `src/bot/async-reply.ts` — 异步回复模块（POST sessionWebhook）

### Phase 5: 配置 + Daemon 集成

- [x]5.1 扩展 `src/config/schema.ts` — 新增 bot 配置段 schema（含 chat.contextWindow、chat.contextTimeoutMinutes）
- [x]5.2 修改 `src/daemon/lifecycle.ts` — startComponents 中注册 bot adapter
- [x]5.3 修改 `web/server/index.ts` — 挂载 bot 路由到 Express app

### Phase 6: WebUI 配置

- [x]6.1 修改 `web/client/src/api/client.ts` — Config 接口新增 bot 字段
- [x]6.2 修改 `web/client/src/pages/Settings.tsx` — 新增"机器人"配置区域

### Phase 7: 测试

- [x]7.1 创建 `tests/bot/dingtalk-verify.test.ts` — 签名验证测试
- [x]7.2 创建 `tests/bot/reply-formatter.test.ts` — 回复格式化测试
- [x]7.3 创建 `tests/bot/command-router.test.ts` — 命令路由测试（含 LLM fallback）
- [x]7.4 创建 `tests/bot/chat-context.test.ts` — 上下文记忆测试（窗口溢出、超时过期、按群隔离）
- [x]7.5 创建 `tests/bot/dingtalk-adapter.test.ts` — adapter 集成测试（同步 + 异步回复）
