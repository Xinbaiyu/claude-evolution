## ADDED Requirements

### Requirement: Restore analysis loading state on page load

ManualAnalysisTrigger 组件 SHALL 在挂载时自动检查后台分析运行状态，若后台正在分析则恢复 loading UI（包括 spinner、禁用按钮、经过时间计时器）。

#### Scenario: Page loads while analysis is running
- **WHEN** 用户访问或刷新 Dashboard 页面且后台正在执行分析
- **THEN** ManualAnalysisTrigger 组件 SHALL 自动显示 loading 状态，包括：
  - 按钮显示为禁用状态
  - 显示 spinner 动画
  - 显示从后端 `startTime` 计算的真实经过时间

#### Scenario: Page loads when no analysis is running
- **WHEN** 用户访问或刷新 Dashboard 页面且后台没有正在执行的分析
- **THEN** ManualAnalysisTrigger 组件 SHALL 显示正常的空闲按钮状态

#### Scenario: Analysis completes after page reload
- **WHEN** 用户刷新页面后恢复了 loading 状态，且后台分析随后完成
- **THEN** 组件 SHALL 通过已有的 WebSocket `analysis_complete` 事件正常清除 loading 状态

### Requirement: API client method for analysis status

前端 API client SHALL 提供 `getAnalysisStatus()` 方法，调用 `GET /api/analyze/status` 并返回类型化的响应对象。

#### Scenario: Successful status query
- **WHEN** 调用 `apiClient.getAnalysisStatus()`
- **THEN** 返回 `{ isRunning: boolean, startTime: string | null, runId: string | null }` 类型的对象

#### Scenario: Network error during status query
- **WHEN** 调用 `apiClient.getAnalysisStatus()` 但网络请求失败
- **THEN** SHALL 默认返回 `{ isRunning: false, startTime: null, runId: null }`，不抛出异常（静默降级）
