## Why

每次分析运行时，LLM 提取阶段会重复提取系统已知的观察（如「优先使用中文进行沟通」），这些重复观察通过晋升流程不断进入 context pool，导致上下文池中出现大量语义相同但措辞不同的条目（实测有观察 mentions 膨胀到 410）。根因有三：（1）提取 prompt 不知道系统已有哪些观察，每次都从零提取；（2）`calculateSimilarity` 使用 `\W+` 分词对中文完全失效，导致中文观察无法被分组合并；（3）active pool 合并只做池内去重，从不与 context pool 对比，漏网重复最终晋升为新条目。

## What Changes

- **提取阶段注入已有观察**：将 context pool + active pool 高置信度观察注入到 extraction prompt，让 LLM 知道「这些已经知道了」，从源头减少 70-80% 重复提取
- **修复 calculateSimilarity 中文支持**：替换 `\W+` 英文分词为混合 tokenization（英文词 + CJK character bigram + 关键字段匹配加权），修复中文观察相似度计算
- **新增跨池去重**：在 LLM Merge 完成后、写入 active pool 前，将合并结果与 context pool 比较，相似度超阈值的直接累加到已有 context 条目而非作为新观察存入

## Capabilities

### New Capabilities
- `extraction-context-injection`: 提取阶段注入已有观察到 prompt，防止重复提取已知内容
- `cross-pool-dedup`: LLM Merge 后的跨池去重，阻止重复观察从 active pool 晋升到 context pool
- `cjk-similarity`: 修复 calculateSimilarity 对中文/CJK 文本的支持，使用 character bigram + 关键字段匹配的混合方案

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

- **`src/analyzers/prompts.ts`** — extraction prompt 模板新增已有观察占位符
- **`src/analyzers/experience-extractor.ts`** — 调用提取时加载并注入已有观察
- **`src/learners/llm-merge.ts`** — 替换 `calculateSimilarity` 实现，新增 Stage 3 跨池去重
- **`src/utils/similarity-grouping.ts`** — 间接受益于 calculateSimilarity 修复（分组质量提升）
- **`src/memory/context-merge.ts`** — 间接受益（context merge 也用 groupBySimilarity）
- **依赖**：零新增外部依赖
- **API**：无变更
- **数据**：context.json / active.json 格式不变，但数据质量改善
