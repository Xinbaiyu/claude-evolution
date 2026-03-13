# 批量批准功能规格

## 概述

允许用户通过 Web UI 一次性批准多个待审批建议，提供原子性保证、实时进度反馈和错误回滚能力。

## 背景

当前 Web UI 只支持逐个批准建议。如果用户需要批准 10+ 个建议：
- 需要点击 10 次"批准"按钮
- 每次批准都触发一次 CLAUDE.md 重新生成（性能浪费）
- 无法直观了解批准进度
- 中途失败时用户不清楚哪些成功、哪些失败

批量批准功能解决这些问题，提供高效、可靠、用户友好的批量操作体验。

## 需求

### 功能性需求

#### 1. 批量选择

**FR-1.1: 复选框多选**
- [ ] 每个建议卡片左侧显示复选框
- [ ] 点击复选框切换选中状态
- [ ] 选中的建议视觉上突出显示（边框变色/背景高亮）

**FR-1.2: 全选/取消全选**
- [ ] 列表顶部显示"全选"复选框
- [ ] 点击"全选"选中所有待审批建议
- [ ] 已全选状态下点击"全选"取消所有选择
- [ ] "全选"复选框状态与实际选中数量同步
  - 全部选中：✅ 选中
  - 部分选中：➖ 不确定状态
  - 全部未选：☐ 未选中

**FR-1.3: 选中状态显示**
- [ ] 列表顶部显示"已选 N 条"文本
- [ ] N = 0 时显示灰色提示文本
- [ ] N > 0 时显示高亮强调文本

#### 2. 批量批准操作

**FR-2.1: 批准按钮**
- [ ] 列表顶部显示"批量批准"按钮
- [ ] 未选中任何建议时按钮禁用
- [ ] 选中 1+ 建议时按钮激活
- [ ] 按钮文本动态显示选中数量："批准 N 条"

**FR-2.2: 确认对话框**
- [ ] 点击"批量批准"弹出确认对话框
- [ ] 显示即将批准的建议数量
- [ ] 显示警告：此操作不可撤销
- [ ] 提供"确认批准"和"取消"按钮

**FR-2.3: API 调用**
- [ ] 确认后调用 `POST /api/suggestions/batch/approve`
- [ ] 请求体：`{ ids: ["id1", "id2", ...] }`
- [ ] 单次 API 调用完成所有批准操作

**FR-2.4: 原子性保证**
- [ ] 批量操作要么全部成功，要么全部失败
- [ ] 失败时自动回滚所有更改
- [ ] 不存在"部分成功"状态

#### 3. 进度反馈

**FR-3.1: 进度 Modal**
- [ ] 批准开始后显示全屏 Modal 对话框
- [ ] Modal 背景半透明遮罩，禁止其他操作
- [ ] Modal 内容居中显示

**FR-3.2: 进度条**
- [ ] 显示水平进度条（0-100%）
- [ ] 进度条下方显示文字："正在批准 N/M 条建议..."
- [ ] 进度条平滑动画过渡（CSS transition）

**FR-3.3: 逐项状态显示**
- [ ] 列出正在批准的建议列表（最多显示 5 条）
- [ ] 每条显示：类型标签 + 简短描述
- [ ] 状态图标：
  - ⟳ 待处理（灰色）
  - ⟳ 处理中（黄色，旋转动画）
  - ✓ 已完成（绿色）
  - ✕ 失败（红色，仅在错误时显示）

**FR-3.4: 预计剩余时间**
- [ ] 根据已完成数量估算剩余时间
- [ ] 显示格式："预计剩余时间: N 秒"
- [ ] 剩余时间 < 1 秒时显示"即将完成..."

#### 4. 错误处理

**FR-4.1: 错误检测**
- [ ] 捕获所有批准过程中的错误
- [ ] 错误类型：
  - 文件权限错误
  - 磁盘空间不足
  - 网络超时
  - 数据格式错误

**FR-4.2: 自动回滚**
- [ ] 检测到错误时立即停止批准
- [ ] 恢复 pending.json 和 approved.json 到批准前状态
- [ ] 不更新 CLAUDE.md

