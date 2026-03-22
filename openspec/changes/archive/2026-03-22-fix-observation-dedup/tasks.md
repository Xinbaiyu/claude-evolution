## 1. CJK Similarity Fix (基础设施)

- [x] 1.1 在 `src/learners/llm-merge.ts` 中新增 `tokenize(text: string): Set<string>` 函数，实现英文词 + CJK character bigram 的混合分词
- [x] 1.2 重写 `calculateSimilarity()` 使用新的 `tokenize()` 替代 `\W+` 分词，并加入关键字段匹配加权（`compareKeyFields` 返回 0~0.2 bonus）
- [x] 1.3 为 `tokenize()` 和修改后的 `calculateSimilarity()` 编写单元测试，覆盖：纯中文、纯英文、中英混合、空文本、相同文本、完全不同文本
- [x] 1.4 运行现有 llm-merge 测试套件，确保无回归

## 2. Extraction Context Injection (源头拦截)

- [x] 2.1 新增 `src/analyzers/existing-observations-loader.ts` 模块，实现 `loadExistingObservationsSummary(maxItems?: number): Promise<string>` — 从 context pool + active pool (conf > 0.7) 加载已有观察并格式化为文本列表
- [x] 2.2 在 `src/analyzers/prompts.ts` 的 `EXTRACTION_PROMPT` 中新增"已知观察"段落模板，指示 LLM 不要重复提取已知内容
- [x] 2.3 修改 `buildAnalysisPrompt()` 签名，新增 `existingObservations?: string` 参数并拼接到 prompt 中
- [x] 2.4 修改 `src/analyzers/experience-extractor.ts` 的 `extractExperience()` 函数，在调用 `buildAnalysisPrompt()` 前加载已有观察摘要并传入
- [x] 2.5 为 `loadExistingObservationsSummary()` 编写单元测试，验证格式化输出和 maxItems 限制

## 3. Cross-Pool Dedup (漏网兜底)

- [x] 3.1 新增 `src/learners/cross-pool-dedup.ts` 模块，实现 `deduplicateAgainstContextPool(mergedObservations, contextObservations, threshold?): CrossPoolDedupResult` — 返回 `{ kept, merged }` 两个数组
- [x] 3.2 在 `mergeLLM()` 的 Stage 2.5 之后、Stage 3 之前插入跨池去重调用：加载 context pool，调用 `deduplicateAgainstContextPool()`，将命中的观察更新到 context pool（mentions+1, confidence 取较高值）
- [x] 3.3 为 `deduplicateAgainstContextPool()` 编写单元测试，覆盖：精确匹配、阈值边界、不同类型不合并、context pool 为空
- [x] 3.4 端到端验证：启动 daemon，触发分析，检查 context.json 不再出现新的重复中文观察

## 4. 集成验证

- [x] 4.1 `npx tsc --noEmit` 编译通过
- [x] 4.2 运行完整测试套件无回归
- [x] 4.3 手动触发分析运行，比较改造前后 context.json 和 active.json 中的重复观察数量
