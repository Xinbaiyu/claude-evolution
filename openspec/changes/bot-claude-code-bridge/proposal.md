## Why

当前钉钉机器人的 LLM fallback 只是简单调一次 `messages.create()`，Claude 没有任何工具可用——不能读代码、不能跑命令、不能搜索。用户希望钉钉机器人的处理能力与 Claude Code CLI 一致：能读文件、写代码、执行命令、搜索代码库。

Claude Code CLI 已有完整的 `--print` 非交互模式（`claude -p`），支持 JSON 输出和权限跳过。最直接的方案是：收到钉钉消息 → spawn `claude -p` 子进程 → 拿到结果 → 推送回钉钉。

## What Changes

- 将 LLM fallback（`commands/chat.ts`）改为调用 `claude -p` 子进程，而非直接调 Anthropic API
- 用户可在消息中指定项目路径（如 `在 /path/to/project 帮我看下这个 bug`），机器人在该目录下执行 CC
- 保留群聊上下文记忆，作为 CC 的 `--append-system-prompt` 注入
- 配置项：超时时间、最大预算、权限模式、默认工作目录
- 安全：仅允许配置中白名单的目录，防止任意路径访问

## Capabilities

### New Capabilities
- `bot-cc-bridge`: 钉钉消息 → Claude Code CLI 子进程桥接 — spawn `claude -p` 处理用户消息，流式获取输出，推送回钉钉

### Modified Capabilities
_(无)_

## Impact

- **替换**: `src/bot/commands/chat.ts` 从 Anthropic SDK 直接调用改为 `child_process.spawn('claude', ...)`
- **依赖**: 需要 `claude` CLI 在 PATH 中可用
- **安全**: 新增目录白名单配置，防止用户指定任意路径
- **性能**: CC 子进程启动较慢（~2-5s），需要异步回复 + 进度提示
