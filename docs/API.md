# Claude Evolution API 参考文档

**版本**: 0.1.0
**基础 URL**: `http://localhost:10010`
**更新时间**: 2026-03-13

---

## 📋 目录

- [1. 概述](#1-概述)
- [2. 认证与安全](#2-认证与安全)
- [3. REST API 端点](#3-rest-api-端点)
- [4. WebSocket 协议](#4-websocket-协议)
- [5. 数据模型](#5-数据模型)
- [6. 错误处理](#6-错误处理)
- [7. 使用示例](#7-使用示例)
- [8. SDK 集成](#8-sdk-集成)

---

## 1. 概述

### 1.1 API 设计原则

Claude Evolution 提供基于 **REST** 的 HTTP API 和 **WebSocket** 实时推送服务:

- **REST API**: 用于 CRUD 操作和触发分析
- **WebSocket**: 用于实时状态更新和通知

### 1.2 响应格式

所有 REST API 响应遵循统一格式:

```typescript
interface ApiResponse<T> {
  success: boolean;       // 操作是否成功
  data?: T;               // 成功时返回的数据
  error?: string;         // 失败时的错误信息
  meta?: {                // 可选的元数据
    total: number;        // 总记录数
    page?: number;        // 当前页码
    limit?: number;       // 每页数量
  };
}
```

**成功响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "sugg-abc123",
    "type": "preference",
    "status": "pending"
  }
}
```

**失败响应示例**:

```json
{
  "success": false,
  "error": "Suggestion not found"
}
```

### 1.3 HTTP 状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| `200 OK` | 成功 | GET/POST 请求成功 |
| `400 Bad Request` | 请求无效 | 参数错误、验证失败 |
| `404 Not Found` | 资源不存在 | ID 不存在 |
| `500 Internal Server Error` | 服务器错误 | 意外错误 |

---

## 2. 认证与安全

### 2.1 认证方式

**当前版本**: 无需认证 (本地服务)

**未来计划**:

- API Key 认证
- JWT Token 认证
- OAuth 2.0 集成

### 2.2 CORS 配置

服务器默认启用 CORS,允许所有来源:

```typescript
app.use(cors());  // 允许所有来源
```

**生产环境建议**:

```typescript
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-domain.com'],
  credentials: true
}));
```

### 2.3 请求限流

**当前版本**: 未实现限流

**建议实现**:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 分钟
  max: 100                   // 最多 100 个请求
});

app.use('/api/', limiter);
```

---

## 3. REST API 端点

### 3.1 健康检查

#### `GET /api/health`

检查服务器是否运行正常

**请求**:

```bash
curl http://localhost:10010/api/health
```

**响应**:

```json
{
  "status": "ok",
  "timestamp": "2026-03-13T15:30:00.000Z"
}
```

**HTTP 状态码**: `200 OK`

---

### 3.2 建议管理

#### `GET /api/suggestions`

获取建议列表

**查询参数**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `status` | string | 否 | - | 过滤状态: `pending`, `approved`, `rejected` |

**请求示例**:

```bash
# 获取所有建议
curl http://localhost:10010/api/suggestions

# 只获取待审批建议
curl http://localhost:10010/api/suggestions?status=pending

# 只获取已批准建议
curl http://localhost:10010/api/suggestions?status=approved
```

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": "sugg-abc123",
      "type": "preference",
      "item": {
        "type": "workflow",
        "description": "采用渐进式重构策略",
        "confidence": 0.9,
        "frequency": 8,
        "evidence": ["session-001", "session-002"]
      },
      "status": "pending",
      "createdAt": "2026-03-13T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1
  }
}
```

**HTTP 状态码**:
- `200 OK`: 成功
- `500 Internal Server Error`: 读取文件失败

---

#### `GET /api/suggestions/:id`

获取单个建议详情

**路径参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 建议 ID (支持前缀匹配) |

**请求示例**:

```bash
# 完整 ID
curl http://localhost:10010/api/suggestions/sugg-abc123

# 前缀匹配
curl http://localhost:10010/api/suggestions/sugg-abc
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "sugg-abc123",
    "type": "preference",
    "item": {
      "type": "workflow",
      "description": "采用渐进式重构策略",
      "confidence": 0.9,
      "frequency": 8,
      "evidence": ["session-001", "session-002"]
    },
    "status": "pending",
    "createdAt": "2026-03-13T10:00:00.000Z"
  }
}
```

**HTTP 状态码**:
- `200 OK`: 成功
- `404 Not Found`: 建议不存在
- `500 Internal Server Error`: 读取文件失败

---

#### `POST /api/suggestions/:id/approve`

批准单个建议

**路径参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 建议 ID |

**请求示例**:

```bash
curl -X POST http://localhost:10010/api/suggestions/sugg-abc123/approve
```

**响应示例**:

```json
{
  "success": true
}
```

**副作用**:
1. 建议移动到 `approved.json`
2. 内容写入 `learned/` 目录
3. 重新生成 `CLAUDE.md`
4. 触发 WebSocket 事件 `suggestion_approved`

**HTTP 状态码**:
- `200 OK`: 成功
- `500 Internal Server Error`: 批准失败

---

#### `POST /api/suggestions/:id/reject`

拒绝单个建议

**路径参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 建议 ID |

**请求示例**:

```bash
curl -X POST http://localhost:10010/api/suggestions/sugg-abc123/reject
```

**响应示例**:

```json
{
  "success": true
}
```

**副作用**:
1. 建议移动到 `rejected.json`
2. 触发 WebSocket 事件 `suggestion_rejected`

**HTTP 状态码**:
- `200 OK`: 成功
- `500 Internal Server Error`: 拒绝失败

---

#### `POST /api/suggestions/batch/approve`

批量批准建议

**请求体**:

```json
{
  "ids": ["sugg-abc123", "sugg-def456", "sugg-ghi789"]
}
```

**请求示例**:

```bash
curl -X POST http://localhost:10010/api/suggestions/batch/approve \
  -H "Content-Type: application/json" \
  -d '{"ids": ["sugg-abc123", "sugg-def456"]}'
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "approved": ["sugg-abc123", "sugg-def456"],
    "count": 2
  }
}
```

**部分失败响应**:

```json
{
  "success": false,
  "error": "部分建议批准失败",
  "data": {
    "approved": ["sugg-abc123"],
    "failed": [
      {
        "id": "sugg-def456",
        "error": "Suggestion not found"
      }
    ]
  }
}
```

**HTTP 状态码**:
- `200 OK`: 全部成功
- `400 Bad Request`: 参数错误 (ids 为空或非数组)
- `500 Internal Server Error`: 部分或全部失败

---

#### `POST /api/suggestions/batch/reject`

批量拒绝建议

**请求体**:

```json
{
  "ids": ["sugg-abc123", "sugg-def456"]
}
```

**请求示例**:

```bash
curl -X POST http://localhost:10010/api/suggestions/batch/reject \
  -H "Content-Type: application/json" \
  -d '{"ids": ["sugg-abc123"]}'
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "rejected": ["sugg-abc123"],
    "count": 1
  }
}
```

**HTTP 状态码**:
- `200 OK`: 全部成功
- `400 Bad Request`: 参数错误
- `500 Internal Server Error`: 部分或全部失败

---

### 3.3 系统管理

#### `GET /api/status`

获取系统状态

**请求示例**:

```bash
curl http://localhost:10010/api/status
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "scheduler": {
      "enabled": false,
      "interval": "1h",
      "lastRun": "2026-03-13T14:00:00.000Z"
    },
    "suggestions": {
      "pending": 81,
      "approved": 12,
      "rejected": 13,
      "total": 106
    },
    "metrics": {
      "avgConfidence": 0.87
    },
    "server": {
      "uptime": 3600,
      "version": "0.1.0"
    }
  }
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `scheduler.enabled` | boolean | 定时调度是否启用 |
| `scheduler.interval` | string | 调度间隔 (如 "1h") |
| `scheduler.lastRun` | string | 上次运行时间 (ISO 8601) |
| `suggestions.pending` | number | 待审批建议数量 |
| `suggestions.approved` | number | 已批准建议数量 |
| `suggestions.rejected` | number | 已拒绝建议数量 |
| `metrics.avgConfidence` | number | 平均置信度 (0-1) |
| `server.uptime` | number | 服务运行时长 (秒) |
| `server.version` | string | 服务版本号 |

