## 1. 后端：广播 analysis_started 事件

- [x] 1.1 在 `web/server/routes/system.ts` 中，分析开始时通过 WebSocket 广播 `analysis_started` 事件（携带 `startTime` 和 `runId`）
- [x] 1.2 在 `web/client/src/api/websocket.ts` 中注册 `analysis_started` 事件类型

## 2. ManualAnalysisTrigger：修复状态恢复与实时监听

- [x] 2.1 在 `ManualAnalysisTrigger` 的 `useEffect` 恢复状态成功后，派发 `analysis_triggered` 自定义事件
- [x] 2.2 在 `ManualAnalysisTrigger` 中监听 `analysis_started` WebSocket 事件，收到后自动切换到 loading 态（处理自动触发的场景）

## 3. RecentAnalysisWidget：修复刷新后滚动定格

- [x] 3.1 在 `RecentAnalysisWidget` 中监听 `analysis_started` WebSocket 事件，收到后重新加载分析记录列表
- [x] 3.2 确认 `loadRecentRuns()` 返回数据中包含 `running` 状态记录时，`requestAnimationFrame` 滚动逻辑能正确暂停（验证现有逻辑时序）

## 4. 验证

- [ ] 4.1 手动测试：手动触发分析 → 刷新页面 → 确认按钮恢复 loading + 列表暂停滚动
- [ ] 4.2 手动测试：等待自动触发分析 → 确认按钮实时切换 loading + 列表暂停滚动
- [ ] 4.3 手动测试：分析完成后 → 确认按钮恢复 idle + 列表恢复滚动
