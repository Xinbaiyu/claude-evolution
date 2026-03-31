## 1. 准备和代码调查

- [x] 1.1 全局搜索 `learningPhases` 引用，列出所有需要修改的文件
- [x] 1.2 全局搜索 `getCurrentPhase` 引用，确认调用位置
- [x] 1.3 搜索 `preference-learner` 导入，确认该文件是否仍在使用
- [x] 1.4 创建分支 `remove-learning-phases-config`

## 2. 删除 ConfigSchema 中的 learningPhases

- [x] 2.1 从 `src/config/schema.ts` 删除 `LearningPhaseSchema` 定义
- [x] 2.2 从 `src/config/schema.ts` 删除 `LearningPhasesSchema` 定义
- [x] 2.3 从 `ConfigSchema` 中删除 `learningPhases` 字段
- [x] 2.4 确保 `ConfigSchema` 使用 `.passthrough()` 或不使用 `.strict()`（支持旧配置兼容）
- [x] 2.5 从 `DEFAULT_CONFIG` 中删除 `learningPhases` 默认值

## 3. 删除 state-manager.ts 中的学习阶段逻辑

- [x] 3.1 从 `src/scheduler/state-manager.ts` 删除 `getCurrentPhase()` 函数
- [x] 3.2 从 `src/scheduler/state-manager.ts` 删除 `getDaysSinceInstall()` 函数（如果仅用于 getCurrentPhase）
- [x] 3.3 验证 `state-manager.ts` 导出列表，移除已删除函数的导出

## 4. 清理 pipeline.ts 中的学习阶段调用

- [x] 4.1 从 `src/analyzers/pipeline.ts` 移除 `getCurrentPhase` 导入
- [x] 4.2 删除 `const currentPhase = await getCurrentPhase(config);` 调用
- [x] 4.3 删除学习阶段相关日志输出：`logger.info(\`当前学习阶段: ${currentPhase}\`)`
- [x] 4.4 删除 `logStep` 中的学习阶段参数：`await logStep(1, '加载配置', 'success', \`学习阶段: ${currentPhase}\`)`
- [x] 4.5 验证分析流程日志输出清晰，不包含误导性信息

## 5. 清理类型定义

- [x] 5.1 从 `src/types/index.ts` 删除 `LearningPhase` 类型定义（`'observation' | 'suggestion' | 'automatic'`）
- [x] 5.2 从 `SystemState` 类型删除 `currentPhase` 字段
- [x] 5.3 验证类型导出列表，移除已删除类型的导出

## 6. 处理 preference-learner.ts

- [x] 6.1 阅读 `src/learners/preference-learner.ts` 完整代码
- [x] 6.2 确认该文件是否在 `src/analyzers/pipeline.ts` 或其他地方被导入
- [x] 6.3 如果未使用，添加文件顶部注释：`// DEPRECATED: This file is no longer used by the incremental learning system`
- [x] 6.4 如果仍在使用，移除对 `currentPhase` 的引用，改为直接使用 `config.learning.promotion` 阈值
- [x] 6.5 添加 TODO 注释：`// TODO: Investigate if this file can be removed`

## 7. 清理 CLI 命令

- [x] 7.1 检查 `src/cli/commands/init.ts` 是否包含学习阶段配置提示
- [x] 7.2 如果存在，删除学习阶段配置提示相关代码
- [x] 7.3 检查 `src/cli/commands/status.ts` 是否显示学习阶段信息
- [x] 7.4 如果存在，删除学习阶段显示相关代码

## 8. 单元测试

- [x] 8.1 添加测试用例：加载包含 `learningPhases` 的旧配置文件
- [x] 8.2 添加测试用例：加载不包含 `learningPhases` 的新配置文件
- [x] 8.3 添加测试用例：加载包含 `currentPhase` 的旧状态文件
- [x] 8.4 添加测试用例：保存状态文件不包含 `currentPhase`
- [x] 8.5 添加测试用例：自动提升逻辑使用 `learning.promotion` 配置
- [x] 8.6 运行完整测试套件，确保所有测试通过

## 9. 文档更新

