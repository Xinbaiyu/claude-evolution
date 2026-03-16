## 为什么需要这个改动

用户目前在学习审核页面中必须逐个管理观察数据，当面对大量数据（182 个活跃观察）时效率低下。此外，存在一个严重 bug：删除的观察被永久丢失而不是移动到归档池，导致相似的观察在删除后再次出现（因为系统不记得删除历史）。这些问题让用户感到沮丧，观察管理耗时过长。

## 具体改动内容

- 在学习审核页面的观察卡片上添加复选框多选系统
- 实现批量操作：批量提升、批量忽略、批量删除
- 修复严重 bug：DELETE 操作现在会正确地将观察移到归档池，标记 `archiveReason: 'user_deleted'`
- 添加智能重复检测：LLM 合并时检查已归档的 `user_deleted` 观察，防止相似观察再次出现
- 增强归档池 UI，支持恢复功能和相似度警告
- 为与已删除观察相似的新观察添加视觉提示标记

## 涉及的功能模块

### 新增功能
- `batch-selection`（批量选择）：观察的复选框多选系统，支持全选、取消全选和筛选条件下的选择
- `batch-operations`（批量操作）：批量提升、忽略、删除，带进度指示器和操作确认
- `archive-management`（归档管理）：完整的归档工作流，包含原因、时间戳和恢复功能
- `deletion-awareness`（删除感知）：智能检测与已删除观察相似的新观察，并向用户发出警告

### 修改的现有功能
- `observation-deletion`（观察删除）：现有删除接口修改为移动到归档池，而非永久删除

## 影响范围

**后端**:
- `web/server/routes/learning.ts`：更新 DELETE 接口改为归档操作，新增批量操作接口
- `src/learners/llm-merge.ts`：增强合并逻辑，检查已归档观察并检测相似度
- `src/memory/observation-manager.ts`：添加批量操作支持

**前端**:
- `web/client/src/pages/LearningReview.tsx`：添加复选框选择状态、批量操作 UI、归档池增强
- `web/client/src/api/client.ts`：添加批量操作 API 方法
- 新组件：`BatchOperationBar` 用于显示选中数量和操作按钮

**数据结构**:
- `archived.json` 结构增强，添加 `suppressSimilar` 标志和 `lastBlockedAt` 时间戳字段

**破坏性变更**:
- **⚠️ 破坏性变更**：DELETE API 行为改变 - 现在是归档而非永久删除（依赖永久删除行为的用户需要更新代码）
