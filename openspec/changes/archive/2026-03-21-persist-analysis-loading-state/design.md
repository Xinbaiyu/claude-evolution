## Context

当前 WebUI 的「运行分析」按钮的 loading 状态完全依赖 React 组件的本地 state（`isRunning`）。用户刷新页面后组件重新挂载，state 归零，导致即使后台分析仍在进行中，按钮也显示为空闲状态。

**现有架构：**
- `ManualAnalysisTrigger.tsx` 通过 `useState` 管理 `isRunning`、`startTime`、`elapsedTime`
- 后端 `POST /api/analyze` 返回 202 后异步执行分析，使用模块级 `isAnalyzing` 变量跟踪
- 分析完成/失败通过 WebSocket 广播 `analysis_complete` / `analysis_failed`
- 分析日志持久化在 SQLite（`analysis.db`），包含 status 为 `running` 的记录

**关键约束：** 后端已经有 `isAnalyzing` 标志和 SQLite 记录，状态信息的"真相源"存在于后端。

## Goals / Non-Goals

**Goals:**
- 页面刷新后，前端能正确展示后台正在进行的分析状态（loading 效果 + 经过时间）
- 方案尽量复用已有的后端状态数据，最小化改动

**Non-Goals:**
- 不改变分析执行流程本身
- 不引入新的状态管理库（Redux/Zustand）
- 不处理多实例/多标签页同步问题（WebSocket 已覆盖）

## Decisions

### Decision 1: 新建 `GET /api/analyze/status` 接口

**选择：** 新增一个轻量 GET 接口返回当前分析运行状态。

**方案对比：**
- **A) 查询 SQLite 中 status='running' 的记录**：准确但存在极端情况（进程崩溃后记录残留为 running）
- **B) 直接暴露内存中的 `isAnalyzing` 标志 + 从 SQLite 读 startTime**：简单可靠，进程重启后自动归零
- **C) 复用 `/api/daemon/status` 扩展字段**：耦合过重

**选定方案 B**：读内存 `isAnalyzing` 作为是否在运行的判断源，`startTime` 从当次分析的 SQLite 记录中获取。这样既准确又不会因进程崩溃产生残留状态。

**返回格式：**
```json
{
  "isAnalyzing": true,
  "startTime": "2026-03-21T14:30:00.000Z",
  "runId": "run_1711020600000"
}
```
当 `isAnalyzing` 为 false 时，`startTime` 和 `runId` 为 null。

### Decision 2: 前端页面加载时主动轮询一次状态

**选择：** `ManualAnalysisTrigger` 组件 `useEffect` 中调用 `GET /api/analyze/status`，若返回 `isAnalyzing: true`，则将本地 state 设为运行中并从后端 `startTime` 续算经过时间。

**不使用轮询而是单次请求 + WebSocket 的原因：**
- 组件挂载时单次 GET 请求获取当前状态
- 后续状态变更依赖已有的 WebSocket `analysis_complete` / `analysis_failed` 事件
- 避免定时轮询带来的不必要开销

### Decision 3: 后端暴露 startTime 的方式

**选择：** 在 `system.ts` 路由模块中，与 `isAnalyzing` 同级维护一个 `currentRunId` 变量。`GET /api/analyze/status` 通过 `currentRunId` 从 SQLite 查询 `start_time`。

**理由：** 最小侵入性改动，不需要修改 `AnalysisLogger` 的接口。

## Risks / Trade-offs

- **[Risk] 进程崩溃后 `isAnalyzing` 内存标志丢失** → 可接受，崩溃恢复后用户重新访问看到空闲状态是正确行为（分析确实已中断）。
- **[Risk] 组件挂载到 GET 响应之间的短暂闪烁** → 可通过初始化 `isRunning` 为 `undefined`/`loading` 来处理：在状态未确认前不渲染按钮的最终状态。
- **[Trade-off] 单次请求 vs 轮询** → 选择单次请求 + WebSocket，牺牲了极端情况下（WebSocket 断连）的实时性，但避免了轮询开销。
