## Architecture

### 整体流程

```
钉钉 @Bot "在 ~/projects/myapp 帮我看下为什么登录报错"
    ↓
BotCommandRouter: 无匹配固定命令 → fallback
    ↓
CCBridgeHandler (替代原 ChatCommand)
    ↓ 解析工作目录 + 验证白名单
    ↓ 同步回复 "正在处理..."
    ↓
spawn('claude', ['-p', '--print', '--output-format', 'json', ...], { cwd })
    ↓ 等待子进程完成
    ↓ 解析 JSON 输出
POST sessionWebhook → 钉钉群回复
```

### 核心模块

#### 1. CCBridgeHandler (`src/bot/commands/cc-bridge.ts`)

替代原 `chat.ts`，核心逻辑：

```typescript
class CCBridgeHandler implements CommandHandler {
  match(): boolean { return false; } // 仅作为 fallback

  async execute(ctx: CommandContext): Promise<BotReply> {
    // 1. 解析工作目录（从消息中提取 或 使用默认目录）
    // 2. 验证目录在白名单中
    // 3. 注入群聊上下文作为 system prompt
    // 4. 返回 async: true（先回"处理中"）
    // 5. 后台 spawn claude -p 子进程
    // 6. 完成后通过 sessionWebhook 推送结果
  }
}
```

#### 2. CC 子进程执行器 (`src/bot/cc-executor.ts`)

封装 `child_process.spawn`：

```typescript
interface CCExecuteOptions {
  prompt: string;
  cwd: string;
  timeoutMs?: number;        // 默认 120000 (2分钟)
  maxBudgetUsd?: number;     // 默认 0.5
  systemPrompt?: string;     // 群聊上下文注入
  permissionMode?: string;   // 默认 'bypassPermissions'
}

interface CCExecuteResult {
  success: boolean;
  result?: string;           // Claude 的回复文本
  error?: string;
  costUsd?: number;
  durationMs: number;
}

async function executeCC(options: CCExecuteOptions): Promise<CCExecuteResult>
```

spawn 参数：
```bash
claude -p \
  --print \
  --output-format json \
  --permission-mode bypassPermissions \
  --max-budget-usd 0.5 \
  --append-system-prompt "群聊上下文: ..." \
  --no-session-persistence \
  "用户的消息"
```

**Claude Code Router 兼容**：spawn 时继承 `process.env`，这样如果用户通过 `eval "$(ccr activate)"` 激活了 CCR，子进程自动使用 `ANTHROPIC_BASE_URL=http://127.0.0.1:3456` 走代理。也可以在 bot.cc 配置中显式指定 `baseURL`，spawn 时注入 `ANTHROPIC_BASE_URL` 环境变量。

#### 3. 工作目录解析 (`src/bot/path-resolver.ts`)

从消息中提取目录路径：

```
"在 ~/projects/myapp 帮我看下bug"  → cwd: ~/projects/myapp, prompt: "帮我看下bug"
"帮我看下bug"                       → cwd: 默认目录（config 配置）
```

匹配规则：
- `在 <path> <prompt>` / `在<path>下 <prompt>`
- `cd <path> && <prompt>`
- 无路径时使用 `bot.cc.defaultCwd` 配置

#### 4. 配置扩展

```json
{
  "bot": {
    "cc": {
      "enabled": true,
      "defaultCwd": "~/projects",
      "allowedDirs": ["~/projects", "~/work"],
      "timeoutMs": 120000,
      "maxBudgetUsd": 0.5,
      "permissionMode": "bypassPermissions",
      "baseURL": "http://127.0.0.1:3456"
    }
  }
}
```

`baseURL` 可选 — 填了就注入 `ANTHROPIC_BASE_URL` 到子进程环境变量，走 CCR 代理。不填则继承当前进程环境（如果 `ccr activate` 过也会走代理）。

### 设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 执行方式 | spawn `claude` CLI 子进程 | 完整复用 CC 全部能力（工具、MCP、hooks），不需要重新实现 |
| 输出格式 | `--output-format json` | 结构化输出，便于提取回复文本和 cost |
| 权限 | `--permission-mode bypassPermissions` | 钉钉无法交互确认，必须跳过。安全通过目录白名单控制 |
| 会话 | `--no-session-persistence` | 每次独立执行，不留历史会话文件 |
| 上下文 | `--append-system-prompt` 注入 | 把群聊历史作为 system prompt 背景，CC 自带的 context 机制会处理 |
| 超时 | 默认 2 分钟 | CC 可能跑较久（读大量文件），但钉钉用户等不了太久 |
| 安全 | 目录白名单 | 防止 `在 /etc 帮我删点东西` 这种 |

### 安全考虑

- **目录白名单**: `allowedDirs` 必须配置，路径必须在白名单内才执行
- **预算限制**: `--max-budget-usd` 防止单次请求消耗过多
- **超时**: 子进程超时自动 kill
- **权限模式**: 虽然跳过了 CC 的确认，但 CC 自身的安全机制（不删敏感文件等）仍然生效
- **无 root**: CC 本身不会以 root 运行

### 与现有系统集成

- **ChatContextManager**: 保留，历史作为 system prompt 注入 CC
- **sendAsyncReply**: 复用，CC 结果通过 sessionWebhook 推送
- **BotCommandRouter**: fallback 从 ChatCommand 换成 CCBridgeHandler
- **固定命令**: /status /help 等保持不变，只有 fallback 走 CC
