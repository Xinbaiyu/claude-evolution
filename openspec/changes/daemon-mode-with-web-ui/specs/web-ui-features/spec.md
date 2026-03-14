# Web UI Features Specification

## Overview

补全 Web UI 的两个核心缺失功能：
1. **手动触发分析** - Dashboard 的"运行分析"按钮当前无实现
2. **系统设置** - Settings 页面当前为占位符

后端 API 已完全实现（`POST /api/analyze`, `GET/PATCH /api/config`），本规格仅涉及前端实现。

---

## 1. Manual Analysis Trigger（手动触发分析）

### 1.1 User Stories

**US-1.1**: 作为用户，我希望在 Dashboard 点击"运行分析"时能立即触发分析，而不是等待定时任务。

**US-1.2**: 作为用户，如果分析正在进行中，我点击按钮时应该看到明确提示，避免重复触发。

**US-1.3**: 作为用户，我希望看到分析进度和完成通知，知道分析何时结束。

### 1.2 Functional Requirements

#### FR-1.1 按钮状态管理
- 默认状态：可点击，显示"运行分析"
- Loading 状态：按钮显示转圈动画 + "分析中..."，禁用
- 分析进行中状态：按钮禁用 + 显示"分析中..."（即使用户刷新页面也保持）

#### FR-1.2 并发控制
- 后端检查：调用 `POST /api/analyze` 前不做前端检查，由后端返回状态
- 冲突处理：如果后端返回 409 Conflict（分析正在进行），显示 Toast："分析正在进行中，请稍候"
- 成功响应：202 Accepted 表示分析已启动

#### FR-1.3 进度显示
- 计时器：分析启动后显示"分析中...已用时 1m 23s"
- 位置：Dashboard 顶部显著位置（StatusCard 区域或单独的进度条）
- 更新频率：每秒更新一次

#### FR-1.4 完成通知
- WebSocket 事件：监听 `analysis_complete` 事件
- Toast 提示：显示"分析完成，发现 N 条新建议"（N 从事件 payload 获取）
- 桌面通知：后端已自动发送，前端无需额外处理
- 自动刷新：完成后自动刷新建议统计数据

#### FR-1.5 错误处理
- API 失败（500）：Toast 显示"分析失败：[错误信息]"
- 网络错误：Toast 显示"网络错误，请检查连接"
- 超时（>10分钟无响应）：Toast 显示"分析超时，请查看日志"

### 1.3 Non-Functional Requirements

- **响应时间**: API 调用响应 < 1s
- **UI 流畅性**: 按钮状态切换无闪烁
- **持久化**: 刷新页面后能恢复分析状态

---

## 2. System Settings（系统设置）

### 2.1 User Stories

**US-2.1**: 作为用户，我希望在 Web UI 修改调度器间隔，无需手动编辑配置文件。

**US-2.2**: 作为用户，我希望能切换 Claude 接入方式（API Key / claude-code-router）并配置相应参数。

**US-2.3**: 作为用户，我希望修改通知设置，控制桌面通知和声音。

**US-2.4**: 作为用户，我希望保存配置时如果需要重启 daemon，能直接点击"立即重启"按钮。

### 2.2 Functional Requirements

#### FR-2.1 页面布局
- **Tab 结构**:
  - Tab 1: 调度器配置（Scheduler）
  - Tab 2: LLM 配置（Claude）
  - Tab 3: 通知配置（Notifications）
- **保存按钮**: 底部固定，所有 Tab 共享
- **重置按钮**: 保存按钮旁边，重置当前 Tab 的所有修改

#### FR-2.2 Tab 1: 调度器配置

**配置项**:
```typescript
interface SchedulerConfig {
  enabled: boolean;        // 调度器开关
  interval: string;        // 间隔时间: "6h" | "12h" | "24h"
  runOnStartup: boolean;   // 启动时立即运行
}
```

**UI 控件**:
- `enabled`: Toggle Switch（默认 true）
- `interval`: Select Dropdown
  - 选项: "每 6 小时" | "每 12 小时" | "每 24 小时"
  - 映射: "6h" | "12h" | "24h"
- `runOnStartup`: Checkbox（默认 false）

**校验规则**:
- 无需前端校验（后端会校验）

#### FR-2.3 Tab 2: LLM 配置（Claude）

