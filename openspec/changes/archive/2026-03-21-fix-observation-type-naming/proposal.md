## Why

CLAUDE.md 生成的"学习内容"区域存在命名混淆：`Preference` 类型有一个 `type` 子字段（可选值包括 `workflow`），与顶层 `ObservationWithMetadata.type`（也有 `workflow`）完全重名。导致输出中同时出现"用户偏好 > workflow"分组和"工作流程"大区块，用户无法理解两者的区别。

此外，当前 communication 分类下有 4 条语义高度重叠的"中文沟通"偏好，说明提取/合并逻辑也需要在分类层面做区分优化。

## What Changes

- **重命名 `Preference.type` 的 `workflow` 值为 `process`**，消除与顶层 `obs.type` 的命名冲突
- **更新 LLM 提取 prompt**（`src/analyzers/prompts.ts`），将 Preference 的 type 枚举从 `style | tool | workflow | communication` 改为 `style | tool | process | communication`
- **更新类型定义**（`src/types/legacy.ts`），同步枚举值变更
- **迁移现有 context.json 数据**，将已存储的 `item.type === "workflow"` 改为 `process`
- **优化 CLAUDE.md 生成器的分组标题**，使 `process` 分类在输出中显示为更易理解的中文标签（如"开发流程"）

## Capabilities

### New Capabilities

无

### Modified Capabilities

- `md-config-generator`: Preference 子分类标签变更，分组显示逻辑调整
- `preference-learner`: LLM prompt 中 Preference.type 枚举值变更

## Impact

- **类型定义**: `src/types/legacy.ts` — Preference.type 枚举值变更
- **LLM Prompt**: `src/analyzers/prompts.ts` — 提取指令中的可选值变更
- **生成器**: `src/memory/claudemd-generator.ts` — 分组标题映射逻辑
- **持久化数据**: `~/.claude-evolution/memory/observations/context.json` 和 `active.json` — 已有数据需迁移
- **无 Breaking Change**: 这是内部重命名，不影响外部 API 或用户交互
