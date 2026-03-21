## Why

`promotion.ts` 的 `isDuplicateInContext` 对 preference 类型按 `item.type`（仅 4 个枚举值：style/tool/workflow/communication）做粗粒度去重，导致活跃池中 mentions 更高、描述更全面的观察无法提升到上下文池，被旧的弱条目阻断。同时上下文池缺乏合并机制，随着观察不断提升，可能出现语义重复或互相矛盾的条目占用 token。

## What Changes

- **移除提升阶段的重复拦截**：`isDuplicateInContext` 不再阻止同类观察提升，任何达到 gold 阈值的观察直接进入上下文池
- **新增上下文池 LLM 合并步骤**：在 promotion 之后、capacity control 之前，调用 LLM 对上下文池中语义相似的观察进行合并
- **合并时跳过 pinned 观察**：`pinned=true` 的条目不参与 LLM 合并，保持原样
- **合并时解决冲突**：LLM 识别互相矛盾的观察（用户偏好变化），保留最新的、淘汰过时的
- **删除 `isDuplicateInContext` 函数**：该函数不再需要

## Capabilities

### New Capabilities
- `context-pool-llm-merge`: 上下文池 LLM 合并与冲突解决，在 auto-promotion 之后对上下文池执行语义去重、合并相似项、解决矛盾项

### Modified Capabilities
（无已有 spec 需要修改）

## Impact

- **promotion.ts**: 移除 `isDuplicateInContext` 及 `getObservationsToPromote` 中的去重逻辑
- **learning-orchestrator.ts**: 在 Step 5 和 Step 5.5 之间新增 context-merge 步骤
- **新增文件**: `src/memory/context-merge.ts` — LLM 合并 prompt 和执行逻辑
- **LLM 调用成本**: 每次学习周期多一次 LLM 调用（仅上下文池，通常 < 80 条）
- **types/learning.ts**: 可能需要扩展 MergeResult 类型以支持冲突解决结果
