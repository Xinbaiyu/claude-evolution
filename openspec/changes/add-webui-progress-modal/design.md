# Design: add-webui-progress-modal

## Context

`add-webui` change 已实现批量批准的完整后端逻辑（包括事务回滚机制）和前端批量选择 UI。当前 `Review.tsx` 页面中的批量批准按钮直接调用 API 并使用简单的 Toast 通知显示结果。

现有实现的不足：
- 用户点击批量批准后没有确认步骤，容易误操作
- 批量操作进行中没有进度反馈，用户体验差
- 成功/失败状态只通过 Toast 快速闪过，用户可能错过重要信息
- 事务回滚的重要信息（"所有更改已回滚"）没有突出显示

现有设计系统参考：
- `Dashboard.tsx` 和 `Review.tsx` 使用 Neo-brutalist 风格
- 深色主题（bg-slate-950, bg-slate-900）
- 黄色强调色（border-amber-500, text-amber-500）
- 粗边框（border-4）和 font-mono 字体

## Goals / Non-Goals

**Goals:**
- 创建 `BatchApprovalModal` 组件，提供批量批准的完整交互流程
- 实现状态机管理：pending（确认） → processing（处理中） → success/error（结果）
- 设计符合现有 Neo-brutalist 风格的 Modal UI
- 在 `Review.tsx` 中集成 Modal，替换现有的简单 Toast 通知
- 清晰展示事务回滚错误信息

**Non-Goals:**
- 不实现实时 WebSocket 进度推送（使用乐观更新或简单的加载状态）
- 不实现批量操作的取消功能（当前后端 API 不支持）
- 不实现批量拒绝功能（超出当前需求范围）

## Decisions

### D1: Modal 组件架构

**决策**: 创建独立的 `BatchApprovalModal` 组件，接收 props 控制显示/隐藏和处理回调

**理由**:
- 可复用性：未来可能在其他页面使用批量操作
- 关注点分离：`Review.tsx` 负责数据管理，Modal 负责交互流程
- 易于测试：独立组件便于单元测试

**替代方案（不采用）**:
- 直接在 `Review.tsx` 中实现 Modal 逻辑：导致文件过大，违反单一职责原则

### D2: 状态机设计

**决策**: 使用 `useState` 管理三个状态：`idle` | `processing` | `success` | `error`

```typescript
type ModalState = 'idle' | 'processing' | 'success' | 'error';
const [state, setState] = useState<ModalState>('idle');
```

**理由**:
- 简单明确：状态转换清晰（idle → processing → success/error）
- 无需引入状态管理库：避免过度工程化
- 易于调试：React DevTools 可直接查看状态

**替代方案（不采用）**:
- 使用 XState 等状态机库：对于 4 个状态的简单流程来说过于复杂

### D3: 进度显示策略

**决策**: 使用乐观更新 + 加载动画，不实现精确的进度百分比

**理由**:
- 当前后端 API 一次性返回结果，无法获取中间进度
- 加载动画（spinner + "正在批准 N 条建议..."）提供足够的用户反馈
- 避免复杂的 WebSocket 集成

**替代方案（不采用）**:
- WebSocket 实时进度推送：需要后端支持，复杂度高，收益有限

### D4: UI 设计风格

**决策**: 遵循 Neo-brutalist 设计系统

关键设计元素：
- 粗边框：`border-4 border-amber-500`（确认阶段）、`border-green-500`（成功）、`border-red-500`（错误/回滚）
- 深色背景：`bg-slate-900` 主体 + `bg-slate-950` 遮罩层
- Mono 字体：`font-mono`
- 强调色：黄色（警告/确认）、绿色（成功）、红色（错误）

**理由**:
- 一致性：与 Dashboard 和 Review 页面保持视觉统一
- 可访问性：高对比度边框和颜色易于识别
- 品牌识别：Neo-brutalist 风格是 claude-evolution 的视觉特征

### D5: 错误处理与回滚提示

**决策**: 在错误状态下突出显示回滚信息

```typescript
{state === 'error' && (
  <div className="border-4 border-red-500 bg-red-900/20 p-6">
    <h3 className="text-xl font-black text-red-400">批准失败</h3>
    <p className="text-slate-300 mt-2">{errorMessage}</p>
    <div className="mt-4 border-2 border-red-500 bg-red-500/10 p-4">
      <p className="text-red-400 font-bold">⚠️ 所有更改已回滚</p>
      <p className="text-sm text-slate-400">未应用任何建议</p>
    </div>
  </div>
)}
```

**理由**:
- 事务回滚是后端的关键特性，必须向用户明确传达
- 双层提示（错误信息 + 回滚提示）避免用户误解
- 视觉层级：红色边框 + 警告图标 + 加粗文字

## Risks / Trade-offs

### R1: 无精确进度条

**风险**: 用户在批量批准大量建议（100+ 条）时可能因缺少精确进度而感到焦虑

**缓解方案**:
- 显示待批准数量："正在批准 N 条建议..."
- 使用动画 spinner 表示系统正在工作
- 设置合理的超时时间（30 秒），超时后显示错误提示

### R2: 用户可能在处理中关闭浏览器

**风险**: 如果用户在 `processing` 状态关闭浏览器，可能不知道操作是否成功

**缓解方案**:
- 在 `processing` 状态禁用关闭按钮和 ESC 键
- 显示明确的提示："请勿关闭浏览器"
- 操作完成后刷新建议列表，确保数据一致性

### R3: Modal 组件增加包体积

**风险**: 新增 Modal 组件可能增加前端包体积

**评估**:
- 预计新增代码 ~150 行（约 5KB）
- 无新增依赖库
- 影响可忽略

## Migration Plan

无需迁移（纯新增功能）

**部署步骤**:
1. 构建前端：`npm run build`
2. 重启 Web 服务器
3. 验证 Modal 正常显示和状态转换

**回滚策略**:
- 如果 Modal 有严重 bug，可临时在 `Review.tsx` 中注释掉 Modal 集成代码，恢复使用 Toast 通知

## Open Questions

无未解决的问题
