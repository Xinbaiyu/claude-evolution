# Spec: batch-reject

## ADDED Requirements

### Requirement: 快照机制支持 rejected.json
快照系统 SHALL 扩展支持 `rejected.json` 文件的备份和恢复。

#### Scenario: 创建快照时备份 rejected.json
- **WHEN** 调用 `createSnapshot()` 函数
- **THEN** 除了备份 `pending.json` 和 `approved.json`，还应备份 `rejected.json`（如果文件存在）

#### Scenario: 回滚快照时恢复 rejected.json
- **WHEN** 调用 `rollbackFromSnapshot(snapshot)` 函数
- **THEN** 除了恢复 `pending.json` 和 `approved.json`，还应恢复 `rejected.json`（如果快照中存在）

#### Scenario: 向后兼容批量批准
- **WHEN** 执行批量批准操作（调用 `batchApproveSuggestions`）
- **THEN** 快照应包含 `rejected.json` 备份，但不影响批量批准的正常执行

### Requirement: 批量拒绝函数接口
系统 SHALL 提供 `batchRejectSuggestions(ids)` 函数，支持事务性批量拒绝建议。

#### Scenario: 成功批量拒绝
- **WHEN** 调用 `batchRejectSuggestions(['id1', 'id2', 'id3'])`，所有 ID 均有效
- **THEN** 返回 `{ success: true, rejected: ['id1', 'id2', 'id3'], failed: [] }`

#### Scenario: 部分 ID 无效时回滚
- **WHEN** 调用 `batchRejectSuggestions(['id1', 'invalid-id', 'id3'])`，第 2 个 ID 无效
- **THEN** 返回 `{ success: false, rejected: [], failed: ['invalid-id'], error: '建议不存在: invalid-id' }`，并且 `id1` 未被拒绝（已回滚）

#### Scenario: 空 ID 数组
- **WHEN** 调用 `batchRejectSuggestions([])`
- **THEN** API 返回 400 错误，错误信息为 "ids must be a non-empty array"

### Requirement: 批量拒绝 API 路由
系统 SHALL 提供 `POST /api/suggestions/batch/reject` API 端点。

#### Scenario: 成功批量拒绝
- **WHEN** 发送 `POST /api/suggestions/batch/reject` 请求，body 为 `{ "ids": ["id1", "id2"] }`
- **THEN** 返回 200 状态码和 `{ success: true, data: { rejected: ["id1", "id2"], count: 2 } }`

#### Scenario: 批量拒绝失败
- **WHEN** 发送 `POST /api/suggestions/batch/reject` 请求，body 包含无效 ID
- **THEN** 返回 500 状态码和 `{ success: false, error: "...", data: { rejected: [], failed: [...] } }`

#### Scenario: 路由顺序正确
- **WHEN** 请求 `POST /api/suggestions/batch/reject`
- **THEN** 路由应匹配到批量拒绝端点，而不是单个拒绝端点 `/:id/reject`

### Requirement: BatchApprovalModal 组件支持 type prop
`BatchApprovalModal` 组件 SHALL 接收 `type: 'approve' | 'reject'` prop，支持批准和拒绝两种模式。

#### Scenario: 批准模式渲染
- **WHEN** 传入 `type="approve"`
- **THEN** Modal 显示黄色边框（`border-amber-500`），标题为"确认批准"，按钮文本为"批准 N 条"

#### Scenario: 拒绝模式渲染
- **WHEN** 传入 `type="reject"`
- **THEN** Modal 显示红色边框（`border-red-500`），标题为"确认拒绝"，按钮文本为"拒绝 N 条"

#### Scenario: processing 状态文案动态化
- **WHEN** type="reject" 且 state="processing"
- **THEN** 显示文本为"正在拒绝 N 条建议..."

#### Scenario: success 状态动态化
- **WHEN** type="reject" 且 state="success"
- **THEN** 显示红色边框、文本"✕ 拒绝成功"和"已拒绝 N 条建议"

#### Scenario: error 状态保持一致
- **WHEN** type="reject" 且 state="error"
- **THEN** 显示红色边框（与 idle 一致）、错误信息和回滚提示

### Requirement: Review 页面批量拒绝按钮
Review.tsx 页面 SHALL 添加批量拒绝按钮，与批量批准按钮并排显示。

#### Scenario: 按钮布局
- **WHEN** 用户访问 Review 页面
- **THEN** 工具栏右侧应显示"批准 N 条"和"拒绝 N 条"两个按钮，并排排列

#### Scenario: 按钮禁用状态
- **WHEN** 未选中任何建议（`selectedIds.length === 0`）
- **THEN** 批量拒绝按钮应禁用，显示灰色样式

#### Scenario: 按钮启用状态
- **WHEN** 选中 N 条建议
- **THEN** 批量拒绝按钮启用，显示红色边框和文本"拒绝 N 条"

#### Scenario: 点击触发 Modal
- **WHEN** 用户点击批量拒绝按钮
- **THEN** 打开 `BatchApprovalModal`，传入 `type="reject"`

### Requirement: API 客户端方法
`apiClient` SHALL 提供 `batchRejectSuggestions(ids)` 方法。

#### Scenario: 调用批量拒绝 API
- **WHEN** 调用 `apiClient.batchRejectSuggestions(['id1', 'id2'])`
- **THEN** 发送 `POST /api/suggestions/batch/reject` 请求，body 为 `{ ids: ['id1', 'id2'] }`

#### Scenario: 成功返回
- **WHEN** API 返回成功响应
- **THEN** 方法返回 `{ rejected: [...], count: N }`

#### Scenario: 失败抛出错误
- **WHEN** API 返回错误响应
- **THEN** 方法抛出 `ApiError`，包含错误信息

### Requirement: 集成到 Review.tsx
Review.tsx 页面 SHALL 集成批量拒绝功能。

#### Scenario: handleBatchReject 实现
- **WHEN** 用户在 Modal 中确认批量拒绝
- **THEN** 调用 `apiClient.batchRejectSuggestions(selectedIds)`

#### Scenario: 成功后刷新列表
- **WHEN** 批量拒绝成功
- **THEN** 清空 `selectedIds` 和 `selectAll` 状态，调用 `fetchSuggestions()` 刷新列表

#### Scenario: 失败显示错误
- **WHEN** 批量拒绝失败
- **THEN** Modal 显示错误状态，包含回滚提示信息
