## Why

用户在 WebUI 点击「运行分析」按钮后，页面会正确显示 loading 状态（分析中... + 经过时间）。但如果用户刷新页面，这个 loading 状态会丢失——因为 `isRunning` 是纯 React 本地状态，不与后端同步。实际上后台分析仍在运行，用户看到的却是一个空闲按钮，这会造成困惑（误以为分析失败）或重复点击（触发 409 冲突）。

## What Changes

- 新增 `GET /api/analyze/status` 接口，返回当前分析运行状态（是否在运行、开始时间、runId）
- 前端 `ManualAnalysisTrigger` 组件在挂载时调用该接口，若后台正在分析则自动恢复 loading 状态
- 使用后端真实 `startTime` 续算经过时间，保证刷新后计时连续
- 后端将 `isAnalyzing` 内存标志扩展为包含 `startTime` 和 `runId` 的状态对象

## Capabilities

### New Capabilities
- `analysis-status-api`: 提供实时分析运行状态查询接口，支持前端刷新后恢复 loading 状态

### Modified Capabilities
- `evolution-dashboard`: Dashboard 的 ManualAnalysisTrigger 组件需要在挂载时查询分析状态并恢复 loading UI

## Impact

- **后端**: `web/server/routes/system.ts` 新增路由，扩展 `isAnalyzing` 为状态对象
- **前端**: `web/client/src/components/ManualAnalysisTrigger.tsx` 新增 mount 时状态恢复逻辑
- **前端**: `web/client/src/api/client.ts` 新增 `getAnalysisStatus()` 方法
- **无 Breaking Change**: 现有 `POST /api/analyze` 行为不变，WebSocket 事件不变
