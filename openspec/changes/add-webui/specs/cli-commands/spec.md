## 新增需求

### 需求：start 命令
系统必须提供 start 命令以启动守护进程模式。

#### 场景：启动集成服务
- **当** 用户运行 `claude-evolution start`
- **则** 调度器和 Web 服务器同时启动
- **则** 进程在后台运行
- **则** 显示访问 URL

#### 场景：指定自定义端口
- **当** 用户运行 `claude-evolution start --port 8080`
- **则** Web 服务器绑定到 8080 端口
- **则** 配置中的默认端口被覆盖

### 需求：stop 命令
系统必须提供 stop 命令以停止守护进程。

#### 场景：停止服务
- **当** 用户运行 `claude-evolution stop`
- **则** 守护进程优雅关闭
- **则** 显示"Server stopped"确认消息

### 需求：status 命令
系统必须提供 status 命令以查询服务状态。

#### 场景：查询状态
- **当** 用户运行 `claude-evolution status`
- **则** 显示守护进程运行状态
- **则** 显示 Web 服务器 URL
- **则** 显示调度器配置

### 需求：logs 命令
系统必须提供 logs 命令以查看运行日志。

#### 场景：查看最近日志
- **当** 用户运行 `claude-evolution logs`
- **则** 显示最近 50 行日志

#### 场景：实时跟踪日志
- **当** 用户运行 `claude-evolution logs --follow`
- **则** 持续输出新日志行
- **则** Ctrl+C 退出跟踪

## 修改需求

### 需求：现有命令保持不变
现有的 init、analyze、review、approve、reject、config 命令必须保持完全向后兼容。

#### 场景：CLI 命令继续工作
- **当** 用户运行任何现有 CLI 命令
- **则** 命令行为与添加 Web UI 前完全一致
- **则** 不依赖 Web 服务器运行