**FR-4.3: 错误提示**
- [ ] 进度 Modal 切换为错误状态
- [ ] 显示红色错误图标和标题："批准失败"
- [ ] 显示具体错误信息（从 API 返回）
- [ ] 提示用户："所有更改已回滚，数据未受影响"

**FR-4.4: 恢复操作**
- [ ] 提供"重试"按钮（重新发起批量批准）
- [ ] 提供"查看详情"按钮（显示完整错误堆栈，开发调试用）
- [ ] 提供"关闭"按钮（关闭 Modal，返回列表）

#### 5. 成功状态

**FR-5.1: 成功提示**
- [ ] 所有建议批准成功后，进度 Modal 切换为成功状态
- [ ] 显示绿色成功图标和标题："批准完成"
- [ ] 显示统计信息："成功批准 N 条建议"

**FR-5.2: 数据刷新**
- [ ] 自动刷新建议列表（已批准的建议从列表移除）
- [ ] 清空选中状态
- [ ] 更新 Dashboard 指标（通过 WebSocket 推送）

**FR-5.3: CLAUDE.md 更新提示**
- [ ] 显示"已更新 CLAUDE.md"提示
- [ ] 可选：显示更新内容摘要（新增了多少条 Preference/Pattern/Workflow）

**FR-5.4: 关闭 Modal**
- [ ] 2 秒后自动关闭 Modal
- [ ] 提供"立即关闭"按钮
- [ ] 关闭后显示 Toast 通知："批量批准完成"

### 非功能性需求

#### NFR-1: 性能

- **NFR-1.1**: 单个批准操作 ≤ 100ms
- **NFR-1.2**: 批量批准 10 个建议 ≤ 200ms
- **NFR-1.3**: 批量批准 50 个建议 ≤ 500ms
- **NFR-1.4**: 批量批准 100 个建议 ≤ 1000ms

**测试方法：** 运行性能测试脚本 `tests/performance/regenerate-learned-content.perf.ts`

#### NFR-2: 可靠性

- **NFR-2.1**: 事务原子性成功率 = 100%（所有批准或全部回滚）
- **NFR-2.2**: 错误恢复成功率 = 100%（回滚后数据完整无损）
- **NFR-2.3**: 崩溃容错：进程崩溃时快照文件保留，手动恢复

**测试方法：**
- 单元测试：模拟各种错误场景（权限错误、磁盘满、中途中断）
- 集成测试：实际文件操作 + 验证回滚结果

#### NFR-3: 用户体验

- **NFR-3.1**: 进度更新延迟 ≤ 100ms
- **NFR-3.2**: 动画流畅度 ≥ 60fps（CSS transform + GPU 加速）
- **NFR-3.3**: 错误信息可读性：非技术用户能理解并采取行动

#### NFR-4: 可维护性

- **NFR-4.4**: 批量批准逻辑集中在 SuggestionManager，不分散在 API 层
- **NFR-4.5**: 快照机制独立封装，易于测试和调试

## API 设计

### POST /api/suggestions/batch/approve

批量批准多个待审批建议。