- [x] 9.1 搜索 README.md 中的"观察期"、"建议期"、"自动期"、"learningPhases"
- [x] 9.2 更新 README.md，移除学习阶段相关描述
- [x] 9.3 搜索 docs/LEARNING.md 中的学习阶段相关章节
- [x] 9.4 更新 docs/LEARNING.md，移除学习阶段章节，说明自动提升基于 `learning.promotion` 配置
- [x] 9.5 检查 docs/ 目录下其他文档，移除学习阶段引用
- [x] 9.6 更新配置示例文件，移除 `learningPhases` 字段

## 10. 集成测试和验证

**配置加载测试：**
- [x] 10.1 准备包含 `learningPhases` 的旧配置文件测试数据
- [x] 10.2 使用新代码加载旧配置文件，验证无错误（`claude-evolution restart`）
- [x] 10.3 检查 daemon 日志，确认无 learningPhases 相关错误或警告

**分析流程测试：**
- [ ] 10.4 运行 `claude-evolution analyze --now`，验证 8 步流程完整执行
- [ ] 10.5 检查日志输出，确认不包含"当前学习阶段: observation/suggestion/automatic"
- [ ] 10.6 验证日志包含分析统计信息（采集到的会话数、提取的经验数、合并数等）

**自动提升逻辑测试：**
- [ ] 10.7 检查 Active Pool 大小：`cat ~/.claude-evolution/memory/observations/active.json | jq 'length'`
- [ ] 10.8 检查 Context Pool 大小：`cat ~/.claude-evolution/memory/observations/context.json | jq 'length'`
- [ ] 10.9 验证自动提升配置：`cat ~/.claude-evolution/config.json | jq '.learning.promotion'`
- [ ] 10.10 确认自动提升基于 autoConfidence (0.90) 和 autoMentions (10)，不受 learningPhases 影响

**CLAUDE.md 生成测试：**
- [ ] 10.11 验证 CLAUDE.md 正常生成：`ls -lh ~/.claude-evolution/output/CLAUDE.md`
- [ ] 10.12 检查 CLAUDE.md 内容包含静态配置和学习内容
- [ ] 10.13 确认 Context Pool 中的观察正确写入 CLAUDE.md

**CLI 命令测试：**
- [ ] 10.14 运行 `claude-evolution status`，确认输出不显示学习阶段
- [ ] 10.15 验证 status 输出包含学习系统统计（Active Pool, Context Pool 大小）
- [ ] 10.16 运行 `claude-evolution init`（如果有该命令），确认不提示学习阶段配置

**状态文件兼容性测试：**
- [ ] 10.17 检查旧 state.json 可能包含 `currentPhase` 字段（正常，会被忽略）
- [ ] 10.18 触发一次分析后检查新保存的 state.json 不包含 `currentPhase`

**Web UI 测试（如果适用）：**
- [ ] 10.19 访问 http://localhost:10010，验证 Dashboard 正常显示
- [ ] 10.20 检查 Settings 页面不显示学习阶段配置（或已删除该部分）

**回归测试（完整工作流）：**
- [ ] 10.21 重启 daemon：`claude-evolution restart`
- [ ] 10.22 等待自动分析触发（或手动触发）
- [ ] 10.23 验证 CLAUDE.md 自动更新
- [ ] 10.24 验证桌面通知/钉钉通知正常（如果启用）
- [ ] 10.25 检查 Active Pool 和 Context Pool 大小变化符合预期

**preference-learner.ts 验证（如果该文件仍在使用）：**
- [ ] 10.26 全局搜索 preference-learner 导入：`grep -r "preference-learner" src/`
- [ ] 10.27 如果该文件仍在使用，验证移除 currentPhase 后功能正常

## 11. CHANGELOG 和发布准备

- [ ] 11.1 在 CHANGELOG.md 中添加条目：`### BREAKING CHANGE: Removed learningPhases configuration`
- [ ] 11.2 说明移除原因：学习阶段在新增量学习系统中不再使用
- [ ] 11.3 说明迁移路径：旧配置文件自动兼容，自动提升逻辑由 `learning.promotion` 控制
- [ ] 11.4 更新版本号（根据项目版本策略）
- [ ] 11.5 准备发布说明