**HTTP 状态码**:
- `200 OK`: 成功
- `500 Internal Server Error`: 读取状态失败

---

#### `GET /api/config`

读取系统配置

**请求示例**:

```bash
curl http://localhost:10010/api/config
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "scheduler": {
      "enabled": false,
      "interval": "1h"
    },
    "llm": {
      "model": "claude-3-5-haiku-20241022",
      "maxTokens": 4096,
      "temperature": 0.3,
      "enablePromptCaching": false
    },
    "learningPhases": {
      "observation": { "durationDays": 3 },
      "suggestion": { "durationDays": 4 },
      "automatic": { "confidenceThreshold": 0.8 }
    }
  }
}
```

**HTTP 状态码**:
- `200 OK`: 成功
- `500 Internal Server Error`: 读取配置失败

---

#### `PATCH /api/config`

更新系统配置

**请求体**:

```json
{
  "scheduler": {
    "enabled": true,
    "interval": "2h"
  },
  "llm": {
    "temperature": 0.5
  }
}
```

**请求示例**:

```bash
curl -X PATCH http://localhost:10010/api/config \
  -H "Content-Type: application/json" \
  -d '{"scheduler": {"enabled": true}}'
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "scheduler": {
      "enabled": true,
      "interval": "1h"
    },
    "llm": {
      "model": "claude-3-5-haiku-20241022",
      "maxTokens": 4096,
      "temperature": 0.5,
      "enablePromptCaching": false
    },
    "learningPhases": {
      "observation": { "durationDays": 3 },
      "suggestion": { "durationDays": 4 },
      "automatic": { "confidenceThreshold": 0.8 }
    }
  }
}
```

