## ADDED Requirements

### Requirement: Analysis status query endpoint

系统 SHALL 提供 `GET /api/analyze/status` 端点，返回当前分析运行的实时状态信息。该端点 SHALL 从后端 `isAnalyzing` 标志和 SQLite 数据库中读取状态，不依赖任何前端状态。

#### Scenario: Query status when analysis is running
- **WHEN** 前端调用 `GET /api/analyze/status` 且后台正在执行分析
- **THEN** 返回 JSON 响应：`{ "isRunning": true, "startTime": "<ISO timestamp>", "runId": "<run_id>" }`

#### Scenario: Query status when no analysis is running
- **WHEN** 前端调用 `GET /api/analyze/status` 且后台没有正在执行的分析
- **THEN** 返回 JSON 响应：`{ "isRunning": false, "startTime": null, "runId": null }`

#### Scenario: Response time requirement
- **WHEN** 前端调用 `GET /api/analyze/status`
- **THEN** 响应时间 SHALL 小于 50ms（纯内存读取，无数据库查询）

### Requirement: Backend analysis state persistence in memory

后端 `system.ts` 路由模块 SHALL 在模块级别维护分析运行的元数据（`startTime` 和 `runId`），与现有 `isAnalyzing` 标志共存。这些数据 SHALL 在分析开始时设置、分析结束时清除。

#### Scenario: Set analysis metadata on start
- **WHEN** `POST /api/analyze` 成功启动分析
- **THEN** 系统 SHALL 将 `startTime` 设为当前时间戳，`runId` 设为生成的 run ID

#### Scenario: Clear analysis metadata on completion
- **WHEN** 分析完成（成功或失败）
- **THEN** 系统 SHALL 将 `startTime` 和 `runId` 清除为 null