**请求体：**
```json
{
  "ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**参数说明：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ids | string[] | 是 | 待批准建议的 ID 列表，最小长度 1 |

**成功响应 (200 OK)：**
```json
{
  "success": true,
  "data": {
    "approved": ["uuid-1", "uuid-2", "uuid-3"],
    "count": 3
  }
}
```

**失败响应 (500 Internal Server Error - 回滚)：**
```json
{
  "success": false,
  "error": "文件写入权限不足",
  "data": {
    "approved": [],
    "failed": ["uuid-3"]
  }
}
```

**错误说明：**
| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 固定为 false |
| error | string | 错误原因描述（用户友好） |
| data.approved | string[] | 固定为空数组（已回滚） |
| data.failed | string[] | 导致失败的建议 ID |

**错误码：**
| HTTP 状态码 | 场景 | 处理建议 |
|-------------|------|----------|
| 400 Bad Request | ids 为空或格式错误 | 前端验证阻止 |
| 404 Not Found | 某个 ID 不存在 | 提示用户刷新列表 |
| 500 Internal Server Error | 文件操作错误、磁盘满等 | 显示错误 + 重试 |

## 数据流设计

### 批量批准流程

```
┌─────────────────────────────────────────────────────────┐
│                   批量批准流程图                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  前端                                                   │
│    │                                                    │
│    ├─ 用户选中 N 个建议                                  │
│    ├─ 点击"批量批准"                                     │
│    ├─ 显示确认对话框 ───────[取消]──► 结束              │
│    │                    │                               │
│    │                  [确认]                            │
│    │                    ↓                               │
│    ├─ POST /api/suggestions/batch/approve               │
│    │     { ids: [...] }                                 │
│    │                                                    │
│    ├─ 显示进度 Modal                                    │
│    │     [⟳ 正在批准 0/N...]                            │
│    │                                                    │
│  后端                                                   │
│    │                                                    │
│    ├─ batchApproveSuggestions(ids)                     │
│    │                                                    │
│    ├─ 1. createSnapshot()                              │
│    │     ├─ 备份 pending.json                          │
│    │     └─ 备份 approved.json                         │
│    │                                                    │
│    ├─ 2. for (id of ids)                               │
│    │     ├─ moveSuggestionToApproved(id)               │
│    │     │   ├─ pending.splice(index, 1)               │
│    │     │   └─ approved.push(suggestion)              │
│    │     │                                              │
│    │     └─ 如果失败 ─► rollbackFromSnapshot()          │
│    │                      └─ 返回错误                   │
│    │                                                    │
│    ├─ 3. regenerateLearnedContent()                    │
│    │     ├─ loadApprovedSuggestions()                  │
│    │     ├─ 按类型分组                                  │
│    │     ├─ writeLearnedContent() ← 只调用1次           │
│    │     └─ generateCLAUDEmd()    ← 只调用1次           │
│    │                                                    │
│    ├─ 4. cleanupSnapshot()                             │
│    │                                                    │
│    └─ 返回成功                                          │
│                                                         │
│  前端                                                   │
│    │                                                    │
│    ├─ 进度 Modal 切换为成功状态                          │
│    ├─ [✅ 批准完成! 成功: N 条]                          │
│    ├─ 2 秒后自动关闭                                    │
│    └─ 刷新建议列表                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 错误回滚流程

```
发生错误时（第 i 个建议失败）：
  ↓
rollbackFromSnapshot(snapshot)
  ├─ 恢复 pending.json 到批准前状态
  └─ 恢复 approved.json 到批准前状态
  ↓
返回 API 错误响应
  {
    success: false,
    error: "具体错误信息",
    data: { approved: [], failed: ["id-i"] }
  }
  ↓
前端显示错误 Modal
  [⚠️ 批准失败]
  [所有更改已回滚]
  [重试] [关闭]
```

## 前端组件设计

### BatchApprovalModal 组件

**状态管理：**
```typescript
interface BatchApprovalState {
  visible: boolean;
  status: 'pending' | 'processing' | 'success' | 'error';
  progress: {
    current: number;
    total: number;
  };
  items: {
    id: string;
    type: string;
    description: string;
    status: 'pending' | 'processing' | 'done' | 'failed';
  }[];
  error?: string;
}
```

**UI 状态切换：**
```
visible=false ──[点击批量批准]──► visible=true, status='pending'
                                  (确认对话框)
                                        │
                                      [确认]
                                        ↓
                                  status='processing'
                                  (进度条 + 列表)
                                        │
                          ┌─────────────┴─────────────┐
                          │                           │
                       [成功]                      [失败]
                          ↓                           ↓
                  status='success'            status='error'
                  (成功提示)                  (错误提示)
                          │                           │
                    [2秒后自动关闭]              [关闭/重试]
                          │                           │
                          └───────────┬───────────────┘
                                      ↓
                              visible=false
```

### Review 页面改动

**新增 UI 元素：**
1. 每个建议卡片左侧添加 checkbox
2. 列表顶部添加：
   - "全选" checkbox
   - "已选 N 条" 文本
   - "批量批准" 按钮

**状态管理：**
```typescript
const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [selectAll, setSelectAll] = useState(false);
const [showBatchModal, setShowBatchModal] = useState(false);
```