**注意**: 部分更新,未提供的字段保持不变

**HTTP 状态码**:
- `200 OK`: 成功
- `400 Bad Request`: 配置数据无效
- `500 Internal Server Error`: 写入配置失败

---

#### `POST /api/analyze`

手动触发分析

**请求示例**:

```bash
curl -X POST http://localhost:10010/api/analyze
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "message": "Analysis triggered successfully",
    "newSuggestions": 5,
    "duration": 12
  }
}
```

**副作用**:
1. 运行完整的分析流程
2. 触发 WebSocket 事件 `analysis_complete`
3. 发送桌面通知 (macOS)

**HTTP 状态码**:
- `200 OK`: 成功
- `500 Internal Server Error`: 分析失败

---

## 4. WebSocket 协议

### 4.1 连接

**WebSocket URL**: `ws://localhost:10010`

**连接示例 (JavaScript)**:

```javascript
const ws = new WebSocket('ws://localhost:10010');

ws.onopen = () => {
  console.log('WebSocket 已连接');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('收到消息:', message);
};

ws.onerror = (error) => {
  console.error('WebSocket 错误:', error);
};

ws.onclose = () => {
  console.log('WebSocket 已断开');
};
```

### 4.2 心跳机制

**服务端** 每 30 秒发送 `ping`:

```javascript
// 客户端响应 pong
ws.addEventListener('ping', () => {
  ws.pong();
});
```

**未响应的客户端** 会被自动断开连接。

### 4.3 消息格式

所有 WebSocket 消息遵循统一格式:

```typescript
interface WSMessage {
  type: string;           // 事件类型
  data: any;              // 事件数据
  timestamp: string;      // ISO 8601 时间戳
}
```

### 4.4 事件类型

#### `connected`

**触发时机**: 客户端连接成功

**数据结构**:

```json
{
  "type": "connected",
  "data": {
    "clientId": "ws-1710346200000-abc123",
    "timestamp": "2026-03-13T15:30:00.000Z"
  },
  "timestamp": "2026-03-13T15:30:00.000Z"
}
```

---

#### `analysis_complete`

**触发时机**: 分析流程完成

**数据结构**:

```json
{
  "type": "analysis_complete",
  "data": {
    "newSuggestions": 5,
    "duration": 12,
    "timestamp": "2026-03-13T15:35:00.000Z"
  },
  "timestamp": "2026-03-13T15:35:00.000Z"
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `newSuggestions` | number | 新增建议数量 |
| `duration` | number | 分析耗时 (秒) |

**客户端处理**:

```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'analysis_complete') {
    console.log(`分析完成: 新增 ${message.data.newSuggestions} 条建议`);
    refreshSuggestionList();
  }
};
```

---

#### `new_suggestions`

**触发时机**: 新建议产生

**数据结构**:

```json
{
  "type": "new_suggestions",
  "data": {
    "count": 5,
    "suggestions": [
      {
        "id": "sugg-abc123",
        "type": "preference",
        "status": "pending"
      }
    ]
  },
  "timestamp": "2026-03-13T15:35:00.000Z"
}
```

**注意**: `suggestions` 仅包含前 5 条预览

---

#### `suggestion_approved`

**触发时机**: 建议被批准

**数据结构**:

```json
{
  "type": "suggestion_approved",
  "data": {
    "id": "sugg-abc123"
  },
  "timestamp": "2026-03-13T15:40:00.000Z"
}
```

**客户端处理**:

```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'suggestion_approved') {
    removeSuggestionFromList(message.data.id);
    showNotification('建议已批准');
  }
};
```

---

#### `suggestion_rejected`

**触发时机**: 建议被拒绝

**数据结构**:

```json
{
  "type": "suggestion_rejected",
  "data": {
    "id": "sugg-abc123"
  },
  "timestamp": "2026-03-13T15:40:00.000Z"
}
```

---

#### `pong`

**触发时机**: 响应客户端的 `ping`

**数据结构**:

```json
{
  "type": "pong",
  "timestamp": "2026-03-13T15:45:00.000Z"
}
```

**客户端发送 ping**:

```javascript
// 客户端主动发送 ping
ws.send(JSON.stringify({ type: 'ping' }));

