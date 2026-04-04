## Why

当前 Agent 执行配置（`bot.cc`）埋在钉钉机器人配置中，职责不清晰且难以复用。当需要添加定时调研任务等新的 Agent 执行场景时，无法复用现有配置。需要将 Agent 执行配置提升为顶级配置，供所有需要调用 Claude Code CLI 的场景统一使用。

## What Changes

- **重构配置结构**：将 `config.bot.cc` 提升为顶级 `config.agent` 配置
- **简化配置模式**：通过 `baseURL` 字段区分原生 Claude（null）和 CCR 代理（有值），其他配置（工作目录、白名单、超时、预算）两种模式通用
- **新增 WebUI Tab**：在 Settings 页面新增 "Agent 执行" Tab，展示统一的 Agent 配置
- **重命名 Tab**：将 "Claude 模型" 改名为 "LLM 提供商"，更准确描述其包含 Claude/OpenAI/CCR 三种提供商
- **配置迁移**：自动将旧的 `bot.cc` 配置迁移到新的 `agent` 配置
- **统一调用方式**：钉钉机器人、定时调研任务等所有 Agent 执行场景都读取 `config.agent`

## Capabilities

### New Capabilities

- `unified-agent-config`: 统一的 Agent 执行配置系统，支持原生 Claude 和 CCR 两种模式，提供工作目录、白名单、超时、预算等通用配置

### Modified Capabilities

<!-- 无现有能力需要修改 -->

## Impact

**配置层**：
- `src/config/schema.ts` - 新增 `agent` 配置 schema，标记 `bot.cc` 为废弃
- `src/config/loader.ts` - 添加配置迁移逻辑（`bot.cc` → `agent`）

**执行层**：
- `src/bot/commands/cc-bridge.ts` - 从 `config.agent` 读取配置而非 `config.bot.cc`
- `src/reminders/service.ts` - 将来定时调研任务也从 `config.agent` 读取配置

**WebUI 层**：
- `web/client/src/pages/Settings.tsx` - 新增 "Agent 执行" Tab，移除 "Claude Code 桥接" 区块
- `web/client/src/components/AgentExecutionConfig.tsx` - 新建组件展示 Agent 配置
- Tab 命名调整："Claude 模型" → "LLM 提供商"

**向后兼容**：
- 保留 `bot.cc` 配置读取能力，但标记为废弃（3 个版本后移除）
- 首次启动时自动迁移配置到新结构
