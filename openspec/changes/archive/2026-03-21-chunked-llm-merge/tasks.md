## 1. 共享工具：相似度分组与并发控制

- [x] 1.1 从 `src/learners/llm-merge.ts` 导出 `calculateSimilarity`（添加 `export` 关键字）
- [x] 1.2 创建 `src/utils/similarity-grouping.ts`，实现 `groupBySimilarity()` 函数：使用 `calculateSimilarity` 的 Union-Find 聚类，阈值 0.5，最大组大小 15，按得分拆分超大组
- [x] 1.3 创建 `src/utils/concurrent.ts`，实现 `pMapLimited(items, fn, concurrency)` 工具函数，用于有限并发的并行执行（使用 `allSettled` 语义）
- [x] 1.4 在 `src/__tests__/similarity-grouping.test.ts` 中添加 `groupBySimilarity` 的单元测试：同类型分组、跨类型隔离、传递性分组、超大组拆分、单例透传

## 2. Context Pool 合并：分批策略

- [x] 2.1 重构 `src/memory/context-merge.ts` 中的 `mergeContextPool()`：调用 `groupBySimilarity(unpinned)`，将每个多观察组独立发送到 LLM，单例直接返回
- [x] 2.2 将单组 LLM 调用提取为 `mergeContextGroup()` 辅助函数（复用现有的 prompt 模板和解析逻辑）
- [x] 2.3 添加按组错误隔离：如果某组的 LLM 调用失败，返回其未合并的观察，其他组继续处理

## 3. Active Pool 合并：分批策略

- [x] 3.1 重构 `src/learners/llm-merge.ts` 中 `mergeLLM()` 的 Stage 1：调用 `groupBySimilarity([...limitedOld, ...limitedNew])`，将每组独立发送到 Stage 1，在 Stage 2 之前合并结果
- [x] 3.2 将 Stage 1 单组调用提取为 `mergeGroupStage1()` 辅助函数
- [x] 3.3 添加按组错误隔离：失败的组返回其未合并的观察

## 4. 经验提取：批次并行化

- [x] 4.1 重构 `src/analyzers/experience-extractor.ts` 中的 `extractExperience()`：将串行 `for` 循环替换为 `pMapLimited(batches, extractFromBatch, 3)`
- [x] 4.2 保留现有的按批错误隔离语义：单批失败不影响其他批次，失败的批次跳过

## 5. 测试

- [x] 5.1 更新 `src/__tests__/context-merge.test.ts`：验证分批行为——各组分别调用、单例跳过、部分失败处理
- [x] 5.2 更新 `src/__tests__/llm-merge.test.ts`：验证 Stage 1 分批、Stage 2 仍接收合并结果、按组错误隔离
- [x] 5.3 运行完整测试套件，验证所有测试通过

## 6. 验证

- [x] 6.1 TypeScript 构建通过（`npx tsc --noEmit`）
- [ ] 6.2 手动冒烟测试：通过 WebUI 触发分析（30+ 条观察），验证日志中无截断错误且经验提取批次并行执行
