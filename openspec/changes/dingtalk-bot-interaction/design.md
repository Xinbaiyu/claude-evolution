## Architecture

### 整体流程

```
钉钉群 @Bot "查看状态"
    ↓
钉钉 Outgoing Webhook POST
    ↓
claude-evolution daemon (HTTP endpoint)
    ↓ 验证签名
DingTalkBotAdapter.handleIncoming()
    ↓ 解析消息
BotCommandRouter.dispatch(message)
    ↓
┌─── 匹配固定命令？──── Yes ──→ CommandHandler.execute()
│                                    ↓ 同步回复（res.json）
│                               钉钉群 ← 机器人回复
│
└─── No（开放式对话）──→ 同步回复 "正在思考..."
                              ↓ 异步
                         ChatHandler.execute()
                              ↓ 调用 Claude API（带上下文）
                         POST sessionWebhook
                              ↓
                         钉钉群 ← 异步回复
```

### 核心模块

#### 1. Bot Adapter Interface (`src/bot/adapter.ts`)

```typescript
interface BotMessage {
  platform: string;          // 'dingtalk' | 'feishu' | ...
  messageId: string;
  chatId: string;
  chatType: 'group' | 'private';
  senderId: string;
  senderName: string;
  content: string;           // 去除 @bot 后的纯文本
  rawContent: string;
  timestamp: string;
  replyToken?: string;       // 平台特定的回复凭据
  sessionWebhook?: string;   // 钉钉异步回复 URL（有效期约 2 小时）
}

interface BotReply {
  content: string;
  format: 'text' | 'markdown';
  async?: boolean;           // true 表示需要异步回复
}

interface BotAdapter {
  readonly platform: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  onMessage(handler: (msg: BotMessage) => Promise<BotReply>): void;
  sendAsync(msg: BotMessage, reply: BotReply): Promise<void>;  // 异步推送回复
}
```

#### 2. DingTalk Bot Adapter (`src/bot/dingtalk-adapter.ts`)

复用现有 web server（Express），在 `/api/bot/dingtalk` 挂载路由：

- **接收**: POST 请求，钉钉推送 JSON body
  - `msgtype: "text"`, `text.content` 为消息内容
  - `senderNick`, `senderId`, `conversationId` 等
  - Header 中 `timestamp` + `sign` 用于签名验证
- **签名验证**: HMAC-SHA256(`timestamp + "\n" + appSecret`, appSecret)，与 header sign 对比
- **回复**: 两种模式：
  - **同步**: 固定命令直接在 HTTP response body 返回 JSON
  - **异步**: LLM 对话先同步返回"正在思考..."，后台调用 Claude API，完成后通过 `sessionWebhook` POST 推送结果（钉钉 Outgoing 提供，有效期约 2 小时）

#### 3. 异步回复模块 (`src/bot/async-reply.ts`)

通过钉钉提供的 `sessionWebhook` URL 异步推送消息：

```typescript
async function sendAsyncReply(sessionWebhook: string, reply: BotReply): Promise<void> {
  // POST sessionWebhook with reply body
  // sessionWebhook 由钉钉每次回调请求携带，有效期 ~2 小时
  // 无需 access_token，直接 POST 即可
}
```

#### 4. Command Router (`src/bot/command-router.ts`)

简单的前缀匹配路由：

| 命令 | 处理 | 回复示例 |
|------|------|----------|
| `/status` 或 `状态` | 读取 status.json + config | "调度器: 运行中, 上次分析: 2h前, 观察: 62条" |
| `/analyze` 或 `分析` | 调用 executor.execute() | "分析已启动，完成后会通知你" |
| `/remind <msg> <time>` | 创建提醒 | "已设置: 30分钟后提醒你开会" |
| `/reminders` 或 `提醒列表` | 列出活跃提醒 | Markdown 表格 |
| `/help` 或 `帮助` | 列出命令 | 命令列表 |
| 其他文本 | LLM 对话 fallback | Claude 生成的回复（异步推送） |

每个命令是一个 `CommandHandler`:

```typescript
interface CommandHandler {
  readonly name: string;
  readonly aliases: string[];
  readonly description: string;
  match(content: string): boolean;
  execute(ctx: CommandContext): Promise<BotReply>;
}
```

#### 5. 配置 Schema

```json
{
  "bot": {
    "enabled": false,
    "dingtalk": {
      "enabled": false,
      "appSecret": "SEC...",
      "path": "/api/bot/dingtalk"
    },
    "chat": {
      "enabled": true,
      "contextWindow": 20,
      "contextTimeoutMinutes": 30
    }
  }
}
```

#### 6. LLM 对话处理器 (`src/bot/commands/chat.ts`)

命令路由无匹配时的 fallback handler：

- 调用 Anthropic SDK（复用项目已有的 llm 配置：model、temperature、maxTokens）
- 携带群聊上下文（ChatContextManager 提供的历史消息）
- 异步执行：先同步返回"正在思考..."，再通过 sessionWebhook 推送 Claude 回复
- 系统提示词简洁：引导 Claude 作为编程助手角色回复

#### 7. 群聊上下文记忆 (`src/bot/chat-context.ts`)

**策略**: 滑动窗口 + 超时过期

```typescript
class ChatContextManager {
  // 内存 Map<chatId, ChatHistory>
  // 不持久化，daemon 重启即清空

  getHistory(chatId: string): ChatMessage[];
  addMessage(chatId: string, role: 'user' | 'assistant', content: string): void;
  clear(chatId: string): void;
}

interface ChatHistory {
  messages: ChatMessage[];   // 最多 contextWindow 条（默认 20）
  lastActivity: number;      // 最后活跃时间戳
}
```

**淘汰规则**:
- 窗口大小: 20 条（可配置），超出时丢弃最早的消息
- 超时过期: 30 分钟无活动自动清空（视为新话题）
- 按群隔离: 每个 chatId 独立上下文
- 内存存储: 不持久化，daemon 重启自动清空
- 定时清理: 每 5 分钟扫描并清除超时的群上下文

复用 daemon 的 web server 端口（10010），不额外开端口。

### 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 通信方式 | Outgoing Webhook (同步 + 异步) | 固定命令同步回复，LLM 对话异步回复（先回"思考中"，再 POST sessionWebhook） |
| 部署方式 | 复用 Express web server | 不新增端口，路由挂载到 `/api/bot/dingtalk` |
| 命令路由 | 前缀匹配 + 别名 + LLM fallback | 简单命令前缀匹配，未匹配时 fallback 到 Claude API |
| 上下文记忆 | 滑动窗口 20 条 + 30 分钟超时 | 简单可靠，内存存储不需要持久化，按群隔离 |
| Adapter 抽象 | 接口 + 具体实现 | 未来可加飞书/企微 adapter |
| 签名验证 | 必须启用 | 防止伪造回调 |

### 安全考虑

- 签名验证必须在处理消息前完成
- appSecret 仅存储在 config.json，不通过 API 暴露
- 命令执行使用现有的内部 API，不暴露新的外部接口
- `/analyze` 等写操作需要限流（同一时间只能一个分析）

### 与现有系统集成

- **AnalysisExecutor**: `/analyze` 命令复用 `sharedExecutor`
- **ReminderService**: `/remind` 命令复用已注入的 `reminderService`
- **Config**: 复用现有 config loader + schema 验证
- **Web Server**: 路由挂载到现有 Express app
