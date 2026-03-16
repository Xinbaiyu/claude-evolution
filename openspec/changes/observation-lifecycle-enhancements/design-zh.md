## 背景

claude-evolution 系统通过三个池管理观察结果：
- **Active Pool（活跃池）**：会话分析中新发现的观察结果，需要经过 LLM 合并、时间衰退和基于置信度阈值的删除
- **Context Pool（上下文池）**：高质量的观察结果（手动或自动提升），用于生成 CLAUDE.md，目前没有容量限制
- **Archive Pool（归档池）**：被移除的观察结果（删除/忽略/过期），保留 30 天后永久删除

**当前状态：**
- LLM 合并（`src/learners/llm-merge.ts`）会整合相似的观察结果，但不会检查合并后的观察是否与之前被忽略的项目匹配
- Archive Pool 是只写的 - 用户无法恢复他们后来意识到有价值的观察结果
- Context Pool 无限增长，有性能下降的风险，并且会用过时的观察结果淹没 CLAUDE.md
- Active Pool 已有成熟的容量控制（`src/memory/capacity-control.ts`），使用 `score = decayed_confidence × mentions`

**约束条件：**
- 必须保持与现有观察 JSON 文件的向后兼容性
- 不能破坏 Web UI 通过 WebSocket 的实时更新
- 学习周期性能预算：新容量控制步骤最多增加 500ms
- 必须在所有操作中保留用户的手动覆盖（promote/ignore/delete）

**利益相关者：**
- 用户：需要可靠的忽略行为和恢复错误操作的能力
- 系统：必须防止 Context Pool 无限增长
- CLAUDE.md：需要聚焦、相关的观察结果（而非历史噪音）

## 目标 / 非目标

**目标：**
- 在 LLM 合并操作期间尊重用户的忽略决策
- 提供 Archive Pool 恢复 UI 和 API
- 使用时间衰退强制执行 Context Pool 容量限制
- 允许用户钉选关键观察结果以防止自动移除
- 通过 Settings UI 使 Context Pool 容量可配置

**非目标：**
- 更改 Active Pool 容量行为（已经运作良好）
- 添加观察结果使用频率跟踪（未来增强）
- 实现语义相关性衰退（复杂，延期）
- Archive Pool UI 显示已删除的代码/文件（不在范围内）
- 基于新证据的自动"取消忽略建议"（v2 功能）

## 决策

### 决策 1：LLM 合并忽略保护策略

**选定方案：** 当相似度 > 0.8 阈值时继承忽略状态

**理由：**
- 保留用户意图：如果用户明确忽略了"使用 bun 而不是 npm"，合并一个新的"优先使用 bun 包管理器"观察应该尊重该决定
- 使用现有的相似度检测：`checkSimilarityToDeletedObservations()` 已经扫描归档的观察结果
- 低误报率：0.8 阈值（与现有的已删除观察检查相同）在保护与允许真正新观察之间取得平衡

**考虑的替代方案：**
- **警告用户但不自动忽略：** 增加 UI 复杂性和中断摩擦。用户忽略一次后可能希望再次忽略。
- **完全跳过（不合并）：** 失去有价值的元数据整合。更好的做法是合并但继承忽略状态。
- **更低的阈值（0.6）：** 太激进 - 会阻止真正不同的观察结果。

**实现：**
```typescript
// 在 mergeLLM() 的 Stage 1 合并之后
const ignoredObs = archivedObs.filter(o => o.manualOverride?.action === 'ignore');

for (const merged of mergedObservations) {
  const similar = findMostSimilar(merged, ignoredObs);
  if (similar && similarity > 0.8) {
    merged.manualOverride = {
      action: 'ignore',
      timestamp: new Date().toISOString(),
      inheritedFrom: similar.id,
    };
    merged.mergeInfo = {
      mergedFromIgnored: true,
      originalIgnoredId: similar.id,
    };
    // 自动归档
    toArchive.push(merged);
  }
}
```

### 决策 2：Archive Pool 恢复行为

**选定方案：** 允许恢复到 Active 和 Context 池，由用户选择

**理由：**
- **灵活性**：用户可能想重新评估（Active）或立即使用（Context）
- **保持池语义**：Active = "需要审核"，Context = "确认有用"
- **保留手动覆盖历史**：恢复操作设置 `manualOverride.action = 'restore'` 以进行审计跟踪

