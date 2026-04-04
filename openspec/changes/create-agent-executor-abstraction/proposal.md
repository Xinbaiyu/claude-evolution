## Why

当前所有需要执行 Claude Code CLI 的场景都直接调用 `executeCC()`，需要手动传递大量配置参数（baseURL、cwd、timeout、budget 等）。这导致代码重复、配置分散、难以维护。需要创建统一的 `AgentExecutor` 抽象层，封装配置读取和执行逻辑，简化调用方代码。

## What Changes

- **新建 AgentExecutor 类**：封装 Claude Code CLI 执行逻辑，自动从 `config.agent` 读取配置
- **简化调用接口**：调用方只需提供 `prompt` 和可选的 `systemPrompt`、`cwd`，其他配置自动处理
- **单例工厂模式**：提供 `getAgentExecutor()` 全局获取执行器实例
- **改造钉钉机器人**：`cc-bridge.ts` 使用新的 AgentExecutor 替代直接调用 `executeCC()`
- **支持定时调研任务**：扩展 `reminders` 系统，支持 `agent-task` 类型的任务执行
- **统一配置源**：所有 Agent 执行场景都从 `config.agent` 读取配置

## Capabilities

### New Capabilities

- `agent-executor`: 统一的 Agent 执行抽象层，封装配置读取、参数验证、Claude Code CLI 调用等逻辑
- `scheduled-agent-tasks`: 支持通过提醒系统定时触发 Agent 任务执行，并将结果通过通知通道返回

### Modified Capabilities

<!-- 无现有能力需要修改 -->

## Impact

**新增文件**：
- `src/agent/executor.ts` - AgentExecutor 类和 getAgentExecutor() 工厂函数
- `src/agent/types.ts` - Agent 执行相关类型定义

**修改文件**：
- `src/bot/commands/cc-bridge.ts` - 从直接调用 `executeCC()` 改为使用 `AgentExecutor`
- `src/reminders/types.ts` - 扩展 Reminder 类型，支持 `agent-task` 任务类型
- `src/reminders/service.ts` - 扩展触发处理逻辑，支持执行 Agent 任务
- `web/server/routes/reminders.ts` - 扩展 API，支持创建 agent-task 类型的提醒

**依赖关系**：
- AgentExecutor 依赖 `config.agent`（前置 change: refactor-agent-config-to-unified-execution）
- 所有 Agent 执行场景统一收敛到 AgentExecutor

**向后兼容**：
- 保留 `executeCC()` 函数不变，供底层调用
- 新旧调用方式可共存，逐步迁移
