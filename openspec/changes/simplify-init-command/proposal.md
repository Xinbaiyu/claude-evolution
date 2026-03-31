## Why

当前 `audit-and-enhance-init-command` 变更计划提出在 init 命令中添加大量配置选项（基础模式 10+ 问题，高级模式 30+ 问题），包括 LLM 详细参数、学习容量调优、提醒系统、机器人集成等。这会导致 init 流程过于冗长，降低新用户的首次体验。实际上，系统的 WebUI (localhost:10010) 已经提供了完整的配置界面，且几乎所有配置项都有合理的默认值。应该将 init 命令简化为只配置必要的启动参数，其他高级配置引导用户在 WebUI 中按需调整。

## What Changes

- **简化 init 命令流程**：从计划的 10-30+ 个问题精简到 3-5 个问题
- **P0/P1 级配置保留在 init**：
  - LLM Provider 选择（claude/openai-compatible/ccr）
  - Scheduler 配置（24h/12h/6h/定时模式）
  - WebUI 端口配置
- **P2 级配置移至 WebUI**：
  - LLM 详细参数（model、temperature、maxTokens、enablePromptCaching 等）
  - Learning 容量调优（targetSize、decay、promotion thresholds 等）
  - Reminders 配置（desktop/webhook）
  - Bot 集成（DingTalk、Claude Code）
  - Daemon 配置（logLevel、logRotation 等）
- **增强完成提示**：明确引导用户访问 WebUI 进行高级配置
- **所有问题提供默认值**：用户可全程按回车使用推荐配置

## Capabilities

### New Capabilities

- `init-wizard`: 简化的初始化向导流程，定义 P0/P1/P2 配置分级和提示逻辑

### Modified Capabilities

- `llm-config-schema`: 明确哪些 LLM 配置属于 init 阶段（activeProvider + 条件性的 baseURL/model），哪些属于 WebUI 调优阶段（temperature/maxTokens/organization 等）

## Impact

**代码变更：**
- `src/cli/commands/init.ts` - 重构所有配置提示函数
  - 移除原有 `promptForApiMode()` 和 `promptForConfig()` 函数
  - 新增 `promptLLMProvider()` - 三选一 Provider 配置
  - 新增 `promptScheduler()` - 保持现有 4 选项
  - 新增 `promptWebUIPort()` - 简单端口配置
  - 更新 `printNextSteps()` - 增强 WebUI 配置引导

**用户体验：**
- 首次配置时间从 5-15 分钟降低到 1-3 分钟
- 新用户可快速启动系统，渐进式探索高级功能
- 减少配置错误（复杂参数如 Learning 容量调优移至 WebUI 可视化配置）

**向后兼容性：**
- 现有 config.json 文件保持有效
- 用户可重新运行 init 覆盖配置
- ConfigSchema 保持不变

**替代方案对比：**
替代当前 `audit-and-enhance-init-command` 变更，采用"最小化 init + WebUI 配置"的方案，而非"完整 CLI 配置（基础+高级模式）"的方案。
