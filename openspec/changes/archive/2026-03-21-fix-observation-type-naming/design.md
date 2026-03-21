## Context

CLAUDE.md 由 `claudemd-generator.ts` 拼接生成，学习内容分三大区块：用户偏好（preference）、常见模式（pattern）、工作流程（workflow）。

当前数据模型中存在两层 `type` 字段：
- `ObservationWithMetadata.type`: 顶层分类，决定渲染到哪个大区块（`preference | pattern | workflow`）
- `Preference.type`: 子分类标签，决定在"用户偏好"内部的分组（`style | tool | workflow | communication`）

`Preference.type` 的 `workflow` 值与顶层的 `workflow` 重名，导致输出中同时出现"用户偏好 > workflow"和"工作流程"两个区块，语义上令人困惑。

## Goals / Non-Goals

**Goals:**
- 消除 `Preference.type` 与 `ObservationWithMetadata.type` 之间的 `workflow` 命名冲突
- 迁移已有持久化数据中的旧值
- 在 CLAUDE.md 输出中使用更清晰的中文分组标题

**Non-Goals:**
- 不重构 ObservationWithMetadata 的整体数据模型
- 不改变观察记录的提取/合并/晋升逻辑
- 不处理重复偏好的去重问题（如多条"中文沟通"偏好），这是一个独立问题

## Decisions

### 1. 将 `Preference.type` 的 `workflow` 重命名为 `process`

**选择**: `process`
**理由**: 这些偏好描述的是"用户偏好的开发流程/过程"（如"先提案再实现"），`process` 准确表达了这个语义，且不与任何现有类型名冲突。

**备选方案**:
- `work-style`: 过于笼统，不够精确
- `development-process`: 太长，与现有单词风格（`style`、`tool`）不一致
- `methodology`: 太学术化

### 2. CLAUDE.md 中使用中文标题映射

在 `generatePreferencesSection` 中增加一个标题映射表：

```typescript
const categoryLabels: Record<string, string> = {
  communication: '沟通方式',
  style: '代码风格',
  tool: '工具偏好',
  process: '开发流程',
};
```

**理由**: 直接用英文 key 做 h3 标题对中文用户不友好，映射为中文后可读性更好。

### 3. 数据迁移采用启动时自动修复策略

在 `regenerateClaudeMdFromDisk` 流程中加一步数据清洗，将 `item.type === "workflow"` 改为 `process`，然后回写文件。

**理由**:
- 不需要单独的迁移脚本，减少维护负担
- 迁移逻辑很简单（一个字符串替换），不值得做成正式的迁移命令
- 只需要在生成器加载数据后、生成内容前执行一次

**备选方案**:
- 单独的 CLI 迁移命令: 过于正式，这只是一个字段值替换
- 兼容两种值: 增加复杂度且不解决根本问题

## Risks / Trade-offs

- **[风险] 旧版本的提取结果可能仍包含 `workflow`** → 在 `generatePreferencesSection` 中同时兼容 `workflow` 和 `process`（映射到同一标题），确保即使有残留数据也能正确显示
- **[风险] active.json 中也可能有需要迁移的数据** → 迁移逻辑需同时覆盖 `context.json` 和 `active.json`
- **[低风险] LLM 提取 prompt 更改后可能短期内仍产出旧值** → 类型映射的兼容处理已覆盖此场景
