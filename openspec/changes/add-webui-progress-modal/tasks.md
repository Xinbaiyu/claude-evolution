# Tasks: add-webui-progress-modal

## 1. 创建 BatchApprovalModal 组件基础结构

- [x] 1.1 创建 `web/client/src/components/BatchApprovalModal.tsx` 文件
- [x] 1.2 定义 TypeScript props 接口：`BatchApprovalModalProps`（包含 isOpen, selectedCount, onClose, onConfirm, errorMessage?, onSuccess?）
- [x] 1.3 定义状态类型：`type ModalState = 'idle' | 'processing' | 'success' | 'error'`
- [x] 1.4 初始化组件状态：`useState<ModalState>('idle')`

## 2. 实现 idle 状态（确认阶段）UI

- [x] 2.1 创建遮罩层：`bg-black/70` 半透明覆盖层，z-index 50
- [x] 2.2 创建 Modal 主体：`border-4 border-amber-500 bg-slate-900`，居中显示
- [x] 2.3 添加标题："确认批准"，使用 `font-black text-amber-500`
- [x] 2.4 显示待批准数量："确认批准 {selectedCount} 条建议？"
- [x] 2.5 添加"确认批准"按钮：点击时切换状态到 `processing` 并调用 `onConfirm`
- [x] 2.6 添加"取消"按钮：点击时调用 `onClose`

## 3. 实现 processing 状态（处理中）UI

- [x] 3.1 创建加载动画 spinner（使用 Tailwind 的 `animate-spin`）
- [x] 3.2 显示进度文本："正在批准 {selectedCount} 条建议..."
- [x] 3.3 显示警告提示："请勿关闭浏览器"，使用 `text-slate-400 text-sm`
- [x] 3.4 禁用关闭按钮和 ESC 键（通过条件渲染或 disabled 属性）

## 4. 实现 success 状态（成功）UI

- [x] 4.1 创建成功 Modal：`border-4 border-green-500`
- [x] 4.2 显示成功标题："✓ 批准成功"，使用 `text-green-400 font-black`
- [x] 4.3 显示成功信息："已批准 {selectedCount} 条建议"
- [x] 4.4 添加"完成"按钮：点击时调用 `onSuccess` 和 `onClose`

## 5. 实现 error 状态（错误）UI

- [x] 5.1 创建错误 Modal：`border-4 border-red-500`
- [x] 5.2 显示错误标题："批准失败"，使用 `text-red-400 font-black`
- [x] 5.3 显示错误信息：从 `errorMessage` prop 读取
- [x] 5.4 创建回滚提示框：`border-2 border-red-500 bg-red-500/10`，显示 "⚠️ 所有更改已回滚" 和 "未应用任何建议"
- [x] 5.5 添加"关闭"按钮：点击时调用 `onClose`（不调用 `onSuccess`）

## 6. 实现状态机逻辑

- [x] 6.1 在 `onConfirm` 回调中使用 try-catch 包裹异步逻辑
- [x] 6.2 成功时：`setState('success')`
- [x] 6.3 失败时：`setState('error')`，存储错误信息到 state
- [x] 6.4 添加 `useEffect` 监听 `isOpen` 变化，重置状态到 `idle`

## 7. 集成到 Review.tsx

- [x] 7.1 在 `Review.tsx` 中导入 `BatchApprovalModal` 组件
- [x] 7.2 添加 Modal 控制状态：`const [modalOpen, setModalOpen] = useState(false)`
- [x] 7.3 修改批量批准按钮的 `onClick`：设置 `setModalOpen(true)` 替代直接调用 API
- [x] 7.4 在 `Review.tsx` 底部渲染 `<BatchApprovalModal />` 组件
- [x] 7.5 传递必要的 props：`isOpen={modalOpen}`、`selectedCount={selectedIds.length}`、`onClose={...}`、`onConfirm={handleBatchApprove}`
- [x] 7.6 实现 `onSuccess` 回调：清空选择状态、刷新建议列表

## 8. 测试与验证

- [x] 8.1 前端构建验证：运行 `npm run build`，确保无 TypeScript 错误
- [ ] 8.2 手动测试 idle → processing → success 流程
- [ ] 8.3 手动测试 idle → processing → error 流程（模拟 API 错误）
- [ ] 8.4 验证回滚提示在错误状态下正确显示
- [ ] 8.5 验证 Neo-brutalist 样式与现有页面一致
