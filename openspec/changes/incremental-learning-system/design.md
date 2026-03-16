# Technical Design: Incremental Learning System

## Context

**Current State:**
- 每次分析生成独立的建议列表 (`pending.json`, `approved.json`, `rejected.json`)
- 建议一旦生成，置信度和元数据不再变化
- 用户需要手动审批所有建议（批量审批负担重）
- 没有遗忘机制，旧建议永久累积

**Proposed State:**
- 观察持续累积在候选池 (`active.json`)
- 每次分析时 LLM 合并去重，动态更新置信度
- 时间衰减自动淡化旧知识
- 高置信度观察自动晋升到上下文 (`context.json`)，无需人工审批

**Constraints:**
- 必须保持向后兼容（现有 `suggestions/` 目录保留用于 review 流程）
- LLM token 消耗 < 100k tokens/天
- 候选池大小稳定在目标范围（默认 50±10 条）
- 不能影响现有的手动审批流程

## Goals / Non-Goals

**Goals:**
1. 实现每 6h 自动合并和去重观察
2. 应用时间衰减，自动遗忘过期知识
3. 高置信度观察自动晋升，无需人工审批
4. 候选池大小自动稳定在配置范围
5. WebUI 支持学习配置和分组审核

**Non-Goals:**
- 不实现监控面板（后续迭代）
- 不支持多语言模型（仅用默认 LLM）
- 不可视化证据链图（后续功能）
- 不支持分布式学习

## Decisions

### Decision 1: 数据结构和存储位置

**选择：新建 `memory/observations/` 目录，保留现有 `suggestions/` 目录**

```
~/.claude-evolution/
  memory/                      # NEW: 增量学习数据
    observations/
      active.json              # 候选区（50条左右）
      context.json             # 已晋升（自动应用）

  suggestions/                 # EXISTING: 兼容现有流程
    pending.json               # 待审批建议
    approved.json              # 已批准
    rejected.json              # 已拒绝
```

**Rationale:**
- 新旧系统隔离，降低迁移风险
- `suggestions/` 保留用于手动审批流程（review 命令）
- `memory/observations/` 作为新的学习核心，支持增量更新

**Alternatives Considered:**
- ❌ **方案 A**: 直接改造 `suggestions/` 目录 → 风险高，破坏现有流程
- ✅ **方案 B**: 新建目录，双轨运行 → 安全、可渐进迁移

---

### Decision 2: 观察数据格式

**选择：扩展现有 `Observation` 类型，新增元数据字段**

```typescript
interface ObservationWithMetadata extends Observation {
  // 现有字段
  id: string;
  sessionId: string;
  timestamp: string;
  type: 'preference' | 'pattern' | 'workflow';
  confidence: number;
  evidence: string[];
  item: Preference | Pattern | Workflow;

  // 新增字段
  mentions: number;              // 累计提及次数
  lastSeen: string;              // 最后观察时间 (ISO 8601)
  firstSeen: string;             // 首次观察时间
  originalConfidence: number;    // 初始置信度（用于衰减计算）
  inContext: boolean;            // 是否已晋升到上下文
  manualOverride?: {             // 手动操作记录
    action: 'promote' | 'demote' | 'ignore';
    timestamp: string;
    reason?: string;
  };
}
```

**Rationale:**
- `mentions`: 追踪观察频率，用于晋升判断
- `lastSeen`: 计算时间衰减的锚点
- `originalConfidence`: 保留原始值，避免衰减复合误差
- `inContext`: 标记是否已应用到 CLAUDE.md
- `manualOverride`: 记录人工干预，防止自动系统覆盖

---

### Decision 3: LLM 合并提示词设计

**选择：两阶段提示词 - 先合并去重，再更新置信度**

**Stage 1: 合并去重提示词**

```typescript
const MERGE_PROMPT = `
你是一个代码学习助手，负责合并和去重观察数据。

# 输入数据

## 旧观察 (${oldObservations.length} 条)
${JSON.stringify(oldObservations, null, 2)}

## 新观察 (${newObservations.length} 条)
${JSON.stringify(newObservations, null, 2)}

# 任务

1. **去重**: 识别重复或高度相似的观察（相似度 > 80%）
2. **合并**: 合并相同主题的观察，保留最完整的证据链
3. **更新**: 更新 mentions 计数和 lastSeen 时间
4. **保留**: 保持所有不重复的观察

# 合并规则

- **Preference**: 相同 type + 相似 description → 合并
- **Pattern**: 相同 problem + 相似 solution → 合并
- **Workflow**: 相同 name + 相似 steps → 合并

