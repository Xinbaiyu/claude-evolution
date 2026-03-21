## Context

当前项目有两套 CLAUDE.md 生成器共存：

1. **`md-generator.ts`** (`generateCLAUDEmd`)：从 `source/*.md` + `learned/*.md` 磁盘文件拼接。pipeline 末尾无条件调用。
2. **`claudemd-generator.ts`** (`regenerateClaudeMd`)：从 `source/*.md` + `context.json`（内存观察对象）生成。learning-orchestrator Step 8 条件调用。

分析流程中两者**串行执行**，后者被前者覆盖。`learned/` 目录是旧架构遗留，学习内容已迁移至 `context.json` 三池系统。

已有 `file-watcher.ts` 使用 chokidar 监听 `source/` + `learned/` 目录变化，但从未被任何代码调用（dead code）。

## Goals / Non-Goals

**Goals:**

- 统一为单一 CLAUDE.md 生成入口，消除双生成器覆盖问题
- 实现文件变化驱动的自动更新：任何输入源变化 → 自动重新生成
- 从分析流程中解耦 CLAUDE.md 生成逻辑（关注点分离）
- daemon 运行期间保持 watcher 活跃

**Non-Goals:**

- 不重构 CLAUDE.md 的内容格式或模板结构
- 不改变三池系统（active/context/archived）的晋升逻辑
- 不引入 token 预算制或按场景差异化注入（属于后续优化）
- 不删除 `learned/` 目录中已有文件（仅不再读取）

## Decisions

### Decision 1: 以 `claudemd-generator.ts` 为统一基础

**选择**：扩展 `claudemd-generator.ts` 为统一入口，废弃 `md-generator.ts` 的 `generateCLAUDEmd`。

**理由**：`claudemd-generator.ts` 已经同时支持 `source/*.md` 和 `context.json`，格式更结构化（按 preferences/patterns/workflows 分类），且是当前增量学习系统的标准输出。`md-generator.ts` 的拼接逻辑依赖已废弃的 `learned/` 目录。

**替代方案**：合并两者到新文件 → 不必要，`claudemd-generator.ts` 已具备所需能力。

### Decision 2: 统一生成器提供无参数入口

**选择**：新增 `regenerateClaudeMdFromDisk()` 函数，从磁盘直接加载 `context.json` + `source/*.md` 生成 CLAUDE.md，不需要调用方传入观察数组。

**理由**：file-watcher 触发时没有内存中的观察数据，需要从磁盘读取。同时 pipeline 和 learning-orchestrator 也可以使用这个入口，避免传参不一致。

**替代方案**：watcher 回调中手动加载 context.json 再传入 → 职责分散，不利于维护。

### Decision 3: Watcher 监听 `source/` 目录和 `context.json` 文件

**选择**：监听两个路径——`~/.claude-evolution/source/` 目录（递归 `*.md`）和 `~/.claude-evolution/memory/observations/context.json` 文件。

**理由**：这是 CLAUDE.md 的完整输入源。`source/` 覆盖用户手动编辑静态规则的场景，`context.json` 覆盖学习周期晋升后自动更新的场景。

**替代方案**：也监听 `active.json` → 不必要，active 池不参与 CLAUDE.md 生成。

### Decision 4: 防抖 + 首次启动立即生成

**选择**：
- 文件变化后 500ms 防抖（与现有 file-watcher 一致）
- daemon 启动时立即生成一次（确保 CLAUDE.md 与当前数据同步）

**理由**：防抖避免快速连续写入（如 learning-orchestrator 同时保存多个文件）触发多次生成。启动时生成确保 daemon 重启后 CLAUDE.md 是最新的。

### Decision 5: 从 pipeline 和 learning-orchestrator 中移除直接调用

**选择**：
- `pipeline.ts`：移除 `[8/8] 生成 CLAUDE.md` 步骤的 `generateCLAUDEmd(config)` 调用
- `learning-orchestrator.ts`：移除 Step 8 的 `regenerateClaudeMd(updatedContext)` 调用

learning-orchestrator 保存 `context.json` 后，watcher 自动检测到变化并触发重新生成。

**理由**：关注点分离。learning-orchestrator 只负责学习逻辑和数据持久化，CLAUDE.md 生成由 watcher 统一驱动。

**替代方案**：保留 learning-orchestrator 的直接调用作为"即时生成"，watcher 只处理手动编辑 → 两条路径仍然存在，违背统一目标。

## Risks / Trade-offs

- **[异步延迟]** watcher 防抖 500ms 意味着 CLAUDE.md 不再在分析流程结束时同步可用 → 可接受，500ms 延迟对用户无感知。如果需要同步保证，可在 pipeline 结束时主动调用一次统一生成器作为保底。
- **[watcher 未启动]** 如果 daemon 未运行，手动执行 `analyze` 命令不会触发 watcher → 在 `analyze` 命令中保留一次主动调用作为 fallback。
- **[context.json 频繁写入]** 如果学习周期中多次写入 context.json → 防抖机制已处理，500ms 内只触发一次。
- **[chokidar 依赖]** 已在 package.json 中存在（file-watcher.ts 已引入），无新依赖。

## Open Questions

- `md-generator.ts` 中的 `writeLearnedContent` 函数是否仍有其他调用方？如有需保留或迁移。
- 是否需要在 WebUI 中展示 watcher 状态（如"最后生成时间"）？可作为后续增强。
