## Context

claude-evolution 的观察生命周期：

```
会话数据 → [提取] → 新观察 → [LLM Merge] → active pool → [晋升] → context pool → [CLAUDE.md 生成]
```

当前问题：context pool 中出现大量语义重复的观察（如"优先使用中文进行沟通"出现多条，其中一条 mentions 膨胀到 410）。根因有三个层次：

1. **提取层**：`EXTRACTION_PROMPT` 不包含已知观察，LLM 每次从零提取，必然重复产出已知内容
2. **分组层**：`calculateSimilarity()` 使用 `\W+` 分词，中文文本几乎无法产出有效 token，相似中文观察被归为 singletons 跳过 LLM merge
3. **存储层**：active pool LLM merge 只做池内去重，从不与 context pool 对比，重复观察通过晋升不断进入 context pool

涉及的核心文件：
- `src/analyzers/prompts.ts` — extraction prompt 模板
- `src/analyzers/experience-extractor.ts` — 提取流程编排
- `src/learners/llm-merge.ts` — `calculateSimilarity()`、`mergeLLM()` 主函数
- `src/utils/similarity-grouping.ts` — `groupBySimilarity()` 使用 calculateSimilarity
- `src/memory/context-merge.ts` — context pool 合并也使用 groupBySimilarity

## Goals / Non-Goals

**Goals:**
- 从源头减少 70-80% 的重复观察提取
- 修复中文/CJK 文本的相似度计算，使中文观察能正确分组和合并
- 阻止语义重复的观察从 active pool 晋升到 context pool
- 零新增外部依赖

**Non-Goals:**
- 不引入 embedding 模型或向量数据库（当前规模不需要）
- 不改变晋升阈值或 temporal decay 机制
- 不修改 context-merge.ts 的 LLM merge prompt（它间接受益于 similarity fix）
- 不做历史数据清洗（已有重复需手动处理或等 context-merge 自然合并）

## Decisions

### Decision 1: 混合 tokenization 替代纯英文分词

**选择**: Character bigram (CJK) + 英文词 + 关键字段匹配加权

**替代方案考虑**:
| 方案 | 优势 | 劣势 | 结论 |
|------|------|------|------|
| API Embedding (OpenAI/Voyage) | 语义最准 | 新依赖+API key+网络延迟+成本 | 对预分组场景 overkill |
| 本地 Embedding (transformers.js) | 无网络依赖 | 90MB 模型下载，中文模型选择有限 | 太重 |
| LLM 逐对判断 | 语义完美 | O(n²) API 调用，成本极高 | Stage 1 已覆盖此功能 |
| 分词库 (jieba) | 中文分词准确 | 新依赖，Node.js 版质量参差 | 过度工程 |
| **Character bigram + 字段匹配** | **零依赖，实现简单** | **语义理解有限** | **✓ 选择：预分组只需高 recall，Stage 1 LLM 做精确判断** |

**关键洞察**：`calculateSimilarity` 的角色是预分组（高 recall），不需要精确语义理解。后续 Stage 1 LLM merge 会做真正的语义判断。

**实现方案**:
```
tokenize(text) → Set<string>
  ├─ 英文词: /[a-z]+/g, filter(len > 2)
  ├─ CJK bigram: 连续中文字符两两组合
  └─ 合并为统一 token 集合

calculateSimilarity(obs1, obs2) → number
  ├─ type 不同 → 0
  ├─ tokenJaccard = jaccard(tokenize(text1), tokenize(text2))
  ├─ fieldBonus = compareKeyFields(obs1, obs2)  // 0 or 0.15
  └─ return min(tokenJaccard + fieldBonus, 1.0)
```

`compareKeyFields` 逻辑：
- preference: `item.type` 相同 → +0.15
- pattern: `item.problem` 的 token overlap > 0.5 → +0.15
- workflow: `item.name` 的 token overlap > 0.5 → +0.15

### Decision 2: 跨池去重放在 LLM Merge Stage 2.5 之后（新 Stage 3）

**选择**: 在 ignore 检查之后、deleted 检查之前插入跨池去重