## 12. 代码审查和合并

- [ ] 12.1 自我审查所有代码变更
- [ ] 12.2 确认所有文件中的 `learningPhases` 引用已清理
- [ ] 12.3 确认所有测试通过
- [ ] 12.4 确认文档更新完整
- [ ] 12.5 创建 Pull Request，填写详细的变更说明
- [ ] 12.6 等待代码审查反馈
- [ ] 12.7 合并到主分支

---

## 核心功能验证摘要

**实施完成后，必须验证以下关键功能正常工作：**

### ✅ P0 必测功能（阻塞发布）

1. **配置加载兼容性**
   - [ ] 包含 `learningPhases` 的旧配置文件可以正常加载
   - [ ] 不包含 `learningPhases` 的新配置文件可以正常加载
   - [ ] 无错误或警告信息

2. **自动分析流程**
   - [ ] 手动触发分析：`claude-evolution analyze --now` 正常执行
   - [ ] 定时触发分析：调度器自动执行正常
   - [ ] 8 步分析流程完整，无中断

3. **自动提升逻辑**
   - [ ] 自动提升基于 `learning.promotion.autoConfidence` (0.90) 和 `autoMentions` (10)
   - [ ] 高质量观察自动进入 Context Pool
   - [ ] 低质量观察保留在 Active Pool

4. **CLAUDE.md 生成**
   - [ ] 静态配置和 Context Pool 内容正常合并
   - [ ] 文件成功生成到 `~/.claude-evolution/output/CLAUDE.md`

5. **日志输出**
   - [ ] 日志不包含"当前学习阶段: observation/suggestion/automatic"
   - [ ] 日志包含必要的统计信息（采集数、提取数、合并数等）

### ⚠️ P1 建议测试（重要但不阻塞）

6. **CLI 命令**
   - [ ] `claude-evolution status` 不显示学习阶段
   - [ ] `claude-evolution init` 不提示学习阶段配置（如果有该命令）

7. **状态文件**
   - [ ] 新保存的 state.json 不包含 `currentPhase` 字段
   - [ ] 旧 state.json（包含 currentPhase）可以正常加载

8. **Web UI**（如果适用）
   - [ ] Dashboard 统计信息正常显示
   - [ ] Settings 页面不显示学习阶段配置

### 🔄 完整工作流验证

**端到端测试场景：**
```bash
# 1. 重启 daemon
claude-evolution restart

# 2. 触发分析
claude-evolution analyze --now

# 3. 检查输出
ls -lh ~/.claude-evolution/output/CLAUDE.md
cat ~/.claude-evolution/memory/observations/active.json | jq 'length'
cat ~/.claude-evolution/memory/observations/context.json | jq 'length'

# 4. 验证自动提升
# 应该看到高质量观察（confidence ≥ 0.90, mentions ≥ 10）在 Context Pool
cat ~/.claude-evolution/memory/observations/context.json | jq '.[].confidence'
```

**快速验证命令集合：**
```bash
# 一键验证脚本（复制粘贴执行）
echo "=== 1. 配置加载 ==="
claude-evolution restart && echo "✅ Daemon 启动成功"

echo "=== 2. 分析流程 ==="
claude-evolution analyze --now && echo "✅ 分析完成"

echo "=== 3. 文件生成 ==="
ls -lh ~/.claude-evolution/output/CLAUDE.md && echo "✅ CLAUDE.md 存在"

echo "=== 4. Pool 状态 ==="
echo "Active Pool: $(cat ~/.claude-evolution/memory/observations/active.json | jq 'length') 条"
echo "Context Pool: $(cat ~/.claude-evolution/memory/observations/context.json | jq 'length') 条"

echo "=== 5. 日志检查 ==="
tail -n 100 ~/.claude-evolution/logs/daemon.log | grep -i "phase" && echo "❌ 发现学习阶段日志！" || echo "✅ 无学习阶段日志"

echo "=== 验证完成 ==="
```

**如果任何 P0 测试失败，不要合并代码！**
