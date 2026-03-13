# Claude Evolution CLI 参考手册

**版本**: 0.1.0
**更新时间**: 2026-03-13

---

## 📋 目录

- [1. CLI 概述](#1-cli-概述)
- [2. 全局选项](#2-全局选项)
- [3. 命令详解](#3-命令详解)
  - [3.1 init - 初始化配置](#31-init---初始化配置)
  - [3.2 analyze - 触发分析](#32-analyze---触发分析)
  - [3.3 review - 查看建议](#33-review---查看建议)
  - [3.4 approve - 批准建议](#34-approve---批准建议)
  - [3.5 reject - 拒绝建议](#35-reject---拒绝建议)
  - [3.6 status - 查看状态](#36-status---查看状态)
  - [3.7 history - 查看历史](#37-history---查看历史)
  - [3.8 diff - 对比差异](#38-diff---对比差异)
  - [3.9 config - 配置管理](#39-config---配置管理)
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

### 3.2 analyze - 触发分析

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
  当前学习阶段: suggestion
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

### 3.3 review - 查看建议

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

### 3.4 approve - 批准建议

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

### 3.5 reject - 拒绝建议

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

### 3.6 status - 查看状态

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
  学习阶段: 建议期 (第 2/3 天)

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

### 3.7 history - 查看历史

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

### 3.8 diff - 对比差异

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

### 3.9 config - 配置管理

**用途**: 读取和设置系统配置

#### 3.9.1 config list - 列出配置

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

学习阶段 (learningPhases):
  observation:
    durationDays: 3
  suggestion:
    durationDays: 4
  automatic:
    confidenceThreshold: 0.8

配置文件: ~/.claude-evolution/config.json
```

---

#### 3.9.2 config set - 设置配置

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

# 修改学习阶段
claude-evolution config set learningPhases.observation.durationDays 7
claude-evolution config set learningPhases.automatic.confidenceThreshold 0.9
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
| `learningPhases.observation.durationDays` | number | 3 | 观察期天数 |
| `learningPhases.suggestion.durationDays` | number | 4 | 建议期天数 |
| `learningPhases.automatic.confidenceThreshold` | number | 0.8 | 自动应用阈值 (0-1) |

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