合并时：
- mentions = sum(mentions)
- confidence = max(confidence)
- evidence = concat(evidence) 并去重
- lastSeen = 最新时间
- firstSeen = 最早时间

# 输出格式

返回 JSON 数组，每个元素包含：
- observation: 合并后的观察对象
- mergedFrom: 被合并的原始 ID 列表

\`\`\`json
[
  {
    "observation": { ... },
    "mergedFrom": ["id1", "id2"]
  }
]
\`\`\`
`;
```

**Stage 2: 置信度调整提示词**

```typescript
const CONFIDENCE_ADJUSTMENT_PROMPT = `
根据以下因素微调置信度（±5%）：

1. **证据质量**:
   - 多样性高（不同会话）: +5%
   - 集中在单个会话: -5%

2. **描述清晰度**:
   - 具体、可操作: +5%
   - 模糊、泛化: -5%

3. **一致性**:
   - 与已晋升规则一致: +5%
   - 与已晋升规则冲突: -10%

返回调整后的观察数组。
`;
```

**Rationale:**
- 两阶段分离职责：合并 vs 质量评估
- 结构化输出易于验证和调试
- 增量调整（±5%）避免置信度剧烈波动

**Alternatives Considered:**
- ❌ **方案 A**: 单阶段提示词 → 任务复杂，容易出错
- ✅ **方案 B**: 两阶段 → 清晰、可测试、可调优

---

### Decision 4: 时间衰减算法实现

**选择：使用 OpenClaw 的指数衰减模型**

```typescript
/**
 * 计算时间衰减后的置信度
 *
 * @param originalConfidence - 初始置信度 (0-1)
 * @param firstSeenDate - 首次观察时间
 * @param halfLifeDays - 半衰期（天数，默认 30）
 * @returns 衰减后的置信度 (0-1)
 */
function applyTemporalDecay(
  originalConfidence: number,
  firstSeenDate: string,
  halfLifeDays: number = 30
): number {
  const now = Date.now();
  const firstSeen = new Date(firstSeenDate).getTime();
  const ageInDays = (now - firstSeen) / (1000 * 60 * 60 * 24);

  // λ = ln(2) / halfLife
  const lambda = Math.log(2) / halfLifeDays;

  // decayed = original × e^(-λ × age)
  const decayMultiplier = Math.exp(-lambda * ageInDays);

  return originalConfidence * decayMultiplier;
}
```

**衰减效果示例**（半衰期 30 天）：
- Day 0: 100%
- Day 30: 50%
- Day 60: 25%
- Day 90: 12.5%

**Rationale:**
- 物理学半衰期模型，数学简洁且直观
- 自然淡化，避免硬截断
- 可配置半衰期，适应不同使用场景

**Alternatives Considered:**
- ❌ **线性衰减**: 过于激进，短期内损失太多
- ❌ **分段函数**: 复杂，边界不平滑
- ✅ **指数衰减**: 平滑、自然、可配置

---

### Decision 5: 自动晋升和删除策略

**选择：双条件阈值 + 延迟删除**

```typescript
interface PromotionThresholds {
  autoPromote: {
    minConfidence: 0.90;  // 90%
    minMentions: 10;
  };
  highPriority: {
    minConfidence: 0.75;  // 75%
    minMentions: 5;
  };
  candidate: {
    minConfidence: 0.60;  // 60%
    minMentions: 3;
  };
}

interface DeletionThresholds {
  immediate: {
    maxConfidence: 0.25;  // < 25% 立即删除
  };
  delayed: {
    maxConfidence: 0.35;  // < 35%
    noGrowthDays: 14;     // 且 14 天未增长
  };
}
```

**晋升逻辑**:
```typescript
function shouldPromote(obs: ObservationWithMetadata): 'auto' | 'high' | 'candidate' | 'none' {
  const decayed = applyTemporalDecay(obs.originalConfidence, obs.firstSeen);

  if (decayed >= 0.90 && obs.mentions >= 10) {
    return 'auto';  // 自动晋升到 context.json
  }
  if (decayed >= 0.75 && obs.mentions >= 5) {
    return 'high';  // 推荐批量批准
  }
  if (decayed >= 0.60 && obs.mentions >= 3) {
    return 'candidate';  // 保留观察
  }
  return 'none';
}
```

**删除逻辑**:
```typescript
function shouldDelete(obs: ObservationWithMetadata): boolean {
  const decayed = applyTemporalDecay(obs.originalConfidence, obs.firstSeen);

  // 立即删除
  if (decayed < 0.25) {
    return true;
  }

  // 延迟删除
  if (decayed < 0.35) {
    const daysSinceLastSeen = (Date.now() - new Date(obs.lastSeen).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastSeen > 14) {
      return true;
    }
  }

  return false;
}
```

**Rationale:**
- 双条件防止误晋升（高置信度 + 高频率）
- 延迟删除给低频观察更多机会
- 三级分类支持不同审批策略

---

### Decision 6: 候选池容量控制

**选择：优先保留策略 + LRU 淘汰**

```typescript
interface CapacityConfig {
  targetSize: 50;        // 目标大小
  maxSize: 60;           // 硬上限（触发清理）
  minSize: 40;           // 软下限（停止清理）
}

