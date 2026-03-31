## Context

**历史背景：**
- `learningPhases` 配置在 v0.3.0 引入旧建议系统时设计，目的是实现"观察期 → 建议期 → 自动期"三阶段渐进式学习
- v0.4.0 重构为增量学习系统后，自动提升逻辑改为基于 `learning.promotion` 的置信度和提及次数阈值
- 旧的 `preference-learner.ts` 中仍有对 `currentPhase` 的引用，但该文件在新系统中未被使用（pipeline.ts 注释："旧的建议系统逻辑已移除"）

**当前状态：**
- `ConfigSchema` 中定义了 `LearningPhasesSchema`（observation, suggestion, automatic）
- `state-manager.ts` 中实现了 `getCurrentPhase()` 函数，基于安装天数计算当前阶段
- `pipeline.ts` 中调用 `getCurrentPhase()` 并输出日志："当前学习阶段: observation"
- **但实际的学习循环 `executeLearningCycle()` 完全不使用 `currentPhase`**

**约束条件：**
- 不能破坏现有配置文件格式（向后兼容）
- 不能影响当前的自动提升逻辑（基于 `learning.promotion`）
- 保留增量学习系统的所有功能

**利益相关方：**
- 用户：简化配置，减少困惑
- 维护者：减少无用代码，降低维护负担

## Goals / Non-Goals

**Goals:**
- ✅ 删除 `learningPhases` 配置定义和相关代码
- ✅ 保持向后兼容：已有配置文件仍可正常加载
- ✅ 不影响当前的自动提升逻辑（`learning.promotion`）
- ✅ 简化日志输出，移除误导性的阶段信息

**Non-Goals:**
- ❌ 不重新实现学习阶段功能（如果未来需要，可以基于 `promotion` 配置实现）
- ❌ 不修改 `learning.promotion` 配置结构
- ❌ 不重构整个增量学习系统
- ❌ 不删除 `preference-learner.ts` 文件（可能有其他用途，需要进一步调查）

## Decisions

### 决策 1：删除策略 - 完全移除 vs 废弃标记

**方案：完全移除 learningPhases 配置**

**理由：**
- ✅ learningPhases 在新系统中完全无用，没有保留价值
- ✅ 配置文件向后兼容通过 Zod schema 的 `.passthrough()` 实现（未知字段被忽略）
- ✅ 简化代码结构，减少维护负担

**备选方案被拒绝：**
- ❌ 废弃标记（deprecated）：增加代码复杂度，延长技术债务生命周期
- ❌ 保留但不使用：误导用户，浪费维护精力

### 决策 2：向后兼容策略

**方案：使用 Zod schema 的默认行为自动忽略未知字段**

**实现：**
```typescript
// ConfigSchema 默认使用 .strict() 模式，会拒绝未知字段
// 修改为 .passthrough() 或不添加 .strict()，让 Zod 忽略 learningPhases

const ConfigSchema = z.object({
  // ... 其他字段
  // learningPhases 字段完全删除
}).passthrough();  // 允许未知字段通过
```

**理由：**
- ✅ 用户的旧配置文件（包含 `learningPhases`）仍可正常加载
- ✅ 不需要编写迁移脚本
- ✅ 不会产生错误或警告

**备选方案被拒绝：**
- ❌ 显式迁移脚本：过度工程，配置变更频率低
- ❌ 运行时警告：对用户无价值，增加日志噪音

### 决策 3：preference-learner.ts 处理方式

**方案：保留文件，移除对 currentPhase 的依赖，标记为待调查**

**理由：**
- ⚠️ 不确定 `preference-learner.ts` 是否在其他地方被使用
- ✅ 安全起见，保留文件但移除对 `learningPhases` 的引用
- ✅ 在代码中添加 `// TODO: 调查此文件是否仍在使用，考虑删除` 注释

**修改内容：**
```typescript
// 将所有 currentPhase 检查替换为直接使用 promotion 阈值
// 例如：
// 旧代码：
if (currentPhase === 'observation') {
  result.toSuggest.push(pref);
} else if (currentPhase === 'suggestion') {
  result.toSuggest.push(pref);
} else {
  if (pref.confidence >= config.learningPhases.automatic.confidenceThreshold) {
    result.toApply.push(pref);
  } else {
    result.toSuggest.push(pref);
  }
}

// 新代码：
if (pref.confidence >= config.learning.promotion.autoConfidence &&
    pref.mentions >= config.learning.promotion.autoMentions) {
  result.toApply.push(pref);
} else {
  result.toSuggest.push(pref);
}
```

**备选方案被拒绝：**
- ❌ 直接删除 `preference-learner.ts`：风险太大，可能破坏未知依赖

### 决策 4：state.json 文件清理

**方案：保留 `state.json` 中的 `currentPhase` 字段（不主动删除）**