**配置项**:
```typescript
interface LLMConfig {
  provider: "anthropic" | "claude-code-router";  // 接入方式
  apiKey?: string;                               // API Key（provider=anthropic 时）
  routerUrl?: string;                            // Router URL（provider=claude-code-router 时）
  model: string;                                 // Claude 模型
  temperature: number;                           // 温度 0-1
  maxTokens: number;                            // 最大 tokens
}
```

**UI 控件**:
- `provider`: Radio Button Group
  - 选项: "Anthropic API Key" | "Claude Code Router"
  - 切换时显示不同的表单

- **当 provider="anthropic"**:
  - `apiKey`: Password Input（带显示/隐藏图标）
    - Placeholder: "sk-ant-api03-..."
    - 校验: 必填，以 "sk-ant-" 开头

- **当 provider="claude-code-router"**:
  - `routerUrl`: Text Input
    - Placeholder: "http://localhost:8080"
    - 校验: 必填，合法 URL

- `model`: Select Dropdown
  - 选项:
    - "Claude Sonnet 4.6"（默认）
    - "Claude Opus 4.6"
    - "Claude Haiku 4.5"
  - 映射:
    - "claude-sonnet-4-6"
    - "claude-opus-4-6"
    - "claude-haiku-4-5"

- `temperature`: Slider（0-1，步长 0.1）
  - 显示当前值
  - 默认: 0.7

- `maxTokens`: Number Input
  - 范围: 1024 - 16384
  - 默认: 8192

**校验规则**:
- `apiKey`: 必填（当 provider=anthropic）
- `routerUrl`: 必填且合法 URL（当 provider=claude-code-router）
- `temperature`: 0-1
- `maxTokens`: 1024-16384

#### FR-2.4 Tab 3: 通知配置

**配置项**:
```typescript
interface NotificationConfig {
  enabled: boolean;        // 通知总开关
  desktop: boolean;        // 桌面通知
  sound: boolean;          // 声音
}
```

**UI 控件**:
- `enabled`: Toggle Switch（主开关）
- `desktop`: Checkbox（依赖 enabled）
- `sound`: Checkbox（依赖 enabled）

**交互逻辑**:
- 当 `enabled=false` 时，`desktop` 和 `sound` 禁用且显示灰色

#### FR-2.5 保存逻辑

**保存流程**:
1. 用户点击"保存"按钮
2. 前端校验所有字段（显示错误提示）
3. 调用 `PATCH /api/config` with 修改的字段
4. 后端返回 200 OK + 需要重启的配置项列表

**响应处理**:
```typescript
interface SaveResponse {
  success: boolean;
  requiresRestart: boolean;
  restartReason?: string;  // 例如: "webUI.port 已修改"
}
```

**重启提示**:
- 如果 `requiresRestart=true`，弹出 Modal:
  - 标题: "需要重启守护进程"
  - 内容: `restartReason`
  - 按钮: "立即重启" | "稍后重启"
- 点击"立即重启": 调用 `POST /api/daemon/restart`
- 点击"稍后重启": 关闭 Modal，顶部显示提示条

#### FR-2.6 重置逻辑

- 点击"重置"按钮
- 弹出确认框: "确定要重置当前 Tab 的所有修改吗？"
- 确认后: 恢复为 `GET /api/config` 读取的原始值

### 2.3 Non-Functional Requirements

- **响应时间**:
  - GET /api/config: < 500ms
  - PATCH /api/config: < 1s
- **数据一致性**: 刷新页面后显示最新配置
- **用户体验**:
  - 切换 Tab 不会丢失未保存的修改
  - 保存成功后显示 Toast 提示
  - 字段校验失败时突出显示错误字段

---

## 3. API 规范

### 3.1 POST /api/analyze

**触发手动分析**

**Request**:
```http
POST /api/analyze HTTP/1.1
Content-Type: application/json
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "分析已启动"
}
```
Status: `202 Accepted`

**Response (Conflict)**:
```json
{
  "success": false,
  "message": "分析正在进行中"
}
```
Status: `409 Conflict`

**Response (Error)**:
```json
{
  "success": false,
  "error": "详细错误信息"
}
```
Status: `500 Internal Server Error`

### 3.2 GET /api/config

**读取配置**

**Request**:
```http
GET /api/config HTTP/1.1
```

**Response**:
```json
{
  "scheduler": {
    "enabled": true,
    "interval": "6h",
    "runOnStartup": false
  },
  "llm": {
    "provider": "anthropic",
    "apiKey": "sk-ant-***",
    "model": "claude-sonnet-4-6",
    "temperature": 0.7,
    "maxTokens": 8192
  },
  "notifications": {
    "enabled": true,
    "desktop": true,
    "sound": false
  }
}
```
Status: `200 OK`

