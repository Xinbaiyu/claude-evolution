## Why

Claude Code 目前缺乏持久化的学习机制,每次会话都是"失忆"的状态。用户需要重复配置偏好、解决相同问题、重新发现最佳实践。我们需要一个自进化系统,让 Claude Code 能够从历史会话中学习,自动总结用户偏好和工作模式,并将这些经验固化为可复用的配置和技能。参考 OpenClaw 的成功实践,结合 claude-mem 的记忆存储能力,我们可以构建一个真正能"成长"的 AI 助手。

## What Changes

- 新增定时任务系统,周期性分析近期会话记录
- 新增会话摘要和经验提取功能,使用 LLM 压缩关键信息
- 新增动态 MD 配置生成器,基于学习到的偏好更新 CLAUDE.md
- 新增技能识别和创建流程,自动化 skill 生成
- 集成 claude-mem MCP 服务,提供持久化存储和语义检索
- 新增用户偏好管理界面,允许手动调整自动学习结果
- 修改现有 CLAUDE.md 配置为模块化结构,支持动态拼接
- 新增进化日志,记录每次自动更新的内容和理由

## Capabilities

### New Capabilities

- `periodic-session-analyzer`: 定时任务调度和会话数据采集,负责周期性触发分析流程
- `experience-extractor`: LLM 驱动的会话摘要和经验提取,将原始对话压缩为结构化知识
- `preference-learner`: 用户偏好识别和更新机制,学习用户的工作习惯和风格偏好
- `md-config-generator`: 动态 MD 配置文件生成器,基于学习结果拼接生成 CLAUDE.md
- `skill-detector`: 重复模式识别和技能候选发现,自动发现可复用的操作模式
- `skill-creator`: 自动化 skill 生成工具,从模板创建并打包技能
- `memory-integration`: claude-mem MCP 集成层,提供统一的记忆存储和检索接口
- `evolution-dashboard`: 进化历史查看和手动干预界面,允许用户审查和调整

### Modified Capabilities

无现有能力需要修改

## Impact

**新增组件:**
- `src/scheduler/` - 定时任务调度器 (使用 node-cron)
- `src/analyzers/` - 会话分析器和经验提取器
- `src/learners/` - 偏好学习和技能检测逻辑
- `src/generators/` - MD 配置和 skill 生成器
- `src/memory/` - claude-mem 集成层
- `src/ui/` - 进化仪表盘 (可选 Web UI)

**修改的配置:**
- `~/.claude/CLAUDE.md` 拆分为模块化源文件
- 新增 `~/.claude-evolution/` 数据目录
  - `config.json` - 系统配置
  - `source/` - MD 源文件
  - `learned/` - 自动学习的配置片段
  - `evolution-log.json` - 进化历史日志

**依赖新增:**
- `node-cron` - 定时任务调度
- `@anthropic-ai/sdk` - Claude API 调用
- `@modelcontextprotocol/sdk` - MCP 客户端
- `chokidar` - 文件监听
- `zod` - 配置验证

**对用户的影响:**
- 首次运行需要初始化配置结构
- 需要用户授权访问 claude-mem 数据
- 定时任务会在后台运行(可配置频率)
- 生成的配置会自动替换 CLAUDE.md(需用户确认)
