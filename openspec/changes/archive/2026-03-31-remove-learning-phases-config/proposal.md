## Why

`learningPhases` 配置（observation/suggestion/automatic 三阶段）在新的增量学习系统中已不再使用。当前代码只在日志中显示学习阶段，但实际的自动提升逻辑完全基于 `config.learning.promotion` 的置信度和提及次数阈值。这导致用户误以为配置学习阶段会影响系统行为，造成困惑，同时产生无用代码维护负担。

## What Changes

- 从 `ConfigSchema` 删除 `learningPhases` 配置定义（observation, suggestion, automatic 三个阶段）
- 删除 `state-manager.ts` 中的 `getCurrentPhase()` 函数和相关逻辑
- 从 `pipeline.ts` 移除对 `currentPhase` 的读取和日志输出
- 清理 `types/index.ts` 中的 `LearningPhase` 类型定义
- 删除 `SystemState.currentPhase` 字段
- 检查并清理 `preference-learner.ts` 中对学习阶段的依赖（如果该文件仍在使用）
- 确保配置文件向后兼容：加载时忽略已存在的 `learningPhases` 字段

## Capabilities

### New Capabilities
<!-- 无，这是代码清理变更 -->

### Modified Capabilities
<!-- 无，不涉及现有功能行为变更，仅删除未使用的配置项 -->

## Impact

**代码变更：**
- `src/config/schema.ts` - 删除 LearningPhasesSchema 和 ConfigSchema 中的 learningPhases 字段
- `src/scheduler/state-manager.ts` - 删除 getCurrentPhase() 函数，删除 SystemState.currentPhase 字段
- `src/analyzers/pipeline.ts` - 移除对 getCurrentPhase 的调用和日志输出
- `src/types/index.ts` - 删除 LearningPhase 类型定义和 SystemState.currentPhase 字段
- `src/learners/preference-learner.ts` - 检查并移除对 currentPhase 的依赖（可能已废弃）
- `src/cli/commands/init.ts` - 移除学习阶段配置提示（如果存在）
- `src/cli/commands/status.ts` - 移除学习阶段显示（如果存在）

**用户体验：**
- 配置文件简化，减少用户困惑
- 移除无效配置项，避免误导
- 现有配置文件仍可正常加载（Zod schema 的 `.passthrough()` 会忽略未知字段）

**向后兼容性：**
- 已有的 `config.json` 文件中的 `learningPhases` 字段会被安全忽略
- 不影响当前的自动提升逻辑（基于 `learning.promotion` 配置）
- 不影响增量学习系统的其他功能

**文档：**
- 更新 README.md 移除学习阶段相关描述
- 更新 docs/LEARNING.md 移除学习阶段章节
- 更新配置示例，移除 learningPhases

## 可能受影响的功能和测试重点

虽然 learningPhases 不影响实际逻辑，但删除相关代码后需要确保以下功能正常工作：

**核心功能（必须测试）：**
1. **配置加载**
   - 加载包含 `learningPhases` 的旧配置文件
   - 加载不包含 `learningPhases` 的新配置文件
   - 配置验证不抛出错误

2. **自动分析流程**
   - 手动触发：`claude-evolution analyze --now`
   - 定时触发：调度器自动执行
   - 8 步分析流程完整执行
   - 日志输出不包含学习阶段信息

3. **增量学习循环**
   - LLM 合并正常工作
   - 时间衰减正常应用
   - 容量控制正常执行
   - 自动提升基于 `learning.promotion` 配置（autoConfidence: 0.90, autoMentions: 10）
   - Context Pool 正常更新

4. **CLAUDE.md 生成**
   - 静态配置正常合并
   - Context Pool 内容正常写入
   - 文件生成成功

5. **CLI 命令**
   - `claude-evolution status` 正常显示统计信息
   - `claude-evolution analyze` 正常执行
   - `claude-evolution init` 不提示学习阶段配置

**边缘情况（建议测试）：**
1. **preference-learner.ts 依赖**
   - 如果该文件仍在使用，确认移除 `currentPhase` 后功能不受影响
   - 如果该文件已废弃，确认没有其他代码导入它

2. **状态文件兼容性**
   - 加载包含 `currentPhase` 的旧 state.json
   - 新保存的 state.json 不包含 `currentPhase`

3. **Web UI 显示**
   - Dashboard 统计信息正常显示
   - Settings 页面学习配置正常（如果有）

**回归测试重点：**
- 运行完整测试套件：`npm test`
- 手动执行一次完整分析流程
- 检查 Active Pool、Context Pool 大小是否符合预期
- 验证自动提升逻辑：创建高置信度观察（confidence ≥ 0.90, mentions ≥ 10），确认自动提升到 Context Pool
