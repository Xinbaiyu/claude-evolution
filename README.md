# claude-evolution

> 让 Claude Code 从历史会话中自我进化，持续优化您的工作流程

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Test Coverage](https://img.shields.io/badge/Coverage-92%25%20(核心)-brightgreen.svg)](./coverage/index.html)

**claude-evolution** 是一个自进化系统，通过分析 Claude Code 的历史会话，自动学习您的工作偏好、问题解决模式和常用工作流程，并生成优化建议来持续改进您的 CLAUDE.md 配置文件。

---

## ✨ 核心特性

### 🧠 智能学习引擎 ⭐ v0.3.0 全新升级
- **自动会话分析**: 扫描 `~/.claude/projects/` 目录，提取有价值的工作模式
- **三类知识提取**:
  - **Preferences** (偏好): 工作习惯、代码风格、工具偏好
  - **Patterns** (模式): 重复出现的问题-解决方案对
  - **Workflows** (工作流): 常见操作序列和最佳实践
- **LLM 驱动**: 使用 Claude Haiku 4 进行语义理解和知识提取
- **增量学习系统** 🆕:
  - **三层存储**: Active Pool（候选池） → Context Pool（上下文池） → Archived Pool（归档池）
  - **时间衰减**: 自动降低老旧观察的置信度，保持配置新鲜
  - **智能合并**: LLM 识别并合并语义相似的观察，避免重复
  - **自动提升**: 高质量观察（confidence≥75%, mentions≥5）自动进入 CLAUDE.md
  - **容量控制**: 保持候选池在最优大小（默认 50 条），淘汰低质量观察
  - **详见**: [Learning System 完整文档](./docs/LEARNING.md)

### ✅ 灵活可控的审批流程
- **自动提升**: 高质量观察自动进入 CLAUDE.md（可配置阈值）
- **手动干预**: 支持手动提升/降级/删除观察
- **批量操作**: 支持批量批准/拒绝，提高效率
- **证据追溯**: 查看每条观察的来源会话和置信度
- **归档恢复**: 已删除观察可在 30 天内恢复

### 🎨 双重界面
- **CLI 工具**: 10 个命令覆盖完整工作流，适合自动化和脚本
- **Web UI**: 现代化可视界面，支持实时推送和批量操作

### 🔄 持续进化
- **自动配置生成**: 合并静态规则和学习内容，生成最终 CLAUDE.md
- **文件监听**: learned/ 目录变化时自动重新生成配置
- **版本管理**: 保留历史快照，支持回滚

---

## 📸 界面预览

### CLI 工具

#### 系统状态
```bash
$ claude-evolution status

📊 Claude Evolution 状态

⚙️  配置状态
  ✓ 已初始化
  LLM 模型: claude-3-5-haiku-20241022

💡 建议统计
  总计: 106 条建议
  ⏳ 待审批: 81 条
  ✓ 已批准: 12 条
  ✗ 已拒绝: 13 条

🏥 系统健康
  ✅ 系统健康
```

#### 历史记录
```bash
$ claude-evolution history --limit 5

📜 历史记录

┌──────────┬────────────┬────────────────────────┬──────────┬──────────┐
│ 操作     │ 类型       │ 描述                   │ 置信度   │ 时间     │
├──────────┼────────────┼────────────────────────┼──────────┼──────────┤
│ ✓ 批准   │ 偏好       │ 重视代码可读性和简洁性 │ 90%      │ 6 小时前 │
│ ✗ 拒绝   │ 模式       │ 配置默认值与 schema... │ 75%      │ 6 小时前 │
└──────────┴────────────┴────────────────────────┴──────────┴──────────┘
```

#### 配置差异
```bash
$ claude-evolution diff

📝 配置差异

+ # preferences.md
+ ## Workflow
+ - **采用渐进式重构策略,分步骤完成大型架构迁移**
+   - 置信度: 90%
+   - 出现频率: 8 次

📊 变更统计
  + 156 行新增
  总计: 156 行变更
```

### Web UI

**Dashboard** - 实时系统概览
- 📊 可视化统计图表（待审批/已批准/置信度分布）
- 🔔 桌面通知（macOS/Windows/Linux）
- 📈 历史趋势分析

**Review** - 建议审批界面
- 📋 建议列表（支持过滤、搜索）
- ✅ 批量选择和批量操作
- 🔍 详细信息展示（证据引用、置信度）
- ⚡ 实时进度弹窗

**Learning Review** - 观察池管理界面 🆕 v0.3.0
- 📂 三层 Tab 切换（Active/Context/Archived）
- 🥇 层级分组（Gold/Silver/Bronze）自动提升候选
- 📉 时间衰减可视化（显示 original → decayed 置信度）
- ⚙️ 手动操作（Promote/Ignore/Delete）
- 📊 统计面板（总数、容量控制归档、过期/删除）
- 🔄 归档恢复功能（30 天内可恢复）

**Settings** - 配置管理
- ⚙️ 学习参数调整（容量、衰减、提升阈值、删除策略）🆕
- 🔧 LLM 配置管理
- 📁 目录结构预览
- 📊 实时池大小进度条 🆕

**Source Manager** - 配置文件编辑器 ⭐ 新功能
- ✏️ 在线编辑 source 目录的 MD 配置文件
- 💾 保存后自动重新生成 CLAUDE.md
- 👁️ 实时预览最终生成的配置文件
- ⚠️ 未保存修改警告

---

## 🚀 快速开始

### 前置条件

- **Node.js** >= 18
- **Claude Code** 已安装并使用过
- **ANTHROPIC_API_KEY** 环境变量（用于 LLM 分析）

### 安装

#### 方式 1: 从源码构建（推荐）

```bash
# 克隆仓库
git clone https://github.com/yourusername/claude-evolution.git
cd claude-evolution

# 安装依赖
npm install

# 编译项目
npm run build

# 全局安装（可选）
npm link
```

#### 方式 2: NPM 安装（计划中）

```bash
npm install -g claude-evolution
```

### 初始化

```bash
# 初始化配置
claude-evolution init

# 设置 API Key
export ANTHROPIC_API_KEY=your-api-key

# 运行首次分析
claude-evolution analyze --now
```

### 守护进程模式 ⭐ 推荐

守护进程模式是最便捷的使用方式,可以：
- 🕐 **自动定时分析**: 每 6 小时自动运行,无需手动触发
- 🌐 **Web UI 访问**: 随时通过浏览器查看和审批建议
- 🔔 **系统通知**: 发现新建议时桌面通知提醒
- 🚀 **开机自启**: 配置一次,永久运行

```bash
# 一次性配置:安装开机自启动
claude-evolution install --enable

# 日常使用
claude-evolution start          # 启动守护进程
claude-evolution status         # 查看运行状态
# 浏览器访问 http://localhost:10010

# 查看日志
claude-evolution logs -f        # 实时跟踪日志

# 维护命令
claude-evolution restart        # 重启服务
claude-evolution stop           # 停止服务
claude-evolution uninstall      # 卸载自启动
```

---

## 📖 使用指南

### 🎯 完整工作流程

#### 1. 初始化系统

```bash
$ claude-evolution init
```

系统会在 `~/.claude-evolution/` 创建配置目录，包含：
- `config.json` - 系统配置
- `source/` - 静态规则（手动维护，可通过 Web UI 管理）
- `learned/` - 学习内容（自动生成）
- `suggestions/` - 建议存储
- `logs/` - 日志文件

**提示**: 初始化完成后，建议启动守护进程并通过 Web UI 管理配置文件：
```bash
claude-evolution start --daemon
# 访问 http://localhost:10010/source-manager 编辑源文件
```

#### 2. 分析会话历史

```bash
$ claude-evolution analyze --now
```

系统会：
1. 扫描 `~/.claude/projects/` 目录的 `.jsonl` 会话文件
2. 使用 Claude Haiku 4 分析会话内容
3. 提取偏好、模式和工作流
4. 生成建议并保存到 `suggestions/pending.json`

#### 3. 查看系统状态

```bash
$ claude-evolution status
```

快速了解：
- 配置状态
- 建议统计
- 上次分析时间
- 系统健康状况

#### 4. 审批建议

**简略模式**:
```bash
$ claude-evolution review
```

**详细模式**（含证据引用）:
```bash
$ claude-evolution review --verbose
```

**批准建议**:
```bash
# 批准单个
$ claude-evolution approve <id>

# 批准所有
$ claude-evolution approve all
```

**拒绝建议**:
```bash
$ claude-evolution reject <id>
```

#### 5. 查看历史记录

```bash
# 最近 10 条
$ claude-evolution history

# 最近 20 条
$ claude-evolution history --limit 20

# 只看已批准的
$ claude-evolution history --type approved

# 只看已拒绝的
$ claude-evolution history --type rejected
```

#### 6. 对比配置差异

```bash
# 查看原始 vs 进化配置
$ claude-evolution diff

# 纯文本输出（便于重定向）
$ claude-evolution diff --no-color > changes.txt
```

#### 7. 配置管理

```bash
# 查看当前配置
$ claude-evolution config list

# 修改配置
$ claude-evolution config set llm.model claude-haiku-4
```

---

### 🌐 使用 Web UI

#### 启动 Web 服务器

```bash
# 开发模式（支持热重载）
npm run dev:server

# 生产模式
npm run build
npm run start:server
```

服务器将在 `http://localhost:10010` 启动

#### 访问界面

1. **Dashboard** (`/`)
   - 系统概览和统计
   - 快速操作入口

2. **Review** (`/review`)
   - 建议列表
   - 批量操作
   - 实时进度

3. **Settings** (`/settings`)
   - 配置管理
   - 系统信息

4. **Source Manager** (`/source-manager`) ⭐ 新功能
   - 在线编辑 source 配置文件
   - 实时预览 CLAUDE.md
   - 自动重新生成配置

---

## 🗂️ 目录结构

### 配置目录 (~/.claude-evolution/)

```
~/.claude-evolution/
├── config.json              # 系统配置
├── status.json              # 运行状态
├── source/                  # 静态规则（手动维护）
│   ├── CLAUDE.md           # 原始 CLAUDE.md（可选）
│   ├── security.md         # 安全规范
│   └── coding-style.md     # 代码风格
├── learned/                 # 学习内容（自动生成）
│   ├── preferences.md      # 学习的偏好
│   ├── solutions.md        # 问题-解决方案模式
│   └── workflows.md        # 工作流程
├── suggestions/             # 建议存储
│   ├── pending.json        # 待审批
│   ├── approved.json       # 已批准
│   └── rejected.json       # 已拒绝
└── logs/                    # 日志文件
    └── analysis.log
```

### 最终配置文件

```
~/.claude/
└── CLAUDE.md               # 最终生成的配置文件
                           # = source/* + learned/*
```

---

## 🧩 系统架构

### 工作流程图

```
┌─────────────────────────────────────────────────────┐
│                   Claude Code                       │
│             历史会话 (*.jsonl)                      │
└───────────────────┬─────────────────────────────────┘
                    │
                    ↓
         ┌──────────────────────┐
         │  Session Collector   │  扫描会话文件
         │  (会话收集器)        │
         └──────────┬───────────┘
                    │
                    ↓
         ┌──────────────────────┐
         │ Experience Extractor │  LLM 分析
         │  (经验提取器)        │  提取知识
         └──────────┬───────────┘
                    │
                    ↓
         ┌──────────────────────┐
         │  Preference Learner  │  合并去重
         │  (偏好学习器)        │  计算置信度
         └──────────┬───────────┘
                    │
                    ↓
         ┌──────────────────────┐
         │  Suggestion Manager  │  生命周期管理
         │  (建议管理器)        │  pending/approved/rejected
         └──────────┬───────────┘
                    │
          ┌─────────┴─────────┐
          │                   │
          ↓                   ↓
   ┌─────────────┐     ┌─────────────┐
   │   Approve   │     │   Reject    │
   └──────┬──────┘     └─────────────┘
          │
          ↓
   ┌─────────────┐
   │     MD      │  合并 source/ + learned/
   │  Generator  │  生成 ~/.claude/CLAUDE.md
   └──────┬──────┘
          │
          ↓
   ┌─────────────────────┐
   │   CLAUDE.md         │
   │  (最终配置文件)     │
   └─────────────────────┘
```

### 核心模块说明

| 模块 | 职责 | 测试覆盖率 |
|------|------|------------|
| **Session Collector** | 扫描和解析 `.jsonl` 会话文件 | 4.59% |
| **Experience Extractor** | 使用 LLM 提取偏好/模式/工作流 | **97.42%** ✅ |
| **Preference Learner** | 合并相似偏好，计算置信度，检测冲突 | **96.73%** ✅ |
| **Suggestion Manager** | 管理建议生命周期，支持批量操作 | **86.2%** ✅ |
| **MD Generator** | 生成最终 CLAUDE.md 配置文件 | 53.1% |
| **File Watcher** | 监听文件变化，触发重新生成 | 3.38% |

---

## 📊 数据模型

### Preference (偏好)

```typescript
interface Preference {
  type: 'workflow' | 'style' | 'tool' | 'communication';
  description: string;        // "使用中文编写文档"
  confidence: number;         // 0.85 (0-1)
  frequency: number;          // 3 (出现次数)
  evidence: string[];         // ["session-001", "session-002"]
}
```

### Pattern (模式)

```typescript
interface Pattern {
  problem: string;            // "TypeScript 类型错误"
  solution: string;           // "使用类型断言或类型守卫"
  confidence: number;         // 0.75
  occurrences: number;        // 5 (出现次数)
  evidence: string[];         // ["session-001"]
}
```

### Workflow (工作流)

```typescript
interface Workflow {
  name: string;               // "提交前检查流程"
  steps: string[];            // ["运行测试", "运行 lint", "提交"]
  confidence: number;         // 0.90
  frequency: number;          // 10 (使用次数)
  evidence: string[];         // ["session-005"]
}
```

---

## ⚙️ 配置选项

### 配置文件: `~/.claude-evolution/config.json`

```json
{
  "llm": {
    "activeProvider": "claude",
    "claude": {
      "model": "claude-sonnet-4-6",
      "maxTokens": 4096,
      "temperature": 0.3,
      "enablePromptCaching": true
    },
    "openai": {
      "baseURL": "https://api.openai.com",
      "model": "gpt-4-turbo",
      "maxTokens": 4096,
      "temperature": 0.3
    },
    "ccr": {
      "baseURL": "http://localhost:3456",
      "model": "claude-sonnet-4-6",
      "maxTokens": 4096,
      "temperature": 0.3
    }
  },
  "scheduler": {
    "enabled": false,
    "analysisInterval": "12h"
  }
}
```

### 主要配置项说明

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `llm.activeProvider` | 当前使用的 LLM 提供商 | claude |
| `llm.claude.model` | Claude 模型名称 | claude-sonnet-4-6 |
| `llm.claude.enablePromptCaching` | 是否启用 Prompt Caching | true |
| `llm.openai.baseURL` | OpenAI-Compatible API 端点 | https://api.openai.com |
| `llm.openai.model` | OpenAI 模型名称 | gpt-4-turbo |
| `llm.ccr.baseURL` | CCR Proxy 地址 | http://localhost:3456 |
| `scheduler.enabled` | 是否启用定时分析 | false |
| `scheduler.analysisInterval` | 分析间隔 | 12h |

### LLM Provider 支持

claude-evolution 支持三种 LLM 提供商，可通过 Web UI (Settings → LLM Provider) 或编辑 `config.json` 配置：

#### 1. Claude Official API (推荐)
- **优势**: 支持 Prompt Caching，显著降低重复内容的 token 成本
- **配置**: 设置环境变量 `ANTHROPIC_API_KEY`
- **适用场景**: 使用 Anthropic 官方 API

#### 2. OpenAI-Compatible API
- **优势**: 支持任意 OpenAI 格式的 API（OpenAI、Azure OpenAI、DeepSeek、Qwen、Ollama 等）
- **配置**: 在 `llm.openai` 中设置 `baseURL`、`apiKey`、`model`
- **成本说明**: 不支持 Prompt Caching，token 成本可能较高（但 DeepSeek、Qwen 等第三方 API 价格可能更低）
- **适用场景**: 使用第三方 OpenAI 兼容服务

#### 3. CCR Proxy
- **优势**: 通过本地代理访问 Claude API，支持自定义路由
- **配置**: 在 `llm.ccr` 中设置 `baseURL` 指向 CCR 服务地址
- **本质**: CCR 是 Anthropic Messages API 的代理，使用相同的 API 格式
- **适用场景**: 需要通过代理访问 Claude API

---

## 🔧 CLI 命令参考

### 完整命令列表

| 命令 | 说明 | 示例 |
|------|------|------|
| `init` | 初始化配置目录和文件 | `claude-evolution init` |
| **守护进程管理** |||
| `start [-d\|--daemon]` | 启动守护进程 | `claude-evolution start --daemon` |
| `stop [-f\|--force]` | 停止守护进程 | `claude-evolution stop` |
| `restart` | 重启守护进程 | `claude-evolution restart` |
| `logs [-f\|--follow]` | 查看日志 | `claude-evolution logs -f` |
| `install [--enable]` | 安装开机自启动 | `claude-evolution install --enable` |
| `uninstall` | 卸载开机自启动 | `claude-evolution uninstall` |
| **建议管理** |||
| `analyze [--now]` | 触发会话分析 | `claude-evolution analyze --now` |
| `review [-v\|--verbose]` | 查看待审批建议 | `claude-evolution review -v` |
| `approve <id\|all>` | 批准建议 | `claude-evolution approve all` |
| `reject <id>` | 拒绝建议 | `claude-evolution reject abc123` |
| **系统信息** |||
| `status` | 显示系统状态 | `claude-evolution status` |
| `history` | 查看历史记录 | `claude-evolution history --limit 20` |
| `diff` | 查看配置差异 | `claude-evolution diff --no-color` |
| **配置管理** |||
| `config list` | 列出当前配置 | `claude-evolution config list` |
| `config set` | 修改配置项 | `claude-evolution config set llm.model claude-haiku-4` |
| `config upgrade` | 升级配置到最新版本 | `claude-evolution config upgrade` |

### 守护进程命令详解

#### start - 启动守护进程

```bash
# 前台运行（开发模式）
claude-evolution start

# 后台运行（生产模式）
claude-evolution start --daemon

# 自定义端口
claude-evolution start --port 3000

# 仅启动 Web UI（不启动调度器）
claude-evolution start --no-scheduler

# 仅启动调度器（不启动 Web UI）
claude-evolution start --no-web
```

#### logs - 查看日志

```bash
# 显示最后 50 行
claude-evolution logs

# 实时跟踪
claude-evolution logs --follow

# 显示最后 100 行
claude-evolution logs --lines 100

# 仅显示错误日志
claude-evolution logs --level ERROR
```

#### install - 配置开机自启动

```bash
# 仅安装（不启动）
claude-evolution install

# 安装并立即启动
claude-evolution install --enable

# 自定义端口
claude-evolution install --port 3000
```

### history 命令选项

```bash
# --limit: 显示数量（默认 10）
claude-evolution history --limit 20

# --type: 过滤类型（all/approved/rejected，默认 all）
claude-evolution history --type approved
```

### diff 命令选项

```bash
# --no-color: 禁用彩色输出
claude-evolution diff --no-color
```

---

## 🧪 开发指南

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/yourusername/claude-evolution.git
cd claude-evolution

# 安装依赖
npm install

# 开发模式（CLI）
npm run dev

# 开发模式（Web 服务器 + 客户端）
npm run dev:server    # 终端 1
npm run dev:client    # 终端 2

# 编译
npm run build
```

### 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 查看 HTML 覆盖率报告
open coverage/index.html
```

### 代码质量

```bash
# TypeScript 类型检查
npx tsc --noEmit

# 代码格式化
npm run format

# Lint 检查
npm run lint
```

### 技术栈

**后端**:
- Node.js 18+
- TypeScript 5.7
- Express.js (REST API)
- @anthropic-ai/sdk (LLM 集成)
- node-cron (定时任务)
- Vitest (测试框架)
- cli-table3 (表格输出)
- diff (文本对比)

**前端**:
- React 18
- Vite 7 (构建工具)
- TailwindCSS (样式)
- React Router (路由)

---

## 📈 测试覆盖

### 整体统计

- **测试文件**: 7 个
- **测试用例**: 120 个（118 passed, 1 skipped, 1 todo）
- **通过率**: 98.3%
- **整体覆盖率**: 63.54%

### 核心模块覆盖率

| 模块 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| **learners 模块** | 90.05% | 84.12% | **100%** | 90.05% |
| ├─ preference-learner | **96.73%** | 87.5% | **100%** | **96.73%** |
| └─ suggestion-manager | **86.2%** | 82.05% | **100%** | **86.2%** |
| **experience-extractor** | **97.42%** | 95.74% | **100%** | **97.42%** |

**平均核心模块覆盖率**: **92.45%** 🎉

---

## 🐛 故障排查

### 问题 1: 分析失败 - "缺少 ANTHROPIC_API_KEY 环境变量"

**解决方案**:
```bash
# 设置 API Key（临时）
export ANTHROPIC_API_KEY=sk-ant-api03-...

# 设置 API Key（永久，添加到 ~/.zshrc 或 ~/.bashrc）
echo 'export ANTHROPIC_API_KEY=sk-ant-api03-...' >> ~/.zshrc
source ~/.zshrc

# 验证
echo $ANTHROPIC_API_KEY
```

### 问题 2: Web UI 无法访问

**症状**: `http://localhost:10010` 无法打开

**解决方案**:
```bash
# 1. 检查服务器是否运行
ps aux | grep "web/server"

# 2. 检查端口是否被占用
lsof -i :10010

# 3. 重新启动服务器
npm run dev:server
```

### 问题 3: 建议列表为空

**症状**: `claude-evolution review` 显示 "暂无待审批建议"

**可能原因**:
1. 没有运行过分析
2. 所有建议已被批准/拒绝
3. 没有可分析的会话文件

**解决方案**:
```bash
# 1. 运行分析
claude-evolution analyze --now

# 2. 检查会话文件
ls ~/.claude/projects/*/*.jsonl

# 3. 查看系统状态
claude-evolution status

# 4. 检查建议文件
cat ~/.claude-evolution/suggestions/pending.json
```

### 问题 4: 命令未找到

**症状**: `claude-evolution: command not found`

**解决方案**:
```bash
# 方式 1: 使用 npm link（推荐）
cd /path/to/claude-evolution
npm run build
npm link

# 方式 2: 使用 node 直接运行
node /path/to/claude-evolution/dist/cli/index.js status

# 方式 3: 添加到 PATH
export PATH="/path/to/claude-evolution/dist/cli:$PATH"
```

---

## 🔒 安全与隐私

### 数据隐私保护

- ✅ **完全本地运行**: 所有数据存储在本地 `~/.claude-evolution/`
- ✅ **不上传云端**: 会话数据不会发送到任何第三方服务器
- ✅ **人工审核**: 所有建议必须经过人工批准才能生效
- ⚠️ **LLM API 调用**: 会话内容会发送到 Anthropic API 进行分析（计划添加敏感数据过滤）

### 访问控制

- Web UI 默认只监听 `localhost:10010`
- 不建议在公网暴露 Web 服务器
- 如需远程访问，建议使用 SSH 隧道或反向代理（Nginx + 认证）

### 环境变量

```bash
# 必需
export ANTHROPIC_API_KEY=sk-ant-api03-...

# 可选
export CLAUDE_EVOLUTION_DIR=~/.claude-evolution  # 自定义配置目录
export PORT=10010                                 # Web 服务器端口
```

---

## 📈 版本历史与路线图

### ✅ v0.1.0 (当前版本) - 2026-03-13

**核心功能**:
- ✅ CLI 工具 (10/10 命令完成)
  - init, analyze, review, approve, reject
  - status, history, diff
  - config list, config set
- ✅ Web UI (Dashboard, Review, Settings)
- ✅ REST API (7 个端点)
- ✅ 核心学习逻辑
- ✅ 批量操作支持
- ✅ 实时 WebSocket 推送

**测试覆盖**:
- ✅ 单元测试（核心模块 92.45% 覆盖率）
- ✅ 集成测试（CLI 工作流、Web API）
- ✅ 测试基础设施完善

**文档**:
- ✅ README.md
- ✅ 测试总结 (TESTING_SUMMARY.md)
- ✅ CLI 增强命令文档 (CLI_ENHANCED_COMMANDS.md)

### 🚧 v0.2.0 (计划中)

**文档与质量**:
- [ ] 架构文档 (ARCHITECTURE.md)
- [ ] API 文档 (API.md)
- [ ] 部署文档 (DEPLOYMENT.md)
- [ ] CLI 参考文档 (CLI_REFERENCE.md)
- [ ] CI/CD 配置 (GitHub Actions)

**功能增强**:
- [ ] 敏感数据自动过滤
- [ ] 配置版本管理
- [ ] 建议合并优化

### 🔮 v0.3.0+ (未来规划)

**高级功能**:
- [ ] 自动批准（高置信度建议）
- [ ] 冲突检测增强
- [ ] MCP Server 集成
- [ ] Git Hooks 集成
- [ ] IDE 插件（VSCode/JetBrains）
- [ ] 团队共享功能
- [ ] 自定义学习规则

---

## 🤝 贡献指南

欢迎贡献！我们欢迎以下形式的贡献：

- 🐛 Bug 报告
- 💡 功能建议
- 📝 文档改进
- 🔧 代码贡献

### 开发流程

1. Fork 本仓库
2. 创建特性分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'feat: add amazing feature'`
4. 推送到分支: `git push origin feature/amazing-feature`
5. 开启 Pull Request

### Commit 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
refactor: 重构
test: 测试相关
chore: 构建/工具链
perf: 性能优化
style: 代码格式
```

### 代码规范

- 使用 TypeScript 严格模式
- 遵循不可变数据模式
- 编写单元测试（核心模块覆盖率 >= 80%）
- 使用描述性的变量和函数名
- 添加必要的注释

---

## 📄 许可证

MIT License © 2026

---

## 💬 社区与支持

- 🐛 [报告 Bug](https://github.com/yourusername/claude-evolution/issues)
- 💡 [功能建议](https://github.com/yourusername/claude-evolution/discussions)
- 📖 [完整文档](./docs/)

---

## 🙏 致谢

- [Claude Code](https://claude.ai/claude-code) - 强大的 AI 编程助手
- [Anthropic](https://www.anthropic.com/) - 提供 Claude API
- [Model Context Protocol](https://modelcontextprotocol.io/) - 标准化的上下文协议

---

**Built with ❤️ using Claude Code**

