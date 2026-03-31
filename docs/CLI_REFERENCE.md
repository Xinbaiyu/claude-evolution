# Claude Evolution CLI 参考手册

**版本**: 0.1.0
**更新时间**: 2026-03-13

---

## 📋 目录

- [1. CLI 概述](#1-cli-概述)
- [2. 全局选项](#2-全局选项)
- [3. 命令详解](#3-命令详解)
  - [3.1 init - 初始化配置](#31-init---初始化配置)
  - [3.2 守护进程管理](#32-守护进程管理)
    - [3.2.1 start - 启动守护进程](#321-start---启动守护进程)
    - [3.2.2 stop - 停止守护进程](#322-stop---停止守护进程)
    - [3.2.3 restart - 重启守护进程](#323-restart---重启守护进程)
    - [3.2.4 logs - 查看日志](#324-logs---查看日志)
    - [3.2.5 install - 安装自启动](#325-install---安装自启动)
    - [3.2.6 uninstall - 卸载自启动](#326-uninstall---卸载自启动)
  - [3.3 analyze - 触发分析](#33-analyze---触发分析)
  - [3.4 review - 查看建议](#34-review---查看建议)
  - [3.5 approve - 批准建议](#35-approve---批准建议)
  - [3.6 reject - 拒绝建议](#36-reject---拒绝建议)
  - [3.7 status - 查看状态](#37-status---查看状态)
  - [3.8 history - 查看历史](#38-history---查看历史)
  - [3.9 diff - 对比差异](#39-diff---对比差异)
  - [3.10 config - 配置管理](#310-config---配置管理)
- [4. 使用场景](#4-使用场景)
- [5. 脚本集成](#5-脚本集成)
- [6. 常见问题](#6-常见问题)

---

## 1. CLI 概述

### 1.1 安装验证

```bash
# 查看版本
claude-evolution --version

# 查看帮助
claude-evolution --help

# 查看命令列表
claude-evolution
```

### 1.2 命令结构

```
claude-evolution <command> [options] [arguments]
```

**示例**:

```bash
claude-evolution review --verbose
claude-evolution approve sugg-abc123
claude-evolution config set scheduler.enabled true
```

### 1.3 命令分类

| 分类 | 命令 | 用途 |
|------|------|------|
| **初始化** | `init` | 初始化配置目录 |
| **守护进程** | `start`, `stop`, `restart`, `logs`, `install`, `uninstall` | 守护进程生命周期管理 |
| **分析** | `analyze` | 触发会话分析 |
| **审批** | `review`, `approve`, `reject` | 管理建议 |
| **查看** | `status`, `history`, `diff` | 查看系统状态 |
| **配置** | `config` | 管理配置 |

---

## 2. 全局选项

### 2.1 `--version`

显示 CLI 版本号

**语法**:

```bash
claude-evolution --version
```

**输出**:

```
0.1.0
```

---

### 2.2 `--help`

显示帮助信息

**语法**:

```bash
# 查看全局帮助
claude-evolution --help

# 查看命令帮助
claude-evolution <command> --help
```

**示例**:

```bash
# 查看 review 命令帮助
claude-evolution review --help
```

**输出**:

```
Usage: claude-evolution review [options]

Review pending suggestions

Options:
  -v, --verbose  显示详细信息（包括证据引用）
  -h, --help     display help for command
```

---

## 3. 命令详解

### 3.1 init - 初始化配置

**用途**: 初始化 claude-evolution 配置目录和文件

**语法**:

```bash
claude-evolution init
```

**行为**:

1. 创建 `~/.claude-evolution/` 目录
2. 创建子目录: `source/`, `learned/`, `suggestions/`, `logs/`
3. 生成默认 `config.json`
4. 生成初始 `state.json`
5. 复制已有 `CLAUDE.md` 到 `source/` (如果存在)

**输出示例**:

```
🚀 初始化 Claude Evolution 配置...

✓ 创建配置目录: ~/.claude-evolution
✓ 创建 source 目录
✓ 创建 learned 目录
✓ 创建 suggestions 目录
✓ 创建 logs 目录
✓ 生成默认配置文件
✓ 检测到已有 CLAUDE.md,已复制到 source 目录

✅ 初始化完成!

下一步:
  1. 运行 'claude-evolution analyze --now' 触发首次分析
  2. 运行 'claude-evolution review' 查看建议
```

**目录结构**:

```
~/.claude-evolution/
├── config.json          # 系统配置
├── state.json           # 系统状态
├── source/
│   └── CLAUDE.md        # 原始配置 (如果存在)
├── learned/             # 学习成果 (空)
│   ├── preferences.md
│   ├── solutions.md
│   └── workflows.md
├── suggestions/         # 建议文件 (空)
│   ├── pending.json
│   ├── approved.json
│   └── rejected.json
└── logs/                # 日志目录 (空)
    └── evolution.log
```

**错误处理**:

```bash
# 如果已初始化
❌ 配置目录已存在: ~/.claude-evolution
💡 如需重新初始化,请先删除该目录:
   rm -rf ~/.claude-evolution
```

**最佳实践**:

- ✅ 在首次使用前运行一次
- ✅ 删除配置目录后需重新初始化
- ⚠️ 重新初始化会覆盖现有配置,请先备份

---

### 3.2 守护进程管理

守护进程模式允许 claude-evolution 在后台持续运行,自动执行定时分析并提供 Web UI 访问。

#### 3.2.1 start - 启动守护进程

**用途**: 启动守护进程(包含调度器和 Web Server)

**语法**:

```bash
claude-evolution start [options]
```

**选项**:

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `-d, --daemon` | boolean | false | 后台运行模式 |
| `-p, --port <port>` | number | 10010 | Web UI 端口 |
| `--no-scheduler` | boolean | false | 禁用调度器 (仅启动 Web UI) |
| `--no-web` | boolean | false | 禁用 Web UI (仅启动调度器) |

**示例**:

```bash
# 前台运行 (开发模式,可看到日志输出)
claude-evolution start

# 后台运行 (生产模式,推荐)
claude-evolution start --daemon

# 自定义端口
claude-evolution start --port 3000

# 仅启动 Web UI
claude-evolution start --no-scheduler

# 仅启动调度器
claude-evolution start --no-web
```

**输出**:

```
🚀 启动守护进程(前台模式)

📅 启动调度器...
   ✓ 调度器已启动
🌐 启动 Web 服务器...
   ✓ Web UI 运行在 http://localhost:10010

✓ 守护进程已启动
   调度器: 每 6h 自动分析
   Web UI: http://localhost:10010

按 Ctrl+C 停止服务
```

**注意事项**:

- 启动前会检查是否已有实例运行,避免重复启动
- 后台模式下,日志输出到 `~/.claude-evolution/logs/daemon.log`
- PID 文件保存在 `~/.claude-evolution/daemon.pid`
- 默认每 6 小时自动执行一次分析 (可在 config.json 中配置)

---

#### 3.2.2 stop - 停止守护进程

**用途**: 停止运行中的守护进程

**语法**:

```bash
claude-evolution stop [options]
```

**选项**:

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `-f, --force` | boolean | false | 强制终止 (使用 SIGKILL) |
| `-t, --timeout <seconds>` | number | 30 | 优雅关闭超时时间(秒) |

**示例**:

```bash
# 优雅停止
claude-evolution stop

# 强制停止 (不等待任务完成)
claude-evolution stop --force

# 自定义超时时间
claude-evolution stop --timeout 60
```

**输出**:

```
🛑 停止守护进程

   PID: 12345
   端口: 10010
   启动时间: 2026/3/14 12:00:00

发送停止信号...
✓ 守护进程已停止
```

**停止流程**:

1. 读取 PID 文件
2. 发送 SIGTERM 信号 (优雅关闭)
3. 等待进程退出 (最多 30 秒)
4. 超时后使用 SIGKILL 强制终止
5. 清理 PID 文件

---

#### 3.2.3 restart - 重启守护进程

**用途**: 重启守护进程 (先停止再启动)

**语法**:

```bash
claude-evolution restart [options]
```

**选项**:

继承 start 命令的所有选项:
- `-d, --daemon`: 后台运行
- `-p, --port <port>`: Web UI 端口
- `--no-scheduler`: 禁用调度器
- `--no-web`: 禁用 Web UI

**示例**:

```bash
# 重启 (保持原配置)
claude-evolution restart

# 重启并切换到后台模式
claude-evolution restart --daemon

# 重启并更换端口
claude-evolution restart --port 3001
```

**输出**:

```
🔄 重启守护进程

正在停止当前实例...
✓ 守护进程已停止

正在启动新实例...
✓ 守护进程已启动
   Web UI: http://localhost:10010
```

**注意事项**:

- 如果守护进程未运行,会直接启动新实例
- 重启后使用新的命令参数,不会继承之前的配置

---

#### 3.2.4 logs - 查看日志

**用途**: 查看守护进程日志

**语法**:

```bash
claude-evolution logs [options]
```

**选项**:

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `-f, --follow` | boolean | false | 实时跟踪日志 |
| `-n, --lines <number>` | number | 50 | 显示最后 N 行 |
| `-l, --level <level>` | string | - | 过滤日志级别 (INFO/WARN/ERROR) |

**示例**:

```bash
# 显示最后 50 行
claude-evolution logs

# 实时跟踪
claude-evolution logs --follow

# 显示最后 100 行
claude-evolution logs --lines 100

# 仅显示错误日志
claude-evolution logs --level ERROR

# 组合使用
claude-evolution logs -f --level WARN
```

**输出**:

```
[2026-03-14T12:00:00.000Z] [INFO] 守护进程已启动
[2026-03-14T12:00:00.123Z] [INFO] 调度器已启动
[2026-03-14T12:00:00.456Z] [INFO] Web 服务器已启动: http://localhost:10010
[2026-03-14T18:00:00.789Z] [INFO] 定时分析任务开始
[2026-03-14T18:05:30.123Z] [INFO] 定时分析任务完成
```

**日志级别**:

- **INFO**: 常规信息 (启动、定时任务等)
- **WARN**: 警告信息 (非致命错误)
- **ERROR**: 错误信息 (任务失败、异常)

**日志轮转**:

- 单个日志文件最大 10MB
- 保留最近 7 个历史文件
- 自动轮转,无需手动清理

---

#### 3.2.5 install - 安装自启动

**用途**: 配置系统开机自启动 (macOS/Linux)

**语法**:

```bash
claude-evolution install [options]
```

**选项**:

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--enable` | boolean | false | 安装后立即启动 |
| `-p, --port <port>` | number | 10010 | Web UI 端口 |

**示例**:

```bash
# 仅安装 (不启动)
claude-evolution install

# 安装并启动
claude-evolution install --enable

# 自定义端口
claude-evolution install --port 3000
```

**输出** (macOS):

```
📦 安装开机自启动

   平台: macOS
   配置文件: ~/Library/LaunchAgents/com.claude-evolution.plist

正在生成配置文件...
✓ 配置文件已创建

正在注册服务...
✓ LaunchAgent 已注册

✅ 自启动已配置

下一步:
  • 重启电脑后自动启动
  • 手动启动: claude-evolution start
  • 查看状态: launchctl list | grep claude-evolution
```

**平台支持**:

- ✅ macOS (LaunchAgent)
- ✅ Linux (systemd)
- ❌ Windows (计划中)

**卸载方法**:

```bash
claude-evolution uninstall
```

---

#### 3.2.6 uninstall - 卸载自启动

**用途**: 移除开机自启动配置

**语法**:

```bash
claude-evolution uninstall
```

**输出**:

```
🗑️  卸载开机自启动

正在停止服务...
✓ 服务已停止

正在注销 LaunchAgent...
✓ LaunchAgent 已注销

正在删除配置文件...
✓ 配置文件已删除

✅ 卸载完成
```

**注意事项**:

- 会先停止运行中的守护进程
- 删除系统配置文件
- 不会删除 `~/.claude-evolution/` 目录中的数据

---

### 3.3 analyze - 触发分析

**用途**: 手动触发会话分析流程

**语法**:

```bash
claude-evolution analyze [options]
```

**选项**:

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--now` | boolean | false | 立即运行 (忽略上次分析时间) |

**基本用法**:

```bash
# 根据配置的间隔时间决定是否分析
claude-evolution analyze

# 强制立即分析
claude-evolution analyze --now
```

**分析流程**:

```
1. 连接 claude-mem MCP
2. 采集自上次分析以来的会话
3. 使用 LLM 提取偏好、模式、工作流
4. 学习和冲突检测
5. 生成待审批建议或自动应用
6. 更新 CLAUDE.md
7. 更新系统状态
```

**输出示例**:

```
========================================
开始分析流程
========================================

[1/7] 加载配置
  上次分析时间: 2026-03-13 15:00:00

[2/7] 连接 claude-mem HTTP API
  ✓ 连接成功

[3/7] 采集会话数据
  总计: 15 条记录
  类型分布:
    feature: 8 条
    bugfix: 4 条
    refactor: 3 条

[4/7] 提取经验和模式
  偏好: 5 项, 模式: 3 项, 工作流: 2 项

[5/7] 学习偏好并决策
  自动应用: 0 项
  待审批: 10 项
  冲突: 0 项

[6/7] 应用学习结果
  ✓ 已添加 10 条待审批建议
  运行 'claude-evolution review' 查看建议

[7/7] 生成 CLAUDE.md
  ✓ 已更新配置文件

✅ 分析流程完成 (耗时 12.5s)
```

**错误场景**:

```bash
# 场景 1: 未初始化
❌ 未初始化: 请先运行 'claude-evolution init'

# 场景 2: API Key 缺失
❌ 分析失败: Missing API key
💡 设置环境变量: export ANTHROPIC_API_KEY=sk-ant-...

# 场景 3: 无新会话
⚠️ 没有新的会话数据需要分析
```

**最佳实践**:

- ✅ 首次运行使用 `--now` 强制分析
- ✅ 定期运行 (每天或每周)
- ✅ 修改大量代码后手动运行
- ⚠️ 频繁运行会增加 API 成本

---

### 3.4 review - 查看建议

**用途**: 查看待审批建议列表

**语法**:

```bash
claude-evolution review [options]
```

**选项**:

| 选项 | 简写 | 类型 | 默认值 | 说明 |
|------|------|------|--------|------|
| `--verbose` | `-v` | boolean | false | 显示详细信息 (证据、完整 ID、创建时间) |

**基本用法**:

```bash
# 简略模式
claude-evolution review

# 详细模式
claude-evolution review --verbose
# 或
claude-evolution review -v
```

**简略模式输出**:

```
📋 待审批建议 (3 条)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID: sugg-abc1
类型: 偏好 (workflow)
描述: 采用渐进式重构策略,分步骤完成大型架构迁移
置信度: 90%
频率: 8 次
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: sugg-def2
类型: 模式
问题: 配置默认值与 schema 不匹配
解决方案: 使用 zod 验证配置文件
置信度: 85%
出现: 3 次
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID: sugg-ghi3
类型: 工作流
名称: Git Commit 流程
步骤: 4 步
置信度: 95%
频率: 15 次
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 提示:
  - 批准: claude-evolution approve <id>
  - 拒绝: claude-evolution reject <id>
  - 批准所有: claude-evolution approve all
  - 详细信息: claude-evolution review --verbose
```

**详细模式输出**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID: sugg-abc123-def456-ghi789
创建时间: 2026-03-13 15:30:45

类型: 偏好 (workflow)
描述: 采用渐进式重构策略,分步骤完成大型架构迁移
置信度: 90%
频率: 8 次

📌 证据引用:
  1. session-001
  2. session-005
  3. session-012
  4. session-018
  5. session-023
  ... 还有 3 条证据
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID: sugg-ghi789-jkl012-mno345
创建时间: 2026-03-13 15:30:50

类型: 工作流
名称: Git Commit 流程
置信度: 95%
频率: 15 次

📋 步骤:
  1. 运行 git status 检查变更
  2. 运行测试确保通过
  3. 使用规范的 commit message
  4. 推送到远程仓库

📌 证据引用:
  1. session-020
  2. session-025
  3. session-030
  4. session-035
  5. session-040
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**空列表输出**:

```
📋 待审批建议

暂无待审批建议

💡 提示:
  运行 'claude-evolution analyze --now' 触发分析
```

**最佳实践**:

- ✅ 定期查看待审批建议
- ✅ 使用 `--verbose` 查看证据来源
- ✅ 批准前仔细阅读描述

---

### 3.5 approve - 批准建议

**用途**: 批准单个或所有待审批建议

**语法**:

```bash
claude-evolution approve <id>
claude-evolution approve all
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `<id>` | string | 建议 ID (支持前缀匹配) 或 `all` |

**基本用法**:

```bash
# 批准单个建议 (完整 ID)
claude-evolution approve sugg-abc123-def456-ghi789

# 批准单个建议 (前缀匹配)
claude-evolution approve sugg-abc

# 批准所有建议
claude-evolution approve all
```

**单个批准输出**:

```
✅ 已批准建议: sugg-abc123

建议内容:
  类型: 偏好 (workflow)
  描述: 采用渐进式重构策略

已应用到配置文件:
  ~/.claude-evolution/learned/preferences.md
  ~/.claude-evolution/CLAUDE.md

💡 下一步:
  - 查看差异: claude-evolution diff
  - 查看历史: claude-evolution history
```

**批量批准输出**:

```
批量批准建议 (3 条)

✓ sugg-abc123 - 偏好: 采用渐进式重构策略
✓ sugg-def456 - 模式: 使用 zod 验证配置
✓ sugg-ghi789 - 工作流: Git Commit 流程

✅ 已批准 3 条建议

已更新配置文件:
  ~/.claude-evolution/learned/preferences.md
  ~/.claude-evolution/learned/solutions.md
  ~/.claude-evolution/learned/workflows.md
  ~/.claude-evolution/CLAUDE.md
```

**错误场景**:

```bash
# 建议不存在
❌ 建议未找到: sugg-xyz

# 前缀匹配多个
❌ 前缀 'sugg-a' 匹配了多个建议:
  - sugg-abc123
  - sugg-abc456
请使用更具体的 ID
```

**副作用**:

1. 建议从 `pending.json` 移动到 `approved.json`
2. 内容写入 `learned/` 目录
3. 重新生成 `CLAUDE.md`
4. 触发 WebSocket 事件 (如果 Web Server 在运行)

**最佳实践**:

- ✅ 批准前查看 `review --verbose`
- ✅ 使用前缀匹配简化输入
- ✅ 批准后查看 `diff` 确认变更
- ⚠️ 批准不可撤销,请谨慎操作

---

### 3.6 reject - 拒绝建议

**用途**: 拒绝单个待审批建议

**语法**:

```bash
claude-evolution reject <id>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `<id>` | string | 建议 ID (支持前缀匹配) |

**基本用法**:

```bash
# 拒绝建议
claude-evolution reject sugg-abc123

# 或使用前缀
claude-evolution reject sugg-abc
```

**输出示例**:

```
✅ 已拒绝建议: sugg-abc123

建议内容:
  类型: 偏好 (workflow)
  描述: 采用渐进式重构策略

已移动到拒绝列表:
  ~/.claude-evolution/suggestions/rejected.json

💡 下一步:
  - 查看拒绝历史: claude-evolution history --type rejected
```

**副作用**:

1. 建议从 `pending.json` 移动到 `rejected.json`
2. 不会应用到配置文件
3. 触发 WebSocket 事件 (如果 Web Server 在运行)

**最佳实践**:

- ✅ 不确定的建议先拒绝
- ✅ 定期查看拒绝历史,避免误拒
- ⚠️ 拒绝不可撤销

---

### 3.7 status - 查看状态

**用途**: 显示系统完整状态

**语法**:

```bash
claude-evolution status
```

**输出示例**:

```
📊 Claude Evolution 状态

⚙️  配置状态
  ✓ 已初始化
  配置文件: ~/.claude-evolution/config.json
  LLM 模型: claude-3-5-haiku-20241022

💡 建议统计
  总计: 106 条建议
  ⏳ 待审批: 81 条
  ✓ 已批准: 12 条
  ✗ 已拒绝: 13 条

📈 分析状态
  ✓ 上次分析: 5 小时前
  已分析会话: 42 个

🏥 系统健康
  ✓ source/ 目录存在
  ✓ learned/ 目录存在
  ✓ suggestions/ 目录存在
  ✓ logs/ 目录存在
  ✓ config.json 存在
  ✅ 系统健康

💡 下一步建议:
  - 查看建议: claude-evolution review
  - 触发分析: claude-evolution analyze --now
```

**未初始化输出**:

```
❌ 未初始化

系统尚未初始化,请先运行:
  claude-evolution init
```

**健康检查失败**:

```
🏥 系统健康
  ✓ source/ 目录存在
  ✓ learned/ 目录存在
  ❌ suggestions/ 目录缺失
  ✓ logs/ 目录存在
  ✓ config.json 存在
  ⚠️ 系统不健康

💡 修复建议:
  mkdir -p ~/.claude-evolution/suggestions
```

**最佳实践**:

- ✅ 每天运行一次查看系统状态
- ✅ 出现问题时首先运行 `status`
- ✅ 集成到监控脚本

---

### 3.8 history - 查看历史

**用途**: 显示审批历史记录

**语法**:

```bash
claude-evolution history [options]
```

**选项**:

| 选项 | 简写 | 类型 | 默认值 | 说明 |
|------|------|------|--------|------|
| `--limit <number>` | `-l` | number | 10 | 显示数量 |
| `--type <type>` | `-t` | string | all | 过滤类型 (approved/rejected/all) |

**基本用法**:

```bash
# 查看最近 10 条历史
claude-evolution history

# 查看最近 20 条历史
claude-evolution history --limit 20
claude-evolution history -l 20

# 只查看已批准的
claude-evolution history --type approved
claude-evolution history -t approved

# 只查看已拒绝的
claude-evolution history --type rejected

# 组合使用
claude-evolution history -l 5 -t approved
```

**输出示例**:

```
📜 历史记录

┌──────────┬────────────┬───────────────────────────┬──────────┬────────────────────┐
│ 操作     │ 类型       │ 描述                      │ 置信度   │ 时间               │
├──────────┼────────────┼───────────────────────────┼──────────┼────────────────────┤
│ ✓ 批准   │ 偏好       │ 采用渐进式重构策略        │ 90%      │ 6 小时前           │
│ ✗ 拒绝   │ 模式       │ 配置默认值与 schema 不... │ 75%      │ 6 小时前           │
│ ✓ 批准   │ 工作流     │ Git Commit 流程           │ 95%      │ 1 天前             │
│ ✓ 批准   │ 偏好       │ 使用 TypeScript 严格模式  │ 88%      │ 1 天前             │
│ ✗ 拒绝   │ 偏好       │ 总是使用 console.log 调... │ 60%      │ 2 天前             │
└──────────┴────────────┴───────────────────────────┴──────────┴────────────────────┘

显示前 10 条,共 25 条记录
提示: 使用 --limit 参数查看更多记录
```

**空历史输出**:

```
📜 历史记录

暂无历史记录

💡 提示:
  - 批准建议: claude-evolution approve <id>
  - 拒绝建议: claude-evolution reject <id>
```

**时间格式**:

| 时间差 | 显示格式 |
|--------|---------|
| < 1 分钟 | "刚刚" |
| < 1 小时 | "N 分钟前" |
| < 1 天 | "N 小时前" |
| < 7 天 | "N 天前" |
| >= 7 天 | "YYYY-MM-DD HH:mm" |

**最佳实践**:

- ✅ 定期查看历史,了解学习进度
- ✅ 使用 `--type` 过滤特定类型
- ✅ 使用 `--limit` 控制输出量

---

### 3.9 diff - 对比差异

**用途**: 显示原始配置与进化配置的差异

**语法**:

```bash
claude-evolution diff [options]
```

**选项**:

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--no-color` | boolean | false | 禁用彩色输出 (便于重定向) |

**基本用法**:

```bash
# 彩色差异输出
claude-evolution diff

# 纯文本输出 (便于重定向到文件)
claude-evolution diff --no-color > changes.txt
```

**输出示例** (彩色):

```
📝 配置差异

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
+ # preferences.md
+ # 学习的偏好
+
+ ## Workflow
+ - **采用渐进式重构策略,分步骤完成大型架构迁移**
+   - 置信度: 90%
+   - 出现频率: 8 次
+
+ ## Tool
+ - **使用 TypeScript 严格模式**
+   - 置信度: 88%
+   - 出现频率: 12 次
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
+ # solutions.md
+ # 已知问题解决方案
+
+ ## 配置验证失败
+ **问题**: 配置默认值与 schema 不匹配
+ **解决方案**: 使用 zod 定义 schema 并验证配置文件
+ **置信度**: 85%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 变更统计

  + 156 行新增
  - 0 行删除
    0 行未变更

  总计: 156 行变更

💡 提示:
  - 查看完整配置: cat ~/.claude-evolution/CLAUDE.md
  - 撤销更改需手动恢复备份
```

**无差异输出**:

```
📝 配置差异

✅ 原始配置与进化配置一致

暂无差异

💡 提示:
  - 批准建议后会产生差异
  - 运行 'claude-evolution review' 查看待审批建议
```

**未初始化输出**:

```
❌ 未初始化

系统尚未初始化,请先运行:
  claude-evolution init
```

**颜色说明**:

- 🟢 **绿色 (+)**: 新增内容
- 🔴 **红色 (-)**: 删除内容
- ⚪ **灰色 ( )**: 未变更内容

**最佳实践**:

- ✅ 批准建议后查看差异
- ✅ 使用 `--no-color` 导出差异报告
- ✅ 定期查看配置演进

---

### 3.10 migrate-suggestions - 迁移旧数据

**用途**: 一次性迁移 v0.2.x 旧格式建议数据到 v0.3.0 观察格式

**语法**:

```bash
claude-evolution migrate-suggestions
```

**功能说明**:

该命令用于从 v0.2.x 升级到 v0.3.0/v0.4.0 时，将旧的 `learned/pending.json` 建议数据迁移到新的 `memory/observations/active.json` 观察格式。

**迁移流程**:

1. **检查是否已迁移**: 查找 `learned/.migrated` 标记文件
2. **备份原始数据**: 创建 `pending.json.backup-YYYYMMDD`
3. **转换格式**: 将旧建议转换为 `ObservationWithMetadata` 格式
4. **合并数据**: 追加到现有 `active.json` 而不覆盖
5. **创建标记**: 防止重复迁移

**输出示例**:

```
🔄 开始迁移建议数据...

✅ 迁移成功！

📊 迁移统计:
   - 已迁移建议: 15 个
   - 备份文件: ~/.claude-evolution/learned/pending.json.backup-20260315
   - 标记文件: ~/.claude-evolution/learned/.migrated

📝 下一步:
   1. 访问 http://localhost:10010/learning-review 查看迁移结果
   2. 使用 WebUI 管理观察（代替旧的 CLI 命令）
   3. 确认无误后可删除 ~/.claude-evolution/learned/ 目录

💡 回滚方法:
   如需回滚，删除 learned/.migrated 并恢复备份文件
```

**转换规则**:

| 旧字段 | 新字段 | 说明 |
|--------|--------|------|
| `id` | `id` | 保持不变 |
| `type` | `type` | 保持不变 (preference/pattern/workflow) |
| `item` | `item` | 保持结构 |
| `confidence` | `confidence`, `originalConfidence` | 两者相同 |
| `item.frequency` | `mentions` | 偏好/工作流频率 |
| `item.occurrences` | `mentions` | 模式出现次数 |
| `createdAt` | `firstSeen`, `lastSeen` | 时间戳 |
| `evidence` | `evidence` | 证据引用保持不变 |
| - | `inContext` | 新增字段，设为 `false` |

**注意事项**:

⚠️ **仅迁移 pending.json**: 不迁移 `approved.json` 和 `rejected.json`
⚠️ **一次性操作**: 标记文件创建后无法再次迁移
⚠️ **不可逆操作**: 执行前请确保已备份数据

**常见场景**:

**场景 1: 首次升级到 v0.3.0**

```bash
# 1. 备份整个配置目录（可选但推荐）
cp -r ~/.claude-evolution ~/backups/claude-evolution-$(date +%Y%m%d)

# 2. 执行迁移
claude-evolution migrate-suggestions

# 3. 验证结果
claude-evolution status
open http://localhost:10010/learning-review
```

**场景 2: 无旧数据**

```bash
$ claude-evolution migrate-suggestions
🔄 开始迁移建议数据...

ℹ️  No legacy data found. learned/pending.json is empty or missing.
```

**场景 3: 已经迁移过**

```bash
$ claude-evolution migrate-suggestions
🔄 开始迁移建议数据...

ℹ️  Already migrated. Marker file exists at learned/.migrated
```

**场景 4: 回滚迁移**

```bash
# 1. 删除标记文件
rm ~/.claude-evolution/learned/.migrated

# 2. 删除迁移的观察（可选，如果需要完全回滚）
# 手动编辑 memory/observations/active.json 移除迁移项

# 3. 恢复备份
cp ~/.claude-evolution/learned/pending.json.backup-20260315 \
   ~/.claude-evolution/learned/pending.json

# 4. 重新迁移
claude-evolution migrate-suggestions
```

**相关命令**:

- `status` - 查看系统状态和观察数量
- `analyze --now` - 触发新一轮学习周期

**相关文档**:

- [MIGRATION_V03_TO_V04.md](./MIGRATION_V03_TO_V04.md) - 完整升级指南
- [LEARNING.md](./LEARNING.md) - 增量学习系统文档

---

### 3.11 config - 配置管理

**用途**: 读取和设置系统配置

#### 3.10.1 config list - 列出配置

**语法**:

```bash
claude-evolution config list
```

**输出示例**:

```
⚙️  Claude Evolution 配置

调度器 (scheduler):
  enabled: false
  interval: 1h

LLM (llm):
  model: claude-3-5-haiku-20241022
  maxTokens: 4096
  temperature: 0.3
  enablePromptCaching: false

配置文件: ~/.claude-evolution/config.json
```

---

#### 3.10.2 config set - 设置配置

**语法**:

```bash
claude-evolution config set <field> <value>
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `<field>` | string | 配置字段 (使用点号分隔) |
| `<value>` | string/number/boolean | 配置值 |

**基本用法**:

```bash
# 启用调度器
claude-evolution config set scheduler.enabled true

# 修改调度间隔
claude-evolution config set scheduler.interval 2h

# 切换 LLM 模型
claude-evolution config set llm.model claude-3-5-sonnet-20241022

# 修改温度
claude-evolution config set llm.temperature 0.5

# 修改最大 Token
claude-evolution config set llm.maxTokens 3000
```

**输出示例**:

```
✅ 配置已更新

字段: scheduler.enabled
旧值: false
新值: true

配置文件: ~/.claude-evolution/config.json
```

**可配置字段**:

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `scheduler.enabled` | boolean | false | 是否启用定时调度 |
| `scheduler.interval` | string | "1h" | 调度间隔 (1h, 30m, 2d) |
| `llm.model` | string | "claude-3-5-haiku-20241022" | LLM 模型 |
| `llm.maxTokens` | number | 4096 | 最大 Token 数 |
| `llm.temperature` | number | 0.3 | 温度 (0-1) |
| `llm.enablePromptCaching` | boolean | false | 是否启用 Prompt Caching |

**错误场景**:

```bash
# 字段不存在
❌ 无效的配置字段: scheduler.unknown

# 值类型错误
❌ 配置值类型错误: scheduler.enabled 需要 boolean 类型
```

**最佳实践**:

- ✅ 修改配置前先 `config list` 查看当前值
- ✅ 重要配置修改前备份 `config.json`
- ⚠️ 修改 LLM 模型会影响成本

---

## 4. 使用场景

### 4.1 首次使用流程

```bash
# 1. 初始化系统
claude-evolution init

# 2. 触发首次分析
claude-evolution analyze --now

# 3. 查看建议
claude-evolution review --verbose

# 4. 批准高置信度建议
claude-evolution approve sugg-abc
claude-evolution approve sugg-def

# 5. 查看配置差异
claude-evolution diff

# 6. 查看系统状态
claude-evolution status
```

### 4.2 日常使用流程

```bash
# 每天早上
claude-evolution status

# 如果有待审批建议
claude-evolution review
claude-evolution approve all

# 每周手动分析
claude-evolution analyze --now
claude-evolution history --limit 20
```

### 4.3 审批工作流

```bash
# 1. 查看待审批建议
claude-evolution review

# 2. 查看详细信息
claude-evolution review --verbose

# 3. 批准确定的建议
claude-evolution approve sugg-abc
claude-evolution approve sugg-def

# 4. 拒绝不确定的建议
claude-evolution reject sugg-ghi

# 5. 查看差异
claude-evolution diff

# 6. 查看历史
claude-evolution history
```

### 4.4 问题排查流程

```bash
# 1. 查看系统状态
claude-evolution status

# 2. 查看配置
claude-evolution config list

# 3. 手动触发分析
claude-evolution analyze --now

# 4. 查看日志
tail -f ~/.claude-evolution/logs/evolution.log
```

---

## 5. 脚本集成

### 5.1 自动批准高置信度建议

```bash
#!/bin/bash
# auto-approve.sh

# 触发分析
claude-evolution analyze --now

# 获取待审批建议 (需要解析输出)
# 批准置信度 >= 90% 的建议
# (需要配合 API 或 JSON 输出)

# 简化版: 批准所有
# claude-evolution approve all
```

### 5.2 定期分析 Cron Job

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 2 点分析
0 2 * * * /usr/local/bin/claude-evolution analyze --now >> ~/claude-evolution-cron.log 2>&1

# 每周一早上 9 点发送状态报告
0 9 * * 1 /usr/local/bin/claude-evolution status | mail -s "Claude Evolution Weekly Report" user@example.com
```

### 5.3 Git Hook 集成

```bash
# .git/hooks/post-commit

#!/bin/bash
# 提交后触发分析

echo "触发 Claude Evolution 分析..."
claude-evolution analyze --now

echo "查看待审批建议数量..."
claude-evolution status | grep "待审批"
```

---

## 6. 常见问题

### Q1: 如何重置系统?

```bash
# 删除配置目录
rm -rf ~/.claude-evolution

# 重新初始化
claude-evolution init
```

---

### Q2: 如何导出配置?

```bash
# 备份配置目录
tar -czf ~/claude-evolution-backup.tar.gz ~/.claude-evolution

# 恢复
tar -xzf ~/claude-evolution-backup.tar.gz -C ~/
```

---

### Q3: 如何撤销批准?

**CLI 不支持撤销**,需手动操作:

```bash
# 1. 从 approved.json 移回 pending.json
# (需要手动编辑 JSON 文件)

# 2. 删除 learned/ 目录中的对应内容

# 3. 重新生成 CLAUDE.md
claude-evolution analyze --now
```

---

### Q4: 如何查看完整 ID?

```bash
# 使用 --verbose 选项
claude-evolution review --verbose

# 或查看 JSON 文件
cat ~/.claude-evolution/suggestions/pending.json | jq '.[] | {id, type}'
```

---

### Q5: 如何批量操作?

**CLI 目前支持**:

```bash
# 批准所有
claude-evolution approve all
```

**不支持**: 批量拒绝、条件批准

**替代方案**: 使用 Web UI 或 API

---

## 总结

Claude Evolution CLI 提供:

✅ **10 个命令**: 初始化、分析、审批、查看、配置
✅ **简洁易用**: 友好的彩色输出和提示
✅ **灵活配置**: 支持点号路径配置
✅ **脚本集成**: 可集成到 Cron 和 Git Hook

**下一步**:

- 查看 [部署指南](./DEPLOYMENT.md) 了解安装和部署
- 查看 [API 文档](./API.md) 了解 Web API 和 SDK
- 查看 [架构文档](./ARCHITECTURE.md) 了解系统设计

---

**维护者**: Claude Code
**最后更新**: 2026-03-13
**版本**: 0.1.0
