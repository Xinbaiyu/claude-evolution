# Bot System

钉钉机器人适配器，支持 Stream 模式（WebSocket 长连接）。

## 功能特性

### 自动重连机制

当 WebSocket 连接断开时，系统会自动尝试重连，无需手动重启。

**断连检测方式**:
- SDK 错误事件监听：捕获网络错误、服务端关闭连接等场景
- 心跳探测：每 30 秒检查一次，若 60 秒内无活动则认为连接失效

**重连策略**:
- 指数退避：1s → 2s → 4s → 8s → 16s → 32s（最大）
- 最大重试次数：10 次（约 10 分钟）
- 达到上限后停止重试，需手动重启

**配置参数**:

```typescript
new DingTalkBotAdapter({
  clientId: 'xxx',
  clientSecret: 'xxx',
  reconnect: {
    enabled: true,           // 是否启用自动重连，默认 true
    maxRetries: 10,          // 最大重试次数，默认 10
    initialDelay: 1000,      // 初始重试延迟（ms），默认 1000
    maxDelay: 32000,         // 最大重试延迟（ms），默认 32000
    backoffMultiplier: 2,    // 退避倍数，默认 2
  },
});
```

### 连接状态监控

通过 `getStatus()` 方法获取当前连接状态：

```typescript
const status = adapter.getStatus();
console.log(status);
// {
//   state: 'connected',              // 当前状态
//   lastConnectedAt: Date,           // 最后连接时间
//   lastDisconnectAt: Date,          // 最后断连时间
//   reconnectAttempts: 0,            // 当前重连次数
//   maxReconnectAttempts: 10,        // 最大重连次数
//   uptimeSeconds: 120,              // 运行时长（秒）
// }
```

**状态说明**:
- `disconnected`: 已断开
- `connecting`: 正在连接
- `connected`: 已连接
- `reconnecting`: 正在重连

### 日志记录

所有连接状态变更和重连尝试都会记录到日志文件（`~/.claude/bot.log`）：

```
[DingTalk Bot] 连接状态: disconnected → connecting
[DingTalk Bot] Stream 连接已建立
[DingTalk Bot] 连接状态: connecting → connected
[DingTalk Bot] 连接断开: Network error
[DingTalk Bot] 连接状态: connected → disconnected
[DingTalk Bot] 重连尝试 #1/10, 延迟: 1000ms
[DingTalk Bot] 重连成功
```

## 故障排查

### 常见问题

**1. 连接频繁断开**
- 检查网络稳定性
- 查看日志中的断连原因
- 考虑调整心跳超时时间（修改源码中的 60000ms）

**2. 重连失败**
- 确认 clientId 和 clientSecret 正确
- 检查防火墙和代理设置
- 查看日志中的详细错误信息

**3. 禁用自动重连**
```typescript
new DingTalkBotAdapter({
  clientId: 'xxx',
  clientSecret: 'xxx',
  reconnect: { enabled: false },
});
```

## 限制说明

- **消息丢失**: 断连到重连成功期间，钉钉发送的消息会丢失（这是 Stream 模式的固有限制）
- **重连上限**: 达到最大重试次数后需要手动重启
- **心跳精度**: 心跳检测有一定延迟（最多 30-60 秒检测到断连）

## 开发指南

### 测试

运行单元测试：
```bash
npm test src/bot/dingtalk-adapter.test.ts
```

### 监控

在生产环境中，建议：
1. 监控 `getStatus()` 返回的状态
2. 在达到最大重试次数时触发告警
3. 定期检查日志文件中的错误信息
