# Design: add-batch-reject

## Context

批量批准功能已在 `add-webui` change 中实现完成，包含完整的事务回滚机制：
- 快照机制：备份 `pending.json` 和 `approved.json`
- 事务性操作：遇到错误时回滚所有更改
- API 接口：`POST /api/suggestions/batch/approve`
- 前端 Modal：`BatchApprovalModal` 组件处理完整交互流程

当前 Review 页面只有批量批准功能，用户无法批量拒绝建议。单个拒绝功能存在但缺少批量操作支持。

现有快照接口（`src/learners/suggestion-manager.ts:281-318`）：
```typescript
interface Snapshot {
  timestamp: string;
  pendingBackup: string;
  approvedBackup: string;
}
```

## Goals / Non-Goals

**Goals:**
- 实现事务性批量拒绝，保证与批量批准相同的可靠性
- 扩展快照机制支持 `rejected.json` 备份和恢复
- 复用 `BatchApprovalModal` 组件，通过 `type` prop 支持批准/拒绝两种模式
- 在 Review 页面添加批量拒绝按钮，与批量批准按钮并排显示
- 保持 API 响应格式一致性

**Non-Goals:**
- 不实现拒绝原因输入功能（后续 feature）
- 不实现撤销拒绝功能
- 不创建独立的 `BatchRejectModal` 组件
- 不重命名现有 `BatchApprovalModal` 组件（避免影响已有功能）

## Decisions

### D1: 扩展现有快照机制 vs 独立快照实现

**决策**: 扩展现有快照接口，添加 `rejectedBackup` 字段

**理由**:
- 代码复用：`createSnapshot()` 和 `rollbackFromSnapshot()` 统一处理所有数据文件
- 向后兼容：批量批准功能继续正常工作（虽然会备份 `rejected.json`，但无害）
- 简单明确：避免维护两套快照系统

**修改内容**:
```typescript
interface Snapshot {
  timestamp: string;
  pendingBackup: string;
  approvedBackup: string;
  rejectedBackup: string;  // ← 新增
}

// createSnapshot() 增加:
const rejectedPath = path.join(getEvolutionDir(), 'suggestions/rejected.json');
const rejectedBackup = path.join(snapshotDir, 'rejected.json');
if (await fs.pathExists(rejectedPath)) {
  await fs.copy(rejectedPath, rejectedBackup);
}

// rollbackFromSnapshot() 增加:
const rejectedPath = path.join(getEvolutionDir(), 'suggestions/rejected.json');
if (await fs.pathExists(snapshot.rejectedBackup)) {
  await fs.copy(snapshot.rejectedBackup, rejectedPath);
}
```

**替代方案（不采用）**:
- 创建独立的 `createRejectSnapshot()` → 代码重复，维护成本高
- 使用通用快照配置系统 → 过度设计，当前只有 2 个用例

### D2: Modal 组件复用策略

**决策**: 扩展 `BatchApprovalModal` 组件，添加 `type: 'approve' | 'reject'` prop

**理由**:
- 状态机完全一致：idle → processing → success/error
- 只有文案和颜色不同：
  - 标题：确认批准 / 确认拒绝
  - 边框：border-amber-500 / border-red-500
  - 按钮：批准 / 拒绝
  - 成功图标：✓ / ✕
- 未来扩展性：可能还有批量编辑、批量归档等操作

**实现方式**:
```typescript
interface BatchApprovalModalProps {
  type: 'approve' | 'reject';  // ← 新增
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  errorMessage?: string;
  onSuccess?: () => void;
}

// 动态配置
const config = {
  approve: { title: '确认批准', color: 'amber', icon: '✓', ... },
  reject: { title: '确认拒绝', color: 'red', icon: '✕', ... },
};
```

**替代方案（不采用）**:
- 创建 `BatchRejectModal` → 代码重复 ~150 行
- 重命名为 `BatchActionModal` → 影响现有功能，风险高

### D3: API 路由顺序

**决策**: 将 `/batch/reject` 放在 `/:id/reject` 之前

**理由**:
- Express 路由按定义顺序匹配
- 通配符路由 `/:id/reject` 会错误匹配 `/batch/reject`（已在批量批准中踩过坑）

**正确顺序**:
```typescript
router.post('/suggestions/batch/approve', ...)  // 具体路由
router.post('/suggestions/batch/reject', ...)   // ← 新增，也在前面
router.post('/suggestions/:id/approve', ...)    // 通配路由
router.post('/suggestions/:id/reject', ...)
```

### D4: 批量拒绝函数实现

**决策**: 参照 `batchApproveSuggestions` 实现，复用 `rejectSuggestion` 函数

**流程**:
1. 创建快照（包含 `rejected.json`）
2. 逐个调用 `rejectSuggestion(id)`
3. 遇到错误立即回滚
4. 全部成功后清理快照

**代码结构**:
```typescript
export async function batchRejectSuggestions(ids: string[]): Promise<BatchRejectionResult> {
  const snapshot = await createSnapshot();
  const rejected: string[] = [];

  try {
    for (const id of ids) {
      await rejectSuggestion(id);
      rejected.push(id);
    }
    await cleanupSnapshot(snapshot);
    return { success: true, rejected, failed: [] };
  } catch (error) {
    await rollbackFromSnapshot(snapshot);
    return { success: false, rejected: [], failed: ids, error };
  }
}
```

**注意**: 不需要调用 `regenerateLearnedContent()`（拒绝不影响 CLAUDE.md）

## Risks / Trade-offs

### R1: 批量批准快照包含 rejected.json

**风险**: 批量批准操作会额外备份 `rejected.json`，虽然用不到

**缓解方案**:
- 影响可忽略：备份一个 JSON 文件开销极小
- 简化实现：统一快照机制比条件判断更可靠

### R2: Modal 组件职责扩大

**风险**: `BatchApprovalModal` 现在处理两种操作，可能变得复杂

**缓解方案**:
- 使用配置对象统一管理差异（`config[type]`）
- 保持状态机逻辑不变
- 如果未来需要第 3 种操作，再考虑重构为 `BatchActionModal`

### R3: 路由冲突风险

**风险**: 如果忘记调整路由顺序，会导致 404 错误

**缓解方案**:
- 在代码注释中明确说明顺序要求
- 测试验证 API 正确响应

## Migration Plan

无需迁移（纯新增功能）

**部署步骤**:
1. 后端构建：`npm run build`
2. 前端构建：`cd web/client && npm run build`
3. 重启 Web 服务器
4. 验证批量拒绝按钮显示和 Modal 功能

**回滚策略**:
- 如果有严重 bug，通过 git revert 回滚提交
- 批量批准功能不受影响（快照机制向后兼容）

## Open Questions

无未解决的问题
