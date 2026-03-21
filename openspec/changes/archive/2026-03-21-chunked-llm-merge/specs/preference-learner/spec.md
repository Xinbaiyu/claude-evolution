## 修改需求

### 需求：Active Pool LLM 合并使用分批策略

`mergeLLM()` 函数必须在 Stage 1（合并/去重）之前使用相似度聚类对观察进行预分组。每组必须由单独的 Stage 1 LLM 调用处理，合并后的结果必须作为单个批次传递给 Stage 2（置信度调整）。

#### 场景：分批分组的 Active Pool 合并
- **当** `mergeLLM()` 接收 50 条旧观察和 20 条新观察
- **则** 系统必须按相似度聚类全部 70 条观察，将每组（≤15 条观察）独立发送到 Stage 1，合并所有 Stage 1 结果，再将合并结果传递给 Stage 2

#### 场景：小输入量的 Active Pool 合并
- **当** `mergeLLM()` 接收 5 条旧观察和 3 条新观察（总计 ≤ 15）
- **则** 系统必须在单次 Stage 1 调用中处理所有观察（无需拆分）

#### 场景：Active Pool 合并截断被消除
- **当** 每个 Stage 1 分块包含 ≤ 15 条观察
- **则** LLM 输出必须远低于 32000 max_tokens 限制，消除截断问题

### 需求：Context Pool LLM 合并使用分批策略

`mergeContextPool()` 函数必须在 LLM 调用之前使用相似度聚类对未固定的观察进行预分组。每组必须由单独的 LLM 调用处理，结果必须与固定观察重新组合。

#### 场景：分批分组的 Context Pool 合并
- **当** `mergeContextPool()` 接收 30 条未固定观察
- **则** 系统必须按相似度聚类观察，将每组（≤15）独立发送到 LLM，合并所有结果，再与固定观察重新组合

#### 场景：少量观察的 Context Pool 合并
- **当** `mergeContextPool()` 接收 5 条未固定观察
- **则** 系统必须在单次 LLM 调用中处理所有观察（无需拆分）

### 需求：外部函数签名保持不变

`mergeLLM()` 和 `mergeContextPool()` 函数必须保持其当前的参数签名和返回类型。分批策略是内部实现细节。

#### 场景：调用方不受影响
- **当** `learning-orchestrator.ts` 调用 `mergeLLM(activeObs, newObservations, options)`
- **则** 调用必须以相同的参数成功执行，并返回相同的 `ObservationWithMetadata[]` 类型
