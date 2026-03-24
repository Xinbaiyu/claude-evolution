## Why

claude-evolution 当前仅有定时分析功能，缺乏通用的定时任务能力。用户在 Claude Code 会话中经常产生"下午3点提醒我做某事"这类需求，但目前无法在 claude-evolution 的 daemon 层面实现定时提醒。通过增加通用提醒/定时任务系统，可以让 claude-evolution 从"被动分析"进化为"主动服务"，为后续接入钉钉、企业微信等通知渠道打下基础。

## What Changes

- 新增 `ReminderService` 服务，管理用户提醒的创建、持久化、调度和触发
- 新增 `NotificationChannel` 抽象层，统一桌面通知、WebSocket 推送等多种通知渠道
- 新增 Skill 文件（安装到 `~/.claude/skills/`），让 Claude 在对话中识别提醒意图并自动调用
- 新增 REST API `/api/reminders/*` 供 Skill 和 Web UI 调用
- 新增 Web UI 提醒管理页面，展示和管理所有提醒
- daemon 启动时恢复未完成的提醒，确保重启后不丢失
- 扩展配置 schema，增加 `reminders` 配置段

## Capabilities

### New Capabilities
- `reminder-service`: 提醒的核心调度服务，包含创建、删除、持久化、到时触发
- `notification-channel`: 通知渠道抽象层，MVP 支持桌面通知 + WebSocket，预留钉钉等扩展接口
- `reminder-skill`: Claude Code Skill 文件，让 Claude 自动识别提醒意图并通过 HTTP API 注册提醒
- `reminder-api`: REST API 端点，供 Skill、Web UI 和外部系统管理提醒

### Modified Capabilities
<!-- 无需修改现有 spec 级别的行为 -->

## Impact

- **新增文件**: `src/reminders/` 模块、`web/server/routes/reminders.ts`、Skill 文件
- **修改文件**: `src/daemon/lifecycle.ts`（注册 ReminderService）、`src/config/schema.ts`（新增配置段）、`web/server/index.ts`（挂载路由）
- **依赖**: 复用现有 `node-cron`、`notifier.ts`、`WebSocketManager`
- **安装流程**: CLI init/install 时自动安装 Skill 到 `~/.claude/skills/`
