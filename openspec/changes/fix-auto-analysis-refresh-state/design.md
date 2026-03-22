## Context

看板页面（Dashboard）有三个与分析运行状态相关的组件：
- `ManualAnalysisTrigger`：运行分析按钮，支持页面刷新后从后端 API 恢复 loading 态
- `RecentAnalysisWidget`：最近分析记录列表，使用 `requestAnimationFrame` 实现无限滚动，当第一条记录状态为 `running` 时暂停滚动并定格
- `Dashboard`：宿主页面，监听 WebSocket 事件和自定义事件来协调子组件

当前的状态恢复机制存在两个断裂点：
1. `ManualAnalysisTrigger` 在挂载时通过 `GET /api/analyze/status` 恢复 loading 态，但恢复成功后**不会派发** `analysis_triggered` 事件
2. `RecentAnalysisWidget` 的滚动暂停逻辑在 `requestAnimationFrame` 回调中检查 `runs[0].status === 'running'`，但首次 `loadRecentRuns()` 加载数据后，如果滚动动画尚未启动或 `runs` 数据异步到达，可能存在时序问题

## Goals / Non-Goals

**Goals:**
- 页面刷新后，无论分析是手动触发还是自动触发的，运行分析按钮都正确显示 loading 态
- 页面刷新后，最近分析记录列表能正确检测到 running 状态的记录并暂停滚动
- 保持现有手动触发分析的行为不变

**Non-Goals:**
- 不修改后端 API 或 WebSocket 协议
- 不改变滚动动画的视觉效果
- 不引入新的状态管理库

## Decisions

### Decision 1: ManualAnalysisTrigger 恢复状态时派发事件

在 `useEffect` 中恢复分析运行状态成功后，派发 `analysis_triggered` 自定义事件。

**理由**：保持与手动触发分析时相同的事件流，不引入新的事件类型。`RecentAnalysisWidget` 已经监听此事件，添加一行代码即可修复。

**替代方案**：引入新的 `analysis_state_restored` 事件 → 过度设计，需要修改监听方多处代码。

### Decision 2: RecentAnalysisWidget 加载数据后主动检查 running 状态

`loadRecentRuns()` 完成后，检查返回数据中是否有 `status === 'running'` 的记录。如果有，确保 `runs` 状态更新后滚动逻辑能立即感知（`requestAnimationFrame` 回调中已有此检查，但需确保数据到达时动画循环已在运行）。

**理由**：这是防御性修复，确保即使 `analysis_triggered` 事件的时序与数据加载不一致，滚动暂停也能正常工作。

## Risks / Trade-offs

- **[风险] 事件派发时序**：`ManualAnalysisTrigger` 的状态恢复 `useEffect` 和 `RecentAnalysisWidget` 的数据加载 `useEffect` 运行顺序不确定 → 两端都做检查来兜底，不依赖特定执行顺序
- **[风险] 重复事件派发**：如果用户手动触发分析后立即刷新页面，恢复逻辑会再次派发事件 → 影响极小，`RecentAnalysisWidget` 收到事件后只是重新加载数据，幂等操作
