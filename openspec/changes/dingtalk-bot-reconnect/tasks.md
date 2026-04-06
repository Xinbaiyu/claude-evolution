## 1. 准备工作和类型定义

- [ ] 1.1 在 `src/bot/types.ts` 中添加连接状态类型定义 `ConnectionState`（disconnected | connecting | connected | reconnecting）
- [ ] 1.2 在 `src/bot/types.ts` 中添加重连配置接口 `ReconnectConfig`
- [ ] 1.3 在 `src/bot/types.ts` 中添加连接状态接口 `ConnectionStatus`

## 2. 连接状态跟踪（Connection State Tracking）

- [ ] 2.1 在 `DingTalkBotAdapter` 类中添加 `state: ConnectionState` 字段，初始值为 `disconnected`
- [ ] 2.2 添加 `lastConnectedAt?: Date` 和 `lastDisconnectAt?: Date` 字段
- [ ] 2.3 实现 `setState(newState: ConnectionState)` 私有方法，负责状态转换和日志记录
- [ ] 2.4 在 `start()` 方法中，连接开始时调用 `setState('connecting')`，成功后调用 `setState('connected')`
- [ ] 2.5 在 `stop()` 方法中调用 `setState('disconnected')`
- [ ] 2.6 实现 `getStatus(): ConnectionStatus` 公开方法，返回当前连接状态和元数据

## 3. SDK 错误事件监听（SDK Error Monitoring）

- [ ] 3.1 修改 `client.on('error')` 监听器，在捕获错误后调用私有方法 `handleDisconnect(error)`
- [ ] 3.2 实现 `handleDisconnect(error)` 方法：记录错误日志、设置状态为 `disconnected`、触发重连
- [ ] 3.3 探索 SDK 是否有 `disconnect` 或 `close` 事件，如果有则添加监听

## 4. 自动重连逻辑（Auto-Reconnection）

- [ ] 4.1 在 `DingTalkBotAdapter` 中添加重连相关字段：`reconnectAttempts: number`、`reconnectConfig: ReconnectConfig`、`reconnectTimer?: NodeJS.Timeout`
- [ ] 4.2 在构造函数中合并默认重连配置和用户传入的配置
- [ ] 4.3 实现 `scheduleReconnect()` 私有方法，实现指数退避算法（根据 `reconnectAttempts` 计算延迟）
- [ ] 4.4 实现 `performReconnect()` 私有方法：检查重试次数、调用 `disconnect()`、创建新的 `DWClient`、调用 `connect()`
- [ ] 4.5 在 `performReconnect()` 中，如果连接成功则重置 `reconnectAttempts` 为 0；如果失败则递增计数并再次调度重连
- [ ] 4.6 在达到最大重试次数后，停止重连并记录 ERROR 日志
- [ ] 4.7 实现 `resetReconnectState()` 私有方法，在连接成功时清除重连计数和定时器
- [ ] 4.8 修改 `start()` 方法，将连接过程改为异步调用（不等待），失败时进入重连流程

## 5. 心跳检测（Heartbeat Liveness Detection）

- [ ] 5.1 在 `DingTalkBotAdapter` 中添加 `lastActivityAt: Date` 字段，初始值为启动时间
- [ ] 5.2 在 `handleStreamMessage()` 方法中，每次收到消息时更新 `lastActivityAt`
- [ ] 5.3 实现 `startHeartbeat()` 私有方法，启动定时器每 30 秒检查 `lastActivityAt`
- [ ] 5.4 在心跳检查中，如果距离最后活动超过 60 秒，调用 `handleDisconnect(new Error('Heartbeat timeout'))`
- [ ] 5.5 在 `start()` 方法中，连接成功后调用 `startHeartbeat()`
- [ ] 5.6 实现 `stopHeartbeat()` 私有方法，在 `stop()` 和 `handleDisconnect()` 中调用，清除心跳定时器

## 6. 状态保护和并发控制（State Protection）

- [ ] 6.1 在 `scheduleReconnect()` 方法开始时，检查当前状态，只有在 `disconnected` 状态才执行重连
- [ ] 6.2 在 `performReconnect()` 方法开始时，设置状态为 `reconnecting`，防止并发重连
- [ ] 6.3 在 `handleDisconnect()` 方法中，检查当前状态，避免重复处理断连事件

## 7. 连接指标和日志（Connection Metrics）

- [ ] 7.1 在 `setState()` 方法中，记录所有状态转换日志（格式: `[DingTalk Bot] 连接状态: <old> → <new>`）
- [ ] 7.2 在 `scheduleReconnect()` 方法中，记录重连尝试日志（格式: `[DingTalk Bot] 重连尝试 #<N>/<max>, 延迟: <delay>ms`）
- [ ] 7.3 在 `performReconnect()` 中，记录连接失败原因（包含 SDK 错误信息）
- [ ] 7.4 在 `getStatus()` 方法中，返回完整的连接指标（state, lastConnectedAt, lastDisconnectAt, reconnectAttempts, maxReconnectAttempts）
- [ ] 7.5 在 `getStatus()` 方法中添加 `uptimeSeconds` 字段，计算当前连接持续时间

## 8. 配置和可观测性

- [ ] 8.1 更新构造函数签名，接受可选的 `reconnectConfig` 参数
- [ ] 8.2 在配置中支持 `reconnect.enabled: false` 来禁用自动重连
- [ ] 8.3 在 `handleDisconnect()` 方法中，检查 `reconnectConfig.enabled`，如果为 false 则不触发重连
- [ ] 8.4 添加 README 或注释说明重连配置参数的含义和默认值

## 9. 测试

- [ ] 9.1 编写单元测试：模拟 SDK `error` 事件，验证状态转换为 `disconnected` 并触发重连
- [ ] 9.2 编写单元测试：验证指数退避算法计算正确（1s, 2s, 4s, 8s, 16s, 32s）
- [ ] 9.3 编写单元测试：验证达到最大重试次数后停止重连
- [ ] 9.4 编写单元测试：验证心跳超时检测（mock 时间流逝）
- [ ] 9.5 编写单元测试：验证重连成功后重置重连计数
- [ ] 9.6 编写单元测试：验证配置 `reconnect.enabled: false` 时不触发重连
- [ ] 9.7 编写集成测试：启动 bot，手动断开网络，验证自动重连成功
- [ ] 9.8 编写压力测试：频繁断连重连（如每 10 秒断连一次，持续 5 分钟），验证无内存泄漏

## 10. 文档和收尾

- [ ] 10.1 更新 `src/bot/README.md`（如果有），说明重连功能和配置
- [ ] 10.2 在代码中添加注释，说明心跳间隔和超时时间的选择理由
- [ ] 10.3 在 design.md 的 Open Questions 中更新：根据测试结果确定心跳间隔的最优值
- [ ] 10.4 Code review: 检查是否有资源泄漏（定时器、事件监听器）
- [ ] 10.5 验证日志记录是否完整（连接、断连、重连、失败原因）