// 收到 pong 响应
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'pong') {
    console.log('Pong received');
  }
};
```

---

## 5. 数据模型

### 5.1 Suggestion (建议)

```typescript
interface Suggestion {
  id: string;                      // 唯一标识符
  type: 'preference' | 'pattern' | 'workflow';  // 建议类型
  item: Preference | Pattern | Workflow;        // 建议内容
  status: 'pending' | 'approved' | 'rejected';  // 状态
  createdAt: string;               // 创建时间 (ISO 8601)
  reviewedAt?: string;             // 审批时间 (ISO 8601)
}
```

---

### 5.2 Preference (偏好)

```typescript
interface Preference {
  type: 'style' | 'tool' | 'workflow' | 'communication';  // 偏好类型
  description: string;             // 偏好描述
  confidence: number;              // 置信度 (0-1)
  frequency: number;               // 出现频率
  evidence: string[];              // 证据列表 (session IDs)
}
```

**示例**:

```json
{
  "type": "workflow",
  "description": "采用渐进式重构策略,分步骤完成大型架构迁移",
  "confidence": 0.9,
  "frequency": 8,
  "evidence": ["session-001", "session-002", "session-003"]
}
```

---

### 5.3 Pattern (模式)

```typescript
interface Pattern {
  problem: string;                 // 问题描述
  solution: string;                // 解决方案
  confidence: number;              // 置信度 (0-1)
  occurrences: number;             // 出现次数
  evidence: string[];              // 证据列表
}
```

**示例**:

```json
{
  "problem": "配置默认值与 schema 不匹配导致验证失败",
  "solution": "使用 zod 定义 schema 并验证配置文件",
  "confidence": 0.85,
  "occurrences": 3,
  "evidence": ["session-010", "session-015"]
}
```

---

### 5.4 Workflow (工作流)

```typescript
interface Workflow {
  name: string;                    // 工作流名称
  steps: string[];                 // 步骤列表
  frequency: number;               // 出现频率
  confidence: number;              // 置信度 (0-1)
  evidence: string[];              // 证据列表
}
```

**示例**:

```json
{
  "name": "Git Commit 流程",
  "steps": [
    "运行 git status 检查变更",
    "运行测试确保通过",
    "使用规范的 commit message",
    "推送到远程仓库"
  ],
  "frequency": 15,
  "confidence": 0.95,
  "evidence": ["session-020", "session-025", "session-030"]
}
```

---

### 5.5 SystemStatus (系统状态)

```typescript
interface SystemStatus {
  scheduler: {
    enabled: boolean;              // 调度器是否启用
    interval: string;              // 调度间隔
    lastRun: string | null;        // 上次运行时间
  };
  suggestions: {
    pending: number;               // 待审批数量
    approved: number;              // 已批准数量
    rejected: number;              // 已拒绝数量
    total: number;                 // 总数量
  };
  metrics: {
    avgConfidence: number;         // 平均置信度
  };
  server: {
    uptime: number;                // 运行时长 (秒)
    version: string;               // 版本号
  };
}
```

---

### 5.6 Config (配置)

```typescript
interface Config {
  scheduler: {
    enabled: boolean;
    interval: string;              // 如 "1h", "30m", "2d"
  };
  llm: {
    model: string;                 // 如 "claude-3-5-haiku-20241022"
    maxTokens: number;
    temperature: number;           // 0-1
    enablePromptCaching: boolean;
  };
  learningPhases: {
    observation: {
      durationDays: number;        // 观察期天数
    };
    suggestion: {
      durationDays: number;        // 建议期天数
    };
    automatic: {
      confidenceThreshold: number; // 自动应用阈值
    };
  };
}
```

---

## 6. 错误处理

### 6.1 错误响应格式

```typescript
interface ErrorResponse {
  success: false;
  error: string;                   // 错误信息
  code?: string;                   // 错误代码 (可选)
  details?: any;                   // 详细信息 (可选)
}
```

### 6.2 常见错误码

| HTTP 状态码 | `code` | `error` 示例 | 说明 |
|------------|--------|--------------|------|
| 400 | `INVALID_PARAMS` | "ids must be a non-empty array" | 参数验证失败 |
| 404 | `NOT_FOUND` | "Suggestion not found" | 资源不存在 |
| 500 | `INTERNAL_ERROR` | "Failed to read suggestions file" | 服务器内部错误 |

### 6.3 错误处理示例

**客户端 (Axios)**:

```typescript
import axios from 'axios';