## 测试计划

### 单元测试

**测试文件：** `tests/unit/suggestion-manager.test.ts`

- [ ] `batchApproveSuggestions` 成功批准所有建议
- [ ] `batchApproveSuggestions` 第 1 个建议失败时回滚
- [ ] `batchApproveSuggestions` 中间建议失败时回滚
- [ ] `batchApproveSuggestions` 最后建议失败时回滚
- [ ] `createSnapshot` 正确备份文件
- [ ] `rollbackFromSnapshot` 正确恢复文件
- [ ] `cleanupSnapshot` 删除快照目录

### 性能测试

**测试文件：** `tests/performance/regenerate-learned-content.perf.ts`

- [ ] 批准 10 个建议 ≤ 200ms
- [ ] 批准 50 个建议 ≤ 500ms
- [ ] 批准 100 个建议 ≤ 1000ms
- [ ] 批量操作 vs 逐个操作性能对比（应快 5 倍以上）

### 集成测试

**测试文件：** `tests/integration/batch-approval.test.ts`

- [ ] Web API `/api/suggestions/batch/approve` 成功响应
- [ ] Web API 失败时返回正确错误码和信息
- [ ] 批准后 `pending.json` 和 `approved.json` 状态正确
- [ ] 批准后 `learned/*.md` 文件内容正确
- [ ] 批准后 `CLAUDE.md` 包含新学习内容

### E2E 测试

**测试文件：** `tests/e2e/batch-approval.spec.ts`

- [ ] 用户选中多个建议
- [ ] 点击"批量批准"显示确认对话框
- [ ] 确认后显示进度 Modal
- [ ] 进度条正确更新
- [ ] 成功后 Modal 显示成功状态
- [ ] 建议列表自动刷新
- [ ] 模拟错误：显示错误 Modal + 数据未改变

## 实现检查清单

### 后端

- [ ] `SuggestionManager.loadApprovedSuggestions()`
- [ ] `SuggestionManager.moveSuggestionToApproved()`
- [ ] `SuggestionManager.regenerateLearnedContent()`
- [ ] `SuggestionManager.batchApproveSuggestions()`
- [ ] `SuggestionManager.createSnapshot()`
- [ ] `SuggestionManager.rollbackFromSnapshot()`
- [ ] `SuggestionManager.cleanupSnapshot()`
- [ ] Web Server 路由 `POST /api/suggestions/batch/approve`
- [ ] 修复 CLI `approve` 命令（移除错误的 writeLearnedContent 调用）

### 前端

- [ ] `Review.tsx` 添加批量选择 UI
  - [ ] Checkbox 组件
  - [ ] 全选功能
  - [ ] 已选计数显示
  - [ ] 批量批准按钮
- [ ] `BatchApprovalModal.tsx` 组件
  - [ ] 确认对话框
  - [ ] 进度显示
  - [ ] 成功状态
  - [ ] 错误状态
- [ ] API 客户端 `apiClient.batchApproveSuggestions()`
- [ ] 错误处理和 Toast 提示

### 测试

- [ ] 单元测试（7 个测试用例）
- [ ] 性能测试（4 个测试用例）
- [ ] 集成测试（5 个测试用例）
- [ ] E2E 测试（7 个测试用例）

### 文档

- [x] 更新 `design.md` - 添加决策 8 和 9
- [x] 创建 `specs/batch-approval/spec.md`
- [ ] 更新 `tasks.md` - 添加批量批准相关任务

## 未来优化方向

1. **进度推送优化**
   - 当前：前端轮询进度（每 100ms 检查一次）
   - 优化：后端通过 WebSocket 实时推送进度事件

2. **取消操作**
   - 当前：批准开始后无法取消
   - 优化：提供"取消"按钮，中断批准并回滚

3. **批量拒绝**
   - 当前：只支持批量批准
   - 优化：支持批量拒绝（同样的进度反馈和回滚机制）

4. **智能批量**
   - 当前：用户手动选择
   - 优化："批准所有高置信度建议"（confidence > 0.9）

5. **撤销操作**
   - 当前：批准后无法撤销
   - 优化：保留最近 10 次批准的快照，支持一键撤销
