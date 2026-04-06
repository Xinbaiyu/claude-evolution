## Context

当前钉钉机器人使用 `dingtalk-stream` SDK 建立 WebSocket 长连接。代码在 `src/bot/dingtalk-adapter.ts` 中实现，通过 `DWClient` 维护连接。

**现状问题**:
- `DWClient` 虽然注册了 `error` 事件监听（第 60-62 行），但仅记录日志
- 没有连接状态跟踪机制，无法感知断连
- 没有自动重连逻辑，断连后需要手动重启
- SDK 的 `keepAlive: false` 配置可能导致连接不稳定

**技术约束**:
- 必须使用 `dingtalk-stream` SDK，这是钉钉官方 Stream 模式的唯一实现
- SDK 的 `connect()` 是异步的，重连需要确保前一次连接已断开
- 不能影响现有消息处理流程

## Goals / Non-Goals

**Goals:**
- 检测 WebSocket 连接断开，包括网络故障、服务端关闭等场景
- 自动尝试重连，减少手动干预
- 支持可配置的重连策略（重试次数、间隔、退避）
- 暴露连接状态，便于监控和调试

**Non-Goals:**
- 不改造 SDK 本身（使用 SDK 提供的能力）
- 不保证消息零丢失（钉钉 Stream 模式本身不提供该保证）
- 不处理消息顺序性问题（超出本次改动范围）

## Decisions

### Decision 1: 连接状态管理方式

**选择**: 在 `DingTalkBotAdapter` 中维护显式的连接状态机（disconnected → connecting → connected → reconnecting）

**理由**:
- `DWClient` 没有暴露连接状态 API，需要自己跟踪
- 状态机清晰表达重连过程，便于调试和监控
- 状态转换可以触发事件，支持通知和日志

**备选方案**:
- 方案 A: 依赖 SDK 的 `error` 事件判断状态 → SDK 事件不完整，无法覆盖所有断连场景
- 方案 B: 不维护状态，每次断连直接重连 → 无法避免重连风暴，缺少可观测性

### Decision 2: 断连检测机制

**选择**: 组合使用被动监听（`error`/`close` 事件）+ 主动心跳检测（定期 ping）

**理由**:
- SDK 的 `error` 事件可以捕获大部分断连场景（网络中断、服务端关闭）
- 但某些静默断连（如防火墙关闭连接）无法通过事件感知，需要心跳探测
- 心跳间隔设为 30 秒，避免过于频繁的探测

**实现方式**:
- 监听 SDK 的 `error` 和 `disconnect` 事件（如果有）
- 启动定时器，每 30 秒记录最后活动时间（收到消息即更新）
- 若 60 秒内无活动，认为连接失效，触发重连

**备选方案**:
- 方案 A: 仅依赖 SDK 事件 → 无法检测静默断连
- 方案 B: 仅使用心跳 → 延迟较高（最多 30-60 秒才能检测到断连）

### Decision 3: 重连策略

**选择**: 指数退避 + 最大重试次数限制

**理由**:
- 指数退避（1s, 2s, 4s, 8s, 16s, 32s）避免重连风暴，给服务端恢复时间
- 最大重试 10 次（约 10 分钟），避免无限重试
- 达到上限后停止重试，记录 ERROR 日志，需要手动介入或外部重启

**配置参数**:
```typescript
interface ReconnectConfig {
  enabled: boolean;           // 是否启用自动重连，默认 true
  maxRetries: number;         // 最大重试次数，默认 10
  initialDelay: number;       // 初始重试延迟（ms），默认 1000
  maxDelay: number;           // 最大重试延迟（ms），默认 32000
  backoffMultiplier: number;  // 退避倍数，默认 2
}
```

**备选方案**:
- 方案 A: 固定间隔重试 → 在服务端故障时会造成压力
- 方案 B: 无限重试 → 可能隐藏问题，不便于运维介入

### Decision 4: 连接初始化时机

**选择**: 保持 `start()` 方法同步启动连接，但将连接建立过程改为异步 + 重试

**理由**:
- `start()` 是 adapter 接口方法，调用方期望它快速返回（不阻塞）
- 首次连接失败也应该进入重连流程，而不是抛出异常
- 这样启动流程和重连流程统一，代码复用

