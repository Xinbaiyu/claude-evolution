# Proposal: add-batch-reject

## Why

批量批准功能已实现并带有完整的事务回滚机制。用户现在需要对称的批量拒绝功能，以便快速处理不需要的建议。批量拒绝应当具备与批量批准相同的可靠性保证（事务性、可回滚），确保数据一致性。

## What Changes

- 扩展后端快照机制，支持 `rejected.json` 的备份和回滚
- 实现 `batchRejectSuggestions()` 函数，提供事务性批量拒绝
- 添加 API 路由 `POST /api/suggestions/batch/reject`
- 扩展 `BatchApprovalModal` 组件，支持 `type: 'approve' | 'reject'` 参数
- 在 Review 页面添加"批量拒绝"按钮

## Capabilities

### New Capabilities

- `batch-reject`: 批量拒绝建议功能，包含后端事务机制、API 接口、前端 Modal 复用和 UI 集成

### Modified Capabilities

无现有 capability 的需求变更（批量批准功能保持不变）

## Impact

**影响的代码**:
- `src/learners/suggestion-manager.ts` - 扩展快照接口和实现批量拒绝函数
- `src/learners/index.ts` - 导出 `batchRejectSuggestions`
- `web/server/routes/suggestions.ts` - 添加批量拒绝路由（注意顺序）
- `web/client/src/components/BatchApprovalModal.tsx` - 添加 `type` prop 支持动态渲染
- `web/client/src/pages/Review.tsx` - 添加批量拒绝按钮和 Modal 集成
- `web/client/src/api/client.ts` - 添加 `batchRejectSuggestions` API 方法

**API 依赖**:
- 复用现有快照机制（`createSnapshot`, `rollbackFromSnapshot`）
- 复用现有 `rejectSuggestion` 函数

**设计系统**:
- 遵循现有 Neo-brutalist 风格
- 拒绝操作使用红色强调（`border-red-500`, `text-red-500`）
