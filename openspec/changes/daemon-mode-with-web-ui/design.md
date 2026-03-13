## Context

claude-evolution 当前是一个按需执行的 CLI 工具，缺少长期运行的守护进程。用户必须手动启动 Web UI (`./start-ui.sh`) 和手动触发分析，无法享受自动化学习体验。

现状：
- CronScheduler 存在但没有承载进程
- Web Server 是独立脚本，与 CLI 分离
- 无进程管理（PID 文件、优雅关闭）
- 无自启动配置
- 日志分散（stdout/stderr）

目标是构建统一的守护进程模式，整合调度器和 Web Server，提供完整的生命周期管理。

## Goals / Non-Goals

**Goals:**
- 统一守护进程管理调度器和 Web Server
- 提供标准的 start/stop/restart 命令
- 支持开机自启动（macOS 优先，Linux 可选）
- 完整的日志系统（轮转、级别过滤）
- 状态共享（调度器 ↔ Web UI）
- 向后兼容现有配置

**Non-Goals:**
- Windows 支持（未来可扩展）
- 分布式部署（单机守护进程）
- 高可用/容错（KeepAlive 提供基本重启）
- 远程管理（仅本地 CLI 控制）

## Decisions

### 1. 单进程架构 vs 多进程架构

**决策**: 单进程同时运行调度器和 Web Server

**理由**:
- ✅ 简化进程管理（一个 PID 文件）
- ✅ 状态共享简单（内存对象，无需 IPC）
- ✅ 资源占用更低
- ✅ 用户体验更好（一个 start 命令）

**替代方案**:
- ❌ 多进程：调度器和 Web Server 各自独立
  - 需要进程间通信（IPC/共享文件）
  - 需要管理两个 PID
  - 启动/停止逻辑复杂

### 2. 前台 vs 后台运行

**决策**: 支持两种模式，通过 `--daemon` 标志控制

**理由**:
- 前台模式：开发调试友好，日志直接可见
- 后台模式：生产环境，开机自启动

**实现**:
```typescript
if (options.daemon) {
  // fork 子进程，父进程退出
  const child = spawn(process.argv[0], process.argv.slice(1), {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
} else {
  // 前台运行，监听 Ctrl+C
  await runDaemon();
}
```

### 3. PID 文件格式

**决策**: JSON 格式存储元数据

```json
{
  "pid": 12345,
  "startTime": "2026-03-14T12:00:00.000Z",
  "port": 10010,
  "version": "0.2.0"
}
```

**理由**:
- ✅ 包含额外信息（启动时间、端口）
- ✅ 易于扩展
- ✅ `status` 命令可显示详细信息

**替代方案**:
- ❌ 纯文本（只存 PID）：信息不足

### 4. 优雅关闭策略

**决策**: 30 秒超时的优雅关闭

```typescript
process.on('SIGTERM', async () => {
  // 1. 停止接收新请求
  server.close();
  // 2. 停止调度器
  scheduler.stop();
  // 3. 等待当前任务（最多 30s）
  await Promise.race([
    waitForCurrentTasks(),
    timeout(30000)
  ]);
  // 4. 强制退出
  process.exit(0);
});
```

**理由**:
- ✅ 不丢失正在进行的分析
- ✅ 防止无限等待
- ✅ 用户体验好（stop 命令不会卡死）

### 5. 日志系统选型

**决策**: 自实现轻量级日志系统（不引入 winston/pino）

**理由**:
- ✅ 零依赖
- ✅ 需求简单（文件输出 + 轮转）
- ✅ 减少 bundle 大小

**实现**:
```typescript
class DaemonLogger {
  private stream: fs.WriteStream;

  log(level: 'info' | 'warn' | 'error', message: string) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    this.stream.write(line);

    // 检查文件大小，触发轮转
    this.checkRotation();
  }

  private checkRotation() {
    const stats = fs.statSync(this.logFile);
    if (stats.size > 10 * 1024 * 1024) { // 10MB
      this.rotate();
    }
  }
}
```

### 6. 自启动配置方式

**决策**: macOS 使用 LaunchAgent，Linux 使用 systemd user service

**macOS (LaunchAgent)**:
- 位置: `~/Library/LaunchAgents/com.claude-evolution.plist`
- 不需要 sudo 权限
- 用户登录时启动

**Linux (systemd)**:
- 位置: `~/.config/systemd/user/claude-evolution.service`
- 不需要 sudo 权限
- 用户会话启动

**理由**:
- ✅ 标准系统机制
- ✅ 无需 root 权限
- ✅ 自动重启支持（KeepAlive/Restart）

