## 为什么

LLM 合并操作（`llm-merge.ts` 中的 Active Pool 合并和 `context-merge.ts` 中的 Context Pool 合并）将所有观察数据序列化为单个 prompt，并期望 LLM 在一次响应中返回全部结果。当观察数量增长时（例如 50 条旧 + 20 条新），输出频繁超出 `max_tokens` 限制（32000/40000），导致截断。现有防御手段（部分 JSON 恢复、fallbackNoMerge）不可靠——部分恢复在深层嵌套 JSON 上会失败，fallbackNoMerge 则完全浪费了 LLM 调用。这是当前学习循环中最常见的故障模式。

此外，经验提取阶段（`experience-extractor.ts`）将观察数据按每 10 条一批分组后，使用**串行 `for` 循环**逐批调用 LLM。各批次之间完全无依赖，串行执行浪费了大量等待时间。

## 变更内容

- 在任何 LLM 调用之前，新增本地预分组步骤，使用已有的 `calculateSimilarity()` 函数按类型 + Jaccard 相似度对观察进行聚类
- 将单次巨型 LLM 调用替换为按组分批调用，每组处理 ≤15 条观察
- 没有相似对等项的观察直接跳过 LLM（直接 "kept" 透传）
- 各组可通过 `Promise.all` 并行处理，带并发控制
- **经验提取批次并行化**：将 `extractExperience()` 中的串行 `for` 循环替换为并发调用，使用共享的 `pMapLimited` 工具函数，最大并发数 3
- 保留现有的截断恢复和 fallbackNoMerge 作为安全网（纵深防御）

## 能力

### 新增能力
- `chunked-merge-strategy`：本地预分组算法（基于 Jaccard 相似度的 Union-Find 聚类）和分批 LLM 调度逻辑，同时适用于 Active Pool 和 Context Pool 合并路径

### 修改能力
- `preference-learner`：学习循环中的合并步骤从单次调用改为分批调用，影响 `mergeLLM()` 和 `mergeContextPool()` 函数的内部行为
- `experience-extractor`：经验提取的批次处理从串行改为有限并发并行，加速 Phase 4 阶段

## 影响

- **修改文件**：`src/learners/llm-merge.ts`、`src/memory/context-merge.ts`、`src/analyzers/experience-extractor.ts`
- **新增工具函数**：`groupBySimilarity()` 函数（约 60 行）+ `pMapLimited()` 并发控制函数（约 30 行）
- **LLM 成本**：降低——没有相似对等项的观察完全跳过 LLM 调用；每个分块更小，消除截断问题
- **延迟**：显著优化——经验提取批次并行处理（4 批 → 2 轮，约 2x 加速）；合并分批并行处理；截断失败导致的重试减少
- **无破坏性变更**：外部 API（`mergeLLM`、`mergeContextPool`、`extractExperience`）签名不变；仅内部重构
- **测试**：`context-merge.test.ts` 和 `llm-merge.test.ts` 中的现有测试需要更新以适配分批行为
