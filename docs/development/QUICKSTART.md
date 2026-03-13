# Claude Evolution - 快速入门指南

## 前置准备

### 1. 环境要求

- ✅ Node.js >= 18
- ✅ npm 或 pnpm
- ✅ Claude Code 已安装
- ✅ claude-mem Worker Service 正在运行 (端口 37777)

### 2. 验证 claude-mem

```bash
# 检查 claude-mem Worker Service 是否运行
curl http://localhost:37777/api/stats

# 如果返回 JSON 数据,说明服务正常
```

### 3. 设置 API Key

```bash
# 添加到 ~/.zshrc 或 ~/.bashrc
export ANTHROPIC_API_KEY="sk-ant-your-api-key"

# 立即生效
source ~/.zshrc
```

## 安装步骤

### 方式 1: 从源码安装 (推荐)

```bash
# 1. 克隆项目
cd ~/Desktop/other_code/claude-evolution

# 2. 安装依赖
npm install

# 3. 编译
npm run build

# 4. 测试 CLI
node dist/cli/index.js --help

# 5. 创建全局命令 (可选)
npm link
```

### 方式 2: 直接使用 node 命令

```bash
# 使用完整路径
alias ce="node ~/Desktop/other_code/claude-evolution/dist/cli/index.js"

# 添加到 ~/.zshrc
echo 'alias ce="node ~/Desktop/other_code/claude-evolution/dist/cli/index.js"' >> ~/.zshrc
```

## 首次使用

### 步骤 1: 初始化

```bash
ce init
# 或
node dist/cli/index.js init
```

**交互式配置**:
```
🚀 欢迎使用 Claude Evolution!

正在创建目录结构...
✓ 目录结构创建完成

检测到现有的 ~/.claude/CLAUDE.md
将迁移到 ~/.claude-evolution/source/CORE.md
✓ 已迁移现有配置

📋 学习阶段配置:

观察期天数 (仅收集数据): (默认: 3) 3
建议期天数 (生成建议需确认): (默认: 4) 4
自动应用的置信度阈值 (0-1): (默认: 0.8) 0.8

⏰ 调度配置:

分析频率 (24h / 12h / 6h): (默认: 24h) 24h

✓ 配置已保存到 ~/.claude-evolution/config.json
✓ 已创建目录结构

✅ 初始化完成!

下一步:
  1. 编辑配置模板:
     ~/.claude-evolution/source/
  2. 运行首次分析:
     ce analyze --now
  3. 或等待定时任务自动运行
```

### 步骤 2: 验证配置

```bash
# 查看配置
ce config list

# 查看创建的目录
ls -la ~/.claude-evolution/

# 预期输出:
# config.json       # 系统配置
# state.json        # 运行状态
# source/           # 手动维护的规则
# learned/          # 自动学习的内容
# suggestions/      # 待审批建议
# output/           # 生成的 CLAUDE.md
# backups/          # 历史备份
# logs/             # 日志文件
```

### 步骤 3: 首次分析

```bash
# 手动触发分析 (需要 ANTHROPIC_API_KEY)
ce analyze --now
```

**预期流程**:
```
🔍 开始分析会话数据...

========================================
开始分析流程
========================================

[1/7] 加载配置
  当前学习阶段: observation
  上次分析时间: 从未

[2/7] 连接 claude-mem HTTP API
✓ claude-mem HTTP 服务可用

[3/7] 采集会话数据
  总计: 15 条记录
  类型分布:
    feature: 8 条
    bugfix: 4 条
    refactor: 3 条

[4/7] 提取经验和模式
✓ 提取完成: 5 个偏好, 3 个问题模式, 2 个工作流

[5/7] 学习偏好并决策
  当前阶段: observation
  自动应用: 0 项
  待审批: 10 项
  冲突: 0 项

[6/7] 应用学习结果
✓ 已添加 10 条待审批建议
  运行 'ce review' 查看建议

[7/7] 生成 CLAUDE.md
✓ CLAUDE.md 已生成 (8543 字符)
✓ 已创建软链接: ~/.claude/CLAUDE.md

✅ 分析流程完成 (耗时 35.42s)
```

### 步骤 4: 审核建议

```bash
# 查看待审批建议
ce review
```

**输出示例**:
```
📋 待审批建议

共 10 条待审批建议:

## 用户偏好

ID: a3f8d912
  类型: tool
  描述: 优先使用 pnpm 作为包管理器
  置信度: 85%
  频率: 12 次

ID: b7e4c3a1
  类型: style
  描述: 代码中使用简洁的命名风格
  置信度: 72%
  频率: 8 次

## 问题模式

ID: c9d2f5b8
  问题: TypeScript 类型错误
  解决方案: 使用 zod 进行运行时验证
  置信度: 78%
  出现: 5 次

操作:
  ce approve <id>  # 批准建议
  ce reject <id>   # 拒绝建议
  ce approve all   # 批准所有建议
```

### 步骤 5: 批准建议

```bash
# 批准单个建议
ce approve a3f8d912

# 或批准所有建议
ce approve all
```

**输出**:
```
✅ 批准建议: a3f8d912...

✓ 已批准并应用建议

已更新:
  ~/.claude-evolution/learned/

  ~/.claude-evolution/output/CLAUDE.md
```

## 日常使用

### 查看学习进度

```bash
# 查看当前配置和学习阶段
ce config list

# 查看待审批建议
ce review

# 查看生成的配置
cat ~/.claude-evolution/output/CLAUDE.md
```