### 7. 状态共享机制

**决策**: 内存对象 + EventEmitter

```typescript
// 共享状态
export const daemonState = {
  scheduler: { ... },
  webServer: { ... },
  suggestions: { ... }
};

// 事件通知
class DaemonEventBus extends EventEmitter {}
export const daemonEvents = new DaemonEventBus();

// 调度器更新状态
daemonEvents.emit('scheduler:executed', { ... });

// Web Server 监听事件
daemonEvents.on('scheduler:executed', (data) => {
  wss.broadcast({ type: 'scheduler_executed', data });
});
```

**理由**:
- ✅ 简单直接（同进程内存）
- ✅ 解耦（通过事件）
- ✅ 易于扩展

## Risks / Trade-offs

### 1. 单进程单点故障

**Risk**: 进程崩溃导致调度器和 Web UI 同时不可用

**Mitigation**:
- LaunchAgent/systemd 配置 KeepAlive/Restart
- 进程异常时自动重启
- 记录崩溃日志，帮助诊断

### 2. 端口冲突

**Risk**: 端口 10010 被占用导致启动失败

**Mitigation**:
- 检测端口占用，给出明确错误提示
- 支持 `--port` 参数自定义端口
- 配置文件支持修改默认端口

### 3. PID 文件过期

**Risk**: 进程异常退出未清理 PID 文件，导致误判进程还在运行

**Mitigation**:
```typescript
async function isDaemonRunning(): Promise<boolean> {
  const pidData = await readPidFile();
  if (!pidData) return false;

  // 检查进程是否真实存在
  try {
    process.kill(pidData.pid, 0); // 信号 0 仅检测存在性
    return true;
  } catch {
    // 进程不存在，清理过期 PID 文件
    await fs.remove(pidFile);
    return false;
  }
}
```

### 4. 日志文件无限增长

**Risk**: 长期运行导致日志文件占满磁盘

**Mitigation**:
- 日志轮转：10MB 触发
- 保留最近 7 个文件
- 配置项 `daemon.logRotation.maxFiles`

### 5. 升级时的状态迁移

**Risk**: 配置格式变化导致旧版本用户无法升级

**Mitigation**:
```typescript
function migrateConfig(oldConfig: any): Config {
  // 检测旧版本配置
  if (!oldConfig.daemon) {
    // 添加默认 daemon 配置
    oldConfig.daemon = DEFAULT_DAEMON_CONFIG;
  }
  // 验证并返回
  return ConfigSchema.parse(oldConfig);
}
```

### 6. 跨平台兼容性

**Risk**: macOS 和 Linux 行为不一致

**Mitigation**:
- 平台特定逻辑隔离到 `src/daemon/platform/`
- 抽象接口 `PlatformAdapter`
- 充分测试两个平台

## Migration Plan

### Phase 1: 开发环境验证（Week 1-2）
1. 实现核心守护进程功能
2. 本地测试 start/stop/restart
3. 验证日志系统

### Phase 2: 自启动测试（Week 2）
1. 实现 install/uninstall
2. 测试 macOS LaunchAgent
3. 测试 Linux systemd（可选）

### Phase 3: 集成测试（Week 3）
1. 完整生命周期测试
2. 边界条件测试（端口占用、PID 过期）
3. 性能测试（内存、CPU）

### Phase 4: 用户测试（Week 3）
1. 内测用户试用
2. 收集反馈
3. 修复问题

### Phase 5: 发布（Week 4）
1. 更新文档
2. 发布 v0.2.0
3. 提供升级指南

### 回滚策略
- 守护进程是新增功能，不影响现有 CLI 命令
- 用户可以继续使用 `analyze --now` 手动分析
- 如遇问题，运行 `uninstall` 移除自启动
- 配置向后兼容，可降级到 v0.1.0

## Open Questions

1. **Windows 支持优先级**
   - 当前不支持，未来是否需要？
   - 使用 NSSM 或 Windows Service 封装？

2. **守护进程健康监控**
   - 是否需要主动健康检查（如心跳）？
   - 目前依赖 KeepAlive，是否足够？

3. **多实例支持**
   - 是否允许用户启动多个守护进程（不同配置目录）？
   - 当前设计是单实例（一个 PID 文件）

4. **远程管理**
   - 是否需要远程控制守护进程（如通过 API）？
   - 当前仅本地 CLI，是否足够？

5. **日志查询**
   - `logs` 命令仅支持 tail，是否需要搜索/过滤？
   - 当前设计简单，可后续扩展
