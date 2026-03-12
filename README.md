# Claude Evolution

> 自进化系统,让 Claude Code 从历史会话中学习,自动提取用户偏好和工作模式

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 功能特性

- 🧠 **自动学习**: 从 Claude Code 历史会话中提取用户偏好、重复模式和工作流程
- 🔄 **三阶段学习**: 观察期 → 建议期 → 自动期,逐步建立信任
- 🛡️ **安全过滤**: 自动过滤敏感数据(API keys, tokens, passwords等)
- ⚙️ **可配置**: 灵活的学习阶段时长和调度频率
- 📝 **配置生成**: 自动拼接静态规则和学习内容,生成完整的 CLAUDE.md
- 🔍 **审核机制**: 手动审批建议,完全控制学习过程

## 工作原理

```
历史会话 → claude-mem HTTP API → 数据采集 → LLM提取 → 偏好学习 → MD配置
```

1. **数据采集**: 通过 claude-mem Worker Service HTTP API 获取历史会话记录
2. **经验提取**: 使用 Claude Haiku 分析会话,提取偏好/模式/工作流
3. **智能决策**: 根据置信度和学习阶段决定自动应用或需要审批
4. **配置生成**: 拼接 source/ 和 learned/ 目录,生成最终 CLAUDE.md
5. **实时更新**: 文件监听自动重新生成配置

## 安装

### 前置条件

- Node.js >= 18
- Claude Code 已安装
- claude-mem Worker Service 正在运行 (默认端口 37777)
- ANTHROPIC_API_KEY 环境变量

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/yourusername/claude-evolution.git
cd claude-evolution

# 安装依赖
npm install

# 编译
npm run build

# 初始化配置
node dist/cli/index.js init
```

## 快速开始

### 1. 初始化

```bash
claude-evolution init
```

初始化时会询问您的 **API 配置模式**：

- **[1] 标准模式（推荐）**: 直接连接 Anthropic API，需要真实 API Key
- **[2] 路由器模式**: 通过 claude-code-router 转发，适用于内部服务

交互式配置学习阶段时长和调度频率。

### 2. 手动触发分析

```bash
export ANTHROPIC_API_KEY=your-api-key
claude-evolution analyze --now
```

### 3. 查看建议

```bash
claude-evolution review
```

### 4. 批准/拒绝建议

```bash
# 批准单个建议
claude-evolution approve <id>

# 批准所有建议
claude-evolution approve all

# 拒绝建议
claude-evolution reject <id>
```

### 5. 查看/修改配置

```bash
# 查看当前配置
claude-evolution config list

# 修改配置
claude-evolution config set learningPhases.observation.durationDays 5
claude-evolution config set scheduler.interval 12h
```

## 目录结构

```
~/.claude-evolution/
├── config.json           # 系统配置
├── state.json            # 运行状态
├── source/               # 用户手动维护的静态规则
│   ├── CORE.md
│   ├── STYLE.md
│   └── CODING.md
├── learned/              # 系统自动学习的内容
│   ├── preferences.md
│   ├── solutions.md
│   └── workflows.md
├── suggestions/          # 待审批建议
│   └── pending.json
├── output/               # 最终生成的配置
│   └── CLAUDE.md         # → 软链接到 ~/.claude/CLAUDE.md
├── backups/              # 历史备份
└── logs/                 # 日志文件
```

## 学习阶段

### 观察期 (默认 3 天)
- **行为**: 仅收集数据,不生成建议
- **目的**: 积累足够的数据样本

### 建议期 (默认 4 天)
- **行为**: 生成建议,全部需要手动审批
- **目的**: 让用户验证学习质量

### 自动期 (第 7 天后)
- **行为**: 高置信度(≥0.8)建议自动应用,低置信度仍需审批
- **目的**: 减少用户干预,实现自动化

## 配置选项

### 学习阶段

```json
{
  "learningPhases": {
    "observation": {
      "durationDays": 3
    },
    "suggestion": {
      "durationDays": 4
    },
    "automatic": {
      "confidenceThreshold": 0.8
    }
  }
}
```

### 调度

```json
{
  "scheduler": {
    "enabled": true,
    "interval": "24h",  // 6h | 12h | 24h | custom
    "customCron": "0 */6 * * *"
  }
}
```

### LLM

```json
{
  "llm": {
    "model": "claude-haiku-4",  // claude-haiku-4 | claude-sonnet-4
    "maxTokens": 4096,
    "temperature": 0.3,
    "enablePromptCaching": true
  }
}
```

## 命令参考

| 命令 | 描述 |
|------|------|
| `init` | 初始化配置 |
| `analyze --now` | 手动触发分析 |
| `review` | 查看待审批建议 |
| `approve <id>` | 批准建议 |
| `approve all` | 批准所有建议 |
| `reject <id>` | 拒绝建议 |
| `config list` | 查看当前配置 |
| `config set <field> <value>` | 修改配置 |

## 开发

```bash
# 开发模式
npm run dev

# 运行测试
npm test

# 生成测试覆盖率报告
npm run test:coverage
```

## 故障排查

### MCP 连接失败

```
❌ 连接 MCP 服务失败
```

**解决方案**:
1. 确认 claude-mem 已安装: `ls ~/.claude-mem/`
2. 检查 MCP 配置: `cat ~/.claude-mem/settings.json`
3. 手动测试 MCP: `npx -y claude-mem-mcp`

### API Key 错误

```
❌ 缺少 ANTHROPIC_API_KEY 环境变量
```

**解决方案**:
```bash
export ANTHROPIC_API_KEY=your-api-key
```

### 软链接创建失败

```
⚠️  创建软链接失败
```

**解决方案**:
手动复制配置文件:
```bash
cp ~/.claude-evolution/output/CLAUDE.md ~/.claude/CLAUDE.md
```

## 安全性

- ✅ 自动过滤敏感数据(API keys, tokens, passwords)
- ✅ 本地运行,数据不上传
- ✅ 手动审批机制,完全控制学习内容
- ✅ 完整的备份机制,支持随时回滚

## License

MIT © [Your Name]

## 致谢

- [Claude Code](https://claude.ai/claude-code) - AI 编程助手
- [claude-mem](https://github.com/yourusername/claude-mem) - 持久化记忆系统
- [MCP](https://modelcontextprotocol.io/) - Model Context Protocol
