## 背景

claude-evolution 学习管线在三个节点使用 LLM 调用：

1. **经验提取**（`src/analyzers/experience-extractor.ts`）：将观察数据按每 10 条一批分组，串行调用 LLM 提取偏好、模式和工作流。各批次之间无依赖，但当前使用 `for` 循环串行 `await`，浪费等待时间。
2. **Active Pool 合并**（`src/learners/llm-merge.ts`）：两阶段 LLM 合并——Stage 1 合并旧+新观察（max_tokens=32000），Stage 2 调整置信度（max_tokens=40000）。
3. **Context Pool 合并**（`src/memory/context-merge.ts`）：单次 LLM 调用合并 context pool 中的相似观察（max_tokens=32000）。

合并模块（#2、#3）将**所有观察序列化到单个 prompt 中**，当观察数量增长到 40-70+ 条时，输出超过 `max_tokens` 限制，导致截断（`stop_reason === 'max_tokens'`）。

当前防御手段：
- `recoverTruncatedJsonArray` / `recoverTruncatedJsonObject`——尝试部分 JSON 恢复（不可靠）
- `fallbackNoMerge`——完全放弃合并（浪费了 LLM 调用，无去重效果）

`calculateSimilarity()` 函数已存在于 `llm-merge.ts` 中，使用 Jaccard 词相似度——这是预分组方案的基础。

## 目标 / 非目标

**目标：**
- 通过确保每次 LLM 调用处理有限数量的观察（≤15），消除 LLM 输出截断
- 跳过无潜在重复的观察，减少 LLM 成本
- 保持合并质量——语义相似的观察仍由 LLM 合并
- 将同一模式应用于 `llm-merge.ts` 和 `context-merge.ts`
- 将经验提取的串行批次处理改为有限并发并行，加速 Phase 4 阶段
- 保留现有纵深防御（部分恢复 + fallback）作为安全网

**非目标：**
- 用更复杂的算法替换 Jaccard 相似度（如 embedding 向量）
- 修改 LLM prompt 格式或合并规则
- 将 max_tokens 值加入 config.json 配置化
- 实现截断后的拆分重试（分批方案本身已防止截断）
- 修改 Stage 2（置信度调整）——它处理的是 Stage 1 的输出，已经是有限的
- 修改经验提取的批次大小或 prompt 内容

## 决策

### 1. 预分组算法：基于 Jaccard 相似度的 Union-Find 聚类

**选择**：使用 Union-Find（并查集）对 `calculateSimilarity() > 0.5` 且同 `type` 的观察进行聚类。

**考虑过的替代方案**：
- **K-means 聚类**：对此场景过度工程化，需要预先确定 K 值
- **简单按 type 分组**：过于粗略——许多观察共享相同 type 但内容无关
- **不分组，仅按数量拆分**：会将真正相似的观察拆到不同分块中

**理由**：Union-Find 在相似度比较上是 O(n²)，但 n ≤ 70（受容量限制），所以最多约 2450 次比较——计算成本可忽略。它天然处理传递相似性（A~B, B~C → {A,B,C}）。

### 2. 组大小上限：每块 15 条观察

**选择**：每组上限 15 条观察。如果聚类超过 15 条，按得分（confidence × mentions）拆分。

**理由**：15 条观察 ≈ 3000 输入 token，≈ 2000 输出 token。在 max_tokens=32000 下，有 10 倍安全余量。当前故障发生在 40-70 条观察时。

### 3. 单例组跳过 LLM

**选择**：仅含 1 条观察的组直接返回，标记 `action: "kept"`——无需 LLM 调用。

**理由**：单条观察没有可合并的对象。这是最大的成本节省来源——通常 50-70% 的观察是唯一的。

### 4. 带并发限制的并行执行

**选择**：通过 `pMapLimited` 并行处理各组/批次，限制最多 3 个并发 LLM 调用。此工具函数由合并分批和经验提取并行化共享。

**理由**：LLM 代理 / API 有速率限制。无限并行有 429 错误风险。3 个并发调用在吞吐量和安全性之间取得平衡。

### 5. 共享 `groupBySimilarity` 函数放在新工具文件中

**选择**：创建 `src/utils/similarity-grouping.ts` 存放分组逻辑，由 `llm-merge.ts` 和 `context-merge.ts` 同时引入。

**理由**：两个文件需要完全相同的分组逻辑。提取出来避免重复，让每个文件专注于自己的合并行为。

### 6. context-merge 复用 llm-merge 的 `calculateSimilarity`

**选择**：从 `llm-merge.ts` 导出 `calculateSimilarity`，在新工具文件中引入。

**理由**：该函数已经经过实战验证。复制会带来代码漂移风险。

### 7. 经验提取并行化：复用 `pMapLimited`，保留 `Promise.allSettled` 语义

**选择**：将 `extractExperience()` 中的串行 `for` 循环替换为 `pMapLimited(batches, extractFromBatch, 3)`。使用 `allSettled` 语义——单批失败不影响其他批次。

**考虑过的替代方案**：
- **Promise.all**：一个批次失败会中断所有批次——不可接受，因为当前已有按批容错
- **不限并发的 Promise.allSettled**：批次数多时可能触发 API rate limit

**理由**：改动极小（约 5 行），但效果显著。4 批 / 并发 3 = 2 轮，约 2x 加速。且复用合并分批的同一个 `pMapLimited` 工具函数，无额外依赖。

## 风险 / 权衡

**[跨组重复遗漏]** → 两条相似观察的 Jaccard 值可能 < 0.5，被分到不同组中，阻止 LLM 合并。
→ 缓解：阈值 0.5 故意设为宽松值。同类型但词重叠率 < 0.5 的观察在大多数情况下确实不同。prompt 中现有的合并规则仍会处理组内去重。

**[总 LLM 调用次数增加]** → 从 1 次大调用变为 3-5 次小调用。
→ 缓解：单例组完全跳过 LLM。因为 prompt 开销小（约 500 token）且输出有限制，净 token 用量通常更低。

**[多组时延迟增加]** → 更多组 = 如果触及并发限制，更多串行 LLM 往返。
→ 缓解：并发数 3 保持延迟可控。最坏情况：5 组 → 2 轮 → 约 2 倍单次调用延迟。实际上大多数运行只有 2-3 组。

**[Union-Find 复杂性]** → 需要维护和测试新算法。
→ 缓解：Union-Find 约 30 行代码，广泛理解，无状态。用确定性输入容易编写单元测试。

**[经验提取并行化时 prompt caching 命中率下降]** → 串行时第 2+ 批次可命中 system message 缓存；并行时多个请求同时到达，首次缓存可能尚未建立。
→ 缓解：取决于 API provider 的缓存实现。使用本地代理时此问题不适用。即使缓存未命中，并行带来的延迟节省远大于缓存 miss 的额外成本。
