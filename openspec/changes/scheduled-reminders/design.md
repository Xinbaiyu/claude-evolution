## Context

claude-evolution 是一个 Claude Code 自我进化工具，当前有一个运行中的 daemon 进程提供：
- 定时分析调度（CronScheduler + node-cron）
- Express Web 服务（端口 10010）+ WebSocket 实时推送
- 跨平台桌面通知（macOS AppleScript / Linux notify-send / Windows Toast）
- 配置管理（Zod schema + JSON 持久化）

用户需要一个通用提醒系统：在 Claude Code 会话中说"下午3点提醒我做某事"，daemon 到时发送桌面通知。参考了 OpenClaw 的 CronService 架构（at/every/cron 三种调度、持久化 jobs.json、多通道通知），但我们采用更轻量的方案。

约束：
- 必须复用现有 daemon 基础设施，不引入新的后台进程
- Skill 文件安装到 `~/.claude/skills/`，让 Claude 自然识别意图
- 通知渠道需要抽象，MVP 先做桌面 + WebSocket，后续可扩展钉钉等

## Goals / Non-Goals

**Goals:**
- 提供可靠的一次性和重复性提醒调度能力
- 通过 Skill 文件让 Claude Code 会话中自然触发提醒创建
- daemon 重启后自动恢复未完成的提醒
- 通知渠道可扩展，MVP 支持桌面通知和 WebSocket
- REST API 支持提醒的 CRUD 操作
- Web UI 展示和管理提醒列表

**Non-Goals:**
- 不实现复杂的 cron 表达式调度（区别于分析调度器）
- 不在 MVP 中接入钉钉/企业微信等第三方通知
- 不实现提醒的条件触发（如"当构建失败时提醒我"）
- 不实现跨设备同步
- 不实现提醒模板或预设

## Decisions

### D1: 提醒调度方案 — 统一 node-cron

**选择**: 所有提醒统一使用 node-cron 调度，与现有分析调度器（CronScheduler）保持一致。一次性提醒转换为精确的 cron 表达式，触发后自动移除；重复提醒直接使用 cron 表达式持续运行。

**备选方案**:
- **setTimeout**: 对一次性提醒精度更高（毫秒级），但需要额外处理 >24h 的漂移校准，且引入了第二种调度机制
- **轮询检查**: 每秒/每分钟检查到期提醒，简单但浪费资源
- **OpenClaw 式 CronService**: 功能完整但复杂度过高

**理由**: 项目已有成熟的 node-cron 调度基础设施（CronScheduler），统一引擎避免维护两套调度机制。cron 精度到分钟级，对提醒场景完全够用。一次性提醒（如"下午3点"）转换为 `0 15 24 3 *` 格式，触发后自动销毁。daemon 重启时遍历持久化文件，过期的立即触发，未到期的重新注册 cron 任务。

### D2: 持久化方案 — JSON 文件

**选择**: `~/.claude-evolution/reminders.json`，与现有 config.json 同级。

**备选方案**:
- **SQLite**: 查询能力强但引入新依赖
- **JSONL**: 适合追加日志但不适合频繁读写全量
- **内存仅**: 最简单但 daemon 重启丢失

**理由**: 提醒数量有限（通常 < 100 条），JSON 文件读写简单，与项目现有持久化模式一致（config.json、observations.json）。

### D3: 触发入口 — Skill 文件

**选择**: 安装 Skill 到 `~/.claude/skills/remind.md`，Skill 内描述触发条件和 API 调用方式。

**备选方案**:
- **Custom Command `/remind`**: 需要用户主动输入命令，不够自然
- **MCP Tool**: 需要注册 MCP server，配置复杂
- **Hook 拦截**: 分析 Claude 输出识别意图，准确率不可控

**理由**: Skill 文件让 Claude 在识别到"提醒我"意图时自动使用，用户体验最自然。Skill 内部通过 `curl` 调用 daemon 的 REST API，无需额外依赖。安装时自动复制到 `~/.claude/skills/`。

### D4: 通知渠道架构 — Strategy 模式

**选择**: `NotificationChannel` 接口 + 多实现，配置选择启用哪些渠道。

```
NotificationChannel
  ├── DesktopChannel (复用 notifier.ts)
  ├── WebSocketChannel (复用 WebSocketManager)
  └── (future) DingTalkChannel, WebhookChannel
```

**理由**: 当前桌面通知和 WebSocket 已有实现但耦合在各处，抽象后统一调用入口，后续扩展只需新增 Channel 实现 + 配置项。

### D5: Skill 安装时机

**选择**: 在 `claude-evolution init` CLI 命令中安装 Skill 文件，同时检查已有版本避免覆盖用户自定义。

**理由**: init 是用户首次配置项目时执行的命令，语义上最合适。同时在 daemon 启动时检查 Skill 版本，如果落后则提示用户更新。

## Risks / Trade-offs

- **[cron 精度]** node-cron 精度到分钟级，无法指定秒级提醒 → 提醒场景分钟级精度完全足够
- **[Skill 兼容性]** Claude Code 的 Skill 加载机制可能变化 → Skill 文件保持极简，仅包含意图描述和 curl 调用
- **[并发写入]** 多个 Claude Code 会话可能同时通过 API 创建提醒 → API 层使用串行写入队列
- **[时区处理]** 用户说"下午3点"需要正确解析为本地时区 → Skill 中要求 Claude 将时间转换为 ISO 8601 格式（含时区）再调用 API
- **[daemon 未运行]** 用户创建提醒时 daemon 可能未启动 → Skill 检测 API 可达性，不可达时提示用户启动 daemon
