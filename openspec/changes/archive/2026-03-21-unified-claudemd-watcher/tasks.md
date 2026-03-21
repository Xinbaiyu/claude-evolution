## 1. 统一生成器

- [x] 1.1 在 `claudemd-generator.ts` 中新增 `regenerateClaudeMdFromDisk()` 函数：从磁盘加载 `context.json` + `source/*.md`，调用 `generateClaudeMdContent()` 写入 `output/CLAUDE.md`
- [x] 1.2 处理 `context.json` 不存在或为空的边界情况（仅生成 source 内容）
- [x] 1.3 添加单元测试：验证 `regenerateClaudeMdFromDisk()` 从磁盘读取并正确生成

## 2. 重构 file-watcher

- [x] 2.1 修改 `file-watcher.ts` 的监听范围：从 `[sourceDir, learnedDir]` 改为 `[sourceDir, contextJsonPath]`
- [x] 2.2 将 watcher 回调从调用 `generateCLAUDEmd(config)` 改为调用 `regenerateClaudeMdFromDisk()`
- [x] 2.3 移除 watcher 对 `config` 参数的依赖（统一生成器不需要 config）
- [x] 2.4 为 `context.json` 变化添加 chokidar 配置（`awaitWriteFinish` 确保文件写完）

## 3. 移除冗余调用

- [x] 3.1 `pipeline.ts`：移除 `[8/8] 生成 CLAUDE.md` 步骤中的 `generateCLAUDEmd(config)` 调用，改为日志提示"CLAUDE.md 将由 watcher 自动更新"
- [x] 3.2 `pipeline.ts`：添加 fallback 逻辑——如果 daemon 未运行（无 watcher），则主动调用 `regenerateClaudeMdFromDisk()`
- [x] 3.3 `learning-orchestrator.ts`：移除 Step 8 的 `regenerateClaudeMd(updatedContext)` 调用，仅保留 Step 7 的 `saveContextObservations` 写入
- [x] 3.4 移除 `learning-orchestrator.ts` 中对 `claudemd-generator.ts` 的 `regenerateClaudeMd` 导入

## 4. Daemon 集成

- [x] 4.1 在 daemon 启动逻辑中调用 `watchSourceFiles()` 启动 watcher
- [x] 4.2 在 daemon 关闭逻辑中调用 `stopWatching()` 清理 watcher
- [x] 4.3 daemon 启动时立即调用一次 `regenerateClaudeMdFromDisk()` 确保 CLAUDE.md 同步

## 5. 清理废弃代码

- [x] 5.1 检查 `md-generator.ts` 中 `writeLearnedContent` 是否有其他调用方
- [x] 5.2 如无其他调用方，废弃 `md-generator.ts` 的 `generateCLAUDEmd` 导出（标记 @deprecated 或直接移除）
- [x] 5.3 更新 `src/generators/index.ts` 的导出，移除 `generateCLAUDEmd` 重导出
- [x] 5.4 移除 `pipeline.ts` 中对 `generateCLAUDEmd` 的 import

## 6. 测试与验证

- [x] 6.1 编写集成测试：编辑 source 文件 → 验证 CLAUDE.md 在 500ms 内自动更新
- [x] 6.2 编写集成测试：模拟 context.json 写入 → 验证 CLAUDE.md 自动更新
- [x] 6.3 编写测试：快速连续编辑多个文件 → 验证防抖只触发一次生成
- [x] 6.4 运行现有测试套件确保无回归
- [ ] 6.5 手动端到端验证：启动 daemon → 编辑 source 文件 → 确认 CLAUDE.md 更新
