## 1. 后端：扩展分析状态管理

- [x] 1.1 将 `web/server/routes/system.ts` 中的 `isAnalyzing` 布尔标志扩展为包含 `startTime` 和 `runId` 的状态对象，在分析启动时记录、结束时清除
- [x] 1.2 新增 `GET /api/analyze/status` 路由，读取内存中的分析状态并返回 `{ isRunning, startTime, runId }`

## 2. 前端：API client 新增方法

- [x] 2.1 在 `web/client/src/api/client.ts` 中新增 `getAnalysisStatus()` 方法，调用 `GET /api/analyze/status`，网络失败时静默降级返回默认值

## 3. 前端：ManualAnalysisTrigger 组件状态恢复

- [x] 3.1 在 `ManualAnalysisTrigger.tsx` 组件挂载时调用 `getAnalysisStatus()`，若 `isRunning` 为 true 则设置本地 state 恢复 loading 状态
- [x] 3.2 使用后端返回的 `startTime` 计算真实经过时间，替代从 0 开始计时

## 4. 验证

- [x] 4.1 构建验证：`npm run build` 无报错
- [x] 4.2 手动验证：触发分析 → 刷新页面 → 确认 loading 状态恢复且经过时间连续
