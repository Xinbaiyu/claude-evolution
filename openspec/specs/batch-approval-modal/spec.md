# Spec: batch-approval-modal

## ADDED Requirements

### Requirement: Modal display control
BatchApprovalModal 组件 SHALL 接收 `isOpen` 和 `onClose` props 来控制显示和隐藏。

#### Scenario: Modal 打开
- **WHEN** `isOpen` prop 为 `true`
- **THEN** Modal 显示在屏幕中央，带有半透明深色遮罩层覆盖整个视口

#### Scenario: Modal 关闭
- **WHEN** 用户点击关闭按钮或 `onClose` 被调用
- **THEN** Modal 隐藏，遮罩层消失，触发 `onClose` 回调

### Requirement: 确认阶段（idle 状态）
当 Modal 处于 `idle` 状态时，SHALL 显示确认对话框，包含待批准建议数量和确认/取消按钮。

#### Scenario: 显示待批准数量
- **WHEN** Modal 打开且状态为 `idle`
- **THEN** 显示 "确认批准 N 条建议？"，N 为通过 `selectedCount` prop 传入的数量

#### Scenario: 用户确认批准
- **WHEN** 用户点击"确认批准"按钮
- **THEN** 状态切换到 `processing`，调用 `onConfirm` 回调，按钮禁用

#### Scenario: 用户取消操作
- **WHEN** 用户点击"取消"按钮
- **THEN** 调用 `onClose` 回调，Modal 关闭

### Requirement: 处理中阶段（processing 状态）
当 Modal 处于 `processing` 状态时，SHALL 显示加载动画和进度提示。

#### Scenario: 显示加载状态
- **WHEN** 状态为 `processing`
- **THEN** 显示 spinner 动画和文本 "正在批准 N 条建议..."

#### Scenario: 禁用用户操作
- **WHEN** 状态为 `processing`
- **THEN** 禁用关闭按钮和 ESC 键，显示"请勿关闭浏览器"提示

### Requirement: 成功状态（success 状态）
当批量批准成功完成时，SHALL 显示成功信息和已批准数量。

#### Scenario: 显示成功信息
- **WHEN** 状态为 `success`
- **THEN** 显示绿色边框 Modal，文本 "✓ 批准成功"，显示 "已批准 N 条建议"

#### Scenario: 关闭成功 Modal
- **WHEN** 用户点击"完成"按钮
- **THEN** 调用 `onSuccess` 回调，Modal 关闭

### Requirement: 错误状态（error 状态）
当批量批准失败时，SHALL 显示错误信息和回滚提示。

#### Scenario: 显示错误信息
- **WHEN** 状态为 `error`
- **THEN** 显示红色边框 Modal，标题 "批准失败"，错误信息从 `errorMessage` prop 读取

#### Scenario: 突出显示回滚信息
- **WHEN** 状态为 `error`
- **THEN** 在错误信息下方显示独立的回滚提示框："⚠️ 所有更改已回滚" 和 "未应用任何建议"

#### Scenario: 关闭错误 Modal
- **WHEN** 用户点击"关闭"按钮
- **THEN** 调用 `onClose` 回调，Modal 关闭，不调用 `onSuccess`

### Requirement: 状态机管理
Modal 组件 SHALL 使用状态机管理内部状态转换：`idle` → `processing` → (`success` | `error`)。

#### Scenario: 状态转换到 processing
- **WHEN** 用户在 `idle` 状态点击"确认批准"
- **THEN** 状态切换到 `processing`，不可逆转（除非通过 props 重置）

#### Scenario: 状态转换到 success
- **WHEN** `onConfirm` 回调成功完成（无错误）
- **THEN** 状态切换到 `success`

#### Scenario: 状态转换到 error
- **WHEN** `onConfirm` 回调抛出错误或 `errorMessage` prop 有值
- **THEN** 状态切换到 `error`

### Requirement: Neo-brutalist 设计风格
Modal 组件的 UI SHALL 遵循 claude-evolution 的 Neo-brutalist 设计系统。

#### Scenario: 确认阶段样式
- **WHEN** 状态为 `idle`
- **THEN** 使用 `border-4 border-amber-500`、`bg-slate-900`、`font-mono` 样式

#### Scenario: 成功状态样式
- **WHEN** 状态为 `success`
- **THEN** 使用 `border-4 border-green-500`、绿色强调色（`text-green-400`）

#### Scenario: 错误状态样式
- **WHEN** 状态为 `error`
- **THEN** 使用 `border-4 border-red-500`、红色强调色（`text-red-400`）

#### Scenario: 遮罩层样式
- **WHEN** Modal 打开
- **THEN** 显示 `bg-black/70` 半透明遮罩层，z-index 为 50

### Requirement: 组件接口（Props）
BatchApprovalModal 组件 SHALL 接收以下 TypeScript props。

#### Scenario: 必需的 props
- **WHEN** 组件被使用
- **THEN** 必须传入 `isOpen: boolean`、`selectedCount: number`、`onClose: () => void`、`onConfirm: () => Promise<void>`

#### Scenario: 可选的 props
- **WHEN** 组件需要显示成功/错误状态
- **THEN** 可以传入 `errorMessage?: string`、`onSuccess?: () => void`

### Requirement: 集成到 Review.tsx
Review.tsx 页面 SHALL 集成 BatchApprovalModal 组件，替换现有的批量批准 Toast 通知。

#### Scenario: 触发 Modal 打开
- **WHEN** 用户在 Review.tsx 中点击"批量批准"按钮
- **THEN** 设置 `isOpen` 为 `true`，Modal 显示

#### Scenario: 处理批准逻辑
- **WHEN** Modal 调用 `onConfirm` 回调
- **THEN** Review.tsx 调用 `apiClient.batchApproveSuggestions(selectedIds)`，根据结果更新 Modal 状态

#### Scenario: 成功后刷新列表
- **WHEN** Modal 调用 `onSuccess` 回调
- **THEN** Review.tsx 清空选择状态，重新调用 `fetchSuggestions()`，关闭 Modal