/**
 * 容量控制：保持候选池在目标范围
 */
function enforceCapacity(observations: ObservationWithMetadata[]): ObservationWithMetadata[] {
  const config = loadConfig().learning.capacity;

  // 未超出硬上限，无需清理
  if (observations.length <= config.maxSize) {
    return observations;
  }

  // 按优先级排序（分数 = decayedConfidence × mentions）
  const scored = observations.map(obs => ({
    obs,
    score: applyTemporalDecay(obs.originalConfidence, obs.firstSeen) * obs.mentions
  }));

  scored.sort((a, b) => b.score - a.score);

  // 保留 top N
  return scored.slice(0, config.targetSize).map(s => s.obs);
}
```

**Rationale:**
- 优先保留高价值观察（高置信度 × 高频率）
- 硬上限防止无限增长
- 软下限避免过度清理

**Alternatives Considered:**
- ❌ **FIFO**: 不考虑质量，可能丢失重要观察
- ❌ **Random**: 不可预测
- ✅ **Score-based**: 公平、可解释

---

### Decision 7: 集成调度器流程

**选择：在现有分析流程后插入合并步骤**

```typescript
// src/daemon/cron-scheduler.ts

async function executeScheduledAnalysis() {
  // 1. 现有流程：分析近期会话
  const newObservations = await analyzeRecentSessions();

  // 2. NEW: 加载旧观察
  const oldObservations = await loadActiveObservations();

  // 3. NEW: LLM 合并去重
  const merged = await mergeLLM(oldObservations, newObservations);

  // 4. NEW: 应用时间衰减
  const decayed = merged.map(obs => ({
    ...obs,
    confidence: applyTemporalDecay(obs.originalConfidence, obs.firstSeen)
  }));

  // 5. NEW: 删除低价值
  const filtered = decayed.filter(obs => !shouldDelete(obs));

  // 6. NEW: 容量控制
  const controlled = enforceCapacity(filtered);

  // 7. NEW: 自动晋升
  const toPromote = controlled.filter(obs => shouldPromote(obs) === 'auto');
  await promoteToContext(toPromote);

  // 8. NEW: 保存候选池
  await saveActiveObservations(controlled);

  // 9. NEW: 重新生成 CLAUDE.md
  await regenerateClaudeMd();

  // 10. 现有流程：通知用户
  await notifyUser();
}
```

**Rationale:**
- 最小侵入现有流程
- 新旧功能串联，易于调试
- 保留现有通知机制

---

### Decision 8: WebUI 配置界面

**选择：在 Settings 页面新增 "Learning" Tab**

```typescript
// web/client/src/pages/Settings.tsx

