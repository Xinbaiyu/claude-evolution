# Proposal: add-webui-progress-modal

## Why

批量批准功能的后端 API 和前端批量选择逻辑已在 `add-webui` change 中实现完成，但缺少用户体验的关键部分：批量批准进度 Modal。用户需要在批准大量建议时看到实时进度反馈、确认对话框、成功/错误状态显示，以及在发生回滚时的明确提示。

## What Changes

- 创建 `BatchApprovalModal.tsx` 组件，提供完整的批量批准用户交互流程
- 实现状态机：pending → processing → success/error
- 设计符合 claude-evolution Neo-brutalist 风格的 Modal UI（深色主题，黄色强调色）
- 集成到现有 `Review.tsx` 页面的批量批准按钮点击事件中
- 处理 API 回滚错误场景，向用户展示"所有更改已回滚"的明确信息

## Capabilities

### New Capabilities

- `batch-approval-modal`: 批量批准进度 Modal 组件，包含确认对话框、进度显示、成功/错误状态反馈、回滚提示等完整交互流程

### Modified Capabilities

无现有 capability 的需求变更

## Impact

**影响的代码:**
- 新增 `web/client/src/components/BatchApprovalModal.tsx`
- 修改 `web/client/src/pages/Review.tsx`（集成 Modal 组件）

**API 依赖:**
- 现有 `POST /api/suggestions/batch/approve` API（已实现）

**设计系统:**
- 遵循现有的 Neo-brutalist 设计风格（参考 `Dashboard.tsx` 和 `Review.tsx`）
