## 1. 移除提升阶段的重复拦截

- [x] 1.1 删除 `promotion.ts` 中的 `isDuplicateInContext` 函数
- [x] 1.2 修改 `getObservationsToPromote` 移除对 `isDuplicateInContext` 的调用，仅保留 `shouldPromote` 判断
- [x] 1.3 清理 `isDuplicateInContext` 相关的导出和引用

## 2. 创建上下文池 LLM 合并模块

- [x] 2.1 创建 `src/memory/context-merge.ts`，定义 `mergeContextPool` 函数签名和 pinned 分组逻辑
- [x] 2.2 编写上下文池合并专用 prompt（包含合并规则、冲突解决策略、pinned 跳过说明）
- [x] 2.3 实现 LLM 调用和 JSON 响应解析（复用 `parseLLMResponse` 和 `withLLMRetry`）
- [x] 2.4 实现合并结果的元数据保留逻辑（`inContext: true`、`mergedFrom`、`promotedAt` 取最早值）
- [x] 2.5 实现合并失败的 fallback 逻辑（返回原始未合并的上下文池）

## 3. 集成到学习周期

- [x] 3.1 在 `learning-orchestrator.ts` 的 Step 5 之后新增 Step 5.1（Context Pool LLM Merge）
- [x] 3.2 将合并结果传递给后续的 Step 5.5（Context Capacity Control）
- [x] 3.3 在学习周期统计结果中增加 `contextMerged` 字段

## 4. 测试

- [x] 4.1 为 `context-merge.ts` 编写单元测试：pinned 观察跳过、合并元数据保留、fallback 逻辑
- [x] 4.2 更新 `promotion.ts` 相关测试：移除 `isDuplicateInContext` 的测试用例，验证同类型观察可以提升
- [x] 4.3 编写集成测试：完整学习周期中上下文池合并步骤的执行顺序和结果

## 5. 验证

- [x] 5.1 运行完整构建确认无编译错误
- [x] 5.2 运行全部测试确认通过