**考虑的替代方案：**
- **始终恢复到 Active：** 强制重新提升工作流。太死板 - 如果观察已知良好会浪费用户时间。
- **基于归档原因的智能路由：** 复杂的逻辑，用户不清楚恢复去向。

**API 设计：**
```typescript
POST /api/learning/unignore
{
  id: string,
  targetPool: 'active' | 'context'
}

POST /api/learning/batch/unignore
{
  ids: string[],
  targetPool: 'active' | 'context'
}
```

**UI 流程：**
```
Archive Pool → [选择观察] → [恢复到 Active | 恢复到 Context]
```

### 决策 3：Context Pool 容量强制执行

**选定方案：** 复用 Active Pool 容量逻辑，使用更长的半衰期和钉选保护

**理由：**
- **代码复用**：`calculateScore(obs, halfLife)` 和排序逻辑在 Active Pool 中已经验证
- **更长的半衰期（默认 90 天）**：Context Pool 观察是高质量的，应该比 Active（30 天）衰减得更慢
- **绝对钉选保护**：钉选的观察完全排除在容量计算之外

**考虑的替代方案：**
- **无衰减，纯 LRU：** 更简单但忽略质量信号（置信度、提及次数）。低质量的旧观察可能比高质量的新观察存活更久。
- **钉选项目的衰减豁免：** 仍然竞争容量。违背了钉选关键观察的目的。
- **基于使用的评分：** 需要跟踪会话中的 CLAUDE.md 引用。对于 v1 来说太复杂。

**容量公式：**
```typescript
// 仅针对未钉选的观察
score = confidence × 0.5^(age_days / halfLifeDays) × mentions

// 降序排序，保留前 (maxSize - pinnedCount) 个
// 归档得分最低的观察，原因为：'context_capacity'
```

**配置默认值：**
```json
{
  "learning": {
    "capacity": {
      "context": {
        "enabled": true,
        "targetSize": 50,
        "maxSize": 80,
        "halfLifeDays": 90
      }
    }
  }
}
```

### 决策 4：钉选语义

**选定方案：** 绝对保护，UI 限制（软上限 20 个钉选项）

**理由：**
- **用户信任**：如果用户钉选"使用 TypeScript strict 模式"，他们期望它永远不会被移除
- **防止滥用**：UI 在 20 个钉选时警告，建议审查现有钉选。不会硬性阻止，但不鼓励过度钉选。
- **简单实现**：在容量评分之前 `if (obs.pinned) continue;`

**考虑的替代方案：**
- **优先级提升（+0.5 分）：** 如果 Context Pool 充满高分观察，仍然容易被移除。违背用户期望。
- **硬限制（最多 10 个钉选）：** 对于大型项目的高级用户来说太限制。

**UI 行为：**
```
钉选按钮：
- 在 Context Pool 观察卡片中可用
- 视觉指示器：📌 图标 + "Pinned" 徽章 + 移动到列表顶部
- 批量钉选：选择多个 → Pin Selected（如果总数 >20 则警告）

取消钉选：
- 点击 📌 切换关闭
- 可批量取消钉选
```

### 决策 5：归档原因粒度

**选定方案：** 区分 `active_capacity` 与 `context_capacity`

**理由：**
- **用户清晰度**：Archive Pool 过滤器可以显示"来自 Active Pool"与"来自 Context Pool"
- **恢复 UX**：默认恢复目标可以匹配源池
- **未来分析**：跟踪哪个池产生更多噪音
- **低成本**：只是字符串常量的更改

**考虑的替代方案：**
- **通用 `capacity_control`：** 来源不明确。无论如何都需要额外的 `sourcePool` 字段。

**类型更新：**
```typescript
type ArchiveReason =
  | 'user_deleted'
  | 'user_ignored'
  | 'expired'
  | 'active_capacity'   // 新增
  | 'context_capacity'; // 新增
```

## 风险 / 权衡

### 风险 1：忽略继承中的误报

**描述：** LLM 合并可能错误地将新观察标记为与被忽略的观察相似

**缓解措施：**
- 使用经过实战检验的 0.8 相似度阈值（与已删除观察检查相同）
- 记录所有继承决策，包含观察 ID 和相似度分数以便调试
- 用户始终可以从 Archive Pool 恢复，如果他们不同意