interface LearningConfig {
  capacity: {
    targetSize: number;      // 候选区目标数量
    maxSize: number;         // 硬上限
  };
  decay: {
    halfLifeDays: number;    // 半衰期（天）
    enabled: boolean;        // 是否启用衰减
  };
  promotion: {
    autoConfidence: number;  // 自动晋升阈值
    autoMentions: number;
    highConfidence: number;  // 高优先级阈值
    highMentions: number;
  };
  deletion: {
    immediateThreshold: number;  // 立即删除阈值
    delayedThreshold: number;    // 延迟删除阈值
    delayedDays: number;         // 延迟天数
  };
}
```

**UI 组件**:
- 滑块：候选区大小（10-200）
- 滑块：半衰期（7-90 天）
- 开关：启用时间衰减
- 数字输入：晋升阈值（置信度 % + 提及次数）
- 数字输入：删除阈值

**Rationale:**
- 集中配置，用户体验一致
- 实时预览效果（显示当前候选池状态）
- 默认值经过调优，高级用户可自定义

---

## Risks / Trade-offs

### Risk 1: LLM 合并质量不稳定

**Risk:** LLM 可能错误合并不相关的观察，或遗漏应该合并的项

**Mitigation:**
- 提供结构化输出格式（JSON schema）
- 两阶段处理降低单次任务复杂度
- 保留合并历史（`mergedFrom` 字段），支持人工审核
- 添加合并质量检测：如果合并后总数减少 > 50%，发出警告

---

### Risk 2: 时间衰减过于激进

**Risk:** 重要但低频的观察可能被过早删除

**Mitigation:**
- 延迟删除策略（14 天宽限期）
- 手动 promote 可绕过衰减（`manualOverride`）
- 用户可调整半衰期（7-90 天）
- Review 页面显示即将删除的观察，提醒用户

---

### Risk 3: 候选池容量控制丢失重要观察

**Risk:** 优先级算法可能错误淘汰潜在价值观察

**Mitigation:**
- 保留被淘汰观察到 `archived.json`（30 天保留期）
- 提供恢复接口（WebUI "Archived" Tab）
- 容量上限设置为软限制（60），远高于目标（50）
- 记录淘汰原因和时间，支持审计

---

### Risk 4: Token 成本超预算

**Risk:** 每次合并 50 条旧观察 + N 条新观察，可能消耗大量 token

**Mitigation:**
- 限制输入大小：旧观察裁剪到 top 50，新观察限制 < 20
- 使用 Haiku 模型进行合并（成本 1/3）
- 缓存合并结果，避免重复调用
- 监控 token 使用，超过阈值时发出警告

**预估成本**:
- 输入：50 旧 + 20 新 = ~25k tokens
- 输出：~70 合并后 = ~15k tokens
- 单次成本（Haiku）：~$0.01
- 每天 4 次：~$0.04/天（远低于 $0.15 预算）

---

### Risk 5: 与现有 suggestions/ 流程冲突

**Risk:** 用户可能混淆新旧系统，不知道该审批哪个

**Mitigation:**
- 保留 `review` 命令，继续支持旧流程
- 新增 `review --learning` 命令，查看候选池
- WebUI 明确区分两个入口：
  - "Suggestions" Tab → 传统审批
  - "Learning Pool" Tab → 候选池管理
- 文档清晰说明两者关系

---

## Migration Plan

### Phase 1: Core Infrastructure (Week 1-2)
1. 实现 `ObservationWithMetadata` 类型
2. 创建 `memory/observations/` 目录管理模块
3. 实现时间衰减算法
4. 实现晋升和删除逻辑
5. 单元测试覆盖率 > 80%

### Phase 2: LLM Integration (Week 3)
1. 设计并测试合并提示词
2. 实现两阶段合并流程
3. 添加合并质量检测
4. Token 消耗监控

### Phase 3: Scheduler Integration (Week 4)
1. 修改 `cron-scheduler.ts`，插入合并步骤
2. 实现 `regenerateClaudeMd()` 逻辑
3. 端到端测试完整流程
4. 性能优化（并行处理）

### Phase 4: WebUI (Week 5)
1. Settings 页面新增 "Learning" Tab
2. Review 页面新增分组显示
3. 实现手动操作（promote/demote/ignore）
4. 实时预览候选池状态

### Phase 5: Testing & Rollout (Week 6)
1. 完整集成测试
2. 负载测试（模拟 1000 条观察）
3. 用户 Beta 测试
4. 文档和教程

**Rollback Strategy:**
- 保留旧系统不变，新系统独立运行
- 如果出现问题，可通过配置禁用新系统
- 数据迁移脚本支持回滚

---

## Open Questions

1. **Q: 是否需要支持手动触发合并？**
   - 场景：用户导入大量历史数据后想立即合并
   - 建议：添加 `analyze --merge-now` 命令

2. **Q: 如何处理用户手动编辑 active.json？**
   - 场景：高级用户直接修改 JSON 文件
   - 建议：启动时验证 schema，损坏则回滚到备份

3. **Q: 是否需要导出/导入候选池？**
   - 场景：团队间共享学习数据
   - 建议：后续版本添加 `export/import` 命令

4. **Q: 如何处理多语言学习（中文 + 英文）？**
   - 当前设计：LLM 自动处理
   - 未来优化：分语言存储候选池

5. **Q: 是否需要版本控制候选池变化？**
   - 场景：回溯历史学习状态
   - 建议：每次合并前备份到 `.bak` 文件