### 3.3 PATCH /api/config

**更新配置（深度合并）**

**Request**:
```http
PATCH /api/config HTTP/1.1
Content-Type: application/json

{
  "scheduler": {
    "interval": "12h"
  },
  "llm": {
    "temperature": 0.8
  }
}
```

**Response**:
```json
{
  "success": true,
  "requiresRestart": false
}
```
Status: `200 OK`

**如需重启**:
```json
{
  "success": true,
  "requiresRestart": true,
  "restartReason": "webUI.port 已修改，需要重启 daemon"
}
```

### 3.4 POST /api/daemon/restart

**重启守护进程**

**Request**:
```http
POST /api/daemon/restart HTTP/1.1
```

**Response**:
```json
{
  "success": true,
  "message": "守护进程正在重启..."
}
```
Status: `202 Accepted`

---

## 4. WebSocket Events

### 4.1 analysis_complete

**分析完成事件**

**Payload**:
```typescript
{
  type: "analysis_complete",
  data: {
    timestamp: "2026-03-14T13:00:00.000Z",
    suggestionsCount: 15,
    duration: 123456  // ms
  }
}
```

**前端处理**:
- 隐藏分析进度显示
- 显示 Toast: "分析完成，发现 15 条新建议"
- 刷新建议统计数据

---

## 5. UI/UX Guidelines

### 5.1 视觉风格

遵循现有 Dashboard/Review 页面风格:
- 组件库: shadcn/ui
- 配色: 与现有页面一致
- 间距: Tailwind spacing scale
- 圆角: rounded-lg (8px)

### 5.2 交互反馈

- **Loading 状态**: 使用 Spinner 组件
- **Toast 提示**: 右上角，3 秒自动消失
- **Modal 弹框**: 半透明遮罩 + 居中弹框
- **表单校验**: 实时校验，错误信息显示在字段下方

### 5.3 响应式设计

- Desktop: 最小宽度 1024px
- 平板/移动端: 暂不考虑（daemon 主要在桌面使用）

---

## 6. Testing Requirements

### 6.1 Unit Tests

- `Dashboard.tsx`: 测试手动触发分析逻辑
- `Settings.tsx`: 测试表单校验、保存、重置逻辑

### 6.2 Integration Tests

- API 调用成功/失败场景
- WebSocket 事件接收
- 重启 daemon 流程

### 6.3 E2E Tests

- 完整流程: 点击运行分析 → 等待完成 → 查看新建议
- 设置流程: 修改配置 → 保存 → 验证生效
- 重启流程: 修改端口 → 保存 → 立即重启 → 验证

---

## 7. Implementation Priority

### Phase 1: 核心功能（1天）
- [ ] Dashboard 手动触发按钮实现
- [ ] Settings 页面 Tab 结构
- [ ] 调度器配置 Tab
- [ ] LLM 配置 Tab（仅 API Key 方式）
- [ ] 通知配置 Tab
- [ ] 保存逻辑

### Phase 2: 完善细节（0.5天）
- [ ] 分析进度显示
- [ ] 重启 Modal
- [ ] 表单校验优化
- [ ] LLM 配置支持 claude-code-router

### Phase 3: 测试与优化（0.5天）
- [ ] 单元测试
- [ ] 集成测试
- [ ] E2E 测试
- [ ] 错误处理完善

---

## 8. Acceptance Criteria

### 手动触发分析
- ✅ 点击"运行分析"按钮能成功调用 API
- ✅ 分析进行中时按钮禁用并显示 Loading
- ✅ 显示实时分析用时（每秒更新）
- ✅ 分析完成后显示 Toast 和桌面通知
- ✅ 冲突时显示提示"分析正在进行中"
- ✅ 错误时显示具体错误信息

### 系统设置
- ✅ Settings 页面有 3 个 Tab（调度器/LLM/通知）
- ✅ 所有配置项能正确加载和显示
- ✅ 修改配置后点击保存能成功更新
- ✅ 切换 Claude 接入方式时显示正确的表单
- ✅ API Key 用 password 输入框（可切换显示）
- ✅ 表单校验失败时显示错误提示
- ✅ 需要重启时弹出 Modal 并提供"立即重启"按钮
- ✅ 点击重置按钮能恢复原始值