**理由：**
- ✅ 用户的 `~/.claude-evolution/state.json` 文件中可能包含 `currentPhase`
- ✅ 加载时忽略该字段（Zod passthrough），不会产生错误
- ✅ 不需要编写迁移脚本清理用户文件

**实现：**
```typescript
// SystemState 类型定义中删除 currentPhase 字段
// 但 loadState() 函数仍可正常加载包含 currentPhase 的旧文件
```

### 决策 5：日志输出清理

**方案：完全移除 pipeline.ts 中的学习阶段日志输出**

**删除内容：**
```typescript
// 删除：
const currentPhase = await getCurrentPhase(config);
logger.info(`  当前学习阶段: ${currentPhase}`);
await logStep(1, '加载配置', 'success', `学习阶段: ${currentPhase}`);
```

**理由：**
- ✅ 学习阶段信息对用户无实际价值（不影响系统行为）
- ✅ 移除误导性信息，避免用户困惑

## Risks / Trade-offs

### 风险 1：用户依赖日志中的阶段信息

**风险：**
用户可能通过查看日志中的"当前学习阶段"来判断系统状态

**缓解措施：**
- 在 CHANGELOG 中明确说明移除学习阶段的原因
- 更新文档，说明自动提升逻辑基于 `learning.promotion` 配置
- 提供清晰的日志输出，显示自动提升的实际阈值：
  ```
  [INFO] 自动提升配置: 置信度 ≥ 90%, 提及次数 ≥ 10
  ```

### 风险 2：preference-learner.ts 可能在未知位置被使用

**风险：**
直接修改 `preference-learner.ts` 可能破坏隐藏的依赖

**缓解措施：**
- 使用全局搜索确认是否有其他文件导入该模块
  ```bash
  grep -r "preference-learner" src/
  ```
- 如果确认未使用，标记为 deprecated 并在下个版本删除
- 在代码中添加明确的 TODO 注释

### 风险 3：配置文件验证失败

**风险：**
如果使用 `.strict()` 模式，旧配置文件会因为包含 `learningPhases` 而加载失败

**缓解措施：**
- 确保 ConfigSchema 使用 `.passthrough()` 或不添加 `.strict()`
- 添加单元测试验证旧配置文件可以正常加载
  ```typescript
  test('should load config with legacy learningPhases field', () => {
    const legacyConfig = {
      learningPhases: { ... },  // 旧字段
      learning: { ... }
    };
    expect(() => ConfigSchema.parse(legacyConfig)).not.toThrow();
  });
  ```

### 风险 4：文档滞后

**风险：**
README 和文档中可能仍然提到学习阶段配置

**缓解措施：**
- 全局搜索文档中的"观察期"、"建议期"、"自动期"、"learningPhases"
- 更新所有相关文档
- 在 PR 中明确列出文档变更清单

## Migration Plan

**部署步骤：**
1. 在新分支开发和测试
2. 添加单元测试验证向后兼容性
3. 更新文档（README, docs/LEARNING.md, 配置示例）
4. 代码审查
5. 合并到主分支
6. 发布新版本，在 CHANGELOG 中说明变更

**回滚策略：**
- 保留本次提交的 commit ID
- 如果发现问题，使用 `git revert <commit-id>` 回滚
- 由于是删除操作，回滚相对安全

**向后兼容性验证：**
1. 准备包含 `learningPhases` 的旧配置文件
2. 使用新代码加载该配置文件
3. 验证：
   - ✅ 加载成功，无错误
   - ✅ 增量学习系统正常工作
   - ✅ 自动提升逻辑基于 `learning.promotion` 配置
4. 运行完整的测试套件

**详细测试清单：**

**阶段 1：配置加载测试**
```bash
# 测试旧配置文件加载
cp ~/.claude-evolution/config.json ~/.claude-evolution/config.json.backup
cat > ~/.claude-evolution/config.json << 'EOF'
{
  "learningPhases": {
    "observation": { "enabled": true, "durationDays": 3 },
    "suggestion": { "enabled": true, "durationDays": 4 },
    "automatic": { "enabled": true, "confidenceThreshold": 0.8 }
  },
  "learning": { "enabled": true, ... }
}
EOF

# 启动 daemon，验证无错误
claude-evolution restart
# 检查日志：不应有 learningPhases 相关错误
tail -f ~/.claude-evolution/logs/daemon.log
```
✅ **预期结果**：配置加载成功，无错误或警告

**阶段 2：分析流程测试**
```bash
# 手动触发分析
claude-evolution analyze --now
```
✅ **预期结果**：
- 8 步分析流程完整执行
- 日志不包含"当前学习阶段: observation/suggestion/automatic"
- 日志包含自动提升配置信息（如果有日志输出）
- CLAUDE.md 成功生成

