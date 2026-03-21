## Context

守护进程启动时通过 `loadConfig()` 加载一次配置，创建 `CronScheduler` 实例。当用户通过 WebUI Settings 页面修改调度器配置（如切换到 timepoints 模式、修改时间点）时，`PATCH /api/config` 只更新了磁盘上的 `config.json`，运行中的 `CronScheduler` 仍按旧配置执行。用户看到"配置已保存"提示，但调度器行为没有任何变化。

当前架构中，WebSocket 基础设施（`WebSocketManager`）和通知系统（`NotificationManager`）已就绪，`config_changed` 事件类型已定义但从未被触发。`CronScheduler` 有 `stop()` 方法但没有 `reload()` 能力。

关键约束：`daemon-process.ts` 创建 `scheduler`，`web/server/index.ts` 创建 `wsManager`，两者在同一进程但无直接引用关系。

## Goals / Non-Goals

**Goals:**
- 用户通过 WebUI 修改调度器配置后，守护进程自动重载调度器，无需手动重启
- 配置保存后通过 WebSocket 广播 `config_changed` 事件
- 守护进程内部监听配置变更，执行 scheduler stop → reload config → start
- 保护运行中的分析任务：若分析正在执行，等待完成后再重载

**Non-Goals:**
- 不实现通用的配置文件监听（fs.watch）—— 仅响应 API 触发的变更
- 不支持非调度器配置的热加载（如 LLM 配置）
- 不实现配置版本控制或回滚

## Decisions

### Decision 1: 使用事件总线模式连接 Web Server 和 Daemon

**选择**: 在 `web/server/index.ts` 中导出一个 `onConfigChanged` 回调注册函数，供 `daemon-process.ts` 注册重载逻辑。

**备选方案**:
- A) 进程内 EventEmitter —— 需要共享实例，增加模块耦合
- B) 文件系统监听 (fs.watch) —— 不可靠，跨平台行为不一致，且无法区分配置的哪个部分变化了
- C) 回调注册模式 —— 简单直接，无额外依赖

**理由**: 回调注册模式（C）最简单。`web/server/index.ts` 已导出 `wsManager`，再导出一个回调注册函数是自然延伸。无需引入新的事件系统。

### Decision 2: Scheduler reload 策略 —— stop + new start

**选择**: 调用 `scheduler.stop()` 销毁旧的 cron 任务，然后从磁盘重新加载配置，用新配置调用 `scheduler.start()`。

**备选方案**:
- A) 增量更新（diff 旧配置和新配置，只调整变化的 cron 任务）—— 复杂度高，收益低
- B) 全量重建（stop + start）—— 简单可靠

**理由**: 调度器通常只有 1-12 个 cron 任务，全量重建的开销可忽略。增量更新带来的边界情况（如从 interval 切换到 timepoints 模式）处理复杂度不值得。

### Decision 3: 分析任务保护

**选择**: 如果 `isAnalysisRunning` 为 true，延迟重载，等当前分析完成后自动执行重载。

**理由**: 分析任务可能运行数十分钟（涉及 LLM 调用），中途终止会浪费已完成的工作。使用一个 `pendingReload` 标志，在分析完成的 `finally` 块中检查并执行延迟重载。

### Decision 4: 仅调度器相关配置变更触发重载

**选择**: 在 `PATCH /api/config` 中检测 `updates.scheduler` 是否存在，仅在调度器配置变更时触发重载回调。

**理由**: 避免无关配置变更（如修改 LLM provider）触发不必要的调度器重启。

## Risks / Trade-offs

- **[Risk] 竞态条件：配置连续快速修改** → Mitigation: 重载回调使用防抖（debounce），300ms 内的多次触发合并为一次重载
- **[Risk] 分析任务长时间运行导致配置变更延迟生效** → Mitigation: 日志记录延迟重载状态，WebSocket 推送 `config_changed` 事件让前端显示"配置将在当前分析完成后生效"
- **[Risk] 重载过程中 scheduler.start() 失败** → Mitigation: catch 错误并记录日志，不影响守护进程整体运行。旧调度器已停止，用户需再次保存配置或手动重启
