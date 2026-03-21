## Why

项目当前存在**两套独立的 CLAUDE.md 生成器**，数据源不同、输出格式不同，且在分析流程中被**串行调用**导致后者覆盖前者的结果：

1. `claudemd-generator.ts`（learning-orchestrator Step 8）：从 `context.json` 观察对象生成，包含晋升后的学习内容
2. `md-generator.ts`（pipeline Step 8/8）：从 `source/*.md` + `learned/*.md` 磁盘文件拼接，**无条件执行**

这导致 learning-orchestrator 刚刚基于 context 池生成的 CLAUDE.md 被 pipeline 末尾的旧生成器直接覆盖。同时，已有的 `file-watcher.ts`（监听文件变化自动重新生成）从未被调用，是 dead code。

需要统一为**单一生成器 + 文件监听驱动**的架构：任何输入源变化（source 文件编辑、context.json 晋升更新）都自动触发一次 CLAUDE.md 重新生成。

## What Changes

- **合并两套生成器为一个统一生成器**：以 `claudemd-generator.ts` 为基础，同时支持 `source/*.md` 静态规则和 `context.json` 学习观察
- **废弃 `md-generator.ts` 中的 `generateCLAUDEmd` 函数**：保留 `writeLearnedContent` 等工具函数（如果仍有调用），移除冗余的拼接逻辑
- **废弃 `learned/` 目录作为 CLAUDE.md 的输入源**：学习内容统一从 `context.json` 读取，`learned/` 目录不再参与 CLAUDE.md 拼接
- **激活并扩展 file-watcher**：监听 `source/*.md` 和 `context.json` 的变化，自动触发统一生成器
- **移除 pipeline 和 learning-orchestrator 中的直接生成调用**：learning-orchestrator 只写 `context.json`，pipeline 不再直接调用生成器；CLAUDE.md 的更新完全由 file-watcher 驱动
- **daemon 启动时激活 watcher**：在 `start` 命令启动后挂载文件监听

## Capabilities

### New Capabilities

- `claudemd-file-watcher`: 监听 CLAUDE.md 输入源文件变化，自动触发重新生成。覆盖监听范围、防抖策略、daemon 集成

### Modified Capabilities

- `md-config-generator`: 合并两套生成器为统一实现，数据源从 `source/*.md` + `context.json` 统一读取，废弃 `learned/` 目录拼接路径

## Impact

- **文件变更**：
  - `src/memory/claudemd-generator.ts` — 扩展为统一生成器入口
  - `src/generators/md-generator.ts` — 废弃 `generateCLAUDEmd`，可能整体移除或仅保留工具函数
  - `src/generators/file-watcher.ts` — 重构监听范围，增加 `context.json` 监听
  - `src/analyzers/pipeline.ts` — 移除末尾的 `generateCLAUDEmd(config)` 调用
  - `src/memory/learning-orchestrator.ts` — 移除 Step 8 的 `regenerateClaudeMd` 调用
  - daemon 启动逻辑 — 挂载 watcher
- **行为变更**：CLAUDE.md 不再在分析流程中同步生成，改为异步由文件变化驱动（延迟约 500ms 防抖）
- **向后兼容**：`learned/` 目录中已有的文件不会被删除，但不再被读取用于 CLAUDE.md 生成