**权衡：** 接受偶尔的误报以更强地保护用户意图

### 风险 2：Context Pool 容量强制执行的性能

**描述：** 在每个学习周期对所有观察进行评分可能会减慢分析速度

**缓解措施：**
- 如果 `observationCount <= maxSize` 则提前退出（常见情况）
- 容量检查在自动提升后运行（每个周期一次，而非每个观察）
- 钉选的观察完全排除在评分之外（O(n) → O(n - pinned)）
- 目标：即使有 150 个观察，开销也 <500ms

**权衡：** 接受较小的性能成本以实现有界的 Context Pool 增长

### 风险 3：钉选滥用

**描述：** 用户可能钉选所有内容，使容量管理失效

**缓解措施：**
- UI 在 20 个钉选时警告："您有 20 个钉选的观察。考虑审查旧的钉选。"
- 视觉反馈：钉选的观察标记清晰，易于审计
- 无硬限制 - 相信用户在警告后自我调节

**权衡：** 软限制优先考虑用户自主权而非严格执行

### 风险 4：与现有观察的向后兼容性

**描述：** 没有 `pinned`、`mergeInfo` 字段的观察可能会破坏类型检查

**缓解措施：**
- 所有新字段都是可选的（`pinned?: boolean`）
- 默认处理：`if (!obs.pinned)` 将 undefined 视为 false
- TypeScript 类型保护确保安全访问：`obs.mergeInfo?.mergedFromIgnored`

**权衡：** 无 - 可选字段保持完全向后兼容性

### 风险 5：Archive Pool UI 复杂性

**描述：** 用户可能不理解恢复 vs 取消忽略的术语

**缓解措施：**
- 清晰的按钮标签："Restore to Active" 和 "Restore to Context"（而非"Unignore"）
- 过滤器："我忽略的"、"自动归档（容量）"、"已过期"
- 工具提示解释每个归档原因

**权衡：** 接受轻微的 UI 复杂性以实现强大的恢复工作流

## 迁移计划

**部署步骤：**

1. **阶段 1：后端（非破坏性）**
   - 部署类型扩展（`ObservationWithMetadata`、`ContextCapacityConfig`）
   - 部署容量控制函数（默认禁用）
   - 部署 API 端点（`/unignore`、`/pin`）
   - 通过单元测试验证

2. **阶段 2：启用 Context 容量（选择加入）**
   - 将配置部分添加到 `~/.claude-evolution/config.json`
   - 默认设置 `enabled: false`
   - 在 CHANGELOG 中记录："Context Pool 容量现在可配置（选择加入）"

3. **阶段 3：前端**
   - 部署 Archive Pool UI
   - 部署容量配置的 Settings UI
   - 在 Context Pool 中部署钉选按钮
   - WebSocket 更新无需更改即可工作（现有基础设施）

4. **阶段 4：默认启用（1 周后）**
   - 对于新安装，将默认值更改为 `enabled: true`
   - 现有用户必须通过 Settings UI 选择加入

**回滚策略：**
- 禁用容量控制：设置 `learning.capacity.context.enabled = false`
- 具有新字段的观察向后兼容（可选字段）
- Archive Pool UI 降级：如果 API 不可用，则回退到只读视图
- 不需要数据迁移 - 系统优雅地处理缺失字段

**测试：**
- 单元测试：带钉选观察的容量强制执行
- 集成测试：Unignore API → Context Pool → CLAUDE.md 重新生成
- 手动测试：钉选 25 个观察，验证 UI 警告
- 性能测试：200 个 Context Pool 观察，测量容量检查延迟

## 待解决问题

**Q1：Active Pool 中是否应该提供钉选功能？**
- 当前范围：仅 Context Pool
- 理由：Active Pool 是短暂的（观察很快被提升或删除）
- 决定：延期至用户反馈。如果需要，以后容易添加。

**Q2：如果在会话中禁用 Context Pool 容量会发生什么？**
- 行为：超过 maxSize 的观察保留到下次启用
- 禁用时不会自动扩展
- 决定：可以接受。设置更改在下一个学习周期生效。

**Q3：我们应该跟踪观察的"最后在会话中使用"的时间戳吗？**
- 将启用基于使用的衰减（比基于时间更准确）
- 需要会话分析记录观察引用
- 决定：延期至阶段 2。基于时间的衰减对于 v1 已足够。