**流程**:
```
Stage 0: groupBySimilarity (用修复后的 calculateSimilarity)
Stage 1: LLM merge per group (去重 + 合并)
Stage 2: LLM confidence adjustment
Stage 2.5: Ignore state inheritance
★ Stage 3: Cross-pool dedup (NEW) ★
Stage 4: Deleted similarity check (原 Stage 3)
```

**为什么在 Stage 2.5 之后**：
- Stage 1 已做 active 内部去重，输出更干净，减少与 context pool 的比较次数
- Stage 2 已调整置信度，跨池比较时用的是最终置信度
- Ignore 检查已完成，不会把应被忽略的观察误合并到 context

**跨池去重逻辑**:
- 对每条 Stage 2.5 输出的观察，用 `calculateSimilarity()` 与 context pool 全量比较
- 相似度 >= 0.7 → 将该观察标记为 `crossPoolMatch`，记录匹配的 context 观察 ID
- 标记后的观察不进入 active pool，而是由调用方（learning-orchestrator）累加到 context 条目

**为什么不直接在 mergeLLM 内修改 context pool**：
- `mergeLLM` 是纯计算函数，不应直接写 IO
- context pool 的读写由 `learning-orchestrator` 管理
- 只标记匹配，由上层决定如何处理，保持职责分离

### Decision 3: Extraction prompt 注入已有观察

**选择**: 在 `buildAnalysisPrompt` 中新增 `existingObservations` 参数

**注入内容**:
- context pool 全量（通常 <20 条）
- active pool 中 confidence > 0.7 的观察
- 合并后按 `confidence * mentions` 降序，取 top 30
- 每条只展示 type + content 摘要（~50 tokens），总计 ~1500 tokens

**注入位置**: 在 `EXTRACTION_PROMPT` 的 "重要规则" 部分之后新增：
```
# 已知观察（请勿重复提取）

以下是系统已经了解的用户偏好和模式。如果会话数据中的行为与这些已知观察一致，请不要重复提取。仅提取下方列表中未涵盖的新发现。

{existingObservations}
```

**调用链变更**:
```
pipeline.ts: runAnalysisPipeline()
  → 加载 context pool + active pool
  → 格式化为摘要文本
  → 传入 extractExperience(observations, config, promptsContext, existingObsSummary)
    → buildAnalysisPrompt(sessionsText, promptsContext, existingObsSummary)
```

**为什么不在 system prompt 中注入**：
- system prompt 是静态的角色定义，适合用 prompt caching
- 已有观察每次分析可能不同，放在 user prompt 中更灵活
- 避免破坏现有的 prompt caching 逻辑

### Decision 4: context pool 数据传递方式

**选择**: 由调用方预加载并通过参数传入

`mergeLLM` 新增可选参数 `contextPoolObservations`：
```typescript
export async function mergeLLM(
  oldObservations, newObservations,
  options: {
    // ... existing options
    contextPoolObservations?: ObservationWithMetadata[]; // NEW
  }
)
```

`learning-orchestrator.ts` 在调用 `mergeLLM` 前加载 context pool，传入参数。merge 完成后，检查返回结果中的 `crossPoolMatch` 标记，累加到对应 context 条目。

## Risks / Trade-offs

**[Risk] Character bigram 对极短中文文本（<4 字）效果差** → Mitigation: 极短文本本身不太可能作为独立观察存在，且 fieldBonus 提供额外区分

**[Risk] 注入已有观察增加 ~1500 tokens/批次，增加 API 成本** → Mitigation: 相比减少的重复提取和后续重复 merge 调用，净节省

**[Risk] 跨池去重阈值 0.7 可能误合并不同观察** → Mitigation: 只标记不直接写入，调用方可添加二次确认；阈值可配置化

**[Risk] `mergeLLM` 参数膨胀** → Mitigation: 已经是 options 对象模式，新增一个可选字段影响最小

**[Trade-off] 方案 A 减少提取 vs 可能遗漏新变化** → 在 prompt 中明确"如果行为有显著变化或补充，仍可提取更新版本"
