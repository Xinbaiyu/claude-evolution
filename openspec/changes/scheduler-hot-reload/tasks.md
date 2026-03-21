## 1. Web Server 层：配置变更回调注册

- [x] 1.1 在 `web/server/index.ts` 新增 `onSchedulerConfigChanged` 回调注册函数并导出
- [x] 1.2 在 `web/server/websocket.ts` 的 `WebSocketManager` 中添加 `emitConfigChanged` 方法

## 2. API 层：保存配置后触发事件

- [x] 2.1 在 `web/server/routes/system.ts` 的 `PATCH /api/config` 中检测 `updates.scheduler` 是否存在
- [x] 2.2 配置保存成功后调用 `wsManager.emitConfigChanged()` 广播 WebSocket 事件
- [x] 2.3 当检测到调度器配置变更时，调用已注册的回调函数触发重载

## 3. 守护进程层：调度器热重载

- [x] 3.1 在 `daemon-process.ts` 中导入 `onSchedulerConfigChanged` 并注册重载回调
- [x] 3.2 实现重载逻辑：stop scheduler → loadConfig() → start scheduler（复用现有的 analysisCallback）
- [x] 3.3 添加重载日志记录（调度器停止、配置重载、调度器重启）

## 4. 前端反馈

- [x] 4.1 在 Settings 页面保存成功后显示"调度器配置已重载"提示（当修改了调度器相关配置时）

## 5. 构建验证

- [x] 5.1 运行 TypeScript 编译确保无类型错误
- [x] 5.2 手动验证：修改调度器配置后检查守护进程日志确认重载成功
