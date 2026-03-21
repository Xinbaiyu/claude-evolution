## Context

当前学习周期（learning-orchestrator.ts）的流程：

1. LLM Merge（活跃池：新旧观察合并）
2. Temporal Decay
3. Deletion
4. Capacity Control（活跃池）
5. Auto-Promotion（活跃池 → 上下文池）
5.5. Context Pool Capacity Control
6. Archive Cleanup
7. Save State
8. Regenerate CLAUDE.md

**现状问题**：Step 5 的 `isDuplicateInContext` 用 `item.type` 做粗粒度去重，preference 的 `item.type` 只有 4 个枚举值（style/tool/workflow/communication），导致同类型下更强的观察被旧条目阻断。同时上下文池没有合并机制，随着观察提升，可能出现语义重复或矛盾的条目。

**现有 LLM 合并基础设施**：`src/learners/llm-merge.ts` 已实现两阶段 LLM 合并（Stage 1 去重合并 + Stage 2 置信度调整），可以复用其 prompt 模板和解析逻辑。

## Goals / Non-Goals

**Goals:**
- 消除 `isDuplicateInContext` 对自动提升的阻断，让达标观察直接进入上下文池
- 在提升后对上下文池执行 LLM 合并，合并语义相似的观察
- LLM 合并时识别并解决冲突（用户偏好变化时保留最新的）
- pinned 的观察在合并时完全跳过
- 复用现有 llm-merge.ts 的基础设施（prompt 模板风格、JSON 解析、重试机制）

**Non-Goals:**
- 不改变活跃池的 LLM 合并逻辑（Step 1 不动）
- 不修改 gold/silver/bronze 阈值体系
- 不改变 pinned 观察的保护机制
- 不做上下文池的手动合并 UI（本次仅自动合并）

## Decisions

### 1. 移除 isDuplicateInContext 而非修改

**决定**：完全移除 `isDuplicateInContext` 函数及其在 `getObservationsToPromote` 中的调用。

**理由**：原函数的"以强替弱"改造不如"先全量提升 + 后 LLM 合并"干净。后者让提升和合并各司其职，逻辑更清晰。重复的问题交给 LLM 在上下文池层面统一处理。

**替代方案（不采用）**：修改 isDuplicateInContext 为"以强替弱"逻辑——增加代码复杂度且仅解决"替换"场景，无法处理多条合并和冲突解决。

### 2. 上下文池合并作为独立步骤

**决定**：在 learning-orchestrator 的 Step 5（Auto-Promotion）之后、Step 5.5（Context Capacity Control）之前插入新的 Step 5.1（Context Pool LLM Merge）。

**理由**：
- 先提升再合并，保证所有达标观察都进入上下文池
- 合并后再做容量控制，避免合并前就因容量限制丢弃可能被合并的条目
- 作为独立步骤，失败不影响其他步骤（可 fallback 到不合并）

### 3. 复用 llm-merge.ts 的模式但独立 prompt

**决定**：新建 `src/memory/context-merge.ts`，复用 `parseLLMResponse`、`withLLMRetry` 等工具函数，但使用专门为上下文池设计的 prompt。

**理由**：上下文池合并的关注点不同于活跃池：
- 需要识别冲突而非仅去重
- 需要尊重 pinned 状态
- 需要处理 inContext/promotedAt 等上下文池专有元数据
- 合并后的观察必须保留 `inContext: true`

### 4. 冲突解决策略：以时间为主、mentions 为辅

**决定**：LLM 在合并 prompt 中被指示：当两条观察矛盾时，优先保留 `lastSeen` 更近的版本；若时间相近，保留 `mentions` 更高的。

**理由**：用户偏好会随时间变化，最近的行为更能代表当前偏好。mentions 作为辅助指标，反映观察的可靠程度。

### 5. 合并范围：仅处理非 pinned 观察

**决定**：合并前将上下文池分为两组——pinned（跳过）和 unpinned（参与合并）。合并完成后将两组重新合并。

**理由**：pinned 是用户明确固定的观察，不应被 LLM 修改或吞并。

## Risks / Trade-offs

- **[LLM 调用增加]** → 每次学习周期多一次 LLM 调用（上下文池通常 < 80 条），成本可控。使用 haiku 模型保持成本低
- **[LLM 合并错误]** → 如果合并阶段失败，fallback 到不合并（保留提升后的原始上下文池），不影响其他步骤
- **[过度合并]** → 复用现有 `detectMergeQualityIssues` 逻辑，如果合并减少超过 50% 则发出警告
- **[pinned 观察与非 pinned 冲突]** → pinned 观察不参与合并，如果 pinned 和非 pinned 存在矛盾，非 pinned 的矛盾方被淘汰，pinned 保留。这符合"用户明确固定的优先"的语义