async function approveSuggestion(id: string): Promise<void> {
  try {
    await axios.post(`/api/suggestions/${id}/approve`);
    console.log('批准成功');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const response = error.response?.data;

      if (response?.error === 'Suggestion not found') {
        console.error('建议不存在');
      } else {
        console.error('批准失败:', response?.error);
      }
    } else {
      console.error('未知错误:', error);
    }
  }
}
```

---

## 7. 使用示例

### 7.1 完整工作流 (JavaScript/TypeScript)

```typescript
import axios from 'axios';

const BASE_URL = 'http://localhost:10010';
const api = axios.create({ baseURL: BASE_URL });

// 1️⃣ 触发分析
async function triggerAnalysis(): Promise<void> {
  const response = await api.post('/api/analyze');
  console.log(`分析完成: 新增 ${response.data.data.newSuggestions} 条建议`);
}

// 2️⃣ 获取待审批建议
async function getPendingSuggestions(): Promise<Suggestion[]> {
  const response = await api.get('/api/suggestions', {
    params: { status: 'pending' }
  });
  return response.data.data;
}

// 3️⃣ 批准单个建议
async function approveSuggestion(id: string): Promise<void> {
  await api.post(`/api/suggestions/${id}/approve`);
  console.log(`建议 ${id} 已批准`);
}

// 4️⃣ 批量批准建议
async function batchApprove(ids: string[]): Promise<void> {
  const response = await api.post('/api/suggestions/batch/approve', { ids });
  console.log(`批准了 ${response.data.data.count} 条建议`);
}

// 5️⃣ 获取系统状态
async function getSystemStatus(): Promise<SystemStatus> {
  const response = await api.get('/api/status');
  return response.data.data;
}

// 使用示例
async function main() {
  // 触发分析
  await triggerAnalysis();

  // 等待 5 秒
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 获取待审批建议
  const suggestions = await getPendingSuggestions();
  console.log(`待审批建议: ${suggestions.length} 条`);

  // 批准置信度 >= 0.9 的建议
  const highConfidence = suggestions.filter(s => {
    const item = s.item as any;
    return item.confidence >= 0.9;
  });

  if (highConfidence.length > 0) {
    const ids = highConfidence.map(s => s.id);
    await batchApprove(ids);
  }

  // 查看系统状态
  const status = await getSystemStatus();
  console.log('系统状态:', status);
}

main().catch(console.error);
```

### 7.2 WebSocket 实时监听

```typescript
const ws = new WebSocket('ws://localhost:10010');

ws.onopen = () => {
  console.log('WebSocket 已连接');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'connected':
      console.log('客户端 ID:', message.data.clientId);
      break;

    case 'analysis_complete':
      console.log(`分析完成: 新增 ${message.data.newSuggestions} 条建议`);
      // 刷新建议列表
      loadSuggestions();
      break;

    case 'suggestion_approved':
      console.log(`建议 ${message.data.id} 已批准`);
      // 从列表移除
      removeSuggestion(message.data.id);
      break;

    case 'suggestion_rejected':
      console.log(`建议 ${message.data.id} 已拒绝`);
      // 从列表移除
      removeSuggestion(message.data.id);
      break;

    default:
      console.log('未知消息:', message);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket 错误:', error);
};

