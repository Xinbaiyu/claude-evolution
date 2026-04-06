## Why

钉钉机器人使用 WebSocket 长连接（Stream 模式）与钉钉服务器通信，但当前实现缺少连接状态监控和自动重连机制。当连接因网络波动、服务端重启等原因断开时，机器人会停止响应，需要手动重启才能恢复服务。这导致用户消息无法及时处理，影响使用体验。

## What Changes

- 添加连接状态监控机制，定期检查 WebSocket 连接健康状态
- 实现自动重连逻辑，在检测到断连时自动尝试重连
- 添加重连策略配置（最大重试次数、重试间隔、指数退避）
- 添加连接状态事件通知（连接成功、断连、重连成功/失败）
- 添加连接状态指标暴露（当前连接状态、重连次数、最后断连时间）

## Capabilities

### New Capabilities
- `dingtalk-connection-monitor`: WebSocket 连接状态监控，包括心跳检测和健康检查
- `dingtalk-auto-reconnect`: 自动重连逻辑，包括重连策略和退避算法
- `dingtalk-connection-metrics`: 连接状态指标收集和暴露

### Modified Capabilities
<!-- 本次改动不涉及现有 capability 的 requirements 变更 -->

## Impact

**受影响的代码**:
- `src/bot/dingtalk-adapter.ts` - 需要添加连接监控和重连逻辑
- `src/bot/types.ts` - 可能需要添加连接状态相关的类型定义

**新增依赖**:
- 可能需要使用 WebSocket 健康检查库或实现自定义心跳机制

**配置变更**:
- 需要在 bot 配置中添加重连策略相关参数（可选，提供默认值）

**监控影响**:
- 添加连接状态指标，可通过 dashboard 或日志查看
