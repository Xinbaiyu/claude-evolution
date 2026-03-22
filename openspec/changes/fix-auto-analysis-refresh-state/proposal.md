## Why

看板页面刷新后，自动触发的分析（如定时调度触发）无法正确恢复 UI 状态。当前 `ManualAnalysisTrigger` 组件在挂载时会从后端 API 查询分析运行状态并恢复 loading 态，但 Dashboard 页面本身并不感知这个恢复事件——它既不会将"运行分析"按钮切换到 loading，也不会通知 `RecentAnalysisWidget` 停止滚动并定格在正在运行的分析记录上。

根本原因：`ManualAnalysisTrigger` 组件在恢复状态时没有派发 `analysis_triggered` 自定义事件，导致 `RecentAnalysisWidget` 无法感知当前有分析正在运行；同时 `RecentAnalysisWidget` 自身在首次加载数据后也没有检查是否有 `running` 状态的记录来决定是否暂停滚动。

## What Changes

- 修复 `ManualAnalysisTrigger` 在页面刷新恢复分析状态时，派发 `analysis_triggered` 事件通知其他组件
- 修复 `RecentAnalysisWidget` 在首次加载数据后检查是否有 `running` 状态的记录，若有则暂停滚动并定格到该记录
- 确保自动触发和手动触发的分析在页面刷新后行为一致

## Capabilities

### New Capabilities

_(无新增能力)_

### Modified Capabilities

- `analysis-status-api`: 前端组件在恢复分析状态时需要正确广播事件，使看板所有组件保持状态同步
- `evolution-dashboard`: 最近分析记录列表在首次加载时需要根据数据中的 running 状态自动暂停滚动

## Impact

- `web/client/src/components/ManualAnalysisTrigger.tsx` — 恢复状态逻辑增加事件派发
- `web/client/src/components/RecentAnalysisWidget.tsx` — 首次数据加载后检查 running 状态
- `web/client/src/pages/Dashboard.tsx` — 可能需要调整状态同步逻辑