**实现方式**:
```typescript
async start(): Promise<void> {
  // 不等待连接成功，直接返回
  this.connect().catch(err => {
    logToFile('[DingTalk Bot] 初始连接失败，进入重连流程:', err);
    this.scheduleReconnect();
  });
}

private async connect(): Promise<void> {
  this.state = 'connecting';
  this.client = new DWClient({ ... });
  await this.client.connect();
  this.state = 'connected';
  this.resetReconnectState();
}
```

### Decision 5: 连接状态暴露

**选择**: 通过现有的 `logToFile` 记录状态变更，暴露 `getStatus()` 方法供 health check 使用

**理由**:
- 日志已经是项目的标准监控方式（见 `file-logger.ts`）
- `getStatus()` 方法可供未来的 health check API 或 dashboard 使用
- 不引入新的监控基础设施，保持轻量

**状态信息**:
```typescript
interface ConnectionStatus {
  state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  lastConnectedAt?: Date;
  lastDisconnectAt?: Date;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}
```

## Risks / Trade-offs

### Risk 1: SDK 不暴露连接状态，心跳机制可能不准确
**影响**: 可能出现误判（连接实际正常但心跳超时）或漏判（断连但心跳没超时）
**缓解**:
- 心跳超时设置较长（60 秒），减少误判
- 配合 SDK 事件监听，双重保障
- 如果发现误判，可调整心跳间隔配置

### Risk 2: 重连过程中丢失消息
**影响**: 断连到重连成功这段时间，钉钉发送的消息会丢失
**现实**: 这是 Stream 模式的固有限制，钉钉不保证消息必达
**缓解**:
- 尽快重连，减少消息丢失窗口（首次重试 1 秒）
- 日志记录断连时间，便于事后排查
- 文档中明确说明该限制

### Risk 3: 重连期间的并发问题
**影响**: 如果心跳检测和 SDK 事件同时触发重连，可能导致多次 `connect()` 调用
**缓解**:
- 使用状态机保护，只有在 `disconnected` 状态才能进入 `reconnecting`
- 重连前先调用 `disconnect()` 清理旧连接

### Risk 4: 配置错误导致重连风暴
**影响**: 如果配置了极短的重试间隔，可能对钉钉服务器造成压力
**缓解**:
- 提供合理的默认配置（1s 初始延迟，指数退避）
- 在文档中说明配置参数的影响
- 最大延迟上限（32 秒），避免无限增长

## Migration Plan

1. **Phase 1: 添加连接状态跟踪**（不改变行为）
   - 在 `DingTalkBotAdapter` 中添加 `state` 字段和状态转换方法
   - 在 `start()` / `stop()` / `error` 事件中更新状态
   - 添加 `getStatus()` 方法暴露状态

2. **Phase 2: 实现重连逻辑**
   - 添加 `scheduleReconnect()` 方法，实现指数退避
   - 在 `error` 事件和心跳超时时触发重连
   - 添加重连配置参数（可选，提供默认值）

3. **Phase 3: 添加心跳检测**
   - 启动定时器，定期检查最后活动时间
   - 若超时，触发重连

4. **Rollback 策略**:
   - 重连功能可通过配置关闭（`reconnect.enabled: false`）
   - 如果出现问题，回退到关闭重连，保持原有行为

5. **测试验证**:
   - 单元测试: 模拟 SDK 断连事件，验证重连流程
   - 集成测试: 手动断开网络，验证自动重连
   - 压力测试: 频繁断连重连，验证无内存泄漏

## Open Questions

1. **SDK 是否有未文档化的连接状态 API?**
   - 需要查阅 `dingtalk-stream` 源码或社区文档
   - 如果有，可以简化心跳检测逻辑

2. **心跳间隔和超时时间的最优值是多少?**
   - 当前设置为 30 秒心跳、60 秒超时
   - 需要根据实际运行情况调整

3. **是否需要暴露 Prometheus 指标?**
   - 当前仅记录日志
   - 如果需要更精细的监控（如 Grafana 可视化），可后续添加
