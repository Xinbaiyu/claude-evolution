## Why

claude-evolution 目前无法开机自启动，且调度器和 Web UI 进程管理分散。电脑重启后，定时分析和 Web UI 都不会运行，用户需要手动启动多个进程。虽然配置文件中有 scheduler.enabled，但实际上没有守护进程来运行它。这导致用户无法享受"自动进化"的完整体验 - 系统应该在后台持续学习，而不是需要频繁手动操作。

## What Changes

- 新增 `start` 命令：启动守护进程（调度器 + Web Server）
- 新增 `stop` 命令：停止守护进程
- 新增 `restart` 命令：重启守护进程
- 新增 `install` 命令：配置开机自启动（macOS LaunchAgent）
- 新增 `uninstall` 命令：移除开机自启动
- 新增 `logs` 命令：查看守护进程日志
- 增强 `status` 命令：显示守护进程运行状态、Web UI 地址、调度器状态
- 配置文件新增 `daemon` 和 `webUI` 配置项

## Capabilities

### New Capabilities

- `daemon-lifecycle`: 守护进程生命周期管理（启动、停止、重启、状态查询）
- `process-management`: 进程管理基础设施（PID 文件、信号处理、优雅关闭）
- `daemon-logging`: 守护进程日志系统（文件输出、轮转、级别过滤）
- `auto-start`: 系统自启动配置（macOS LaunchAgent、Linux systemd）
- `shared-state`: 调度器与 Web Server 状态共享机制
- `daemon-commands`: 守护进程 CLI 命令集（start/stop/restart/logs/install/uninstall）

### Modified Capabilities

- `cli-status-command`: 增强显示守护进程状态、Web UI 地址、调度器执行时间
- `configuration-schema`: 新增 daemon 和 webUI 配置项，保持向后兼容

## Impact

**新增文件**:
- `src/daemon/process-manager.ts` - 进程管理核心逻辑
- `src/daemon/logger.ts` - 日志系统
- `src/daemon/shared-state.ts` - 状态共享
- `src/daemon/platform/macos.ts` - macOS 自启动支持
- `src/daemon/platform/linux.ts` - Linux systemd 支持（可选）
- `src/cli/commands/start.ts` - start 命令
- `src/cli/commands/stop.ts` - stop 命令
- `src/cli/commands/restart.ts` - restart 命令
- `src/cli/commands/logs.ts` - logs 命令
- `src/cli/commands/install.ts` - install 命令
- `src/cli/commands/uninstall.ts` - uninstall 命令

**修改文件**:
- `src/cli/index.ts` - 注册新命令
- `src/cli/commands/status.ts` - 增强状态显示
- `src/config/schema.ts` - 新增配置项
- `README.md` - 添加守护进程使用说明
- `docs/CLI_REFERENCE.md` - 新命令文档
- `docs/DEPLOYMENT.md` - 自启动配置指南

**依赖项**:
- 无新增外部依赖
- 使用 Node.js 内置模块（child_process, fs, os）

**破坏性变更**:
- 无破坏性变更，纯增量功能
- 配置向后兼容，旧配置文件继续有效
