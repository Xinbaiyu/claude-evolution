## 新增需求

### 需求：建议列表 API
系统必须提供 REST API 端点以获取待审批、已批准和已拒绝的建议列表。

#### 场景：获取待审批建议
- **当** 前端发送 GET /api/suggestions?status=pending
- **则** 返回所有状态为 pending 的建议
- **则** 响应包含建议类型、描述、置信度、频率和 ID

#### 场景：获取已批准建议
- **当** 前端发送 GET /api/suggestions?status=approved
- **则** 返回所有已批准的建议
- **则** 响应包含批准时间戳

### 需求：建议详情 API
系统必须提供获取单个建议完整详情的 API 端点。

#### 场景：获取建议详情含证据
- **当** 前端发送 GET /api/suggestions/:id
- **则** 返回指定 ID 的建议完整信息
- **则** 响应包含 evidence 数组和创建时间

### 需求：建议批准 API
系统必须提供批准建议的 API 端点。

#### 场景：批准单个建议
- **当** 前端发送 POST /api/suggestions/:id/approve
- **则** 建议状态更新为 approved
- **则** 建议从 pending.json 移动到 approved.json
- **则** 返回操作成功响应

#### 场景：批量批准建议
- **当** 前端发送 POST /api/suggestions/batch/approve 带 ids 数组
- **则** 所有指定 ID 的建议状态更新为 approved
- **则** 返回批量操作结果

### 需求：建议拒绝 API
系统必须提供拒绝建议的 API 端点。

#### 场景：拒绝单个建议
- **当** 前端发送 POST /api/suggestions/:id/reject
- **则** 建议状态更新为 rejected
- **则** 建议从 pending.json 移动到 rejected.json
- **则** 返回操作成功响应

### 需求：系统状态 API
系统必须提供查询调度器和分析器状态的 API 端点。

#### 场景：获取调度器状态
- **当** 前端发送 GET /api/status
- **则** 返回调度器运行状态（enabled/disabled）
- **则** 返回上次分析时间和下次计划时间
- **则** 返回当前配置的分析间隔

### 需求：配置读取 API
系统必须提供读取当前配置的 API 端点。

#### 场景：获取完整配置
- **当** 前端发送 GET /api/config
- **则** 返回 config.json 中的所有配置项
- **则** 敏感信息（API keys）被过滤

### 需求：配置更新 API
系统必须提供更新配置的 API 端点。

#### 场景：更新调度器配置
- **当** 前端发送 PATCH /api/config 带 scheduler 字段
- **则** config.json 中的 scheduler 配置被更新
- **则** 调度器重新加载配置
- **则** 返回更新后的配置

### 需求：手动触发分析 API
系统必须提供手动触发分析的 API 端点。

#### 场景：触发立即分析
- **当** 前端发送 POST /api/analyze
- **则** 分析流程立即开始执行
- **则** 返回分析任务 ID
- **则** WebSocket 推送分析进度更新