ws.onclose = () => {
  console.log('WebSocket 已断开,5 秒后重连...');
  setTimeout(() => {
    location.reload();
  }, 5000);
};
```

### 7.3 React 集成示例

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:10010' });

function SuggestionList() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载建议
  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/suggestions', {
        params: { status: 'pending' }
      });
      setSuggestions(response.data.data);
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 批准建议
  const handleApprove = async (id: string) => {
    try {
      await api.post(`/api/suggestions/${id}/approve`);
      setSuggestions(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('批准失败:', error);
    }
  };

  // WebSocket 监听
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:10010');

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'analysis_complete') {
        loadSuggestions();
      }

      if (message.type === 'suggestion_approved') {
        setSuggestions(prev => prev.filter(s => s.id !== message.data.id));
      }
    };

    return () => ws.close();
  }, []);

  // 初始加载
  useEffect(() => {
    loadSuggestions();
  }, []);

  return (
    <div>
      <h2>待审批建议 ({suggestions.length})</h2>
      {loading && <p>加载中...</p>}
      {suggestions.map(s => (
        <div key={s.id}>
          <p>{(s.item as any).description}</p>
          <button onClick={() => handleApprove(s.id)}>批准</button>
        </div>
      ))}
    </div>
  );
}
```

---

## 8. SDK 集成

### 8.1 TypeScript SDK (推荐)

**安装**:

```bash
npm install axios ws
npm install -D @types/ws
```

**封装客户端**:

```typescript
import axios, { AxiosInstance } from 'axios';

export class ClaudeEvolutionClient {
  private api: AxiosInstance;
  private ws: WebSocket | null = null;

  constructor(baseURL: string = 'http://localhost:10010') {
    this.api = axios.create({ baseURL });
  }

  // REST API 方法
  async getSuggestions(status?: string): Promise<Suggestion[]> {
    const response = await this.api.get('/api/suggestions', {
      params: { status }
    });
    return response.data.data;
  }

  async approveSuggestion(id: string): Promise<void> {
    await this.api.post(`/api/suggestions/${id}/approve`);
  }

  async batchApprove(ids: string[]): Promise<void> {
    await this.api.post('/api/suggestions/batch/approve', { ids });
  }

  async getStatus(): Promise<SystemStatus> {
    const response = await this.api.get('/api/status');
    return response.data.data;
  }

  async triggerAnalysis(): Promise<void> {
    await this.api.post('/api/analyze');
  }

  // WebSocket 方法
  connectWebSocket(onMessage: (message: WSMessage) => void): void {
    this.ws = new WebSocket('ws://localhost:10010');

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      onMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

**使用示例**:

```typescript
const client = new ClaudeEvolutionClient();

// REST API
const suggestions = await client.getSuggestions('pending');
await client.approveSuggestion(suggestions[0].id);

// WebSocket
client.connectWebSocket((message) => {
  if (message.type === 'analysis_complete') {
    console.log('分析完成');
  }
});
```

### 8.2 Python SDK

```python
import requests
import websocket
import json

class ClaudeEvolutionClient:
    def __init__(self, base_url='http://localhost:10010'):
        self.base_url = base_url
        self.session = requests.Session()

    def get_suggestions(self, status=None):
        params = {'status': status} if status else {}
        response = self.session.get(
            f'{self.base_url}/api/suggestions',
            params=params
        )
        return response.json()['data']

    def approve_suggestion(self, suggestion_id):
        response = self.session.post(
            f'{self.base_url}/api/suggestions/{suggestion_id}/approve'
        )
        return response.json()

    def batch_approve(self, ids):
        response = self.session.post(
            f'{self.base_url}/api/suggestions/batch/approve',
            json={'ids': ids}
        )
        return response.json()

    def connect_websocket(self, on_message):
        def on_ws_message(ws, message):
            data = json.loads(message)
            on_message(data)

        ws = websocket.WebSocketApp(
            'ws://localhost:10010',
            on_message=on_ws_message
        )
        ws.run_forever()

# 使用示例
client = ClaudeEvolutionClient()

# 获取建议
suggestions = client.get_suggestions(status='pending')
print(f'待审批建议: {len(suggestions)} 条')

# 批准建议
client.approve_suggestion(suggestions[0]['id'])
```

---

## 9. 总结

Claude Evolution API 提供:

✅ **RESTful 设计**: 符合 REST 规范的 HTTP API
✅ **实时推送**: WebSocket 支持实时状态更新
✅ **类型安全**: TypeScript 类型定义
✅ **易于集成**: 支持多种语言的 SDK
✅ **统一响应**: 一致的数据格式

**下一步建议**:

1. 添加 API 认证 (API Key / JWT)
2. 实现请求限流和速率控制
3. 提供 OpenAPI (Swagger) 规范
4. 支持分页和排序
5. 添加更多过滤条件

---

**维护者**: Claude Code
**最后更新**: 2026-03-13
**版本**: 0.1.0