### 修改配置

```bash
# 修改学习阶段时长
ce config set learningPhases.observation.durationDays 5

# 修改调度频率
ce config set scheduler.interval 12h

# 修改 LLM 模型
ce config set llm.model claude-sonnet-4
```

### 手动触发分析

```bash
# 随时手动触发分析
ce analyze --now
```

## 学习阶段说明

### 第 1-3 天: 观察期 (Observation)
- **行为**: 系统仅收集和分析数据,不会自动应用任何建议
- **用户操作**: 运行 `ce analyze --now`,然后 `ce review` 查看建议
- **目的**: 积累足够的数据样本,让用户验证学习质量

### 第 4-7 天: 建议期 (Suggestion)
- **行为**: 系统生成建议,但全部需要手动审批
- **用户操作**: 定期运行 `ce review` 和 `ce approve`
- **目的**: 用户验证学习内容的准确性

### 第 8 天后: 自动期 (Automatic)
- **行为**: 高置信度(≥0.8)的建议自动应用,低置信度仍需审批
- **用户操作**: 偶尔查看 `ce review` 处理低置信度建议
- **目的**: 实现自动化,减少用户干预

## 目录结构说明

```
~/.claude-evolution/
├── config.json              # 系统配置
├── state.json               # 运行状态 (安装日期、分析历史)
├── source/                  # 用户手动维护的静态规则
│   ├── CORE.md             # 核心编程原则
│   ├── STYLE.md            # 代码风格
│   └── CODING.md           # 编码实践
├── learned/                 # 系统自动学习的内容
│   ├── preferences.md      # 学习的偏好
│   ├── solutions.md        # 问题解决方案
│   └── workflows.md        # 工作流程
├── suggestions/
│   └── pending.json        # 待审批建议
├── output/
│   └── CLAUDE.md           # 最终配置 (→ ~/.claude/CLAUDE.md)
├── backups/                # 历史备份
│   └── CLAUDE.md.YYYY-MM-DD-HH-mm-ss
└── logs/
    ├── scheduler.log
    └── error.log
```

## 文件编辑

### 编辑静态规则

```bash
# 编辑核心规则
vim ~/.claude-evolution/source/CORE.md

# 文件会自动监听变化,实时更新 CLAUDE.md
# 无需手动重新生成
```

### 查看学习内容

```bash
# 查看学习的偏好
cat ~/.claude-evolution/learned/preferences.md

# 查看问题解决方案
cat ~/.claude-evolution/learned/solutions.md

# 查看工作流程
cat ~/.claude-evolution/learned/workflows.md
```

## 故障排查

### 问题 1: HTTP API 连接失败

```bash
# 症状
❌ 连接 claude-mem HTTP 服务失败

# 检查
curl http://localhost:37777/api/stats

# 解决
# 确保 claude-mem Worker Service 正在运行
# 检查端口 37777 是否被占用
```

### 问题 2: API Key 错误

```bash
# 症状
❌ 缺少 ANTHROPIC_API_KEY 环境变量

# 解决
export ANTHROPIC_API_KEY="sk-ant-your-key"
echo 'export ANTHROPIC_API_KEY="sk-ant-your-key"' >> ~/.zshrc
```

### 问题 3: 软链接创建失败

```bash
# 症状
⚠️  创建软链接失败

# 手动创建
ln -sf ~/.claude-evolution/output/CLAUDE.md ~/.claude/CLAUDE.md

# 或手动复制
cp ~/.claude-evolution/output/CLAUDE.md ~/.claude/CLAUDE.md
```

### 问题 4: 分析没有结果

```bash
# 可能原因:
# 1. 没有新的会话数据
# 2. claude-mem Worker Service 未运行
# 3. claude-mem 数据库为空

# 检查服务状态
curl http://localhost:37777/api/stats

# 在 Claude Code 中运行一些任务,产生会话数据
# 然后重新运行分析
```

## 高级配置

### 自定义 Cron 表达式

```bash
# 使用自定义调度 (每6小时的第15分钟)
ce config set scheduler.interval custom
ce config set scheduler.customCron "15 */6 * * *"
```

### 调整置信度阈值

```bash
# 提高自动应用的门槛 (更保守)
ce config set learningPhases.automatic.confidenceThreshold 0.9

# 降低门槛 (更激进)
ce config set learningPhases.automatic.confidenceThreshold 0.7
```

### 切换 LLM 模型

```bash
# 使用 Sonnet (更强但更贵)
ce config set llm.model claude-sonnet-4

# 使用 Haiku (更快更便宜,默认)
ce config set llm.model claude-haiku-4
```

## 下一步

1. **定期分析**: 每天或每周运行 `ce analyze --now`
2. **审核建议**: 定期运行 `ce review` 处理待审批建议
3. **调整配置**: 根据需要调整学习阶段时长和置信度阈值
4. **编辑规则**: 在 `~/.claude-evolution/source/` 中维护静态规则
5. **监控效果**: 观察 Claude Code 是否遵循学习的偏好

## 获取帮助

```bash
# 查看所有命令
ce --help

# 查看特定命令帮助
ce config --help
ce analyze --help
```

## 反馈和贡献

遇到问题或有建议?
- GitHub Issues: https://github.com/yourusername/claude-evolution/issues
- 文档: README.md
- 状态: STATUS.md
