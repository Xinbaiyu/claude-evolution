# Claude Evolution 守护进程详解

**版本**: 0.2.0
**更新时间**: 2026-03-14

---

## 📋 目录

- [1. 守护进程概述](#1-守护进程概述)
- [2. 架构设计](#2-架构设计)
- [3. 生命周期管理](#3-生命周期管理)
- [4. 日志系统](#4-日志系统)
- [5. 状态管理](#5-状态管理)
- [6. 开机自启动](#6-开机自启动)
- [7. 配置详解](#7-配置详解)
- [8. 故障排查](#8-故障排查)
- [9. 最佳实践](#9-最佳实践)
- [10. 技术细节](#10-技术细节)

---

## 1. 守护进程概述

### 1.1 什么是守护进程模式

守护进程模式是 claude-evolution 的核心运行方式，它将以下组件统一管理：

```
┌──────────────────────────────────────────┐
│    claude-evolution Daemon               │
├──────────────────────────────────────────┤
│                                          │
│  [1] CronScheduler                       │
│      - 定时分析（默认 6h）               │
│      - 生成建议                          │
│      - 发送通知                          │
│                                          │
│  [2] Web Server (Express)                │
│      - REST API (:10010)                 │
│      - 静态文件服务                      │
│      - WebSocket 推送                    │
│                                          │
│  [3] 状态管理                            │
│      - 共享内存状态                      │
│      - 调度器 ↔ Web UI 同步              │
│      - PID 文件管理                      │
│                                          │
└──────────────────────────────────────────┘
```

### 1.2 为什么需要守护进程

**解决的问题**:

1. **自动化不足**: 之前需要手动运行 `analyze` 命令
2. **进程分散**: 调度器和 Web UI 是独立进程，难以管理
3. **用户体验差**: 电脑重启后需要手动启动
4. **状态不同步**: 多个进程间状态无法共享

**带来的价值**:

- ✅ **真正的自动化**: 设置后无需干预
- ✅ **统一管理**: 一条命令控制所有组件
- ✅ **持久运行**: 开机自启，崩溃重启
- ✅ **实时同步**: 调度器和 Web UI 状态同步

### 1.3 核心特性

| 特性 | 说明 |
|------|------|
| **进程管理** | PID 文件、优雅关闭、信号处理 |
| **日志系统** | 文件输出、级别过滤、自动轮转 |
| **状态管理** | SharedStateManager、事件总线 |
| **自启动** | macOS LaunchAgent、Linux systemd |
| **错误处理** | 端口冲突检测、重复启动检测 |

---

## 2. 架构设计

### 2.1 进程结构

```typescript
// 主进程
claude-evolution start
  ↓
┌─────────────────────────┐
│   Daemon Process        │
│   (PID: 12345)          │
├─────────────────────────┤
│  ProcessManager         │ ← 生命周期管理
│  DaemonLogger           │ ← 日志输出
│  SharedStateManager     │ ← 状态同步
├─────────────────────────┤
│  CronScheduler          │ ← 定时任务
│  Web Server (Express)   │ ← HTTP/WebSocket
└─────────────────────────┘
```

### 2.2 核心模块

#### ProcessManager (`src/daemon/process-manager.ts`)

**职责**:
- PID 文件读写
- 进程存在检测
- 信号处理 (SIGTERM, SIGINT)
- 优雅关闭协调

**关键方法**:

```typescript
interface ProcessManager {
  writePidFile(data: PidFileData): Promise<void>;
  readPidFile(): Promise<PidFileData | null>;
  isDaemonRunning(): Promise<boolean>;
  setupSignalHandlers(): void;
  onShutdown(callback: () => Promise<void>): void;
}
```

#### DaemonLogger (`src/daemon/logger.ts`)

**职责**:
- 文件日志输出
- 日志级别过滤
- 日志轮转 (10MB / 7 files)

**日志级别**:

```typescript
enum LogLevel {
  INFO = 'INFO',    // 常规信息
  WARN = 'WARN',    // 警告
  ERROR = 'ERROR'   // 错误
}
```

**日志格式**:

```
[2026-03-14T12:34:56.789Z] [INFO] 守护进程已启动
[2026-03-14T12:34:56.790Z] [INFO] Web 服务器已启动: http://localhost:10010
[2026-03-14T18:00:00.123Z] [INFO] 定时分析任务开始
[2026-03-14T18:05:30.456Z] [INFO] 定时分析任务完成
```

#### SharedStateManager (`src/daemon/shared-state.ts`)

**职责**:
- 维护守护进程状态
- 事件总线 (EventEmitter)
- 组件间通信

**状态结构**:

```typescript
interface DaemonState {
  scheduler: {
    isRunning: boolean;
    lastExecution: Date | null;
    nextExecution: Date | null;
    totalExecutions: number;
  };
  webServer: {
    isRunning: boolean;
    port: number;
    activeConnections: number;
  };
  suggestions: {
    pending: number;
    approved: number;
    rejected: number;
  };
}
```

**事件类型**:

```typescript
interface DaemonEvents {
  'scheduler:executed': (data: { timestamp: Date; duration: number }) => void;
  'scheduler:started': () => void;
  'scheduler:stopped': () => void;
  'webserver:started': (data: { port: number }) => void;
  'webserver:stopped': () => void;
  'suggestions:updated': (stats: SuggestionsStats) => void;
}
```

### 2.3 数据流

```
┌─────────────┐
│ 调度器执行  │
└──────┬──────┘
       │
       ↓ emit('scheduler:executed')
┌──────────────┐
│ SharedState  │
├──────────────┤
│ 更新状态     │
└──────┬───────┘
       │
       ├─→ WebSocket.broadcast() ──→ Web UI 刷新
       │
       └─→ API /api/daemon/status ──→ status 命令
```

---

## 3. 生命周期管理

### 3.1 启动流程

```
claude-evolution start
  ↓
检查是否已运行?
  ├─ 是 ──→ 报错退出
  └─ 否
     ↓
写入 PID 文件
  ↓
初始化日志系统
  ↓
启动调度器 (可选)
  ↓
启动 Web Server (可选)
  ↓
注册信号处理器
  ↓
进入运行状态
```

**代码流程** (`src/cli/commands/start.ts`):

```typescript
export async function startCommand(options: StartOptions) {
  // 1. 检查重复启动
  if (await processManager.isDaemonRunning()) {
    console.error('守护进程已在运行');
    process.exit(1);
  }

  // 2. 写入 PID 文件
  await processManager.writePidFile({
    pid: process.pid,
    startTime: new Date().toISOString(),
    port: options.port,
    version: '0.2.0'
  });

  // 3. 启动组件
  if (enableScheduler) {
    scheduler.start(config, handleAnalysis);
  }

  if (enableWeb) {
    await webModule.startServer(port);
  }

  // 4. 设置信号处理
  processManager.onShutdown(async () => {
    scheduler?.stop();
    await webServer?.close();
    await logger.close();
  });
}
```

### 3.2 停止流程

```
claude-evolution stop
  ↓
读取 PID 文件
  ↓
找到进程?
  ├─ 否 ──→ 报错退出
  └─ 是
     ↓
发送 SIGTERM 信号
  ↓
等待进程退出 (最多 30s)
  ├─ 正常退出 ──→ 清理 PID 文件
  └─ 超时
     ↓
  发送 SIGKILL (强制)
     ↓
  清理 PID 文件
```

**优雅关闭顺序**:

1. 停止接收新请求 (Web Server)
2. 停止调度器 (取消定时任务)
3. 等待当前任务完成 (最多 30s)
4. 关闭数据库连接等资源
5. 删除 PID 文件
6. 退出进程

**代码实现** (`src/daemon/process-manager.ts`):

```typescript
setupSignalHandlers() {
  process.on('SIGTERM', async () => {
    console.log('收到 SIGTERM，开始优雅关闭...');

    // 调用注册的回调
    for (const callback of this.shutdownCallbacks) {
      await callback();
    }

    // 删除 PID 文件
    await this.deletePidFile();

    process.exit(0);
  });
}
```

### 3.3 重启流程

```
claude-evolution restart
  ↓
检查是否运行?
  ├─ 是 ──→ 执行 stop
  │         ↓
  │       等待完全停止
  └─ 否
     ↓
执行 start
```

---

## 4. 日志系统

### 4.1 日志架构

```
DaemonLogger
  ↓
FileStream (append mode)
  ↓
~/.claude-evolution/logs/daemon.log
  ↓ (达到 10MB)
轮转 ──→ daemon.log.1
      ──→ daemon.log.2
      ──→ ...
      ──→ daemon.log.7 (删除更早的)
```

### 4.2 日志级别

| 级别 | 用途 | 示例 |
|------|------|------|
| **INFO** | 常规操作 | 守护进程启动、定时任务执行 |
| **WARN** | 警告信息 | 端口占用提示、API 调用限流 |
| **ERROR** | 错误异常 | 任务执行失败、网络错误 |

### 4.3 日志格式

**标准格式**:

```
[时间戳] [级别] 消息内容
```

**示例**:

```
[2026-03-14T12:34:56.789Z] [INFO] 守护进程已启动
[2026-03-14T12:34:56.790Z] [INFO] PID 文件已创建: ~/.claude-evolution/daemon.pid
[2026-03-14T12:34:57.123Z] [INFO] 调度器已启动
[2026-03-14T12:34:57.456Z] [INFO] Web 服务器已启动: http://localhost:10010
[2026-03-14T18:00:00.000Z] [INFO] 定时分析任务开始
[2026-03-14T18:05:30.123Z] [INFO] 定时分析任务完成
[2026-03-14T18:05:30.456Z] [ERROR] 分析失败: Network timeout
```

### 4.4 日志轮转

**触发条件**:
- 文件大小达到 10MB

**轮转策略**:
- `daemon.log` → `daemon.log.1`
- `daemon.log.1` → `daemon.log.2`
- ...
- `daemon.log.7` → 删除

**保留策略**:
- 最多保留 7 个历史文件
- 约 70MB 磁盘空间

**实现** (`src/daemon/logger.ts`):

```typescript
async rotate(): Promise<void> {
  const stats = await fs.stat(this.logFile);
  const maxSizeBytes = this.parseSize(this.maxSize); // 10MB → 10485760

  if (stats.size >= maxSizeBytes) {
    // 轮转现有文件
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const oldPath = `${this.logFile}.${i}`;
      const newPath = `${this.logFile}.${i + 1}`;

      if (await fs.pathExists(oldPath)) {
        if (i === this.maxFiles - 1) {
          await fs.remove(oldPath); // 删除最旧的
        } else {
          await fs.move(oldPath, newPath);
        }
      }
    }

    // 轮转当前文件
    await fs.move(this.logFile, `${this.logFile}.1`);

    // 重新打开日志文件
    await this.openStream();
  }
}
```

### 4.5 日志查看

**CLI 命令**:

```bash
# 查看最后 50 行
claude-evolution logs

# 实时跟踪
claude-evolution logs --follow

# 显示 100 行
claude-evolution logs --lines 100

# 仅错误日志
claude-evolution logs --level ERROR
```

**直接查看**:

```bash
# 查看当前日志
tail -f ~/.claude-evolution/logs/daemon.log

# 查看所有日志（包括历史）
cat ~/.claude-evolution/logs/daemon.log{,.{1..7}} 2>/dev/null

# 搜索错误
grep ERROR ~/.claude-evolution/logs/daemon.log
```

---

## 5. 状态管理

### 5.1 PID 文件

**位置**: `~/.claude-evolution/daemon.pid`

**格式** (JSON):

```json
{
  "pid": 12345,
  "startTime": "2026-03-14T04:58:16.474Z",
  "port": 10010,
  "version": "0.2.0"
}
```

**用途**:
- 防止重复启动
- stop 命令定位进程
- status 命令读取信息
- 计算进程运行时长

**生命周期**:
- start 时创建
- stop 时删除
- 崩溃后成为 stale PID

**Stale PID 检测**:

```typescript
async isDaemonRunning(): Promise<boolean> {
  const pidInfo = await this.readPidFile();
  if (!pidInfo) return false;

  try {
    // process.kill(pid, 0) 不杀进程，仅检测存在性
    process.kill(pidInfo.pid, 0);
    return true;
  } catch (error) {
    // ESRCH: 进程不存在 → stale PID
    if (error.code === 'ESRCH') {
      await this.deletePidFile();
      return false;
    }
    throw error;
  }
}
```

### 5.2 共享状态

**设计目标**:
- 调度器和 Web Server 运行在同一进程
- 通过内存共享状态，无需数据库或文件

**实现**:

```typescript
// 全局单例
export const sharedState = new SharedStateManager();

// 调度器更新
scheduler.on('executed', () => {
  sharedState.recordSchedulerExecution(duration);
});

// Web API 读取
app.get('/api/daemon/status', (req, res) => {
  res.json(sharedState.getState());
});

// WebSocket 推送
sharedState.getEventBus().on('suggestions:updated', (stats) => {
  wsManager.broadcast({ type: 'suggestions_updated', data: stats });
});
```

### 5.3 事件总线

**发布订阅模式**:

```typescript
// 发布事件
sharedState.getEventBus().emit('scheduler:executed', {
  timestamp: new Date(),
  duration: 5000
});

// 订阅事件
sharedState.getEventBus().on('scheduler:executed', (data) => {
  console.log(`分析完成，耗时 ${data.duration}ms`);

  // WebSocket 推送给前端
  wsManager.broadcast({
    type: 'scheduler_executed',
    data: {
      timestamp: data.timestamp,
      duration: data.duration
    }
  });
});
```

**事件流**:

```
CronScheduler
  ↓ emit('scheduler:executed')
SharedStateManager
  ↓ update state
  ↓ emit('scheduler:executed')
WebSocketManager
  ↓ broadcast()
Web UI (React)
  ↓ update component
User sees update
```

---

## 6. 开机自启动

### 6.1 macOS (LaunchAgent)

#### 6.1.1 plist 文件生成

**位置**: `~/Library/LaunchAgents/com.claude-evolution.plist`

**模板**:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.claude-evolution</string>

  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/claude-evolution</string>
    <string>start</string>
    <string>--daemon</string>
  </array>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>

  <key>StandardOutPath</key>
  <string>/Users/xxx/.claude-evolution/logs/stdout.log</string>

  <key>StandardErrorPath</key>
  <string>/Users/xxx/.claude-evolution/logs/stderr.log</string>
</dict>
</plist>
```

#### 6.1.2 关键配置项

| 配置项 | 说明 |
|--------|------|
| `Label` | 服务唯一标识符 |
| `ProgramArguments` | 启动命令和参数 |
| `RunAtLoad` | 开机自动启动 |
| `KeepAlive.SuccessfulExit` | 崩溃后自动重启 |
| `StandardOutPath` | 标准输出重定向 |
| `StandardErrorPath` | 标准错误重定向 |

#### 6.1.3 安装流程

```bash
# 1. 生成 plist 文件
claude-evolution install

# 2. 加载 LaunchAgent
launchctl load ~/Library/LaunchAgents/com.claude-evolution.plist

# 3. 启动服务
launchctl start com.claude-evolution

# 4. 验证
launchctl list | grep claude-evolution
```

#### 6.1.4 管理命令

```bash
# 查看状态
launchctl list | grep claude-evolution

# 启动
launchctl start com.claude-evolution

# 停止
launchctl stop com.claude-evolution

# 重启
launchctl stop com.claude-evolution
launchctl start com.claude-evolution

# 卸载
launchctl unload ~/Library/LaunchAgents/com.claude-evolution.plist
rm ~/Library/LaunchAgents/com.claude-evolution.plist
```

### 6.2 Linux (systemd)

#### 6.2.1 Service 文件生成

**位置**: `~/.config/systemd/user/claude-evolution.service`

**模板**:

```ini
[Unit]
Description=Claude Evolution Daemon
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/claude-evolution start --daemon
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
```

#### 6.2.2 安装流程

```bash
# 1. 生成 service 文件
claude-evolution install

# 2. 重载 systemd
systemctl --user daemon-reload

# 3. 启用服务
systemctl --user enable claude-evolution

# 4. 启动服务
systemctl --user start claude-evolution

# 5. 验证
systemctl --user status claude-evolution
```

#### 6.2.3 管理命令

```bash
# 查看状态
systemctl --user status claude-evolution

# 启动
systemctl --user start claude-evolution

# 停止
systemctl --user stop claude-evolution

# 重启
systemctl --user restart claude-evolution

# 查看日志
journalctl --user -u claude-evolution -f

# 卸载
systemctl --user disable claude-evolution
rm ~/.config/systemd/user/claude-evolution.service
systemctl --user daemon-reload
```

---

## 7. 配置详解

### 7.1 守护进程配置

**位置**: `~/.claude-evolution/config.json`

**完整结构**:

```json
{
  "daemon": {
    "enabled": true,
    "pidFile": "~/.claude-evolution/daemon.pid",
    "logFile": "~/.claude-evolution/logs/daemon.log",
    "logLevel": "info",
    "logRotation": {
      "maxSize": "10MB",
      "maxFiles": 7
    },
    "gracefulShutdownTimeout": 30000
  },
  "webUI": {
    "enabled": true,
    "port": 10010,
    "host": "127.0.0.1",
    "autoOpenBrowser": false,
    "corsOrigins": ["http://localhost:10010"]
  },
  "scheduler": {
    "enabled": true,
    "interval": "6h",
    "runOnStartup": false
  }
}
```

### 7.2 配置项说明

#### daemon 配置

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | boolean | `true` | 是否启用守护进程 |
| `pidFile` | string | `~/.claude-evolution/daemon.pid` | PID 文件路径 |
| `logFile` | string | `~/.claude-evolution/logs/daemon.log` | 日志文件路径 |
| `logLevel` | enum | `info` | 日志级别 (info/warn/error/debug) |
| `logRotation.maxSize` | string | `10MB` | 日志轮转大小 |
| `logRotation.maxFiles` | number | `7` | 保留历史文件数 |
| `gracefulShutdownTimeout` | number | `30000` | 优雅关闭超时(ms) |

#### webUI 配置

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | boolean | `true` | 是否启用 Web UI |
| `port` | number | `10010` | 监听端口 |
| `host` | string | `127.0.0.1` | 监听地址 |
| `autoOpenBrowser` | boolean | `false` | 启动时打开浏览器 |
| `corsOrigins` | array | `["http://localhost:10010"]` | CORS 允许的源 |

#### scheduler 配置

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | boolean | `true` | 是否启用调度器 |
| `interval` | string | `6h` | 执行间隔 (1h/2h/6h/12h/24h) |
| `runOnStartup` | boolean | `false` | 启动时立即执行 |
| `customCron` | string | - | 自定义 cron 表达式 |

### 7.3 修改配置

```bash
# 修改日志级别
claude-evolution config set daemon.logLevel debug

# 修改端口
claude-evolution config set webUI.port 3000

# 修改调度间隔
claude-evolution config set scheduler.interval 3h

# 查看配置
claude-evolution config list

# 升级配置到最新版本
claude-evolution config upgrade
```

---

## 8. 故障排查

### 8.1 启动失败

#### 症状 1: 端口被占用

```
❌ 端口 10010 已被占用
```

**排查步骤**:

```bash
# 1. 查看端口占用
lsof -i :10010

# 2. 杀死占用进程
kill -9 $(lsof -t -i:10010)

# 3. 或使用其他端口
claude-evolution start --port 3001
```

#### 症状 2: PID 文件存在

```
❌ 守护进程已在运行
```

**排查步骤**:

```bash
# 1. 检查进程是否真的在运行
claude-evolution status

# 2. 如果是 stale PID，手动删除
rm ~/.claude-evolution/daemon.pid

# 3. 重新启动
claude-evolution start
```

#### 症状 3: 权限错误

```
EACCES: permission denied
```

**解决方案**:

```bash
# 检查目录权限
ls -la ~/.claude-evolution/

# 修复权限
chmod 755 ~/.claude-evolution/
chmod 644 ~/.claude-evolution/daemon.pid
chmod 644 ~/.claude-evolution/logs/daemon.log
```

### 8.2 运行时问题

#### 症状 1: Web UI 无法访问

**排查步骤**:

```bash
# 1. 确认守护进程运行
claude-evolution status

# 2. 测试健康检查
curl http://localhost:10010/api/health

# 3. 查看日志
claude-evolution logs --level ERROR

# 4. 检查防火墙
sudo ufw status  # Linux
sudo pfctl -sa   # macOS
```

#### 症状 2: 调度器不执行

**排查步骤**:

```bash
# 1. 查看调度器状态
claude-evolution status

# 2. 查看日志
claude-evolution logs | grep "定时分析"

# 3. 检查配置
claude-evolution config list | grep scheduler

# 4. 手动触发测试
claude-evolution analyze --now
```

#### 症状 3: 内存泄漏

**症状**: 进程内存持续增长

**排查步骤**:

```bash
# 1. 查看内存使用
ps aux | grep claude-evolution

# 2. 使用 Node.js 内存分析
node --expose-gc --max-old-space-size=512 dist/cli/index.js start

# 3. 生成 heapdump
kill -USR2 <pid>  # 如果配置了 heapdump

# 4. 重启守护进程
claude-evolution restart
```

### 8.3 自启动问题

#### macOS: LaunchAgent 不工作

**排查步骤**:

```bash
# 1. 检查 plist 文件
ls -la ~/Library/LaunchAgents/com.claude-evolution.plist

# 2. 验证 plist 语法
plutil -lint ~/Library/LaunchAgents/com.claude-evolution.plist

# 3. 查看 launchctl 状态
launchctl list | grep claude

# 4. 查看日志
tail -f ~/.claude-evolution/logs/stdout.log
tail -f ~/.claude-evolution/logs/stderr.log

# 5. 手动加载
launchctl load ~/Library/LaunchAgents/com.claude-evolution.plist
```

#### Linux: systemd 服务失败

**排查步骤**:

```bash
# 1. 查看服务状态
systemctl --user status claude-evolution

# 2. 查看详细日志
journalctl --user -u claude-evolution --since today

# 3. 检查 service 文件
cat ~/.config/systemd/user/claude-evolution.service

# 4. 重载配置
systemctl --user daemon-reload

# 5. 重启服务
systemctl --user restart claude-evolution
```

---

## 9. 最佳实践

### 9.1 生产环境建议

#### 配置优化

```json
{
  "daemon": {
    "logLevel": "info",           // 生产环境不用 debug
    "gracefulShutdownTimeout": 60000  // 增加超时时间
  },
  "scheduler": {
    "interval": "6h",             // 合理的执行间隔
    "runOnStartup": false         // 避免启动拥堵
  },
  "webUI": {
    "host": "127.0.0.1",          // 仅本地访问
    "corsOrigins": ["http://localhost:10010"]  // 限制 CORS
  }
}
```

#### 监控告警

```bash
# 添加 cron 检查守护进程
crontab -e

# 每小时检查一次
0 * * * * claude-evolution status || mail -s "Claude Evolution Down" admin@example.com
```

### 9.2 开发环境建议

#### 前台运行

```bash
# 开发时使用前台模式，方便查看日志
claude-evolution start
```

#### 调试日志

```bash
# 启用详细日志
claude-evolution config set daemon.logLevel debug

# 重启生效
claude-evolution restart
```

### 9.3 资源限制

#### 内存限制

```bash
# 使用 ulimit 限制内存
ulimit -v 524288  # 512MB

# 或在 systemd 服务中
[Service]
MemoryLimit=512M
```

#### 文件描述符

```bash
# 检查限制
ulimit -n

# 增加限制
ulimit -n 4096
```

### 9.4 安全建议

1. **限制网络访问**

```bash
# 仅监听本地
claude-evolution config set webUI.host 127.0.0.1

# 或使用反向代理 (Nginx) + HTTPS
```

2. **日志脱敏**

确保日志中不包含敏感信息（API Key、密码等）

3. **定期更新**

```bash
# 检查更新
npm outdated claude-evolution

# 更新
npm update claude-evolution
```

---

## 10. 技术细节

### 10.1 信号处理

```typescript
// SIGTERM: 优雅关闭
process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

// SIGINT: Ctrl+C
process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});

// SIGHUP: 重新加载配置
process.on('SIGHUP', async () => {
  await reloadConfig();
});
```

### 10.2 性能优化

#### 事件循环监控

```typescript
// 检测事件循环阻塞
const { performance } = require('perf_hooks');

setInterval(() => {
  const start = performance.now();
  setImmediate(() => {
    const lag = performance.now() - start;
    if (lag > 100) {
      logger.warn(`Event loop lag: ${lag}ms`);
    }
  });
}, 5000);
```

#### WebSocket 连接池

```typescript
// 限制 WebSocket 连接数
class WebSocketManager {
  private maxConnections = 100;

  handleConnection(ws: WebSocket) {
    if (this.clients.size >= this.maxConnections) {
      ws.close(1008, 'Too many connections');
      return;
    }
    // ...
  }
}
```

### 10.3 错误恢复

#### 自动重启策略

**macOS LaunchAgent**:

```xml
<key>KeepAlive</key>
<dict>
  <key>SuccessfulExit</key>
  <false/>  <!-- 非正常退出时重启 -->
</dict>

<key>ThrottleInterval</key>
<integer>10</integer>  <!-- 重启间隔 10 秒 -->
```

**Linux systemd**:

```ini
[Service]
Restart=on-failure      # 失败时重启
RestartSec=10           # 重启前等待 10 秒
StartLimitBurst=5       # 最多重启 5 次
StartLimitIntervalSec=60 # 在 60 秒内
```

---

## 11. 总结

### 11.1 守护进程优势

- ✅ **自动化**: 设置后无需干预
- ✅ **持久运行**: 开机自启、崩溃重启
- ✅ **统一管理**: 一条命令控制全部
- ✅ **实时同步**: 组件间状态共享
- ✅ **日志完善**: 轮转、过滤、追踪
- ✅ **生产就绪**: 优雅关闭、错误恢复

### 11.2 适用场景

| 场景 | 推荐模式 |
|------|---------|
| **个人使用** | ✅ 守护进程模式 |
| **小团队** | ✅ 守护进程模式 |
| **大规模部署** | PM2 集群模式 |
| **容器环境** | Docker + 守护进程 |
| **开发调试** | 前台运行 |

### 11.3 下一步

- 学习 [CLI 命令参考](./CLI_REFERENCE.md)
- 阅读 [部署指南](./DEPLOYMENT.md)
- 查看 [故障排查手册](./TROUBLESHOOTING.md)

---

**维护者**: Claude Code
**最后更新**: 2026-03-14
**版本**: 0.2.0