**阶段 3：自动提升逻辑测试**
```bash
# 检查 Active Pool 和 Context Pool 状态
ls -lh ~/.claude-evolution/memory/observations/
cat ~/.claude-evolution/memory/observations/active.json | jq 'length'
cat ~/.claude-evolution/memory/observations/context.json | jq 'length'

# 检查自动提升配置
cat ~/.claude-evolution/config.json | jq '.learning.promotion'
```
✅ **预期结果**：
- Active Pool 大小在合理范围（< maxSize）
- Context Pool 包含高质量观察（confidence ≥ 0.90, mentions ≥ 10）
- 自动提升基于 `learning.promotion` 配置，不受 learningPhases 影响

**阶段 4：CLI 命令测试**
```bash
# 测试 status 命令
claude-evolution status
```
✅ **预期结果**：
- 输出包含学习系统统计信息（Active Pool, Context Pool 大小）
- 输出不包含"学习阶段"字段
- 命令正常退出，无错误

**阶段 5：状态文件兼容性测试**
```bash
# 检查状态文件内容
cat ~/.claude-evolution/state.json
```
✅ **预期结果**：
- 旧的 state.json 可能包含 `currentPhase` 字段（正常，会被忽略）
- 新保存的 state.json 不包含 `currentPhase` 字段
- 包含必要字段：installDate, lastAnalysisTime, lastAnalysisSuccess, totalAnalyses

**阶段 6：单元测试**
```bash
# 运行完整测试套件
npm test

# 运行配置相关测试
npm test -- config
npm test -- state-manager
npm test -- pipeline
```
✅ **预期结果**：
- 所有测试通过
- 新增的向后兼容性测试通过
- 删除 learningPhases 后相关测试已更新或删除

**阶段 7：Web UI 测试**（如果适用）
```bash
# 访问 Web UI
open http://localhost:10010
```
✅ **预期结果**：
- Dashboard 统计信息正常显示
- Learning Review 页面正常工作
- Settings 页面不显示学习阶段配置（或已删除）

**阶段 8：回归测试（完整工作流）**
```bash
# 模拟完整使用场景
1. claude-evolution restart        # 启动 daemon
2. 等待自动分析触发（或手动触发）
3. 检查 CLAUDE.md 是否更新
4. 检查 Active Pool 大小变化
5. 检查 Context Pool 是否有新提升的观察
6. 验证桌面通知/钉钉通知正常（如果启用）
```
✅ **预期结果**：
- 完整工作流无中断
- 所有功能正常工作
- 自动提升逻辑正常（基于 promotion 配置）

**功能影响矩阵：**

| 功能模块 | 是否受影响 | 测试重点 | 优先级 |
|---------|----------|---------|--------|
| 配置加载 | ⚠️ 可能 | 旧配置文件兼容性 | P0 |
| 分析流程 | ⚠️ 可能 | pipeline.ts 日志输出 | P0 |
| 自动提升 | ❌ 不受影响 | 基于 promotion 配置 | P0 |
| 增量学习 | ❌ 不受影响 | LLM 合并、衰减、容量控制 | P0 |
| CLAUDE.md 生成 | ❌ 不受影响 | 静态配置 + Context Pool | P0 |
| CLI status | ⚠️ 可能 | 输出格式变化 | P1 |
| CLI init | ⚠️ 可能 | 移除学习阶段提示 | P1 |
| Web UI | ⚠️ 可能 | Settings 页面 | P1 |
| preference-learner.ts | ⚠️ 可能 | 如果仍在使用 | P2 |

**关键验证点：**
1. ✅ 自动提升逻辑使用 `config.learning.promotion` 而非 `learningPhases`
2. ✅ 旧配置文件（包含 learningPhases）可以正常加载
3. ✅ 新配置文件（不包含 learningPhases）可以正常加载
4. ✅ 分析流程完整执行，无错误
5. ✅ CLAUDE.md 正常生成
6. ✅ 日志输出不包含误导性的学习阶段信息

## Open Questions

1. **preference-learner.ts 是否仍在使用？**
   - 需要全局搜索确认是否有其他代码导入该模块
   - 如果确认未使用，是否应在本次变更中删除？
   - 建议：保守起见，本次变更只移除对 `learningPhases` 的依赖，标记为待删除

2. **是否需要提供迁移工具？**
   - 当前方案依赖 Zod 的 passthrough 行为自动忽略旧字段
   - 是否需要提供 CLI 命令清理用户配置文件中的 `learningPhases`？
   - 建议：不需要，自动忽略即可

3. **是否需要在 Web UI 中显示自动提升配置？**
   - 用户可能不知道如何调整自动提升的激进程度
   - 是否应在 Settings 页面添加 `learning.promotion` 配置界面？
   - 建议：不在本次变更范围内，可作为后续改进

4. **init 命令是否提示学习阶段配置？**
   - 如果 `init.ts` 中有学习阶段配置提示，应该如何处理？
   - 建议：检查 `init.ts`，如果存在则删除相关提示
