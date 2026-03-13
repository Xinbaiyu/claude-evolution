# Tasks: add-batch-reject

## 1. 扩展快照机制支持 rejected.json

- [x] 1.1 修改 `Snapshot` 接口，添加 `rejectedBackup: string` 字段
- [x] 1.2 在 `createSnapshot()` 函数中添加 `rejected.json` 备份逻辑
- [x] 1.3 在 `rollbackFromSnapshot()` 函数中添加 `rejected.json` 恢复逻辑
- [x] 1.4 验证批量批准功能仍正常工作（向后兼容性测试）

## 2. 实现批量拒绝后端函数

- [x] 2.1 定义 `BatchRejectionResult` 接口（类似 `BatchApprovalResult`）
- [x] 2.2 实现 `batchRejectSuggestions(ids)` 函数
- [x] 2.3 在函数中调用 `createSnapshot()` 创建快照
- [x] 2.4 实现 for 循环逐个调用 `rejectSuggestion(id)`
- [x] 2.5 实现错误处理：遇到错误时调用 `rollbackFromSnapshot()` 并返回失败结果
- [x] 2.6 成功时调用 `cleanupSnapshot()` 并返回成功结果
- [x] 2.7 在 `src/learners/index.ts` 中导出 `batchRejectSuggestions`

## 3. 添加批量拒绝 API 路由

- [x] 3.1 在 `web/server/routes/suggestions.ts` 中导入 `batchRejectSuggestions`
- [x] 3.2 添加 `POST /suggestions/batch/reject` 路由处理函数
- [x] 3.3 **关键**：将批量拒绝路由放在 `/suggestions/:id/reject` 之前
- [x] 3.4 实现请求参数验证（`ids` 必须是非空数组）
- [x] 3.5 调用 `batchRejectSuggestions(ids)` 并返回结果
- [x] 3.6 处理错误情况，返回适当的 HTTP 状态码

## 4. 扩展 BatchApprovalModal 组件支持 type prop

- [x] 4.1 在 `BatchApprovalModalProps` 接口中添加 `type: 'approve' | 'reject'` 字段（默认 'approve'）
- [x] 4.2 创建 `modalConfig` 对象，定义 approve 和 reject 的配置（标题、颜色、文案）
- [x] 4.3 修改 idle 状态 UI：使用 `config[type].title` 和 `config[type].borderColor`
- [x] 4.4 修改 processing 状态 UI：使用 `config[type].processingText`
- [x] 4.5 修改 success 状态 UI：使用 `config[type].successTitle` 和颜色
- [x] 4.6 修改 error 状态 UI：保持红色边框（approve 和 reject 一致）

## 5. 添加 API 客户端方法

- [x] 5.1 在 `web/client/src/api/client.ts` 中添加 `batchRejectSuggestions(ids)` 方法
- [x] 5.2 实现 `POST /api/suggestions/batch/reject` 请求
- [x] 5.3 处理响应和错误（参照 `batchApproveSuggestions` 实现）

## 6. 集成到 Review.tsx

- [x] 6.1 添加批量拒绝 Modal 控制状态：`const [rejectModalOpen, setRejectModalOpen] = useState(false)`
- [x] 6.2 实现 `handleBatchReject()` 函数
- [x] 6.3 在 `handleBatchReject()` 中调用 `apiClient.batchRejectSuggestions(selectedIds)`
- [x] 6.4 处理成功和错误情况（抛出错误以便 Modal 捕获）
- [x] 6.5 实现 `handleBatchRejectSuccess()` 回调：清空选择、刷新列表
- [x] 6.6 在工具栏添加"批量拒绝"按钮（与批量批准按钮并排）
- [x] 6.7 按钮样式：红色边框（`border-red-500`），禁用时灰色
- [x] 6.8 按钮点击时设置 `setRejectModalOpen(true)`
- [x] 6.9 渲染第二个 `<BatchApprovalModal type="reject" ... />`

## 7. 构建和测试

- [x] 7.1 后端构建验证：运行 `npm run build`，确保无 TypeScript 错误
- [x] 7.2 前端构建验证：运行 `cd web/client && npm run build`，确保编译成功
- [x] 7.3 手动测试：启动 Web 服务器，验证批量拒绝按钮显示
- [x] 7.4 手动测试：选择 2-3 个建议，点击批量拒绝，验证 Modal 流程（idle → processing → success）
- [x] 7.5 手动测试：模拟错误（如无效 ID），验证 error 状态和回滚提示
- [x] 7.6 回归测试：验证批量批准功能仍正常工作
